// =============================================================================
// Integration loggers. The DB-backed logger records every API request/operation
// to integration_logs with detailed debugging context. Server-only.
// =============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationLogger } from "@/lib/integration/ports";

export interface IntegrationLogContext {
  companyId: string;
  provider?: string | null;
  integrationId?: string | null;
}

/** Logger that writes to integration_logs (via the service-role client). */
export function createIntegrationLogger(admin: SupabaseClient, ctx: IntegrationLogContext): IntegrationLogger {
  return {
    async log(entry) {
      try {
        await admin.from("integration_logs").insert({
          company_id: ctx.companyId,
          integration_id: ctx.integrationId ?? null,
          provider: ctx.provider ?? null,
          level: entry.level,
          action: entry.action,
          message: entry.message ?? null,
          context: entry.context ?? {},
          http_status: entry.httpStatus ?? null,
          duration_ms: entry.durationMs ?? null,
        });
      } catch (err) {
        // Never let logging failures break the operation being logged.
        console.error("[integration-logger] failed to write log", err);
      }
    },
  };
}

/** Console logger for local/dev use or when no DB logger is wired. */
export const consoleIntegrationLogger: IntegrationLogger = {
  log(entry) {
    const line = `[integration] ${entry.level} ${entry.action}${entry.message ? ` — ${entry.message}` : ""}`;
    if (entry.level === "error") console.error(line, entry.context ?? "");
    else if (entry.level === "warn") console.warn(line, entry.context ?? "");
  },
};

/** Fan-out logger: writes to several loggers (e.g. DB + console). */
export function multiLogger(...loggers: IntegrationLogger[]): IntegrationLogger {
  return { log: async (entry) => void (await Promise.all(loggers.map((l) => l.log(entry)))) };
}
