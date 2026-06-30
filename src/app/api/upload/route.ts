import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "client-media";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

// Authenticated image upload. Stores files under <client_id>/ in the public
// client-media bucket and returns the public URL. Uses the service-role client
// for the actual upload, so only logged-in members can reach this route.
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single<{ client_id: string | null }>();

  if (!profile?.client_id) {
    return NextResponse.json({ error: "Account not linked to a client." }, { status: 403 });
  }

  const form = await request.formData();
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
  const path = `${profile.client_id}/${kind}-${Date.now()}.${ext}`;

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
