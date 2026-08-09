import { describe, it, expect } from "vitest";
import { resolveMediaUrls } from "@/lib/review/validation/media";

describe("resolveMediaUrls", () => {
  it("returns undefined when image is missing → SMS", () => {
    expect(resolveMediaUrls(undefined)).toBeUndefined();
    expect(resolveMediaUrls(null)).toBeUndefined();
    expect(resolveMediaUrls("")).toBeUndefined();
    expect(resolveMediaUrls("   ")).toBeUndefined();
  });

  it("returns undefined for a non-URL or non-http(s) scheme → SMS", () => {
    expect(resolveMediaUrls("not-a-url")).toBeUndefined();
    expect(resolveMediaUrls("ftp://example.com/x.png")).toBeUndefined();
  });

  it("returns [url] for a valid http(s) image → MMS", () => {
    expect(resolveMediaUrls("https://cdn.example.com/logo.png")).toEqual(["https://cdn.example.com/logo.png"]);
    expect(resolveMediaUrls("http://example.com/i.jpg")).toEqual(["http://example.com/i.jpg"]);
  });

  it("trims surrounding whitespace", () => {
    expect(resolveMediaUrls("  https://x.com/y.png  ")).toEqual(["https://x.com/y.png"]);
  });
});
