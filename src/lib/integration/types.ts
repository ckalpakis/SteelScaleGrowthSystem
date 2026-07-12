// =============================================================================
// Integration adapter system — shared types for sync + webhook flows.
// =============================================================================

import type { CanonicalObjectType } from "@/lib/crm/models";
import type { PlatformEvent, PlatformEventType } from "@/lib/events/types";
import type { OAuthTokens } from "@/lib/integration/ports";

// ---------------------------------------------------------------- sync
export interface SyncOptions {
  /** Only fetch records changed since this ISO timestamp (incremental sync). */
  since?: string | null;
  /** Provider pagination cursor to resume from. */
  cursor?: string | null;
  /** Max records to pull in this run. */
  limit?: number;
}

/** A page of raw provider records returned by a fetch method. */
export interface RawPage {
  records: unknown[];
  /** Cursor to fetch the next page, or null when done. */
  cursor?: string | null;
  hasMore?: boolean;
}

export interface SyncError {
  index?: number;
  message: string;
}

export interface SyncResult {
  objectType: CanonicalObjectType;
  fetched: number;
  normalized: number;
  published: number;
  errors: SyncError[];
  cursor: string | null;
  hasMore: boolean;
}

// ---------------------------------------------------------------- connect
export interface ConnectParams {
  /** OAuth authorization code, when applicable. */
  code?: string;
  redirectUri?: string;
  [key: string]: unknown;
}

export interface ConnectResult {
  status: "connected" | "error";
  connectedUser?: string | null;
  tokens?: OAuthTokens;
  error?: string;
}

// ---------------------------------------------------------------- webhooks
/** A raw inbound webhook request, transport-agnostic. */
export interface WebhookRequest {
  headers: Record<string, string>;
  /** Exact raw body string (needed for signature verification). */
  rawBody: string;
  query?: Record<string, string>;
}

/**
 * One item parsed out of a webhook. A provider either:
 *  - supplies a ready-made `event` (for payloads the base can't assemble, e.g.
 *    PAYMENT_RECEIVED), or
 *  - supplies objectType + eventType + raw, and lets the base normalize + wrap it.
 */
export interface ParsedWebhookItem {
  objectType: CanonicalObjectType;
  eventType: PlatformEventType | null;
  raw?: unknown;
  event?: PlatformEvent;
}

export interface ParsedWebhook {
  items: ParsedWebhookItem[];
}

export interface WebhookResult {
  verified: boolean;
  published: number;
  events: PlatformEvent[];
}
