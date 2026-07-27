// =============================================================================
// Directory — CSV parsing + row → listing mapping. Pure, dependency-free.
//
// Handles quoted fields, escaped quotes (""), commas inside quotes, and both
// \n and \r\n line endings. Header names are matched flexibly so a scraped or
// bought list imports without hand-editing columns.
// =============================================================================

import type { ListingInput, ListingTier } from "@/lib/directory/types";

/** Parse CSV text into rows of string cells. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  // Flush the final field/row (unless the file ended with a trailing newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Parse CSV into header-keyed records (first row = headers). */
export function csvToRecords(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = (cells[i] ?? "").trim();
    });
    return rec;
  });
}

// Accepted header aliases → canonical field.
const FIELD_ALIASES: Record<keyof ListingInput, string[]> = {
  business_name: ["business_name", "business name", "business", "name", "company", "company name", "first name", "first_name"],
  category: ["category", "type", "industry", "niche", "listing label", "label"],
  description: ["description", "about", "bio", "summary"],
  address: ["address", "address1", "address line 1", "street", "address_line_1"],
  city: ["city", "town"],
  state: ["state", "region", "province"],
  postal_code: ["postal_code", "postal code", "zip", "zipcode", "zip code", "postcode"],
  phone: ["phone", "phone number", "telephone", "mobile", "tel"],
  website: ["website", "url", "web", "site", "website url"],
  email: ["email", "e-mail", "email address"],
  image_url: ["image_url", "image", "photo", "logo", "image url", "picture"],
  tier: ["tier", "plan", "level"],
};

function pick(rec: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    if (rec[a] !== undefined && rec[a] !== "") return rec[a];
  }
  return "";
}

/** Map one CSV record to a ListingInput. Returns null when there's no name. */
export function recordToListing(rec: Record<string, string>): ListingInput | null {
  const business_name = pick(rec, FIELD_ALIASES.business_name);
  if (!business_name) return null;

  const tierRaw = pick(rec, FIELD_ALIASES.tier).toLowerCase();
  const tier: ListingTier = tierRaw === "premium" ? "premium" : "free";

  return {
    business_name,
    category: pick(rec, FIELD_ALIASES.category) || null,
    description: pick(rec, FIELD_ALIASES.description) || null,
    address: pick(rec, FIELD_ALIASES.address) || null,
    city: pick(rec, FIELD_ALIASES.city) || null,
    state: pick(rec, FIELD_ALIASES.state) || null,
    postal_code: pick(rec, FIELD_ALIASES.postal_code) || null,
    phone: pick(rec, FIELD_ALIASES.phone) || null,
    website: pick(rec, FIELD_ALIASES.website) || null,
    email: pick(rec, FIELD_ALIASES.email) || null,
    image_url: pick(rec, FIELD_ALIASES.image_url) || null,
    tier,
  };
}

/** Parse a CSV blob straight into listing inputs (skips rows with no name). */
export function csvToListings(text: string): ListingInput[] {
  return csvToRecords(text)
    .map(recordToListing)
    .filter((l): l is ListingInput => l !== null);
}
