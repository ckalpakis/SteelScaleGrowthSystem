import { ImageResponse } from "next/og";

import { createAdminClient } from "@/lib/supabase/admin";
import { getReviewImageConfig } from "@/lib/review-image/config.server";
import { verifyReviewImage } from "@/lib/review-image/sign";
import { applyNameTemplate, buildReviewImageElement, IMAGE_HEIGHT, IMAGE_WIDTH } from "@/lib/review-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public, SIGNED personalized-image endpoint (Twilio fetches this as MMS media).
// Auth is the HMAC signature in the query string — no session/header. Renders the
// client's base image with the recipient's name overlaid, per the saved config.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("c") ?? "";
  const name = url.searchParams.get("n") ?? "";
  const sig = url.searchParams.get("sig");

  if (!clientId || !verifyReviewImage(clientId, name, sig)) {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const config = await getReviewImageConfig(admin, clientId);
  if (!config || !config.enabled || !config.baseImageUrl) {
    return new Response("Not found", { status: 404 });
  }

  const text = applyNameTemplate(config.nameTemplate, name);

  try {
    return new ImageResponse(
      buildReviewImageElement({
        baseImageUrl: config.baseImageUrl,
        text,
        color: config.textColor,
        fontSize: config.fontSize,
        position: config.textPosition,
      }),
      {
        width: IMAGE_WIDTH,
        height: IMAGE_HEIGHT,
        headers: {
          // Same name → same image; let Twilio/CDN cache briefly.
          "Cache-Control": "public, max-age=3600, immutable",
        },
      },
    );
  } catch (err) {
    console.error("[media/review-image] render failed", err);
    return new Response("Render error", { status: 500 });
  }
}
