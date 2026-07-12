"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCompanyId } from "@/lib/reputation.server";
import { integrationDef, type IntegrationConnection } from "@/lib/integrations";

const PATH = "/dashboard/integrations";

export type IntegrationResult =
  | { ok: true; connection: IntegrationConnection }
  | { ok: false; error: string };

type Row = {
  provider: string;
  status: string;
  connected_account: string | null;
  config: Record<string, unknown> | null;
  last_sync_at: string | null;
  connected_at: string | null;
};

function toConnection(r: Row): IntegrationConnection {
  return {
    provider: r.provider,
    status: (r.status as IntegrationConnection["status"]) ?? "disconnected",
    connected_account: r.connected_account,
    config: r.config ?? {},
    last_sync_at: r.last_sync_at,
    connected_at: r.connected_at,
  };
}

async function upsert(
  provider: string,
  patch: Record<string, unknown>
): Promise<IntegrationResult> {
  if (!integrationDef(provider)) return { ok: false, error: "Unknown integration." };

  const companyId = await getCurrentCompanyId();
  if (!companyId) return { ok: false, error: "No company is linked to your account." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("integration_connections")
    .upsert({ company_id: companyId, provider, ...patch }, { onConflict: "company_id,provider" })
    .select("provider, status, connected_account, config, last_sync_at, connected_at")
    .single<Row>();

  if (error || !data) return { ok: false, error: error?.message ?? "Something went wrong." };
  revalidatePath(PATH);
  return { ok: true, connection: toConnection(data) };
}

// NOTE: no external API yet — connecting just records the connection state so
// the marketplace and settings are fully functional against the database.
export async function connectIntegration(provider: string): Promise<IntegrationResult> {
  const now = new Date().toISOString();
  return upsert(provider, { status: "connected", connected_at: now, last_sync_at: now, last_error: null });
}

export async function disconnectIntegration(provider: string): Promise<IntegrationResult> {
  return upsert(provider, {
    status: "disconnected",
    connected_account: null,
    connected_at: null,
    last_sync_at: null,
  });
}

export async function saveIntegrationSettings(
  provider: string,
  input: { connected_account?: string | null; config?: Record<string, unknown> }
): Promise<IntegrationResult> {
  const patch: Record<string, unknown> = {};
  if (input.connected_account !== undefined) patch.connected_account = input.connected_account?.trim() || null;
  if (input.config !== undefined) patch.config = input.config;
  return upsert(provider, patch);
}
