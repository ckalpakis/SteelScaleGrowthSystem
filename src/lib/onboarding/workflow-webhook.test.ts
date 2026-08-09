import { describe, it, expect, vi } from "vitest";
import { createHash } from "node:crypto";

import { handleWorkflowWebhook, type WorkflowDeps, type WorkflowStore, type WorkflowClient } from "@/lib/onboarding/workflow-webhook";

const SECRET_A = "secret-for-client-a";
const HASH_A = createHash("sha256").update(SECRET_A).digest("hex");
const SECRET_B = "secret-for-client-b";

function makeDeps(over: {
  client?: WorkflowClient | null;
  credEnabled?: boolean;
  duplicate?: boolean;
  twilio?: boolean;
} = {}) {
  const client: WorkflowClient | null =
    over.client === undefined
      ? { id: "acc_a", public_business_name: "Acme", google_review_link: "https://g.page/r/acme/review", status: "active" }
      : over.client;

  const store: WorkflowStore = {
    getClientByLocationId: vi.fn(async () => client),
    getCredentialByClient: vi.fn(async () => (over.credEnabled === false ? null : { clientAccountId: "acc_a", secretHash: HASH_A, enabled: true })),
    recordEventOnce: vi.fn(async () => (over.duplicate ? "duplicate" : "new")),
    setEventStatus: vi.fn(async () => undefined),
  };
  const sendReview = vi.fn(async () => undefined);
  const deps: WorkflowDeps = { store, sendReview, twilioConfigured: () => over.twilio !== false };
  return { deps, store, sendReview };
}

function payload(over: Record<string, unknown> = {}) {
  return {
    eventVersion: "1.0",
    eventType: "review_request.initial",
    idempotencyKey: "loc_1:contact_1:initial:wf_1",
    locationId: "loc_1",
    contactId: "contact_1",
    firstName: "Dana",
    lastName: "Smith",
    phone: "+14125550100",
    email: "dana@acme.com",
    ...over,
  };
}

describe("handleWorkflowWebhook", () => {
  it("sends a review for a valid, authenticated, active request", async () => {
    const { deps, sendReview } = makeDeps();
    const res = await handleWorkflowWebhook(deps, SECRET_A, payload());
    expect(res).toEqual({ ok: true, outcome: "sent" });
    // Business identity comes from OUR record, not the payload.
    expect(sendReview).toHaveBeenCalledWith(expect.objectContaining({ businessName: "Acme", reviewLink: "https://g.page/r/acme/review", to: "+14125550100" }));
  });

  it("rejects an invalid payload", async () => {
    const { deps, sendReview } = makeDeps();
    const res = await handleWorkflowWebhook(deps, SECRET_A, payload({ eventType: "not_a_real_event" }));
    expect(res).toMatchObject({ ok: false, code: "invalid_payload" });
    expect(sendReview).not.toHaveBeenCalled();
  });

  it("rejects a wrong/cross-account secret without sending", async () => {
    const { deps, sendReview } = makeDeps();
    // Client B's secret must not authenticate against client A's location.
    const res = await handleWorkflowWebhook(deps, SECRET_B, payload());
    expect(res).toMatchObject({ ok: false, code: "unauthorized" });
    expect(sendReview).not.toHaveBeenCalled();
  });

  it("rejects an unknown location without revealing existence", async () => {
    const { deps, sendReview } = makeDeps({ client: null });
    const res = await handleWorkflowWebhook(deps, SECRET_A, payload());
    expect(res).toMatchObject({ ok: false, code: "unauthorized" });
    expect(sendReview).not.toHaveBeenCalled();
  });

  it("is idempotent — a replayed delivery does not send again", async () => {
    const { deps, sendReview } = makeDeps({ duplicate: true });
    const res = await handleWorkflowWebhook(deps, SECRET_A, payload());
    expect(res).toEqual({ ok: true, outcome: "duplicate" });
    expect(sendReview).not.toHaveBeenCalled();
  });

  it("skips (no send) when the client is not active", async () => {
    const { deps, sendReview } = makeDeps({ client: { id: "acc_a", public_business_name: "Acme", google_review_link: "https://g.page/r/acme/review", status: "paused" } });
    const res = await handleWorkflowWebhook(deps, SECRET_A, payload());
    expect(res).toEqual({ ok: true, outcome: "skipped_inactive" });
    expect(sendReview).not.toHaveBeenCalled();
  });

  it("reports not_configured when messaging is unavailable", async () => {
    const { deps, sendReview } = makeDeps({ twilio: false });
    const res = await handleWorkflowWebhook(deps, SECRET_A, payload());
    expect(res).toMatchObject({ ok: false, code: "not_configured" });
    expect(sendReview).not.toHaveBeenCalled();
  });
});
