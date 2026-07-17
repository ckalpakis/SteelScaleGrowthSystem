// =============================================================================
// GHL workflow "Test Configuration" — dry-run checklist. Pure/testable core.
//
// Validates that a client's webhook setup is correct WITHOUT sending an SMS.
// The server gathers facts (does a credential exist, is the location known, is
// the client active, is Twilio configured) and this builder turns them into a
// checklist the admin UI renders.
// =============================================================================

import { buildWorkflowPayloads } from "@/lib/onboarding/webhook-setup";

export interface ChecklistItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface TestConfigFacts {
  /** A webhook credential exists and is enabled. */
  credentialEnabled: boolean;
  /** If the admin supplied a secret to verify, whether it matched the stored hash. */
  secretProvided: boolean;
  secretMatches: boolean;
  /** The client has a resolved provider location id. */
  locationId: string | null;
  clientActive: boolean;
  /** The client has a valid https review link (needed to resolve merge output). */
  hasReviewLink: boolean;
  twilioConfigured: boolean;
}

/** All required contact merge fields the payloads depend on. */
export function requiredMergeFields(): string[] {
  const fields = new Set<string>();
  for (const p of buildWorkflowPayloads()) {
    for (const m of p.json.match(/\{\{[^}]+\}\}/g) ?? []) fields.add(m);
  }
  return [...fields].sort();
}

/** Turn gathered facts into a rendered checklist. `passed` is true iff all pass. */
export function buildTestChecklist(facts: TestConfigFacts): { items: ChecklistItem[]; passed: boolean } {
  const items: ChecklistItem[] = [];

  items.push({
    key: "secret",
    label: "Webhook secret",
    ok: facts.secretProvided ? facts.secretMatches : facts.credentialEnabled,
    detail: facts.secretProvided
      ? facts.secretMatches
        ? "The supplied secret matches the stored credential."
        : "The supplied secret does not match. Rotate the secret and reinstall it."
      : facts.credentialEnabled
        ? "A webhook credential is configured and enabled."
        : "No enabled webhook credential exists. Generate one first.",
  });

  items.push({
    key: "location",
    label: "Location matching",
    ok: Boolean(facts.locationId),
    detail: facts.locationId ? `Requests will resolve to location ${facts.locationId}.` : "No provider location id is recorded for this client yet.",
  });

  items.push({
    key: "merge_fields",
    label: "Contact merge fields",
    ok: true,
    detail: `The backend resolves these fields from the request: ${requiredMergeFields().join(", ")}.`,
  });

  items.push({
    key: "client_active",
    label: "Client is active",
    ok: facts.clientActive,
    detail: facts.clientActive ? "The client account is active and will receive sends." : "The client is not active; requests will be skipped until it is.",
  });

  items.push({
    key: "review_link",
    label: "Review link configured",
    ok: facts.hasReviewLink,
    detail: facts.hasReviewLink ? "A review link is set and will be used from the Steel Scale record." : "No review link is configured on the client record.",
  });

  items.push({
    key: "twilio",
    label: "Messaging configured",
    ok: facts.twilioConfigured,
    detail: facts.twilioConfigured ? "Messaging is configured." : "Messaging is not configured on the server.",
  });

  return { items, passed: items.every((i) => i.ok) };
}

/** Twilio config presence check (no throw). */
export function isTwilioConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_API_KEY &&
      process.env.TWILIO_API_SECRET &&
      process.env.TWILIO_MESSAGING_SERVICE_SID,
  );
}
