import { describe, it, expect } from "vitest";
import { normalizePhone, requireValidPhone } from "@/lib/review/validation/phone";
import { ValidationError } from "@/lib/review/errors";

describe("normalizePhone", () => {
  it("normalizes US numbers to E.164", () => {
    expect(normalizePhone("+14125551234")).toBe("+14125551234");
    expect(normalizePhone("(412) 555-1234")).toBe("+14125551234");
    expect(normalizePhone("412-555-1234")).toBe("+14125551234");
  });

  it("returns null for invalid input", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });
});

describe("requireValidPhone", () => {
  it("returns the E.164 number when valid", () => {
    expect(requireValidPhone("(412) 555-1234")).toBe("+14125551234");
  });

  it("throws ValidationError when invalid", () => {
    expect(() => requireValidPhone("nope")).toThrow(ValidationError);
    expect(() => requireValidPhone("nope")).toThrow("Invalid phone number.");
  });
});
