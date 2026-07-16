import { NextResponse } from "next/server";
import { handleReviewWebhook } from "@/lib/review/controller";
import { toAppError } from "@/lib/review/errors";
import {
  assertWebhookSecret,
  assertRateLimit,
  assertContentLength,
  assertBodyBytes,
  clientIp,
} from "@/lib/review/security";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// =============================================================================
// POST /api/review
//
// Secured webhook: requires the x-steelscale-secret header, enforces a body-size
// limit and a per-IP rate limit, then hands the parsed JSON to the controller.
// Thin transport shell — all business logic lives in @/lib/review.
// =============================================================================
export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  console.log("[review] request received", { ip });

  // 1. Security gate: body size (declared) → secret → rate limit.
  try {
    assertContentLength(request.headers);
    assertWebhookSecret(request.headers);
    assertRateLimit(ip);
  } catch (err) {
    const appError = toAppError(err);
    console.warn("[review] request rejected", { ip, status: appError.status, reason: appError.name });
    return NextResponse.json(appError.toPayload(), { status: appError.status });
  }

  // 2. Read the body with a hard size cap (authoritative), then parse JSON.
  let raw: unknown;
  try {
    const text = await request.text();
    assertBodyBytes(text);
    raw = JSON.parse(text);
  } catch (err) {
    const appError = toAppError(err);
    // A size violation is 413; anything else here is malformed JSON.
    if (appError.status === 413) {
      console.warn("[review] payload too large", { ip });
      return NextResponse.json(appError.toPayload(), { status: 413 });
    }
    console.warn("[review] invalid JSON body", { ip });
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  // 3. Process.
  const { status, body } = await handleReviewWebhook(raw);
  return NextResponse.json(body, { status });
}
