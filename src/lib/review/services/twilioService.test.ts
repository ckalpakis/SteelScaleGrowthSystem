import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Twilio SDK and the env loader so no real credentials/network are used.
const createMock = vi.fn().mockResolvedValue({ sid: "SM123", status: "queued" });
vi.mock("twilio", () => ({ default: vi.fn(() => ({ messages: { create: createMock } })) }));
vi.mock("@/lib/review/config/env", () => ({
  loadTwilioConfig: () => ({ accountSid: "ACxxx", apiKey: "SKxxx", apiSecret: "secret", messagingServiceSid: "MGxxx" }),
}));

import { sendMessage } from "@/lib/review/services/twilioService";
import { TwilioError } from "@/lib/review/errors";

beforeEach(() => {
  createMock.mockClear();
  createMock.mockResolvedValue({ sid: "SM123", status: "queued" });
});

describe("sendMessage", () => {
  it("sends a plain SMS (no mediaUrl) when no media is provided", async () => {
    const res = await sendMessage({ to: "+14125551234", body: "hi" });
    expect(res).toEqual({ messageSid: "SM123", status: "queued" });

    const args = createMock.mock.calls[0][0];
    expect(args.messagingServiceSid).toBe("MGxxx");
    expect(args.to).toBe("+14125551234");
    expect(args.body).toBe("hi");
    expect("mediaUrl" in args).toBe(false);
    expect(args.from).toBeUndefined();
  });

  it("sends an MMS with mediaUrl when media is provided", async () => {
    await sendMessage({ to: "+14125551234", body: "hi", mediaUrl: ["https://x.com/y.png"] });
    const args = createMock.mock.calls[0][0];
    expect(args.mediaUrl).toEqual(["https://x.com/y.png"]);
    expect(args.messagingServiceSid).toBe("MGxxx");
  });

  it("does not include mediaUrl when the array is empty (stays SMS)", async () => {
    await sendMessage({ to: "+14125551234", body: "hi", mediaUrl: [] });
    const args = createMock.mock.calls[0][0];
    expect("mediaUrl" in args).toBe(false);
  });

  it("wraps Twilio failures as TwilioError with the error code", async () => {
    createMock.mockRejectedValueOnce(Object.assign(new Error("bad number"), { code: 21211 }));
    await expect(sendMessage({ to: "+1", body: "hi" })).rejects.toBeInstanceOf(TwilioError);
  });
});
