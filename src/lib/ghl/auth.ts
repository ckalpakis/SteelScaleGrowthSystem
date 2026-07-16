// =============================================================================
// GHL integration — authentication manager. Server-only.
//
// Loads the agency credential, verifies scopes, and (for OAuth) refreshes the
// access token with single-flight protection so concurrent callers never trigger
// a refresh stampede. Tokens are never returned to the browser and never logged.
// =============================================================================

import { GhlAuthError, GhlScopeError } from "@/lib/ghl/errors";
import { oauthTokenResponseSchema } from "@/lib/ghl/schemas";
import type { GhlConfig, GhlLogger, TokenSet, TokenStore } from "@/lib/ghl/types";

const EXPIRY_SKEW_MS = 60_000; // refresh 60s before expiry

class MemoryTokenStore implements TokenStore {
  constructor(private tokens: TokenSet | null = null) {}
  async load() {
    return this.tokens;
  }
  async save(t: TokenSet) {
    this.tokens = t;
  }
}

export interface AuthManagerDeps {
  config: GhlConfig;
  fetchImpl?: typeof fetch;
  now?: () => number;
  tokenStore?: TokenStore;
  logger?: GhlLogger;
}

export class GhlAuthManager {
  private readonly config: GhlConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly store: TokenStore;
  private readonly logger?: GhlLogger;
  private grantedScopes: string[];
  private refreshing: Promise<TokenSet> | null = null;

  constructor(deps: AuthManagerDeps) {
    this.config = deps.config;
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.now = deps.now ?? Date.now;
    this.store = deps.tokenStore ?? new MemoryTokenStore(null);
    this.logger = deps.logger;
    this.grantedScopes = [...deps.config.grantedScopes];
  }

  /** A valid agency bearer token (PIT as-is; OAuth refreshed when near expiry). */
  async getAgencyToken(): Promise<string> {
    if (this.config.authMethod === "private_integration") {
      return this.config.privateIntegrationToken as string;
    }

    let tokens = await this.store.load();
    if (!tokens) {
      tokens = this.seedFromConfig();
      await this.store.save(tokens);
    }
    if (tokens.expiresAt - this.now() > EXPIRY_SKEW_MS) return tokens.accessToken;

    // Single-flight: concurrent callers share one refresh.
    if (!this.refreshing) {
      this.refreshing = this.doRefresh(tokens).finally(() => {
        this.refreshing = null;
      });
    }
    const refreshed = await this.refreshing;
    return refreshed.accessToken;
  }

  /** Throw GhlScopeError if any required scope is not granted. */
  assertScopes(required: readonly string[]): void {
    if (this.grantedScopes.length === 0) {
      // We can't verify (operator didn't declare GHL_GRANTED_SCOPES). Warn, allow.
      this.logger?.warn({ event: "ghl.scopes.unverified", required });
      return;
    }
    const missing = required.filter((r) => !this.grantedScopes.includes(r));
    if (missing.length > 0) {
      throw new GhlScopeError(`Missing required GHL scopes: ${missing.join(", ")}`, {
        safeMessage: "The GHL agency token is missing required scopes.",
        code: "missing_scopes",
      });
    }
  }

  private seedFromConfig(): TokenSet {
    const c = this.config;
    // If we know the expiry, use it; if we have a refresh token but no expiry,
    // force an immediate refresh; otherwise use the access token as-is.
    let expiresAt: number;
    if (c.tokenExpiresAt) expiresAt = Date.parse(c.tokenExpiresAt);
    else if (c.refreshToken) expiresAt = 0;
    else expiresAt = Number.POSITIVE_INFINITY;
    return { accessToken: c.accessToken as string, refreshToken: c.refreshToken, expiresAt, scopes: this.grantedScopes };
  }

  private async doRefresh(current: TokenSet): Promise<TokenSet> {
    const refreshToken = current.refreshToken ?? this.config.refreshToken;
    if (!refreshToken) {
      throw new GhlAuthError("No refresh token available; the agency must re-authorize.", {
        safeMessage: "GHL authorization expired; reconnect required.",
        code: "no_refresh_token",
      });
    }

    const body = new URLSearchParams({
      client_id: this.config.clientId ?? "",
      client_secret: this.config.clientSecret ?? "",
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      // Agency (Company) refresh may require this; VERIFY against docs.
      user_type: "Company",
    });

    let res: Response;
    try {
      res = await this.fetchImpl(this.config.tokenUrl as string, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: body.toString(),
      });
    } catch (err) {
      throw new GhlAuthError("Token refresh request failed.", { safeMessage: "GHL token refresh failed.", cause: err });
    }

    if (!res.ok) {
      this.logger?.error({ event: "ghl.refresh.failed", status: res.status });
      throw new GhlAuthError(`Token refresh returned ${res.status}.`, {
        status: res.status,
        safeMessage: "GHL token refresh was rejected.",
        code: "refresh_rejected",
      });
    }

    const json = await res.json().catch(() => ({}));
    const parsed = oauthTokenResponseSchema.safeParse(json);
    if (!parsed.success) {
      throw new GhlAuthError("Token refresh returned an unexpected shape.", { safeMessage: "GHL token refresh malformed." });
    }

    const next: TokenSet = {
      accessToken: parsed.data.access_token,
      refreshToken: parsed.data.refresh_token ?? refreshToken,
      expiresAt: this.now() + (parsed.data.expires_in ?? 3600) * 1000,
      scopes: parsed.data.scope ? parsed.data.scope.split(/[\s,]+/).filter(Boolean) : current.scopes,
    };
    if (next.scopes && next.scopes.length) this.grantedScopes = next.scopes;
    await this.store.save(next);
    this.logger?.info({ event: "ghl.refresh.ok" });
    return next;
  }
}
