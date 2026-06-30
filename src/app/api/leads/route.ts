import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendNewLeadEmail } from "@/lib/email";
import type { Client, Lead } from "@/lib/types";

// Public lead-capture endpoint. Called from the public site contact form.
// Uses the service-role client so the anonymous visitor can create a lead
// without us opening up a public INSERT policy on the table.
export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const clientId = str(payload.client_id);
  const name = str(payload.name);

  if (!clientId || !name) {
    return NextResponse.json(
      { error: "Name is required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Confirm the client exists (and grab notification config).
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single<Client>();

  if (clientError || !client) {
    return NextResponse.json({ error: "Unknown business." }, { status: 404 });
  }

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      client_id: clientId,
      name,
      email: str(payload.email),
      phone: str(payload.phone),
      service: str(payload.service),
      message: str(payload.message),
      status: "new",
    })
    .select("*")
    .single<Lead>();

  if (insertError || !lead) {
    console.error("[leads] insert failed", insertError);
    return NextResponse.json({ error: "Could not save your request." }, { status: 500 });
  }

  // Notify the business. Awaited but fails soft inside the helper.
  await sendNewLeadEmail(client, lead);

  return NextResponse.json({ ok: true }, { status: 201 });
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}
