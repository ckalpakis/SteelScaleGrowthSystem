import { requireClient } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { businessName, stageFor, type Lead } from "@/lib/types";

// GET /dashboard/leads/export — download all of the signed-in client's leads
// as a CSV. RLS scopes the query to the caller's client automatically.
export async function GET() {
  const { client, settings } = await requireClient();
  if (!client) {
    return new Response("Not linked to a client.", { status: 403 });
  }

  const supabase = createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })
    .returns<Lead[]>();

  const headers = [
    "Name",
    "Phone",
    "Email",
    "Service",
    "Estimate Value",
    "Status",
    "Source",
    "Message",
    "Received",
  ];

  const rows = (leads ?? []).map((l) => [
    l.name,
    l.phone ?? "",
    l.email ?? "",
    l.service_needed ?? "",
    l.estimate_value != null ? String(l.estimate_value) : "",
    stageFor(l.status).label,
    l.source ?? "",
    l.message ?? "",
    new Date(l.created_at).toISOString(),
  ]);

  const csv = [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  // Prepend a UTF-8 BOM so Excel renders accents correctly.
  const body = "﻿" + csv;

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${slugForFile(businessName(client, settings))}-leads-${stamp}.csv`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// RFC 4180 escaping: wrap in quotes and double any embedded quotes when the
// value contains a comma, quote, or newline.
function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function slugForFile(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "client";
}
