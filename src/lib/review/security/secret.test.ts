import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertWebhookSecret, SECRET_HEADER } from "@/lib/review/security/secret";
import { UnauthorizedError } from "@/lib/review/errors";

const original = process.env.STEELSCALE_WEBHOOK_SECRET;

function headersWith(secret?: string): Headers {
  const h = new Headers();
  if (secret !== undefined) h.set(SECRET_HEADER, secret);
  return h;
}

describe("assertWebhookSecret", () => {
  beforeEach(() => {
    process.env.STEELSCALE_WEBHOOK_SECRET = "correct-secret";
  });
  afterEach(() => {
    process.env.STEELSCALE_WEBHOOK_SECRET = original;
  });

  it("passes when the header matches", () => {
    expect(() => assertWebhookSecret(headersWith("correct-secret"))).not.toThrow();
  });

  it("rejects a wrong secret", () => {
    expect(() => assertWebhookSecret(headersWith("wrong"))).toThrow(UnauthorizedError);
  });

  it("rejects a missing header", () => {
    expect(() => assertWebhookSecret(headersWith())).toThrow(UnauthorizedError);
  });

  it("fails closed when the server secret is not configured", () => {
    delete process.env.STEELSCALE_WEBHOOK_SECRET;
    expect(() => assertWebhookSecret(headersWith("anything"))).toThrow(UnauthorizedError);
  });
});
