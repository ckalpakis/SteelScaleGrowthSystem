// =============================================================================
// Media resolution for MMS. An image only becomes MMS media when it's a valid,
// public http(s) URL — otherwise we fall back to plain SMS (never break SMS on
// a bad/empty image value). Twilio expects mediaUrl as an array of URLs.
// =============================================================================

/** Return [image] when it's a valid http(s) URL, otherwise undefined (→ SMS). */
export function resolveMediaUrls(image?: string | null): string[] | undefined {
  if (!image) return undefined;
  const trimmed = image.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") return [trimmed];
  } catch {
    // Not a parseable URL → send as SMS.
  }
  return undefined;
}
