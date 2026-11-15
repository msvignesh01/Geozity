import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  requestSchema,
  responseSchema,
} from "../src/domain/contracts";
import { parseIntent } from "../src/domain/intent";
import { createContext, readContext } from "../src/server/security";
import { encodeWav } from "../src/voice";
import { wavSeconds } from "../src/server/voice";

describe("intent and geography", () => {
  it.each([
    ["Parks in Bengaluru", "park", "Bengaluru"],
    [
      "Nearest hospital to MG Road, Bengaluru",
      "hospital",
      "MG Road, Bengaluru",
    ],
    ["Cafes near Hyde Park", "cafe", "Hyde Park"],
    ["Pharmacies near Shinjuku, Tokyo", "pharmacy", "Shinjuku, Tokyo"],
    [
      "Restaurants near Marina Beach, Chennai",
      "restaurant",
      "Marina Beach, Chennai",
    ],
    ["Museums in 東京", "museum", "東京"],
    ["Places to eat in New York", "restaurant", "New York"],
    ["cafés in Paris", "cafe", "Paris"],
  ])(
    "extracts %s without using a place-name category",
    (question, category, location) => {
      expect(parseIntent(question)).toMatchObject({
        category,
        locationText: location,
      });
    },
  );
  it("preserves follow-up category and distinguishes location replies", () => {
    expect(parseIntent("cafes instead", "hospital")).toMatchObject({
      category: "cafe",
      locationText: null,
    });
    expect(parseIntent("Bengaluru", "park", true)).toMatchObject({
      category: "park",
      locationText: "Bengaluru",
    });
    expect(parseIntent("parks near me")).toMatchObject({
      category: "park",
      nearMe: true,
      locationText: null,
    });
    expect(parseIntent("switch to cafes")).toMatchObject({
      category: "cafe",
      locationText: null,
    });
  });
  it.each([
    "Book a flight to Paris",
    "Open now cafes in Bengaluru",
    "Wheelchair parks in London",
  ])("does not promise unsupported constraints: %s", (question) => {
    expect(parseIntent(question).unsupported).toBe(true);
  });
  it("calculates zero and antimeridian distances correctly", () => {
    expect(distanceMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 0 })).toBe(0);
    expect(
      distanceMeters({ lat: 0, lon: 179.99 }, { lat: 0, lon: -179.99 }),
    ).toBeCloseTo(2223.9, 0);
    expect(
      distanceMeters({ lat: 0, lon: 0 }, { lat: 0, lon: 180 }),
    ).toBeCloseTo(20015086.8, 0);
  });
  it("rejects malformed input and contradictory success records", () => {
    expect(
      requestSchema.safeParse({
        requestId: crypto.randomUUID(),
        question: "x".repeat(501),
      }).success,
    ).toBe(false);
    expect(
      requestSchema.safeParse({
        requestId: crypto.randomUUID(),
        question: "parks",
        deviceLocation: { lat: 91, lon: 1 },
      }).success,
    ).toBe(false);
    expect(
      responseSchema.safeParse({ status: "ready", places: [] }).success,
    ).toBe(false);
  });
});
describe("signed search context", () => {
  const secret = "s".repeat(40);
  it("binds a selected city to the session and rejects modifications", async () => {
    const token = await createContext(secret, "session-a", "park", {
      lat: 12.97,
      lon: 77.59,
      label: "Bengaluru",
    });
    expect(
      (await readContext(secret, token, "session-a")).location?.label,
    ).toBe("Bengaluru");
    await expect(readContext(secret, token, "session-b")).rejects.toThrow(
      "expired",
    );
    await expect(
      readContext(secret, `${token}tampered`, "session-a"),
    ).rejects.toThrow();
  });
});
describe("voice duration integrity", () => {
  it("derives billed duration from validated PCM samples", () => {
    expect(wavSeconds(encodeWav(new Float32Array(16000)))).toBe(1);
  });
  it("rejects oversized, malformed, and silent-empty containers before provider billing", () => {
    expect(() => wavSeconds(new ArrayBuffer(44))).toThrow();
    expect(() => wavSeconds(encodeWav(new Float32Array(480001)))).toThrow();
    const buffer = encodeWav(new Float32Array(16000));
    new DataView(buffer).setUint32(24, 8000, true);
    expect(() => wavSeconds(buffer)).toThrow();
  });
});
