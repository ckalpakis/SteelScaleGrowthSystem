import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createInvitation,
  resolveInvitation,
  markInvitationOpened,
  revokeInvitation,
} from "@/lib/onboarding/invitations";
import { generateInvitationToken, hashInvitationToken } from "@/lib/onboarding/tokens";

// ---- a tiny chainable mock of the Supabase query builder ----
type Row = Record<string, unknown>;

function makeSelectClient(row: Row | null) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const update = vi.fn();
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  Object.assign(chain, {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single,
    maybeSingle,
    returns: vi.fn().mockResolvedValue({ data: row ? [row] : [], error: null }),
    update: update.mockImplementation(() => chain),
    _self: self,
  });
  const from = vi.fn(() => chain);
  return { client: { from } as unknown as SupabaseClient, from, chain, update };
}

const now = Date.now();
const future = new Date(now + 3 * 24 * 3600 * 1000).toISOString();
const past = new Date(now - 1000).toISOString();

function inviteRow(overrides: Partial<Row> = {}): Row {
  return {
    id: "inv_1",
    public_token_hash: "hash",
    client_email: "owner@biz.com",
    status: "pending",
    expires_at: future,
    opened_at: null,
    submitted_at: null,
    created_by_user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("createInvitation", () => {
  it("stores only a hash and returns the raw token once", async () => {
    const { client, chain } = makeSelectClient(inviteRow());
    const res = await createInvitation(client, { clientEmail: "Owner@Biz.com" });

    expect(res.rawToken).toBeTruthy();
    // The inserted row carried a hash, never the raw token.
    const insertArg = (chain.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Row;
    expect(insertArg.public_token_hash).toBe(hashInvitationToken(res.rawToken));
    expect(insertArg.public_token_hash).not.toBe(res.rawToken);
    expect(insertArg.client_email).toBe("owner@biz.com"); // normalized
  });
});

describe("resolveInvitation", () => {
  it("returns valid for a live, pending invitation", async () => {
    const { rawToken } = generateInvitationToken();
    const { client } = makeSelectClient(inviteRow());
    const res = await resolveInvitation(client, rawToken);
    expect(res.reason).toBe("valid");
  });

  it("returns not_found for a malformed token without querying", async () => {
    const { client, from } = makeSelectClient(null);
    const res = await resolveInvitation(client, "short");
    expect(res.reason).toBe("not_found");
    expect(from).not.toHaveBeenCalled();
  });

  it("returns not_found when no row matches the hash", async () => {
    const { rawToken } = generateInvitationToken();
    const { client } = makeSelectClient(null);
    const res = await resolveInvitation(client, rawToken);
    expect(res.reason).toBe("not_found");
  });

  it("returns expired and marks it when past expiry", async () => {
    const { rawToken } = generateInvitationToken();
    const { client, update } = makeSelectClient(inviteRow({ status: "opened", expires_at: past }));
    const res = await resolveInvitation(client, rawToken);
    expect(res.reason).toBe("expired");
    expect(update).toHaveBeenCalledWith({ status: "expired" });
  });

  it("returns revoked for a revoked invitation", async () => {
    const { rawToken } = generateInvitationToken();
    const { client } = makeSelectClient(inviteRow({ status: "revoked" }));
    const res = await resolveInvitation(client, rawToken);
    expect(res.reason).toBe("revoked");
  });

  it("returns submitted for an already-used invitation (reuse)", async () => {
    const { rawToken } = generateInvitationToken();
    const { client } = makeSelectClient(inviteRow({ status: "submitted", submitted_at: past }));
    const res = await resolveInvitation(client, rawToken);
    expect(res.reason).toBe("submitted");
  });
});

describe("markInvitationOpened / revokeInvitation", () => {
  let mock: ReturnType<typeof makeSelectClient>;
  beforeEach(() => {
    mock = makeSelectClient(inviteRow());
    // update chains need eq() to resolve; make terminal calls resolve.
    (mock.chain.eq as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const p = Promise.resolve({ data: null, error: null });
      return Object.assign(p, mock.chain);
    });
  });

  it("only transitions a pending invitation to opened", async () => {
    await markInvitationOpened(mock.client, "inv_1");
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ status: "opened" }));
  });

  it("revokes an invitation", async () => {
    await revokeInvitation(mock.client, "inv_1");
    expect(mock.update).toHaveBeenCalledWith({ status: "revoked" });
  });
});
