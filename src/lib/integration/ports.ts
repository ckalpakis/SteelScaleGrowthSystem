// =============================================================================
// Integration adapter system — dependency ports.
//
// The adapter depends on small injected interfaces ("ports") rather than
// concrete DB/crypto code, so the mapping/orchestration logic stays testable and
// the real implementations (company_integrations + AES-256-GCM crypto, the
// integration_logs table, a canonical record store) can be wired in later
// without touching any provider. This is the seam that keeps the system
// "designed for future providers".
// =============================================================================

import type { CanonicalRecord } from "@/lib/crm/models";

/** Decrypted OAuth token set for a connection. */
export interface OAuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  /** ISO-8601 access-token expiry. */
  expiresAt: string | null;
  tokenType?: string | null;
  scopes?: string[];
}

/**
 * Reads/writes a connection's credentials. Real impl persists to
 * company_integrations with the token columns encrypted (src/lib/crypto.ts).
 */
export interface CredentialStore {
  load(): Promise<OAuthTokens | null>;
  save(tokens: OAuthTokens): Promise<void>;
  clear(): Promise<void>;
}

/** Structured integration logging. Real impl writes to integration_logs. */
export interface IntegrationLogger {
  log(entry: {
    level: "debug" | "info" | "warn" | "error";
    action: string;
    message?: string;
    context?: Record<string, unknown>;
    httpStatus?: number;
    durationMs?: number;
  }): void | Promise<void>;
}

/** Persists normalized canonical records. Real impl upserts canonical_* tables. */
export interface CanonicalRecordSink {
  upsert(records: CanonicalRecord[]): Promise<void>;
}
