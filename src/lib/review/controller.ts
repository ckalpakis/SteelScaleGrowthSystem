// =============================================================================
// Review webhook controller — orchestrates the pipeline and maps the outcome to
// an HTTP status + JSON body. Any thrown AppError is turned into its response;
// unexpected errors become an UnknownError (500). The route stays a thin shell.
// =============================================================================

import { validateReviewWebhook } from "@/lib/review/validation/reviewSchema";
import { requireValidPhone } from "@/lib/review/validation/phone";
import { buildReviewMessage } from "@/lib/review/messageBuilder";
import { sendSms } from "@/lib/review/services/twilioService";
import { toAppError, ValidationError, type AppError } from "@/lib/review/errors";
import type { ControllerResponse } from "@/lib/review/types";

export async function handleReviewWebhook(raw: unknown): Promise<ControllerResponse> {
  try {
    const data = validateReviewWebhook(raw);
    const phone = requireValidPhone(data.phone);

    console.log("[review] validated", { phone, business: data.businessName });

    const body = buildReviewMessage({
      firstName: data.firstName,
      businessName: data.businessName,
      reviewLink: data.reviewLink,
    });

    const { messageSid, status } = await sendSms({ to: phone, body });

    console.log("[review] success", { messageSid, status, phone, business: data.businessName });
    return { status: 200, body: { success: true, messageSid } };
  } catch (err) {
    const appError = toAppError(err);
    logError(appError, err);
    return { status: appError.status, body: appError.toPayload() };
  }
}

function logError(appError: AppError, original: unknown): void {
  const context = { name: appError.name, status: appError.status };
  if (appError instanceof ValidationError) {
    console.warn("[review] validation error", { ...context, message: appError.message });
  } else {
    console.error("[review] error", { ...context, message: appError.message, cause: original });
  }
}
