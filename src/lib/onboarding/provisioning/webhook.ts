// =============================================================================
// Onboarding provisioning — client webhook credential generation. Server-only.
//
// Generates a public identifier + a cryptographically secure secret. Only the
// secret HASH is persisted for verification; the raw secret is encrypted into a
// short-lived handoff column for a ONE-TIME admin reveal and is never logged.
// =============================================================================

import { createHash, randomBytes } from "node:crypto";

import { encryptSecret, encryptionConfigured } from "@/lib/crypto";
import { WEBHOOK_SECRET_HANDOFF_TTL_MINUTES } from "@/lib/onboarding/provisioning/config";

export interface GeneratedWebhookSecret {
  publicId: string;
  rawSecret: string;
  secretHash: string;
  /** AES-256-GCM ciphertext of the raw secret, or null if encryption is unconfigured. */
  secretCiphertext: string | null;
  secretExpiresAt: string;
}

/** sha256 hex of a raw secret (matches the review webhook's timing-safe compare). */
export function hashWebhookSecret(rawSecret: string): string {
  return createHash("sha256").update(rawSecret, "utf8").digest("hex");
}

/** Generate a fresh credential. The raw secret is only surfaced here + in the handoff. */
export function generateWebhookCredential(): GeneratedWebhookSecret {
  const publicId = `whc_${randomBytes(9).toString("base64url")}`;
  const rawSecret = randomBytes(32).toString("base64url");
  const secretHash = hashWebhookSecret(rawSecret);
  const secretCiphertext = encryptionConfigured() ? encryptSecret(rawSecret) : null;
  const secretExpiresAt = new Date(Date.now() + WEBHOOK_SECRET_HANDOFF_TTL_MINUTES * 60 * 1000).toISOString();
  return { publicId, rawSecret, secretHash, secretCiphertext, secretExpiresAt };
}
