import { describe, it, expect, beforeEach } from "vitest";
import { assertRateLimit, _rateLimitConfig, _resetRateLimit } from "@/lib/review/security/rateLimit";
import { RateLimitError } from "@/lib/review/errors";

describe("assertRateLimit", () => {
  beforeEach(() => _resetRateLimit());

  it("allows requests up to the limit", () => {
    for (let i = 0; i < _rateLimitConfig.MAX_REQUESTS; i++) {
      expect(() => assertRateLimit("1.2.3.4")).not.toThrow();
    }
  });

  it("throws RateLimitError once the limit is exceeded", () => {
    for (let i = 0; i < _rateLimitConfig.MAX_REQUESTS; i++) assertRateLimit("1.2.3.4");
    expect(() => assertRateLimit("1.2.3.4")).toThrow(RateLimitError);
  });

  it("keys limits per client (separate IPs don't interfere)", () => {
    for (let i = 0; i < _rateLimitConfig.MAX_REQUESTS; i++) assertRateLimit("1.1.1.1");
    expect(() => assertRateLimit("2.2.2.2")).not.toThrow();
  });

  it("resets after the window elapses", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < _rateLimitConfig.MAX_REQUESTS; i++) assertRateLimit("9.9.9.9", t0);
    expect(() => assertRateLimit("9.9.9.9", t0)).toThrow(RateLimitError);
    expect(() => assertRateLimit("9.9.9.9", t0 + _rateLimitConfig.WINDOW_MS)).not.toThrow();
  });
});
