import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { CANONICAL_CUSTOM_VALUE_KEYS } from "@/lib/onboarding/types";

// Guards the invariants of migration 0029 directly from its SQL, so they can't
// silently regress. (The migration is separately proven to apply against a real
// Postgres; these tests lock the specific constraints the feature relies on.)
const sql = readFileSync(join(process.cwd(), "supabase/migrations/0029_ghl_onboarding.sql"), "utf8");
const flat = sql.replace(/\s+/g, " ").toLowerCase();

describe("migration 0029 — structure", () => {
  it("creates all 8 tables", () => {
    const count = (sql.match(/create table if not exists public\./g) ?? []).length;
    expect(count).toBe(8);
  });
});

describe("token uniqueness", () => {
  it("stores only a hash and makes it unique", () => {
    expect(flat).toContain("public_token_hash text not null unique");
    // the raw token is never a column
    expect(flat).not.toMatch(/\braw_token\b|\btoken_plaintext\b/);
  });
});

describe("one location per client", () => {
  it("makes ghl_locations.client_account_id unique", () => {
    expect(flat).toContain("client_account_id uuid not null unique references public.client_accounts");
  });
  it("makes ghl_location_id unique", () => {
    expect(flat).toContain("ghl_location_id text unique");
  });
});

describe("validation constraints", () => {
  it("checks follow_up_count 0..3", () => {
    expect(flat).toContain("follow_up_count between 0 and 3");
  });
  it("checks review_request_limit_14_days range", () => {
    expect(flat).toContain("review_request_limit_14_days >= 0 and review_request_limit_14_days <= 500");
  });
  it("one provisioning step row per (run, step_key)", () => {
    expect(flat).toContain("unique (provisioning_run_id, step_key)");
  });
  it("allows at most one active agency connection", () => {
    expect(flat).toMatch(/ghl_connections_single_active_idx[\s\S]*where status = 'active'/);
  });
});

describe("access boundaries (RLS)", () => {
  it("enables RLS on all 8 tables", () => {
    const count = (flat.match(/enable row level security/g) ?? []).length;
    expect(count).toBe(8);
  });
  it("adds NO anon/authenticated policy (service-role only)", () => {
    // No create-policy statements at all → anon + authenticated are denied.
    expect(flat).not.toContain("create policy");
  });
  it("never stores GHL tokens in plaintext (only *_encrypted reserved columns)", () => {
    expect(flat).toContain("access_token_encrypted");
    expect(flat).not.toMatch(/\baccess_token text\b|\brefresh_token text\b/);
  });
});

describe("seed data", () => {
  it("seeds all 10 canonical custom-value keys", () => {
    for (const key of CANONICAL_CUSTOM_VALUE_KEYS) {
      expect(flat).toContain(`'${key}'`);
    }
  });
  it("seeds the legacy GHL key names", () => {
    expect(flat).toContain("'service_type'");
    expect(flat).toContain("'9_email_sending_subdomain_after_the_'");
  });
});
