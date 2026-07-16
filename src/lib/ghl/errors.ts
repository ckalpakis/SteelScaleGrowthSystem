// =============================================================================
// GHL integration — structured errors. Server-only.
//
// Every error carries a `safeMessage` (no secrets, safe to surface/log) and a
// `correlationId` so a failure can be traced without ever logging tokens or full
// response bodies. `retryable` marks transient failures for the HTTP client.
// =============================================================================

export interface GhlErrorOptions {
  safeMessage?: string;
  status?: number;
  code?: string | null;
  correlationId?: string;
  retryable?: boolean;
  cause?: unknown;
}

export class GhlError extends Error {
  readonly safeMessage: string;
  readonly status?: number;
  readonly code: string | null;
  readonly correlationId?: string;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(message: string, opts: GhlErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.safeMessage = opts.safeMessage ?? message;
    this.status = opts.status;
    this.code = opts.code ?? null;
    this.correlationId = opts.correlationId;
    this.retryable = opts.retryable ?? false;
    this.cause = opts.cause;
  }
}

/** Missing/invalid configuration or scopes — never retry, never a caller error. */
export class GhlConfigurationError extends GhlError {}

/** Required OAuth scopes are not granted to the agency token. */
export class GhlScopeError extends GhlConfigurationError {}

/** 401/403 — token invalid, expired, or lacks permission. */
export class GhlAuthError extends GhlError {}

/** 400/422 — request rejected by GHL validation, or our own input validation. */
export class GhlValidationError extends GhlError {}

/** 404 — resource not found. */
export class GhlNotFoundError extends GhlError {}

/** 409 / "already exists" — a location (or resource) already exists. */
export class GhlDuplicateError extends GhlError {}

/** 429 — rate limited. `retryAfterMs` from the Retry-After header when present. */
export class GhlRateLimitError extends GhlError {
  readonly retryAfterMs?: number;
  constructor(message: string, opts: GhlErrorOptions & { retryAfterMs?: number } = {}) {
    super(message, { ...opts, retryable: true });
    this.retryAfterMs = opts.retryAfterMs;
  }
}

/** 5xx — GHL server error (transient). */
export class GhlServerError extends GhlError {
  constructor(message: string, opts: GhlErrorOptions = {}) {
    super(message, { ...opts, retryable: true });
  }
}

/** Request aborted due to the configured timeout (transient). */
export class GhlTimeoutError extends GhlError {
  constructor(message: string, opts: GhlErrorOptions = {}) {
    super(message, { ...opts, retryable: true });
  }
}

/** Network/transport failure (transient). */
export class GhlNetworkError extends GhlError {
  constructor(message: string, opts: GhlErrorOptions = {}) {
    super(message, { ...opts, retryable: true });
  }
}

/** Response did not match the expected schema. */
export class GhlSchemaError extends GhlError {}

/** True for errors worth retrying (GET only, by policy). */
export function isTransientGhlError(err: unknown): boolean {
  return err instanceof GhlError && err.retryable;
}
