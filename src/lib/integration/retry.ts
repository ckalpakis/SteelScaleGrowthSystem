// =============================================================================
// Reusable retry with exponential backoff + jitter.
//
// Used across the integration system for failed syncs, failed webhook
// processing, and token refreshes. Pure and transport-agnostic.
// =============================================================================

export interface RetryOptions {
  /** Total attempts including the first. Default 4. */
  maxAttempts?: number;
  /** Base delay before the first retry (ms). Default 500. */
  baseDelayMs?: number;
  /** Cap on any single backoff delay (ms). Default 30000. */
  maxDelayMs?: number;
  /** Backoff multiplier. Default 2. */
  factor?: number;
  /** Apply random jitter (0.5×–1×) to each delay. Default true. */
  jitter?: boolean;
  /** Decide whether an error is worth retrying. Default: always. */
  retryable?: (error: unknown) => boolean;
  /** Called before each backoff sleep. */
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void | Promise<void>;
  /** Injectable sleep (for tests). */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function backoff(attempt: number, opts: Required<Pick<RetryOptions, "baseDelayMs" | "maxDelayMs" | "factor" | "jitter">>): number {
  const raw = opts.baseDelayMs * Math.pow(opts.factor, attempt - 1);
  const capped = Math.min(raw, opts.maxDelayMs);
  return opts.jitter ? Math.round(capped * (0.5 + Math.random() * 0.5)) : capped;
}

/**
 * Run `fn` with retries. `fn` receives the 1-based attempt number. Throws the
 * last error once attempts are exhausted or the error is not retryable.
 */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 4;
  const retryable = options.retryable ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;
  const cfg = {
    baseDelayMs: options.baseDelayMs ?? 500,
    maxDelayMs: options.maxDelayMs ?? 30_000,
    factor: options.factor ?? 2,
    jitter: options.jitter ?? true,
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !retryable(error)) break;
      const delayMs = backoff(attempt, cfg);
      await options.onRetry?.({ attempt, delayMs, error });
      await sleep(delayMs);
    }
  }
  throw lastError;
}

/** Marks an error as permanently non-retryable (e.g. invalid credentials). */
export class NonRetryableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "NonRetryableError";
  }
}

/** Default retryable predicate: retry everything except NonRetryableError. */
export function isRetryable(error: unknown): boolean {
  return !(error instanceof NonRetryableError);
}
