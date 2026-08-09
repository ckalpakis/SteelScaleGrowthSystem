import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { submitOnboarding } from "@/lib/onboarding/submission";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    legal_business_name: "Acme Plumbing LLC",
    public_business_name: "Acme Plumbing",
    owner_first_name: "Dana",
    primary_email: "dana@acme.com",
    primary_phone: "(412) 555-0100",
    website_url: "https://acmeplumbing.com",
    timezone: "America/New_York",
    google_review_link: "https://g.page/r/acme/review",
    follow_up_count: 2,
    review_request_limit_14_days: 8,
    ask_for_referral: true,
    ...overrides,
  };
}

function clientWithRpc(impl: (name: string, args: unknown) => { data: unknown; error: unknown }) {
  const rpc = vi.fn((name: string, args: unknown) => Promise.resolve(impl(name, args)));
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("submitOnboarding", () => {
  it("commits a valid submission and returns the created ids", async () => {
    const { client, rpc } = clientWithRpc(() => ({
      data: { client_account_id: "acc_1", provisioning_run_id: "run_1", invitation_id: "inv_1" },
      error: null,
    }));

    const res = await submitOnboarding(client, "raw-token-value-abcdefghijklmnop", validPayload());

    expect(res).toEqual({ ok: true, clientAccountId: "acc_1", provisioningRunId: "run_1" });
    // The RPC received a token HASH, never the raw token.
    const [, args] = rpc.mock.calls[0] as [string, { p_token_hash: string; p_payload: Record<string, unknown> }];
    expect(args.p_token_hash).not.toContain("raw-token-value");
    // Phone was normalized to E.164.
    expect(args.p_payload.primary_phone).toBe("+14125550100");
  });

  it("rejects invalid input before calling the RPC", async () => {
    const { client, rpc } = clientWithRpc(() => ({ data: null, error: null }));
    const res = await submitOnboarding(client, "raw-token-value-abcdefghijklmnop", validPayload({ primary_email: "not-an-email" }));

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.code).toBe("validation");
      expect(res.issues?.some((i) => i.field === "primary_email")).toBe(true);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps an already-submitted RPC error to a generic invalid_link", async () => {
    const { client } = clientWithRpc(() => ({ data: null, error: { message: "ONBOARD_SUBMITTED", code: "P0001" } }));
    const res = await submitOnboarding(client, "raw-token-value-abcdefghijklmnop", validPayload());
    expect(res).toEqual({ ok: false, code: "invalid_link" });
  });

  it("maps an expired RPC error to a generic invalid_link (no reason leaked)", async () => {
    const { client } = clientWithRpc(() => ({ data: null, error: { message: "ONBOARD_EXPIRED", code: "P0001" } }));
    const res = await submitOnboarding(client, "raw-token-value-abcdefghijklmnop", validPayload());
    expect(res).toEqual({ ok: false, code: "invalid_link" });
  });

  it("maps an unexpected RPC error to a generic error", async () => {
    const { client } = clientWithRpc(() => ({ data: null, error: { message: "deadlock detected", code: "40P01" } }));
    const res = await submitOnboarding(client, "raw-token-value-abcdefghijklmnop", validPayload());
    expect(res).toEqual({ ok: false, code: "error" });
  });
});
