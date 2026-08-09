import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAgencyAdmin } from "@/lib/auth";

const BUCKET = "client-media";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

// Authenticated image upload. Stores files under <client_id>/ in the public
// client-media bucket and returns the public URL. Uses the service-role client
// for the actual upload, so only logged-in members can reach this route.
//
// Target client:
//  - a client owner uploads to their own client (from their profile)
//  - an agency admin may pass client_id to upload for the client they're editing
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData();
  const requestedClientId = String(form.get("client_id") ?? "").trim();

  let clientId: string | null = null;
  if (requestedClientId && isAgencyAdmin(user.email)) {
    clientId = requestedClientId;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("client_id")
      .eq("id", user.id)
      .single<{ client_id: string | null }>();
    clientId = profile?.client_id ?? null;
  }

  if (!clientId) {
    return NextResponse.json({ error: "Account not linked to a client." }, { status: 403 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
  }

  const kind = sanitize(String(form.get("kind") ?? "image")) || "image";
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${clientId}/${kind}-${Date.now()}.${ext}`;

  const admin = createAdminClient();
  const buffer = await file.arrayBuffer();
  const { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });
  if (error) {
    console.error("[upload] failed", error);
    return NextResponse.json({ error: "Upload failed. Is the bucket created?" }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}

function sanitize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]/g, "");
}
