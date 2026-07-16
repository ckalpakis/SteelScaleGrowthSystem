// =============================================================================
// Error classes for the review-request pipeline.
//
// Every error carries the HTTP status + JSON body it should produce, so the
// controller can map any thrown error to a response without branching on
// strings. All extend AppError.
// =============================================================================

export interface ErrorPayload {
  success: false;
  error: string;
  details?: { field: string; message: string }[];
  code?: number | string | null;
}

export abstract class AppError extends Error {
  abstract readonly status: number;
  /** The exact JSON body returned to the caller. */
  abstract toPayload(): ErrorPayload;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Input failed validation (bad shape or invalid phone). 400. */
export class ValidationError extends AppError {
  readonly status = 400;
  constructor(
    message: string,
    private readonly details?: { field: string; message: string }[]
  ) {
    super(message);
  }
  toPayload(): ErrorPayload {
    return this.details
      ? { success: false, error: this.message, details: this.details }
      : { success: false, error: this.message };
  }
}

/** A Twilio API or network failure while sending. 502. */
export class TwilioError extends AppError {
  readonly status = 502;
  constructor(
    message: string,
    readonly code: number | string | null = null
  ) {
    super(message);
  }
  toPayload(): ErrorPayload {
    return { success: false, error: "Failed to send message.", code: this.code };
  }
}

/** Required environment/config is missing. 500. */
export class ConfigurationError extends AppError {
  readonly status = 500;
  toPayload(): ErrorPayload {
    return { success: false, error: "SMS service is not configured." };
  }
}

/** Anything unexpected. 500. */
export class UnknownError extends AppError {
  readonly status = 500;
  constructor(readonly cause?: unknown) {
    super("Internal server error.");
  }
  toPayload(): ErrorPayload {
    return { success: false, error: "Internal server error." };
  }
}

/** Coerce any thrown value into an AppError. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  return new UnknownError(err);
}
