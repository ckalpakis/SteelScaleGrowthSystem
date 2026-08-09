import { describe, it, expect } from "vitest";

import { sniffImageType, validateLogoBytes } from "@/lib/onboarding/logo";
import { LOGO_MAX_BYTES } from "@/lib/onboarding/config";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
// "<svg " — a spoofed image; must be rejected.
const SVG = new Uint8Array([0x3c, 0x73, 0x76, 0x67, 0x20, 0x78, 0x6d, 0x6c]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0]);

describe("sniffImageType", () => {
  it("detects png/jpeg/webp by magic bytes", () => {
    expect(sniffImageType(PNG)).toBe("image/png");
    expect(sniffImageType(JPEG)).toBe("image/jpeg");
    expect(sniffImageType(WEBP)).toBe("image/webp");
  });
  it("returns null for unsupported types", () => {
    expect(sniffImageType(SVG)).toBeNull();
    expect(sniffImageType(GIF)).toBeNull();
  });
});

describe("validateLogoBytes", () => {
  it("accepts a real PNG", () => {
    const res = validateLogoBytes(PNG);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.ext).toBe("png");
  });

  it("rejects an SVG even though it may claim to be an image", () => {
    const res = validateLogoBytes(SVG);
    expect(res.ok).toBe(false);
  });

  it("rejects an empty file", () => {
    const res = validateLogoBytes(new Uint8Array(0));
    expect(res.ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    // A buffer just over the cap, with a valid PNG header.
    const big = new Uint8Array(LOGO_MAX_BYTES + 1);
    big.set(PNG.slice(0, 8), 0);
    const res = validateLogoBytes(big);
    expect(res.ok).toBe(false);
  });
});
