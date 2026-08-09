// =============================================================================
// Request body size limits. The review payload is tiny (a few hundred bytes),
// so we cap it well below anything abusive. Two checks: the declared
// Content-Length (fast reject) and the actual byte length after reading
// (authoritative — a caller can lie about or omit Content-Length).
// =============================================================================

import { PayloadTooLargeError } from "@/lib/review/errors";

export const MAX_BODY_BYTES = 16 * 1024; // 16 KB

/** Fast pre-read check on the declared Content-Length header. */
export function assertContentLength(headers: Headers): void {
  const header = headers.get("content-length");
  if (!header) return; // may be absent; the post-read check is authoritative
  const length = Number(header);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
    throw new PayloadTooLargeError("Content-Length exceeds limit.");
  }
}

/** Authoritative check on the actual read body. */
export function assertBodyBytes(text: string): void {
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new PayloadTooLargeError("Body exceeds limit.");
  }
}
