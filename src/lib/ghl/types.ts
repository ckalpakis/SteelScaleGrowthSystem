// =============================================================================
// GHL integration — types. Server-only.
// =============================================================================

export type GhlAuthMethod = "oauth" | "private_integration";

export interface GhlConfig {
  baseUrl: string;
  apiVersion: string; // sent as the `Version` header
  authMethod: GhlAuthMethod;
  companyId: string; // agency / company id
  timeoutMs: number;
  /** Scopes the agency token was actually granted (for verification). */
  grantedScopes: string[];
  // OAuth
  clientId?: string;
  clientSecret?: string;
  tokenUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string; // ISO
  // Private Integration Token
  privateIntegrationToken?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** epoch ms when the access token expires; Infinity for non-expiring PITs. */
  expiresAt: number;
  scopes?: string[];
}

/** Injectable token persistence so refresh survives across serverless instances. */
export interface TokenStore {
  load(): Promise<TokenSet | null>;
  save(tokens: TokenSet): Promise<void>;
}

export interface GhlLogger {
  info(event: Record<string, unknown>): void;
  warn(event: Record<string, unknown>): void;
  error(event: Record<string, unknown>): void;
}

// ---------------------------------------------------------------- domain shapes
export interface CreateLocationInput {
  companyId?: string; // defaults to config.companyId
  name: string; // public business name
  legalName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
}

export interface CreateLocationResult {
  locationId: string;
  created: boolean; // false when returned from an existing-reference lookup
  raw?: unknown;
}

/** Idempotency hooks so a retry never silently creates a second location. */
export interface CreateLocationIdempotency {
  /** Return an existing GHL location id for this client, or null. Checked first. */
  getExistingLocationId?: () => Promise<string | null>;
  /** Persist the new location id right after creation. */
  onCreated?: (locationId: string) => Promise<void>;
}

export interface GhlLocationRecord {
  id: string;
  name: string | null;
  companyId: string | null;
  raw?: unknown;
}

export interface LocationAccessToken {
  accessToken: string;
  expiresIn?: number;
}

export interface CustomValue {
  id: string;
  name: string | null;
  key: string | null;
  value: string | null;
}

export interface Snapshot {
  id: string;
  name: string | null;
  type?: string | null;
}

/**
 * Result of asking whether snapshot deployment can be automated. If the current
 * official API exposes no supported endpoint for our auth type, this is
 * `{ supported: false, requiresManualTask: true }` — never a fabricated call.
 */
export type SnapshotAutomationResult =
  | { supported: true; method: "create_from_snapshot" | "apply_to_location" }
  | { supported: false; reason: string; requiresManualTask: true };
