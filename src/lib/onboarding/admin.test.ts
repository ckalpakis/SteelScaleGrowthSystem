import { describe, it, expect, vi, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isAgencyAdmin } from "@/lib/auth";
import { canResendInvitation, setAdminTaskStatus, markSnapshotTaskComplete } from "@/lib/onboarding/admin.server";
import { generateWebhookCredential, hashWebhookSecret } from "@/lib/onboarding/provisioning/webhook";

// ---- admin-only access ----
describe("isAgencyAdmin (admin-only access)", () => {
  const prev = process.env.AGENCY_ADMIN_EMAILS;
  afterEach(() => {
    process.env.AGENCY_ADMIN_EMAILS = prev;
  });
  it("allows a listed admin and denies everyone else", () => {
    process.env.AGENCY_ADMIN_EMAILS = "boss@steelscale.xyz, admin@steelscale.xyz";
    expect(isAgencyAdmin("Admin@SteelScale.xyz")).toBe(true);
    expect(isAgencyAdmin("random@example.com")).toBe(false);
    expect(isAgencyAdmin(null)).toBe(false);
  });
});

// ---- invitation resend business rule ----
describe("canResendInvitation", () => {
  it("allows resend unless already submitted", () => {
    expect(canResendInvitation("pending")).toBe(true);
    expect(canResendInvitation("opened")).toBe(true);
    expect(canResendInvitation("expired")).toBe(true);
    expect(canResendInvitation("revoked")).toBe(true);
    expect(canResendInvitation("submitted")).toBe(false);
  });
});

// ---- secret rotation ----
describe("webhook secret rotation", () => {
  const prev = process.env.CREDENTIALS_ENCRYPTION_KEY;
  afterEach(() => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = prev;
  });
  it("stores only a hash and yields a distinct secret each rotation", () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = "a".repeat(64);
    const a = generateWebhookCredential();
    const b = generateWebhookCredential();
    expect(a.rawSecret).not.toBe(b.rawSecret);
    expect(a.secretHash).toBe(hashWebhookSecret(a.rawSecret));
    expect(a.secretHash).not.toBe(a.rawSecret);
    expect(a.secretCiphertext).toBeTruthy(); // encrypted handoff present when configured
    expect(a.secretCiphertext).not.toContain(a.rawSecret);
  });
});

// ---- a tiny chainable Supabase mock for the admin mutations ----
function mockAdmin() {
  const calls: { table: string; op: string; arg: unknown }[] = [];
  const tasks: Record<string, { id: string; client_account_id: string; provisioning_run_id: string | null }> = {
    task_snap: { id: "task_snap", client_account_id: "acc_1", provisioning_run_id: null },
  };
  const from = vi.fn((table: string) => {
    const ctx: { table: string; filters: Record<string, unknown> } = { table, filters: {} };
    const chain: Record<string, unknown> = {
      update: (arg: unknown) => {
        calls.push({ table, op: "update", arg });
        return chain;
      },
      insert: (arg: unknown) => {
        calls.push({ table, op: "insert", arg });
        return Promise.resolve({ error: null });
      },
      select: () => chain,
      eq: (col: string, val: unknown) => {
        ctx.filters[col] = val;
        // terminal for update chains resolves; also returns chain for select
        const p = Promise.resolve({ data: null, error: null });
        return Object.assign(p, chain);
      },
      maybeSingle: () => {
        if (table === "admin_tasks") return Promise.resolve({ data: tasks[String(ctx.filters.id)] ?? null, error: null });
        return Promise.resolve({ data: null, error: null });
      },
    };
    return chain;
  });
  return { admin: { from } as unknown as SupabaseClient, calls };
}

describe("admin task completion", () => {
  it("marks a task complete and writes an audit entry", async () => {
    const { admin, calls } = mockAdmin();
    await setAdminTaskStatus(admin, "task_x", "complete", "admin@steelscale.xyz");
    const taskUpdate = calls.find((c) => c.table === "admin_tasks" && c.op === "update");
    expect((taskUpdate!.arg as { status: string }).status).toBe("complete");
    expect(calls.some((c) => c.table === "admin_audit_log" && c.op === "insert")).toBe(true);
  });

  it("mark-snapshot-complete flips the snapshot status and audits", async () => {
    const { admin, calls } = mockAdmin();
    const res = await markSnapshotTaskComplete(admin, "task_snap", "admin@steelscale.xyz");
    // No provisioning_run_id on the task → returns without engine retry.
    expect(res.ok).toBe(true);
    const locUpdate = calls.find((c) => c.table === "ghl_locations" && c.op === "update");
    expect((locUpdate!.arg as { snapshot_status: string }).snapshot_status).toBe("applied");
    expect(calls.some((c) => c.table === "admin_audit_log")).toBe(true);
  });
});
