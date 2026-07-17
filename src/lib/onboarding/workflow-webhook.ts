// =============================================================================
// Client review-workflow webhook — ingestion core. Server-only, testable.
//
// Authenticated by a PER-CLIENT secret (X-SteelScale-Webhook-Secret). The
// backend resolves the client from the authenticated locationId in its OWN
// records and ignores any business name / logo / review URL supplied by GHL.
// Idempotent by the GHL-supplied idempotency key. This core is pure of I/O
// (store + sender are injected) so every branch is unit-tested.
// =============================================================================

import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/** Header carrying the per-client webhook secret (case-insensitive on read). */
export const WORKFLOW_SECRET_HEADER = "X-SteelScale-Webhook-Secret";

export const WORKFLOW_EVENT_TYPES = [
  "review_request.initial",
  "review_request.follow_up_1",
  "review_request.follow_up_2",
  "review_request.follow_up_3",
] as const;

export const workflowPayloadSchema = z.object({
  eventVersion: z.string().min(1),
  eventType: z.enum(WORKFLOW_EVENT_TYPES),
  idempotencyKey: z.string().trim().min(1).max(300),
  locationId: z.string().trim().min(1),
  contactId: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().optional().default(""),
  phone: z.string().trim().min(1),
  email: z.string().trim().optional().default(""),
});

export type WorkflowPayload = z.infer<typeof workflowPayloadSchema>;

export interface WorkflowClient {
  id: string;
  public_business_name: string;
  google_review_link: string | null;
  status: string;
}

export interface WorkflowCredential {
  clientAccountId: string;
  secretHash: string;
  enabled: boolean;
}

export interface WorkflowStore {
  /** Resolve the client from its provider location id (authoritative). */
  getClientByLocationId(locationId: string): Promise<WorkflowClient | null>;
  /** The client's webhook credential (hash + enabled), or null. */
  getCredentialByClient(clientAccountId: string): Promise<WorkflowCredential | null>;
  /** Insert an idempotency record; returns 'new' or 'duplicate'. */
  recordEventOnce(input: { idempotencyKey: string; clientAccountId: string; locationId: string; eventType: string }): Promise<"new" | "duplicate">;
  setEventStatus(idempotencyKey: string, status: "processed" | "skipped" | "failed", safeError?: string): Promise<void>;
}

export interface WorkflowSendParams {
  to: string;
  firstName: string;
  businessName: string;
  reviewLink: string;
}

export interface WorkflowDeps {
  store: WorkflowStore;
  /** Sends the review request (real Twilio in prod; spy in tests). */
  sendReview: (p: WorkflowSendParams) => Promise<void>;
  /** Whether Twilio is configured (gates the send). */
  twilioConfigured: () => boolean;
}

export type WorkflowResult =
  | { ok: true; outcome: "sent" | "duplicate" | "skipped_inactive" }
  | { ok: false; code: "invalid_payload" | "unknown_location" | "unauthorized" | "not_configured" | "error"; safeMessage: string };

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

/** Handle one workflow webhook. All failures return SAFE, generic messages. */
export async function handleWorkflowWebhook(deps: WorkflowDeps, rawSecret: string | null, rawPayload: unknown): Promise<WorkflowResult> {
  const parsed = workflowPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return { ok: false, code: "invalid_payload", safeMessage: "The request payload was invalid." };
  }
  const payload = parsed.data;

  // Resolve the client from the authenticated location id (our record only).
  const client = await deps.store.getClientByLocationId(payload.locationId);
  if (!client) {
    // Do not reveal whether the location exists.
    return { ok: false, code: "unauthorized", safeMessage: "Unauthorized." };
  }

  // Per-client secret check (timing-safe). A secret from another client will not
  // match THIS client's hash → cross-account requests are rejected.
  const cred = await deps.store.getCredentialByClient(client.id);
  const providedHash = rawSecret ? createHash("sha256").update(rawSecret, "utf8").digest("hex") : "";
  if (!cred || !cred.enabled || !rawSecret || !timingSafeEqualHex(providedHash, cred.secretHash)) {
    return { ok: false, code: "unauthorized", safeMessage: "Unauthorized." };
  }

  // Idempotency: a replayed delivery is a safe no-op.
  const dedupe = await deps.store.recordEventOnce({
    idempotencyKey: payload.idempotencyKey,
    clientAccountId: client.id,
    locationId: payload.locationId,
    eventType: payload.eventType,
  });
  if (dedupe === "duplicate") return { ok: true, outcome: "duplicate" };

  // Only send for active clients.
  if (client.status !== "active") {
    await deps.store.setEventStatus(payload.idempotencyKey, "skipped", "client not active");
    return { ok: true, outcome: "skipped_inactive" };
  }

  if (!client.google_review_link) {
    await deps.store.setEventStatus(payload.idempotencyKey, "failed", "no review link configured");
    return { ok: false, code: "error", safeMessage: "Client configuration incomplete." };
  }

  if (!deps.twilioConfigured()) {
    await deps.store.setEventStatus(payload.idempotencyKey, "failed", "messaging not configured");
    return { ok: false, code: "not_configured", safeMessage: "Messaging is not configured." };
  }

  try {
    await deps.sendReview({
      to: payload.phone,
      firstName: payload.firstName,
      businessName: client.public_business_name, // resolved from OUR record
      reviewLink: client.google_review_link, // resolved from OUR record
    });
    await deps.store.setEventStatus(payload.idempotencyKey, "processed");
    return { ok: true, outcome: "sent" };
  } catch {
    await deps.store.setEventStatus(payload.idempotencyKey, "failed", "send failed");
    return { ok: false, code: "error", safeMessage: "Could not process the request." };
  }
}
