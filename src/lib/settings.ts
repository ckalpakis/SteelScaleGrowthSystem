// Shared helpers for turning the Settings form into a client_settings row.
// Plain module (no "use server") so both the client-scoped action and the
// agency-admin action can reuse it.

export function nullify(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

// One item per line → trimmed array (avoids comma issues like "Marietta, GA").
export function lines(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toNum(v: FormDataEntryValue | null): number | null {
  const n = parseFloat(String(v ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

export function toInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isFinite(n) ? n : null;
}

// Parse a JSON array field; blank means []. Throws a friendly error otherwise.
export function parseJsonArray(v: FormDataEntryValue | null, label: string): unknown[] {
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${label}: invalid JSON. Check for missing commas or quotes.`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${label}: must be a JSON array (starts with [ and ends with ]).`);
  }
  return parsed;
}

// Build a full client_settings row from the form. Throws on bad JSON.
export function buildClientSettings(formData: FormData, clientId: string) {
  const businessName = nullify(formData.get("business_name"));
  const settings = {
    client_id: clientId,
    business_name: businessName,
    phone: nullify(formData.get("phone")),
    email: nullify(formData.get("email")),
    address: nullify(formData.get("address")),
    hours: nullify(formData.get("hours")),
    logo_url: nullify(formData.get("logo_url")),
    favicon_url: nullify(formData.get("favicon_url")),
    brand_color: nullify(formData.get("brand_color")) ?? "#1e3a8a",
    secondary_color: nullify(formData.get("secondary_color")) ?? "#0c2340",
    hero_image_url: nullify(formData.get("hero_image_url")),
    tagline: nullify(formData.get("tagline")),
    primary_location: nullify(formData.get("primary_location")),
    hero_headline: nullify(formData.get("hero_headline")),
    hero_subheadline: nullify(formData.get("hero_subheadline")),
    work_heading: nullify(formData.get("work_heading")),
    services_heading: nullify(formData.get("services_heading")),
    services_subheading: nullify(formData.get("services_subheading")),
    promo_text: nullify(formData.get("promo_text")),
    services: lines(formData.get("services")),
    service_details: parseJsonArray(formData.get("service_details"), "Services"),
    service_area: nullify(formData.get("service_area")),
    service_areas: lines(formData.get("service_areas")),
    gallery: parseJsonArray(formData.get("gallery"), "Gallery"),
    value_props: lines(formData.get("value_props")),
    badges: lines(formData.get("badges")),
    badge_logos: parseJsonArray(formData.get("badge_logos"), "Badge logos"),
    about_headline: nullify(formData.get("about_headline")),
    about_text: nullify(formData.get("about_text")),
    rating: toNum(formData.get("rating")),
    review_count: toInt(formData.get("review_count")),
    google_review_link: nullify(formData.get("google_review_link")),
    auto_review_enabled: formData.get("auto_review_enabled") === "on",
    auto_review_delay_days: toInt(formData.get("auto_review_delay_days")) ?? 3,
    review_request_message: nullify(formData.get("review_request_message")),
    facebook_url: nullify(formData.get("facebook_url")),
    instagram_url: nullify(formData.get("instagram_url")),
    google_business_url: nullify(formData.get("google_business_url")),
    stats: parseJsonArray(formData.get("stats"), "Stats"),
    process_steps: parseJsonArray(formData.get("process_steps"), "Process steps"),
    testimonials: parseJsonArray(formData.get("testimonials"), "Testimonials"),
    financing: parseJsonArray(formData.get("financing"), "Financing"),
    faqs: parseJsonArray(formData.get("faqs"), "FAQs"),
  };
  return { settings, businessName };
}

export function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
