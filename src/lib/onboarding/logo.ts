// =============================================================================
// Client onboarding — logo validation. Server-only.
//
// Validates the ACTUAL file content (magic bytes), not the declared MIME type
// or extension, so a renamed/spoofed file is rejected. Only PNG, JPEG, and WebP
// are accepted. SVG is refused (unsanitized SVG is an XSS vector).
// =============================================================================

import { LOGO_ALLOWED_CONTENT_TYPES, LOGO_MAX_BYTES, type LogoContentType } from "@/lib/onboarding/config";

export type LogoValidationResult =
  | { ok: true; contentType: LogoContentType; ext: "png" | "jpg" | "webp"; bytes: Uint8Array }
  | { ok: false; error: string };

/** Sniff the real image type from the leading bytes. Returns null if unknown. */
export function sniffImageType(bytes: Uint8Array): LogoContentType | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

const EXT_BY_TYPE: Record<LogoContentType, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Validate a logo's size and true content type from its raw bytes. */
export function validateLogoBytes(bytes: Uint8Array): LogoValidationResult {
  if (bytes.length === 0) return { ok: false, error: "The logo file is empty." };
  if (bytes.length > LOGO_MAX_BYTES) {
    return { ok: false, error: `The logo must be ${Math.floor(LOGO_MAX_BYTES / (1024 * 1024))} MB or smaller.` };
  }
  const sniffed = sniffImageType(bytes);
  if (!sniffed || !LOGO_ALLOWED_CONTENT_TYPES.includes(sniffed)) {
    return { ok: false, error: "The logo must be a PNG, JPEG, or WebP image." };
  }
  return { ok: true, contentType: sniffed, ext: EXT_BY_TYPE[sniffed], bytes };
}
