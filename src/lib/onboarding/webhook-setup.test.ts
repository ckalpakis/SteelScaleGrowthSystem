import { describe, it, expect } from "vitest";

import { buildWorkflowPayloads, buildSetupInstructions, workflowWebhookUrl, WEBHOOK_SECRET_HEADER } from "@/lib/onboarding/webhook-setup";

describe("buildWorkflowPayloads", () => {
  const payloads = buildWorkflowPayloads();

  it("produces the four workflow stages in order", () => {
    expect(payloads.map((p) => p.stage)).toEqual(["initial", "follow_up_1", "follow_up_2", "follow_up_3"]);
    expect(payloads.map((p) => p.eventType)).toEqual([
      "review_request.initial",
      "review_request.follow_up_1",
      "review_request.follow_up_2",
      "review_request.follow_up_3",
    ]);
  });

  it("uses GHL merge fields and a per-stage idempotency key", () => {
    const initial = JSON.parse(payloads[0].json);
    expect(initial).toMatchObject({
      eventVersion: "1.0",
      eventType: "review_request.initial",
      idempotencyKey: "{{location.id}}:{{contact.id}}:initial:{{workflow.id}}",
      locationId: "{{location.id}}",
      contactId: "{{contact.id}}",
      firstName: "{{contact.first_name}}",
      lastName: "{{contact.last_name}}",
      phone: "{{contact.phone}}",
      email: "{{contact.email}}",
    });
    expect(JSON.parse(payloads[1].json).idempotencyKey).toContain(":follow-up-1:");
    expect(JSON.parse(payloads[3].json).idempotencyKey).toContain(":follow-up-3:");
  });

  it("never leaks business identity into the payload (backend resolves it)", () => {
    for (const p of payloads) {
      expect(p.json).not.toContain("businessName");
      expect(p.json).not.toContain("reviewLink");
      expect(p.json).not.toContain("logo");
    }
  });

  it("builds a stable webhook url and the required header", () => {
    expect(workflowWebhookUrl("https://app.steelscale.xyz/")).toBe("https://app.steelscale.xyz/api/workflow/review");
    expect(WEBHOOK_SECRET_HEADER).toBe("X-SteelScale-Webhook-Secret");
  });

  it("documents the full setup flow", () => {
    const steps = buildSetupInstructions();
    expect(steps.length).toBeGreaterThanOrEqual(14);
    expect(steps.join(" ")).toMatch(/Custom Webhook/i);
    expect(steps.join(" ")).toMatch(/Activate/i);
  });
});
