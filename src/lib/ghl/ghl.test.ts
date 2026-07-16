// =============================================================================
// GHL integration — tests. All network is mocked via an injected fetch.
// =============================================================================

import { describe, it, expect, vi } from "vitest";

import { createGhlAgencyClient } from "@/lib/ghl";
import { GhlAuthManager } from "@/lib/ghl/auth";
import {
  GhlAuthError,
  GhlDuplicateError,
  GhlRateLimitError,
  GhlScopeError,
  GhlTimeoutError,
  GhlValidationError,
} from "@/lib/ghl/errors";
import type { GhlConfig } from "@/lib/ghl/types";

// ---- helpers ---------------------------------------------------------------

function pitConfig(overrides: Partial<GhlConfig> = {}): GhlConfig {
  return {
    baseUrl: "https://api.test",
    apiVersion: "2021-07-28",
    authMethod: "private_integration",
    companyId: "comp_1",
    timeoutMs: 50,
    grantedScopes: [
      "locations.write",
      "locations.readonly",
      "locations/customValues.readonly",
      "locations/customValues.write",
      "snapshots.readonly",
    ],
    privateIntegrationToken: "pit-secret",
    ...overrides,
  };
}

function oauthConfig(overrides: Partial<GhlConfig> = {}): GhlConfig {
  return {
    baseUrl: "https://api.test",
    apiVersion: "2021-07-28",
    authMethod: "oauth",
    companyId: "comp_1",
    timeoutMs: 50,
    grantedScopes: ["locations.write"],
    clientId: "cid",
    clientSecret: "csecret",
    tokenUrl: "https://api.test/oauth/token",
    accessToken: "access-1",
    refreshToken: "refresh-1",
    tokenExpiresAt: undefined,
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

// ---- create location -------------------------------------------------------

describe("createGhlLocation", () => {
  it("creates a sub-account and returns the location id", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "loc_123" }, { status: 201 }));
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    const result = await ghl.createLocation({ name: "Acme Plumbing", email: "a@acme.com" });

    expect(result).toEqual(expect.objectContaining({ locationId: "loc_123", created: true }));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/locations/");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer pit-secret");
    expect(init.headers.Version).toBe("2021-07-28");
  });

  it("rejects invalid input without calling the API", async () => {
    const fetchImpl = vi.fn();
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    await expect(ghl.createLocation({ name: "" })).rejects.toBeInstanceOf(GhlValidationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("does not create a second location when an existing id is found (idempotent replay)", async () => {
    const fetchImpl = vi.fn();
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    const result = await ghl.createLocation(
      { name: "Acme" },
      { getExistingLocationId: async () => "loc_existing" },
    );

    expect(result).toEqual({ locationId: "loc_existing", created: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("surfaces a duplicate (409) as GhlDuplicateError and never retries the POST", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: "Location already exists" }, { status: 409 }));
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    await expect(ghl.createLocation({ name: "Acme" })).rejects.toBeInstanceOf(GhlDuplicateError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("calls onCreated with the new id after a successful create", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ location: { id: "loc_9" } }, { status: 201 }));
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });
    const onCreated = vi.fn().mockResolvedValue(undefined);

    const result = await ghl.createLocation({ name: "Acme" }, { onCreated });

    expect(result.locationId).toBe("loc_9");
    expect(onCreated).toHaveBeenCalledWith("loc_9");
  });
});

// ---- auth + scope ----------------------------------------------------------

