import { NextResponse } from "next/server";
import { handleReviewWebhook } from "@/lib/review/controller";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// =============================================================================
// POST /api/review
//
// Thin transport shell: parse the JSON body, hand it to the controller, and
// return the controller's status + body. All logic lives in @/lib/review.
// =============================================================================
export async function POST(request: Request) {
  console.log("[review] request received");

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    console.warn("[review] invalid JSON body");
    return NextResponse.json({ success: false, error: "Invalid JSON body." }, { status: 400 });
  }

  const { status, body } = await handleReviewWebhook(raw);
  return NextResponse.json(body, { status });
}
