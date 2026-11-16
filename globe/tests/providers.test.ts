import { afterEach, describe, expect, it, vi } from "vitest";
import { geocode, places } from "../src/server/maps";
import { interpret } from "../src/server/ai";
import { responseSchema } from "../src/domain/contracts";
import type { Env } from "../src/server/config";
import { reserve } from "../src/server/budget";
import { generateIntent } from "../src/server/intent-provider";
import { upstream } from "../src/server/http";

const env: Env = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-key",
  SESSION_HMAC_SECRET: "s".repeat(40),
  GEOAPIFY_API_KEY: "test-map-key",
  DAILY_MAP_CALL_LIMIT: "200",
  DAILY_AI_CALL_LIMIT: "10",
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function network(data: unknown, budget = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) =>
      String(input).includes("/rpc/") ? json(budget) : json(data),
    ),
  );
}
describe("provider boundary regressions", () => {
  it("enriches tagged results beyond the first three without exceeding three article lookups", async () => {
    const articles: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/rpc/")) return json(true);
        if (url.includes("wikipedia.org")) {
          articles.push(url);
          expect(new Headers(init?.headers).get("User-Agent")).toContain(
            "https://geozity-globe.vercel.app",
          );
          return json({
            type: "standard",
            extract: "A sourced public park summary.",
          });
        }
        return json({
          features: Array.from({ length: 8 }, (_, i) => ({
            properties: {
              lat: 12.97 + i * 0.001,
              lon: 77.59,
              name: `Park ${i + 1}`,
              categories: ["leisure.park"],
              datasource: {
                raw: {
                  osm_type: "n",
                  osm_id: i + 1,
                  ...(i >= 3 ? { wikipedia: `en:Park_${i + 1}` } : {}),
                },
              },
            },
          })),
        });
      }),
    );
    const found = await places(
      env,
      "client",
      "park",
      { lat: 12.97, lon: 77.59, label: "Test area" },
      5000,
    );
    expect(found[3].wikiSummary).toBe("A sourced public park summary.");
    expect(found[0].wikiSummary).toBeNull();
    expect(articles).toHaveLength(3);
  });
  it("asks for a more specific area instead of searching the middle of a state", async () => {
    network({
      features: [
        {
          properties: {
            lat: 43.156,
            lon: -75.845,
            formatted: "New York, USA",
            result_type: "state",
          },
        },
      ],
    });
    expect(await geocode(env, "client", "New York")).toEqual([]);
  });
  it("rejects redirects without forwarding the server key to another host", async () => {
    const outgoing = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      if (init?.redirect === "error")
        throw new TypeError("Unsupported redirect mode");
      expect(init?.redirect).toBe("manual");
      return new Response(null, {
        status: 302,
        headers: { Location: "https://untrusted.invalid" },
      });
    });
    vi.stubGlobal("fetch", outgoing);
    await expect(
      upstream("https://project.supabase.co/rest/v1/rpc/test", {
        headers: { apikey: "test-server-key" },
      }),
    ).rejects.toThrow();
    expect(outgoing).toHaveBeenCalledTimes(1);
  });
  it("uses modern Supabase server keys as API keys, not invalid bearer tokens", async () => {
    const outgoing = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({ apikey: "sb_secret_test_only" });
      expect(init?.redirect).toBe("manual");
      expect(new Headers(init?.headers).get("User-Agent")).toBe(
        "Geozity-Server/1.0",
      );
      expect(init?.headers).not.toHaveProperty("Authorization");
      return json(true);
    });
    vi.stubGlobal("fetch", outgoing);
    await reserve(
      { ...env, SUPABASE_SECRET_KEY: "sb_secret_test_only" },
      "a".repeat(43),
      "map",
    );
    expect(outgoing).toHaveBeenCalledTimes(1);
  });
  it("keeps legacy service-role authentication working", async () => {
    const outgoing = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      expect(init?.headers).toMatchObject({
        apikey: "test-key",
        Authorization: "Bearer test-key",
      });
      return json(true);
    });
    vi.stubGlobal("fetch", outgoing);
    await reserve(env, "a".repeat(43), "map");
    expect(outgoing).toHaveBeenCalledTimes(1);
  });
  it("does not merge equal city names in different states", async () => {
    network({
      features: [
        {
          properties: {
            lat: 39.78,
            lon: -89.65,
            formatted: "Springfield, Illinois, USA",
            city: "Springfield",
            state: "Illinois",
            country: "USA",
            name: null,
          },
        },
        {
          properties: {
            lat: 42.1,
            lon: -72.59,
            formatted: "Springfield, Massachusetts, USA",
            city: "Springfield",
            state: "Massachusetts",
            country: "USA",
            name: null,
          },
        },
      ],
    });
    expect(await geocode(env, "client", "Springfield")).toHaveLength(2);
  });
  it("keeps the provider’s first-ranked location when several hits identify the same city", async () => {
    network({
      features: [
        {
          properties: {
            lat: 12.97,
            lon: 77.59,
            formatted: "MG Road, Bengaluru",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
          },
        },
        {
          properties: {
            lat: 12.9,
            lon: 77.5,
            formatted: "Another MG Road, Bengaluru",
            city: "Bengaluru",
            state: "Karnataka",
            country: "India",
          },
        },
      ],
    });
    expect((await geocode(env, "client", "MG Road, Bengaluru"))[0].lat).toBe(
      12.97,
    );
  });
  it("rejects invalid coordinates and unreadable provider responses", async () => {
    network({
      features: [{ properties: { lat: 100, lon: 20, formatted: "Invalid" } }],
    });
    await expect(geocode(env, "client", "test")).rejects.toThrow("unusable");
    network({ features: "invalid" });
    await expect(geocode(env, "client", "test")).rejects.toThrow("unusable");
  });
  it("handles null optional fields honestly without losing actual results", async () => {
    network({
      features: [
        {
          properties: {
            lat: 12.97,
            lon: 77.59,
            name: null,
            formatted: null,
            city: null,
            state: null,
            country: null,
            categories: ["leisure.park"],
            datasource: { raw: { osm_type: "n", osm_id: 1 } },
          },
        },
      ],
    });
    const results = await places(
      env,
      "client",
      "park",
      { lat: 12.97, lon: 77.59, label: "Bengaluru" },
      5000,
    );
    expect(results[0]).toMatchObject({
      name: "Unnamed park",
      openingHours: null,
      address: null,
    });
  });
  it("rejects executable result links at the browser contract", () => {
    expect(
      responseSchema.safeParse({
        status: "ready",
        places: [{ osmUrl: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });
});
describe("bounded AI interpretation", () => {
  it("calls Sarvam directly with the tested model and never retries a rejected call", async () => {
    const outgoing = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("api-subscription-key")).toBe(
          "test-sarvam-key",
        );
        expect(JSON.parse(String(init?.body))).toMatchObject({
          model: "sarvam-105b-conversations",
          max_tokens: 512,
          stream: false,
        });
        return json({ error: { message: "Test provider rejection" } }, 403);
      },
    );
    vi.stubGlobal("fetch", outgoing);
    await expect(
      generateIntent(
        {
          ...env,
          SARVAM_API_KEY: "test-sarvam-key",
          AI_MODEL: "sarvam-105b-conversations",
        },
        "Parks in Bengaluru",
      ),
    ).rejects.toThrow();
    expect(outgoing).toHaveBeenCalledTimes(1);
  });
  const configured = {
    ...env,
    ENABLE_AI: "true",
    AI_MODEL: "configured-test-model",
    SARVAM_API_KEY: "test-sarvam-key",
  };
  const fallback = {
    category: "park" as const,
    locationText: "Bengaluru",
    nearMe: false,
    unsupported: false,
  };
  it("validates model intent and never accepts coordinates or tool arguments", async () => {
    network(true);
    const generate = vi.fn(async () =>
      JSON.stringify({
        category: "cafe",
        locationText: "London",
        nearMe: false,
        unsupported: false,
      }),
    );
    const result = await interpret(
      configured,
      "client",
      "Parks in Bengaluru",
      fallback,
      generate,
    );
    expect(result).toMatchObject({
      mode: "ai_verified",
      intent: { category: "park", locationText: "Bengaluru" },
    });
    generate.mockResolvedValue(
      JSON.stringify({ ...fallback, lat: 0, tool: "delete" }),
    );
    expect(
      (
        await interpret(
          configured,
          "client",
          "Parks in Bengaluru",
          fallback,
          generate,
        )
      ).mode,
    ).toBe("rule_based");
  });
  it("falls back on AI failure without pretending AI ran successfully", async () => {
    network(true);
    const generate = vi.fn(async (): Promise<string> => {
      throw new Error("private upstream detail");
    });
    expect(
      await interpret(
        configured,
        "client",
        "Parks in Bengaluru",
        fallback,
        generate,
      ),
    ).toEqual({ mode: "rule_based", intent: fallback });
  });
  it("does not call the model if the allowance is exhausted or AI is disabled", async () => {
    network(null, false);
    const generate = vi.fn(async () => "{}");
    expect(
      (
        await interpret(
          configured,
          "client",
          "Parks in Bengaluru",
          fallback,
          generate,
        )
      ).mode,
    ).toBe("rule_based");
    expect(
      (await interpret(env, "client", "Parks in Bengaluru", fallback, generate))
        .mode,
    ).toBe("rule_based");
    expect(generate).not.toHaveBeenCalled();
  });
});
