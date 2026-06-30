"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgencyAdmin } from "@/lib/auth";
import { buildClientSettings, slugify } from "@/lib/settings";
import type { SettingsState } from "@/app/dashboard/actions";

// All actions here are agency-admin only and use the service-role client.

// Create a new client (tenant) + settings, and optionally its login, in one go.
export async function createClientAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAgencyAdmin();
  const admin = createAdminClient();

  const name = String(formData.get("business_name") ?? "").trim();
  if (!name) return { ok: false, error: "Business name is required." };

  const slug = slugify(String(formData.get("slug") || name));
  if (!slug) return { ok: false, error: "Could not derive a valid slug." };

  const domain = String(formData.get("domain") ?? "").trim() || null;

  // 1) Create the client row.
  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({ name, slug, domain })
    .select("id")
    .single<{ id: string }>();
  if (clientError || !client) {
    const msg = clientError?.code === "23505" ? "That slug or domain is already taken." : clientError?.message;
    return { ok: false, error: msg ?? "Could not create the client." };
  }

  // 2) Create settings from whatever fields were provided.
  let settings: ReturnType<typeof buildClientSettings>["settings"];
  try {
    ({ settings } = buildClientSettings(formData, client.id));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid input." };
  }
  const { error: settingsError } = await admin.from("client_settings").insert(settings);
  if (settingsError) return { ok: false, error: settingsError.message };

  // 3) Optionally create the login + profile link.
  const ownerEmail = String(formData.get("owner_email") ?? "").trim();
  const ownerPassword = String(formData.get("owner_password") ?? "").trim();
  if (ownerEmail && ownerPassword) {
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });
    if (userError || !created.user) {
      return { ok: false, error: `Client created, but login failed: ${userError?.message ?? "unknown error"}` };
    }
    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      client_id: client.id,
      full_name: name,
      role: "owner",
    });
    if (profileError) return { ok: false, error: `Client created, but link failed: ${profileError.message}` };
  }

  revalidatePath("/dashboard/clients");
  redirect(`/dashboard/clients/${client.id}`);
}

// Edit any client's website content (admin-scoped; bind clientId on the page).
export async function updateClientSettings(clientId: string, _prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAgencyAdmin();
  const admin = createAdminClient();

  let settings: ReturnType<typeof buildClientSettings>["settings"];
  let businessName: string | null;
  try {
    ({ settings, businessName } = buildClientSettings(formData, clientId));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON." };
  }

  const { error: settingsError } = await admin.from("client_settings").upsert(settings, { onConflict: "client_id" });
  if (settingsError) return { ok: false, error: settingsError.message };
  if (businessName) await admin.from("clients").update({ name: businessName }).eq("id", clientId);

  const { data: client } = await admin.from("clients").select("slug").eq("id", clientId).single<{ slug: string }>();
  if (client) revalidatePath(`/site/${client.slug}`);
  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true };
}

// Update slug / domain for a client.
export async function updateClientCore(formData: FormData) {
  await requireAgencyAdmin();
  const admin = createAdminClient();
  const clientId = String(formData.get("client_id") ?? "");
  const slug = slugify(String(formData.get("slug") ?? ""));
  const domain = String(formData.get("domain") ?? "").trim() || null;
  if (clientId && slug) {
    await admin.from("clients").update({ slug, domain }).eq("id", clientId);
    revalidatePath(`/dashboard/clients/${clientId}`);
  }
  redirect(`/dashboard/clients/${clientId}`);
}

// Create a login for a client that doesn't have one (or add a teammate).
export async function addClientLogin(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAgencyAdmin();
  const admin = createAdminClient();
  const clientId = String(formData.get("client_id") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  if (!clientId || !email || !password) return { ok: false, error: "Email and password are required." };

  const { data: created, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (userError || !created.user) return { ok: false, error: userError?.message ?? "Could not create the login." };

  const { error: profileError } = await admin.from("profiles").insert({ id: created.user.id, client_id: clientId, role: "owner" });
  if (profileError) return { ok: false, error: profileError.message };

  revalidatePath(`/dashboard/clients/${clientId}`);
  return { ok: true };
}
