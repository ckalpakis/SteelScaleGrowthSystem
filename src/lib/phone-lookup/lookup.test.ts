import { describe, it, expect, vi } from "vitest";

import { lookupLineType, lookupMany, normalizeLineType, parseNumberList, type LookupDeps } from "@/lib/phone-lookup/lookup.server";

describe("normalizeLineType", () => {
  it("maps Twilio types to normalized line types", () => {
    expect(normalizeLineType("mobile")).toBe("mobile");
    expect(normalizeLineType("landline")).toBe("landline");
    expect(normalizeLineType("fixedVoip")).toBe("voip");
    expect(normalizeLineType("nonFixedVoip")).toBe("voip");
    expect(normalizeLineType("tollFree")).toBe("other");
    expect(normalizeLineType(null)).toBe("unknown");
  });
});

describe("parseNumberList", () => {
  it("splits on newlines/commas/semicolons and dedupes", () => {
    expect(parseNumberList("+15551112222, +15551112222\n+15553334444; ")).toEqual(["+15551112222", "+15553334444"]);
  });
});

describe("lookupLineType", () => {
  const deps = (resp: Record<string, unknown>): LookupDeps => ({ fetchLookup: vi.fn().mockResolvedValue(resp) });

  it("returns the normalized line type + carrier for a valid number", async () => {
    const res = await lookupLineType("(412) 555-0100", deps({ valid: true, lineTypeIntelligence: { type: "mobile", carrier_name: "Verizon" } }));
    expect(res).toMatchObject({ e164: "+14125550100", valid: true, lineType: "mobile", rawType: "mobile", carrierName: "Verizon" });
  });

  it("flags a landline", async () => {
    const res = await lookupLineType("+14125550100", deps({ valid: true, lineTypeIntelligence: { type: "landline" } }));
    expect(res.lineType).toBe("landline");
  });

  it("rejects an invalid number without calling Twilio", async () => {
    const fetchLookup = vi.fn();
    const res = await lookupLineType("nope", { fetchLookup });
    expect(res.valid).toBe(false);
    expect(res.lineType).toBe("unknown");
    expect(fetchLookup).not.toHaveBeenCalled();
  });

  it("captures a Twilio error instead of throwing", async () => {
    const res = await lookupLineType("+14125550100", { fetchLookup: vi.fn().mockRejectedValue(new Error("429 Too Many Requests")) });
    expect(res.error).toContain("429");
    expect(res.lineType).toBe("unknown");
  });
});

describe("lookupMany", () => {
  it("returns one result per number with its line type", async () => {
    const fetchLookup = vi.fn(async (e164: string) => ({ valid: true, lineTypeIntelligence: { type: e164 === "+14125550100" ? "mobile" : "landline" } }));
    const res = await lookupMany(["+14125550100", "+12025550175"], { fetchLookup }, 50);
    expect(res).toHaveLength(2);
    expect(res[0].lineType).toBe("mobile");
    expect(res[1].lineType).toBe("landline");
  });

  it("caps the number of lookups at the provided max", async () => {
    const fetchLookup = vi.fn().mockResolvedValue({ valid: true, lineTypeIntelligence: { type: "mobile" } });
    const inputs = ["+14155550132", "+16505551234", "+13035557788"];
    const res = await lookupMany(inputs, { fetchLookup }, 2);
    expect(res).toHaveLength(2);
    expect(fetchLookup).toHaveBeenCalledTimes(2);
  });
});
