// =============================================================================
// Client onboarding — in-memory fixed-window rate limiter. Server-only.
//
// MVP-grade, per-process (per serverless instance) first line of defense against
// token-guessing and submission floods. Swap for a shared store (Redis/Upstash)
// if global limits are needed. Returns a result rather than throwing so callers
// can shape their own response.
// =============================================================================

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

const MAX_KEYS = 20_000;
const buckets = new Map<string, Bucket>();

/**
 * Allow up to `max` hits per `windowMs` for `key`. Keys should be namespaced by
 * caller (e.g. `open:<ip>`, `submit:<ip>`) so different actions don't share a
 * budget.
 */
export function checkRateLimit(key: string, max: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_KEYS) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= max) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

function prune(now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

// Sensible defaults for the two public actions.
export const OPEN_RATE = { max: 30, windowMs: 60_000 }; // opening/viewing an invite
export const SUBMIT_RATE = { max: 8, windowMs: 60_000 }; // submitting the form

/** For tests. */
export function _resetOnboardingRateLimit(): void {
  buckets.clear();
}
