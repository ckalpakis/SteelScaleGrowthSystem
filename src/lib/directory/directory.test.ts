import { describe, it, expect } from "vitest";

import { parseCsv, csvToRecords, recordToListing, csvToListings } from "@/lib/directory/csv";
import { slugify, uniqueSlug } from "@/lib/directory/slug";

describe("slugify", () => {
  it("makes URL-safe slugs", () => {
    expect(slugify("Joe's Plumbing & Heating!")).toBe("joe-s-plumbing-heating");
    expect(slugify("  Café Déjà Vu  ")).toBe("cafe-deja-vu");
  });
});

describe("uniqueSlug", () => {
  it("appends a counter on collisions", () => {
    const taken = new Set<string>();
    expect(uniqueSlug("Bob's Bakery", taken)).toBe("bob-s-bakery");
    expect(uniqueSlug("Bob's Bakery", taken)).toBe("bob-s-bakery-2");
    expect(uniqueSlug("Bob's Bakery", taken)).toBe("bob-s-bakery-3");
  });
});

describe("parseCsv", () => {
  it("handles quotes, commas, and newlines inside fields", () => {
    const csv = 'name,note\n"Acme, Inc.","Line1\nLine2"\n"He said ""hi""",ok';
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(["name", "note"]);
    expect(rows[1]).toEqual(["Acme, Inc.", "Line1\nLine2"]);
    expect(rows[2]).toEqual(['He said "hi"', "ok"]);
  });

  it("skips fully blank rows", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("csvToRecords + recordToListing", () => {
  it("maps flexible headers to listing fields", () => {
    const csv = "Business Name,Type,Phone,Website,City,Region,Zip\nAcme Plumbing,Plumbing,412-555-0100,https://acme.com,Gibsonia,PA,15044";
    const recs = csvToRecords(csv);
    const listing = recordToListing(recs[0]);
    expect(listing).toMatchObject({
      business_name: "Acme Plumbing",
      category: "Plumbing",
      phone: "412-555-0100",
      website: "https://acme.com",
      city: "Gibsonia",
      state: "PA",
      postal_code: "15044",
      tier: "free",
    });
  });

  it("recognizes premium tier and defaults otherwise", () => {
    expect(recordToListing({ name: "A", tier: "premium" })?.tier).toBe("premium");
    expect(recordToListing({ name: "A", tier: "gold" })?.tier).toBe("free");
  });

  it("skips rows with no business name", () => {
    expect(recordToListing({ phone: "123" })).toBeNull();
  });

  it("csvToListings drops nameless rows", () => {
    const csv = "name,phone\nAcme,111\n,222\nBeta,333";
    expect(csvToListings(csv).map((l) => l.business_name)).toEqual(["Acme", "Beta"]);
  });
});
