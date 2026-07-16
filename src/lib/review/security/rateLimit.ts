// =============================================================================
// Simple in-memory fixed-window rate limiter (per client key, usually the IP).
//
// MVP-grade: state lives in the process, so limits are per-instance. That's fine
// as a first line of defense against abuse/loops from a single caller. Swap for
// a shared store (Redis/Upstash) later if you need global limits.
// =============================================================================

import { RateLimitError } from "@/lib/review/errors";

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per window, per key
const MAX_KEYS = 10_000; // guard against unbounded memory growth

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Throw RateLimitError if `key` has exceeded MAX_REQUESTS in the current window. */
export function assertRateLimit(key: string, now: number = Date.now()): void {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_KEYS) pruneExpired(now);
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (existing.count >= MAX_REQUESTS) {
    throw new RateLimitError("Rate limit exceeded.");
  }
  existing.count += 1;
}

function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

// Exposed for tests.
export const _rateLimitConfig = { WINDOW_MS, MAX_REQUESTS };
export function _resetRateLimit(): void {
  buckets.clear();
}
