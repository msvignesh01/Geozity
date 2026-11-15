import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../src/server/app";
import { responseSchema } from "../src/domain/contracts";
import type { Env } from "../src/server/config";
import { encodeWav } from "../src/voice";

const env: Env = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
  GEOAPIFY_API_KEY: "test-map-key",
  SESSION_HMAC_SECRET: "test-secret-".repeat(4),
  DAILY_MAP_CALL_LIMIT: "200",
};
const location = {
  lat: 12.9756,
  lon: 77.6066,
  formatted: "MG Road, Bengaluru, India",
  city: "Bengaluru",
  country: "India",
};
const feature = (id: number, lat: number, name: string) => ({
  properties: {
    lat,
    lon: 77.6066,
    name,
    formatted: "Bengaluru, India",
    categories: ["healthcare.hospital", "leisure.park", "catering.cafe"],
    datasource: { raw: { osm_type: "n", osm_id: id } },
  },
});
let fetched: string[];
let budget = true;
let mapStatus = 200;
let ambiguous = false;
let empty = false;
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
beforeEach(() => {
  fetched = [];
  budget = true;
  mapStatus = 200;
  ambiguous = false;
  empty = false;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      fetched.push(url);
      if (url.includes("/rpc/geozity_reserve_usage")) return json(budget);
      if (url.includes("/v1/geocode/search"))
        return json(
          {
            features: [
              { properties: location },
              ...(ambiguous
                ? [
                    {
                      properties: {
                        ...location,
                        lat: 42,
                        lon: -72,
                        formatted: "Springfield, Massachusetts, USA",
                        city: "Springfield",
                        country: "United States",
                      },
                    },
                  ]
                : []),
            ],
          },
          mapStatus,
        );
      if (url.includes("/v2/places"))
        return json(
          {
            features: empty
              ? []
              : [
                  feature(2, 12.99, "<script>alert(1)</script>"),
                  feature(1, 12.98, "Nearby Hospital"),
                  feature(1, 12.98, "Duplicate"),
                ],
          },
          mapStatus,
        );
      if (url.includes("/v1/speech-to-text")) {
        expect(new Headers(init?.headers).get("xi-api-key")).toBe(
          "test-eleven-key",
        );
        return json({
          text: "Parks in Bengaluru",
          language_code: "eng",
          language_probability: 0.99,
          words: [],
        });
      }
      if (url.includes("/v1/text-to-speech/")) {
        const body: unknown = JSON.parse(String(init?.body));
        expect(body).toMatchObject({ model_id: "eleven_v4" });
        return new Response(
          new Uint8Array([73, 68, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
          {
            headers: { "Content-Type": "audio/mpeg" },
          },
        );
      }
      if (url.includes("api.sarvam.ai/speech-to-text")) {
        expect(new Headers(init?.headers).get("api-subscription-key")).toBe(
          "test-sarvam-key",
        );
        return json({ transcript: "Show parks in Bengaluru." });
      }
      if (url.includes("api.sarvam.ai/text-to-speech")) {
        const body: unknown = JSON.parse(String(init?.body));
        expect(body).toMatchObject({ model: "bulbul:v4-flash" });
        return json({
          audios: [
            btoa(String.fromCharCode(73, 68, 51, 0, 0, 0, 0, 0, 0, 0, 0, 0)),
          ],
        });
      }
      throw new Error(`Unmocked network: ${new URL(url).hostname}`);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
function post(body: unknown, cookie?: string, overrides: Partial<Env> = {}) {
  return app.request(
    "/api/location/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        question: "Nearest hospital to MG Road, Bengaluru",
        ...Object(body),
      }),
    },
    { ...env, ...overrides },
  );
}
describe("public search contract", () => {
  it("health is local readiness without provider calls", async () => {
    expect((await app.request("/api/health", {}, env)).status).toBe(200);
    expect(fetched).toEqual([]);
  });
  it("returns real normalized sorted deduplicated evidence and medical notice", async () => {
    const response = await post({});
    expect(response.status).toBe(200);
    const data = responseSchema.parse(await response.json());
    expect(data.status).toBe("ready");
    if (data.status !== "ready") throw new Error("Expected ready");
    expect(data.places.map((p) => p.id)).toEqual(["node/1", "node/2"]);
    expect(data.places.map((p) => p.rank)).toEqual([1, 2]);
    expect(data.places[0].openingHours).toBeNull();
    expect(data.safetyNotice).toContain("emergency");
    expect(data.places[0].distanceLabel).toContain("straight-line");
    expect(data.aiMode).toBe("rule_based");
    expect(JSON.stringify(data)).not.toContain("test-map-key");
    expect(JSON.stringify(data)).not.toContain("test-server-key");
  });
  it("refines a category without geocoding the confirmed area again", async () => {
    const first = await post({});
    const data = responseSchema.parse(await first.json());
    const cookie = first.headers.get("set-cookie")!.split(";")[0];
    if (data.status !== "ready") throw new Error("Expected ready");
    fetched = [];
    const second = await post(
      { question: "cafes instead", contextToken: data.contextToken },
      cookie,
    );
    expect(responseSchema.parse(await second.json()).status).toBe("ready");
    expect(fetched.some((url) => url.includes("/v1/geocode/search"))).toBe(
      false,
    );
  });
  it("asks for ambiguous locations and accepts only a signed choice from the same session", async () => {
    ambiguous = true;
    const first = await post({ question: "Parks in Springfield" });
    const data = responseSchema.parse(await first.json());
    if (data.status !== "needs_clarification")
      throw new Error("Expected clarification");
    expect(data.status).toBe("needs_clarification");
    expect(data.choices).toHaveLength(2);
    const cookie = first.headers.get("set-cookie")!.split(";")[0];
    fetched = [];
    const chosen = await post(
      { question: "Parks in Springfield", choiceToken: data.choices[0].token },
      cookie,
    );
    expect(responseSchema.parse(await chosen.json()).status).toBe("ready");
    expect((await post({ choiceToken: data.choices[0].token })).status).toBe(
      400,
    );
  });
  it("does not guess a city without device permission", async () => {
    const response = await post({ question: "nearest hospital" });
    expect(responseSchema.parse(await response.json()).status).toBe(
      "needs_clarification",
    );
    expect(fetched.some((url) => url.includes("geoapify"))).toBe(false);
  });
  it("uses explicitly shared GPS without saving it or calling geocoding", async () => {
    const response = await post({
      question: "parks near me",
      deviceLocation: { lat: 12.9756, lon: 77.6066 },
    });
    expect(responseSchema.parse(await response.json()).status).toBe("ready");
    expect(fetched.some((url) => url.includes("geocode"))).toBe(false);
  });
  it("reports honest empty results", async () => {
    empty = true;
    const response = await post({});
    expect(responseSchema.parse(await response.json()).status).toBe(
      "no_results",
    );
  });
  it.each([429, 500, 503])(
    "handles provider HTTP %s safely",
    async (status) => {
      mapStatus = status;
      const response = await post({});
      expect(response.status).toBe(status === 429 ? 429 : 502);
      const text = await response.text();
      expect(text).not.toContain("test-map-key");
      expect(text).not.toContain("api.geoapify.com");
    },
  );
  it("enforces quota before map calls", async () => {
    budget = false;
    expect((await post({})).status).toBe(429);
    expect(fetched.some((url) => url.includes("geoapify"))).toBe(false);
  });
  it("fails closed if Supabase cannot verify the allowance", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("database credentials private")),
    );
    const response = await post({});
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("credentials");
  });
  it("kill switch prevents every outgoing call", async () => {
    expect(
      (await post({}, undefined, { DISABLE_EXTERNAL_PROVIDERS: "true" }))
        .status,
    ).toBe(503);
    expect(fetched).toEqual([]);
  });
  it("validates before provider calls", async () => {
    expect((await post({ question: "" })).status).toBe(400);
    expect((await post({ question: "x".repeat(17000) })).status).toBe(413);
    expect((await post({ deviceLocation: { lat: 100, lon: 0 } })).status).toBe(
      400,
    );
    expect(fetched).toEqual([]);
  });
  it("rejects cross-origin writes", async () => {
    const response = await app.request(
      "/api/location/search",
      {
        method: "POST",
        headers: {
          Origin: "https://attacker.invalid",
          "Content-Type": "application/json",
        },
        body: "{}",
      },
      env,
    );
    expect(response.status).toBe(403);
    expect(fetched).toEqual([]);
  });
  it("accepts only the configured Vercel origin through the Cloudflare proxy", async () => {
    const send = (origin: string) =>
      app.request(
        "https://geozity-api.example.workers.dev/api/location/search",
        {
          method: "POST",
          headers: {
            Origin: origin,
            "Content-Type": "application/json",
            "Sec-Fetch-Site": "same-origin",
          },
          body: JSON.stringify({
            requestId: crypto.randomUUID(),
            question: "Parks in Bengaluru",
          }),
        },
        { ...env, FRONTEND_ORIGIN: "https://geozity-globe.vercel.app" },
      );
    expect(
      (await send("https://geozity-globe.vercel.app.attacker.invalid")).status,
    ).toBe(403);
    expect(fetched).toEqual([]);
    const response = await send("https://geozity-globe.vercel.app");
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("Secure");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Strict");
    expect(response.headers.get("set-cookie")).not.toContain("Domain=");
  });
  it("explains unsupported requests without map calls", async () => {
    const response = await post({ question: "Book a flight to Paris" });
    const data = responseSchema.parse(await response.json());
    expect(data.status).toBe("failed");
    if (data.status === "failed")
      expect(data.errorCode).toBe("UNSUPPORTED_CATEGORY");
    expect(fetched.some((url) => url.includes("geoapify"))).toBe(false);
  });
  it("uses complete parsed searches directly without letting AI reject them", async () => {
    const response = await post({ question: "Parks in Bengaluru" }, undefined, {
      ENABLE_AI: "true",
      SARVAM_API_KEY: "test-sarvam-key",
      AI_MODEL: "sarvam-105b-conversations",
      DAILY_AI_CALL_LIMIT: "10",
    });
    expect(await response.json()).toMatchObject({
      status: "ready",
      aiMode: "rule_based",
    });
    expect(fetched.some((url) => url.includes("sarvam.ai"))).toBe(false);
  });
});
describe("ElevenLabs server-only adapters", () => {
  const voiceEnv: Env = {
    ...env,
    ENABLE_VOICE: "true",
    ELEVENLABS_API_KEY: "test-eleven-key",
    ELEVENLABS_VOICE_ID: "test-voice",
    DAILY_VOICE_SECONDS_LIMIT: "100",
    DAILY_SPEECH_CHAR_LIMIT: "1000",
  };
  it("validates WAV duration then returns an editable transcript", async () => {
    const response = await app.request(
      "/api/voice/transcribe",
      {
        method: "POST",
        headers: { "Content-Type": "audio/wav" },
        body: encodeWav(new Float32Array(16000)),
      },
      voiceEnv,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "Parks in Bengaluru" });
  });
  it("rejects malformed uploads without calling ElevenLabs", async () => {
    expect(
      (
        await app.request(
          "/api/voice/transcribe",
          {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: new ArrayBuffer(50),
          },
          voiceEnv,
        )
      ).status,
    ).toBe(400);
    expect(fetched).toEqual([]);
  });
  it("voice is opt-in and disabled without configuration", async () => {
    expect(
      (
        await app.request(
          "/api/voice/transcribe",
          {
            method: "POST",
            headers: { "Content-Type": "audio/wav" },
            body: encodeWav(new Float32Array(16000)),
          },
          env,
        )
      ).status,
    ).toBe(503);
    expect(fetched).toEqual([]);
  });
  it("reserves speech characters and returns uncached audio", async () => {
    const response = await app.request(
      "/api/voice/speak",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Found parks in Bengaluru." }),
      },
      voiceEnv,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("prevents unlimited text-to-speech payloads", async () => {
    const response = await app.request(
      "/api/voice/speak",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "a".repeat(501) }),
      },
      voiceEnv,
    );
    expect(response.status).toBe(400);
    expect(fetched).toEqual([]);
  });
});

