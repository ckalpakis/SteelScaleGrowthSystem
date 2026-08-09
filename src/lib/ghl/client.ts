// =============================================================================
// GHL integration — typed HTTP client. Server-only.
//
// Responsibilities:
//   - Base URL + `Version` header from config.
//   - Authorization injection (agency OAuth/PIT token, or an explicit override
//     such as a minted location token).
//   - Timeout via AbortController.
//   - Safe retries for idempotent GET requests ONLY (never for POST/PUT).
//   - Structured error mapping (status -> GhlError subclass).
//   - Response schema validation with zod.
//   - Per-request correlation IDs.
//   - Secret redaction: tokens and full response bodies are NEVER logged.
// =============================================================================

import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  GhlAuthError,
  GhlDuplicateError,
  GhlError,
  GhlNetworkError,
  GhlNotFoundError,
  GhlRateLimitError,
  GhlSchemaError,
  GhlServerError,
  GhlTimeoutError,
  GhlValidationError,
} from "@/lib/ghl/errors";
import type { GhlAuthManager } from "@/lib/ghl/auth";
import type { GhlConfig, GhlLogger } from "@/lib/ghl/types";
import { isTransientGhlError } from "@/lib/ghl/errors";
import { withRetry } from "@/lib/integration/retry";

export interface GhlRequestOptions<T> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  /** Parsed + validated with this schema when provided. */
  schema?: z.ZodType<T>;
  /** JSON body (POST/PUT/PATCH). */
  body?: unknown;
  /** Query params. */
  query?: Record<string, string | number | undefined>;
  /**
   * Override the Authorization token (e.g. a minted location token). When
   * omitted the agency token from the auth manager is used.
   */
  authToken?: string;
  /** Retry idempotent GETs. Ignored for non-GET methods. Default true for GET. */
  retry?: boolean;
  /** Correlation id to thread through logs/errors. Auto-generated when omitted. */
  correlationId?: string;
}

export interface GhlHttpClientDeps {
  config: GhlConfig;
  auth: GhlAuthManager;
  fetchImpl?: typeof fetch;
  logger?: GhlLogger;
}

/** Redact anything that looks like a bearer token from a header record. */
function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = k.toLowerCase() === "authorization" ? "Bearer [redacted]" : v;
  }
  return out;
}

export class GhlHttpClient {
  private readonly config: GhlConfig;
  private readonly auth: GhlAuthManager;
  private readonly fetchImpl: typeof fetch;
  private readonly logger?: GhlLogger;

  constructor(deps: GhlHttpClientDeps) {
    this.config = deps.config;
    this.auth = deps.auth;
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.logger = deps.logger;
  }

  async request<T>(opts: GhlRequestOptions<T>): Promise<T> {
    const correlationId = opts.correlationId ?? randomUUID();
    const isGet = opts.method === "GET";
    const shouldRetry = isGet && (opts.retry ?? true);

    const run = (attempt: number) => this.execute<T>(opts, correlationId, attempt);

    if (!shouldRetry) {
      // Non-idempotent methods are executed exactly once — never silently
      // replayed, so a POST can't create a duplicate resource on a retry.
      return run(1);
    }

    return withRetry(run, {
      maxAttempts: 4,
      baseDelayMs: 500,
      retryable: isTransientGhlError,
      onRetry: ({ attempt, delayMs, error }) => {
        this.logger?.warn({
          event: "ghl.http.retry",
          correlationId,
          method: opts.method,
          path: opts.path,
          attempt,
          delayMs,
          status: error instanceof GhlError ? error.status : undefined,
        });
      },
    });
  }

