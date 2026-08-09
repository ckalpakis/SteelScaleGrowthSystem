import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// =============================================================================
// Symmetric encryption for secrets at rest (e.g. Twilio auth tokens).
// AES-256-GCM. Server-only — never import from client code.
//
// The key comes from CREDENTIALS_ENCRYPTION_KEY. It may be supplied as:
//   - 64 hex chars (32 bytes), or
//   - base64 that decodes to 32 bytes, or
//   - any passphrase (derived to 32 bytes via scrypt).
//
// Ciphertext format:  v1:<iv b64>:<tag b64>:<ciphertext b64>
// =============================================================================

const VERSION = "v1";
const SCRYPT_SALT = "steelscale-cred-v1";

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) throw new Error("CREDENTIALS_ENCRYPTION_KEY is not set.");

  // 64-char hex → 32 bytes
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");

  // base64 that decodes to exactly 32 bytes
  try {
    const b = Buffer.from(raw, "base64");
    if (b.length === 32) return b;
  } catch {
    // fall through to scrypt
  }

  // Anything else: derive a 32-byte key deterministically.
  return scryptSync(raw, SCRYPT_SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed ciphertext.");
  }
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]);
  return pt.toString("utf8");
}

export function encryptionConfigured(): boolean {
  return Boolean(process.env.CREDENTIALS_ENCRYPTION_KEY);
}