describe("explicit voice-provider routing", () => {
  const voiceEnv: Env = {
    ...env,
    ENABLE_VOICE: "true",
    ELEVENLABS_API_KEY: "test-eleven-key",
    SARVAM_API_KEY: "test-sarvam-key",
    DAILY_VOICE_SECONDS_LIMIT: "100",
    DAILY_SPEECH_CHAR_LIMIT: "1000",
  };
  it("routes Indian speech only to Sarvam and returns an editable English transcript", async () => {
    const response = await app.request(
      "/api/voice/transcribe",
      {
        method: "POST",
        headers: { "Content-Type": "audio/wav", "X-Voice-Provider": "sarvam" },
        body: encodeWav(new Float32Array(16000)),
      },
      voiceEnv,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "Show parks in Bengaluru." });
    expect(fetched.some((url) => url.includes("elevenlabs"))).toBe(false);
  });
  it("generates speech with the selected Sarvam provider", async () => {
    const response = await app.request(
      "/api/voice/speak",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "Parks in Bengaluru.",
          provider: "sarvam",
        }),
      },
      voiceEnv,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(fetched.some((url) => url.includes("elevenlabs"))).toBe(false);
  });
  it("rejects unknown providers before billing or upload", async () => {
    expect(
      (
        await app.request(
          "/api/voice/transcribe",
          {
            method: "POST",
            headers: {
              "Content-Type": "audio/wav",
              "X-Voice-Provider": "arbitrary",
            },
            body: encodeWav(new Float32Array(16000)),
          },
          voiceEnv,
        )
      ).status,
    ).toBe(400);
    expect(fetched).toEqual([]);
  });
  it("does not silently forward recordings to another service when a key is missing", async () => {
    expect(
      (
        await app.request(
          "/api/voice/transcribe",
          {
            method: "POST",
            headers: {
              "Content-Type": "audio/wav",
              "X-Voice-Provider": "sarvam",
            },
            body: encodeWav(new Float32Array(16000)),
          },
          { ...voiceEnv, SARVAM_API_KEY: undefined },
        )
      ).status,
    ).toBe(503);
    expect(fetched).toEqual([]);
  });
  it("exposes provider availability without credential values", async () => {
    const response = await app.request("/api/config", {}, voiceEnv);
    const data: unknown = await response.json();
    expect(data).toMatchObject({
      voiceProviders: ["elevenlabs", "sarvam"],
      voiceEnabled: true,
      speechEnabled: true,
    });
    expect(JSON.stringify(data)).not.toContain("test-eleven-key");
    expect(JSON.stringify(data)).not.toContain("test-sarvam-key");
  });
  it.each([403, 429])(
    "reports provider HTTP %s safely without retries or forwarding to the other service",
    async (status) => {
      let voiceCalls = 0;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL) => {
          const url = String(input);
          if (url.includes("/rpc/")) return json(true);
          expect(url).toContain("api.sarvam.ai");
          voiceCalls += 1;
          return json(
            { error: { message: "private-provider-payload-test-sarvam-key" } },
            status,
          );
        }),
      );
      const response = await app.request(
        "/api/voice/transcribe",
        {
          method: "POST",
          headers: {
            "Content-Type": "audio/wav",
            "X-Voice-Provider": "sarvam",
          },
          body: encodeWav(new Float32Array(16000)),
        },
        voiceEnv,
      );
      expect(response.status).toBe(status === 429 ? 429 : 502);
      expect(await response.text()).not.toContain("private-provider-payload");
      expect(voiceCalls).toBe(1);
    },
  );
});
