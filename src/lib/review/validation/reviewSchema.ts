// =============================================================================
// Webhook payload validation (zod). Enforces the required fields — firstName,
// phone, reviewLink, businessName — and passes optional fields through.
// =============================================================================

import { z } from "zod";
import { ValidationError } from "@/lib/review/errors";
import type { ReviewWebhookInput } from "@/lib/review/types";

export const reviewWebhookSchema = z.object({
  contactId: z.string().optional(),
  firstName: z.string().trim().min(1, "firstName is required"),
  lastName: z.string().optional(),
  phone: z.string().trim().min(1, "phone is required"),
  email: z.string().optional(),
  businessName: z.string().trim().min(1, "businessName is required"),
  businessOwner: z.string().optional(),
  reviewLink: z.string().trim().url("reviewLink must be a valid URL"),
  logo: z.string().optional(),
  image: z.string().optional(),
  messageType: z.string().optional(),
});

/** Validate a raw payload. Throws ValidationError("Validation failed.", details) on failure. */
export function validateReviewWebhook(raw: unknown): ReviewWebhookInput {
  const result = reviewWebhookSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    throw new ValidationError("Validation failed.", details);
  }
  return result.data;
}
