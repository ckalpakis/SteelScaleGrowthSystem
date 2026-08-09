import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { handleWorkflowWebhook, WORKFLOW_SECRET_HEADER } from "@/lib/onboarding/workflow-webhook";
import { workflowDeps } from "@/lib/onboarding/workflow-webhook.server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BODY_BYTES = 16 * 1024;

// Client review-workflow webhook (see the per-client setup package). Authenticated
// by the per-client X-SteelScale-Webhook-Secret header; the client is resolved
// from the authenticated locationId in our own records. Idempotent by the
// GHL-supplied idempotency key. Never returns raw internal errors.
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  const text = await request.text().catch(() => "");
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) return NextResponse.json({ ok: false }, { status: 413 });

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, code: "invalid_payload" }, { status: 400 });
  }

  const secret = request.headers.get(WORKFLOW_SECRET_HEADER);
  const result = await handleWorkflowWebhook(workflowDeps(createAdminClient()), secret, payload);

  if (result.ok) return NextResponse.json({ ok: true, outcome: result.outcome });

  const status =
    result.code === "unauthorized" ? 401 : result.code === "invalid_payload" ? 400 : result.code === "not_configured" ? 503 : 500;
  return NextResponse.json({ ok: false, code: result.code }, { status });
}