  private buildUrl(path: string, query?: GhlRequestOptions<unknown>["query"]): string {
    const url = new URL(`${this.config.baseUrl}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async execute<T>(opts: GhlRequestOptions<T>, correlationId: string, attempt: number): Promise<T> {
    const token = opts.authToken ?? (await this.auth.getAgencyToken());
    const url = this.buildUrl(opts.path, opts.query);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Version: this.config.apiVersion,
      Accept: "application/json",
    };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    this.logger?.info({
      event: "ghl.http.request",
      correlationId,
      method: opts.method,
      path: opts.path,
      attempt,
      headers: redactHeaders(headers), // never logs the raw token
    });

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method: opts.method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new GhlTimeoutError(`GHL request timed out after ${this.config.timeoutMs}ms.`, {
          safeMessage: "The request to HighLevel timed out.",
          correlationId,
          cause: err,
        });
      }
      throw new GhlNetworkError("GHL request failed at the transport layer.", {
        safeMessage: "Could not reach HighLevel.",
        correlationId,
        cause: err,
      });
    } finally {
      clearTimeout(timer);
    }

    // Read the body as text once; parse to JSON defensively. We never log this.
    const text = await res.text().catch(() => "");
    let json: unknown = undefined;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
    }

    if (!res.ok) {
      throw this.mapError(res, json, correlationId);
    }

    this.logger?.info({ event: "ghl.http.response", correlationId, status: res.status });

    if (!opts.schema) return json as T;

    const parsed = opts.schema.safeParse(json);
    if (!parsed.success) {
      // Log only the field paths that failed — never the response body.
      this.logger?.error({
        event: "ghl.http.schema_error",
        correlationId,
        issues: parsed.error.issues.map((i) => i.path.join(".")),
      });
      throw new GhlSchemaError("GHL response did not match the expected schema.", {
        safeMessage: "HighLevel returned an unexpected response shape.",
        correlationId,
        status: res.status,
      });
    }
    return parsed.data;
  }

  /** Extract a short, non-sensitive message from an error envelope. */
  private extractSafeMessage(json: unknown): string | undefined {
    if (json && typeof json === "object") {
      const obj = json as Record<string, unknown>;
      const msg = obj.message ?? obj.error ?? obj.msg;
      if (typeof msg === "string") return msg.slice(0, 200);
      if (Array.isArray(msg) && typeof msg[0] === "string") return String(msg[0]).slice(0, 200);
    }
    return undefined;
  }

  private mapError(res: Response, json: unknown, correlationId: string): GhlError {
    const status = res.status;
    const detail = this.extractSafeMessage(json);
    const base = { status, correlationId } as const;

    if (status === 401 || status === 403) {
      return new GhlAuthError(`GHL auth failed (${status}).`, {
        ...base,
        safeMessage: "HighLevel rejected the credentials or permissions.",
        code: "unauthorized",
      });
    }
    if (status === 404) {
      return new GhlNotFoundError("GHL resource not found.", {
        ...base,
        safeMessage: "The requested HighLevel resource was not found.",
        code: "not_found",
      });
    }
    if (status === 409 || (detail && /already exist|duplicate/i.test(detail))) {
      return new GhlDuplicateError("GHL resource already exists.", {
        ...base,
        safeMessage: detail ?? "That HighLevel resource already exists.",
        code: "duplicate",
      });
    }
    if (status === 422 || status === 400) {
      return new GhlValidationError(`GHL rejected the request (${status}).`, {
        ...base,
        safeMessage: detail ?? "HighLevel rejected the request as invalid.",
        code: "validation",
      });
    }
    if (status === 429) {
      const retryAfter = res.headers.get("retry-after");
      const retryAfterMs = retryAfter ? parseRetryAfter(retryAfter) : undefined;
      return new GhlRateLimitError("GHL rate limit exceeded.", {
        ...base,
        safeMessage: "HighLevel rate limit reached; retrying shortly.",
        code: "rate_limited",
        retryAfterMs,
      });
    }
    if (status >= 500) {
      return new GhlServerError(`GHL server error (${status}).`, {
        ...base,
        safeMessage: "HighLevel had a server error.",
        code: "server_error",
      });
    }
    return new GhlError(`GHL request failed (${status}).`, {
      ...base,
      safeMessage: detail ?? "The HighLevel request failed.",
    });
  }
}

/** Parse a Retry-After header (delta-seconds or HTTP-date) into ms. */
function parseRetryAfter(value: string): number | undefined {
  const secs = Number(value);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const date = Date.parse(value);
  if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  return undefined;
}
