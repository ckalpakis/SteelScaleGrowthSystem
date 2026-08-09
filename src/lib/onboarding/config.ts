// =============================================================================
// Client onboarding — configuration constants. Server-safe (no secrets).
// =============================================================================

/** How long an invitation link stays valid, in days. Overridable via env. */
export const INVITATION_TTL_DAYS = Number(process.env.ONBOARDING_INVITATION_TTL_DAYS ?? 14);

/** Object-storage bucket used for onboarding uploads (reuses the app bucket). */
export const ONBOARDING_MEDIA_BUCKET = "client-media";

/** Prefix for onboarding logo objects within the bucket. */
export const ONBOARDING_LOGO_PREFIX = "onboarding";

// ---------------------------------------------------------------- logo limits
/** Max logo upload size. Kept modest — logos are small. */
export const LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Allowed logo image types. SVG is intentionally EXCLUDED: the app does not
 * currently sanitize SVG, and SVG can carry active content (scripts), so
 * accepting it would be an XSS vector once the logo URL is rendered.
 */
export const LOGO_ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export type LogoContentType = (typeof LOGO_ALLOWED_CONTENT_TYPES)[number];

// ---------------------------------------------------------------- body limits
/** Max size of the whole submission body (JSON fields + logo). */
export const SUBMISSION_MAX_BYTES = LOGO_MAX_BYTES + 64 * 1024;