describe("auth and scopes", () => {
  it("maps a 401 to GhlAuthError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: "unauthorized" }, { status: 401 }));
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    await expect(ghl.getLocation("loc_1")).rejects.toBeInstanceOf(GhlAuthError);
  });

  it("throws GhlScopeError before any request when a required scope is missing", async () => {
    const fetchImpl = vi.fn();
    const ghl = createGhlAgencyClient({ config: pitConfig({ grantedScopes: ["locations.readonly"] }), fetchImpl });

    await expect(ghl.createLocation({ name: "Acme" })).rejects.toBeInstanceOf(GhlScopeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("allows the call (with a warning) when scopes are unverified/empty", async () => {
    const warn = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: "loc_1" }, { status: 201 }));
    const ghl = createGhlAgencyClient({
      config: pitConfig({ grantedScopes: [] }),
      fetchImpl,
      logger: { info: vi.fn(), warn, error: vi.fn() },
    });

    await ghl.createLocation({ name: "Acme" });
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ event: "ghl.scopes.unverified" }));
  });

  it("refreshes an expired OAuth token exactly once under concurrency (single-flight)", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      if (String(url).includes("/oauth/token")) {
        return jsonResponse({ access_token: "access-2", refresh_token: "refresh-2", expires_in: 3600, scope: "locations.write" });
      }
      return jsonResponse({ id: "loc_1" });
    });
    // expiresAt = 0 (forces refresh because a refresh token is present)
    const ghl = createGhlAgencyClient({ config: oauthConfig(), fetchImpl });

    // Two concurrent agency-token users should share ONE refresh.
    const [t1, t2] = await Promise.all([ghl.auth.getAgencyToken(), ghl.auth.getAgencyToken()]);
    expect(t1).toBe("access-2");
    expect(t2).toBe("access-2");

    const refreshCalls = fetchImpl.mock.calls.filter(([u]) => String(u).includes("/oauth/token"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("throws GhlAuthError when the refresh is rejected", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: "invalid_grant" }, { status: 400 }));
    const auth = new GhlAuthManager({ config: oauthConfig(), fetchImpl });

    await expect(auth.getAgencyToken()).rejects.toBeInstanceOf(GhlAuthError);
  });
});

// ---- rate limit + timeout --------------------------------------------------

describe("transport behavior", () => {
  it("retries a rate-limited GET and eventually surfaces GhlRateLimitError", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: "slow down" }, { status: 429, headers: { "retry-after": "0" } }));
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    await expect(ghl.getLocation("loc_1")).rejects.toBeInstanceOf(GhlRateLimitError);
    // GET is retried (maxAttempts=4).
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("succeeds after a transient 500 on a GET", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "boom" }, { status: 500 }))
      .mockResolvedValueOnce(jsonResponse({ id: "loc_1", name: "Acme" }));
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    const loc = await ghl.getLocation("loc_1");
    expect(loc.id).toBe("loc_1");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("maps an aborted request to GhlTimeoutError", async () => {
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    const ghl = createGhlAgencyClient({ config: pitConfig({ timeoutMs: 10 }), fetchImpl });

    await expect(ghl.getLocation("loc_1")).rejects.toBeInstanceOf(GhlTimeoutError);
  });
});

// ---- location token --------------------------------------------------------

describe("getLocationAccessToken", () => {
  it("mints a location token from the agency token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ access_token: "loc-token", expires_in: 86400 }));
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    const token = await ghl.getLocationAccessToken("loc_1");
    expect(token).toEqual({ accessToken: "loc-token", expiresIn: 86400 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/oauth/locationToken");
    expect(init.method).toBe("POST");
  });
});

// ---- custom values ---------------------------------------------------------

describe("custom values", () => {
  it("lists and normalizes custom values", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        customValues: [
          { id: 1, name: "Business Name", fieldKey: "custom_values.business_name", value: "Acme" },
          { id: "2", name: "Phone", key: "custom_values.phone", value: "555" },
        ],
      }),
    );
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    const values = await ghl.listLocationCustomValues("loc_1", "loc-token");
    expect(values).toEqual([
      { id: "1", name: "Business Name", key: "custom_values.business_name", value: "Acme" },
      { id: "2", name: "Phone", key: "custom_values.phone", value: "555" },
    ]);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe("Bearer loc-token");
  });

  it("updates a custom value and returns the normalized result", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ customValue: { id: "5", name: "Phone", key: "custom_values.phone", value: "999" } }),
    );
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    const updated = await ghl.updateLocationCustomValue("loc_1", "5", { value: "999" }, "loc-token");
    expect(updated).toEqual({ id: "5", name: "Phone", key: "custom_values.phone", value: "999" });
    expect(fetchImpl.mock.calls[0][1].method).toBe("PUT");
  });
});

// ---- snapshots -------------------------------------------------------------

describe("snapshots", () => {
  it("lists snapshots", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ snapshots: [{ id: "snap_1", name: "Contractor Base" }] }),
    );
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl });

    const snaps = await ghl.listSnapshots();
    expect(snaps).toEqual([{ id: "snap_1", name: "Contractor Base", type: null }]);
  });

  it("reports snapshot deployment as unsupported (requires a manual admin task)", () => {
    const ghl = createGhlAgencyClient({ config: pitConfig(), fetchImpl: vi.fn() });
    const support = ghl.snapshotAutomationSupport();
    expect(support).toEqual(
      expect.objectContaining({ supported: false, requiresManualTask: true }),
    );
  });
});
