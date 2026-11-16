import { afterEach, expect, it, vi } from "vitest";
import { routeLegs } from "../src/server/routes";
import type { Env } from "../src/server/config";
const env: Env = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_fixture",
  SESSION_HMAC_SECRET: "s".repeat(40),
  GEOAPIFY_API_KEY: "fixture-map",
  DAILY_MAP_CALL_LIMIT: "200",
};
const points = [
  { id: "first", lat: 12.97, lon: 77.59 },
  { id: "second", lat: 12.98, lon: 77.6 },
];
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => vi.unstubAllGlobals());
it.each(["walk", "bicycle", "drive"] as const)(
  "uses explicit %s mode and provider seconds/meters without geodesic estimates",
  async (mode) => {
    const outgoing = vi.fn(async (raw: string | URL, init?: RequestInit) => {
      const url = new URL(String(raw));
      if (url.pathname.includes("/rpc/")) {
        expect(JSON.parse(String(init?.body)).p_units).toBe(3);
        return json(true);
      }
      expect(url.hostname).toBe("api.geoapify.com");
      expect(url.searchParams.get("mode")).toBe(mode);
      expect(url.searchParams.get("waypoints")).toBe("12.97,77.59|12.98,77.6");
      expect(init?.redirect).toBe("manual");
      return json({
        features: [{ properties: { legs: [{ time: 321, distance: 789 }] } }],
      });
    });
    vi.stubGlobal("fetch", outgoing);
    const result = await routeLegs(env, "fixture", points, mode);
    expect(result[0]).toMatchObject({
      fromId: "first",
      toId: "second",
      seconds: 321,
      meters: 789,
      mode,
      verified: true,
    });
    expect(outgoing).toHaveBeenCalledTimes(2);
  },
);
it.each([
  { features: [] },
  { features: [{ properties: { legs: [] } }] },
  { features: [{ properties: { legs: [{ time: -1, distance: 20 }] } }] },
  { features: [{ properties: { legs: [{ time: NaN, distance: 20 }] } }] },
])("rejects malformed or missing route evidence", async (data) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (raw: string | URL) =>
      String(raw).includes("/rpc/") ? json(true) : json(data),
    ),
  );
  expect((await routeLegs(env, "fixture", points, "walk"))[0]).toMatchObject({
    verified: false,
    seconds: null,
    meters: null,
  });
});
it("reports a timeout as unverified without retrying or inventing travel", async () => {
  const outgoing = vi.fn(async (raw: string | URL) => {
    if (String(raw).includes("/rpc/")) return json(true);
    throw new DOMException("Fixture timeout", "TimeoutError");
  });
  vi.stubGlobal("fetch", outgoing);
  expect((await routeLegs(env, "fixture", points, "walk"))[0].verified).toBe(
    false,
  );
  expect(outgoing).toHaveBeenCalledTimes(2);
});
it("fails closed before routing if its reservation is rejected", async () => {
  const outgoing = vi.fn(async () => json(false));
  vi.stubGlobal("fetch", outgoing);
  await expect(routeLegs(env, "fixture", points, "walk")).rejects.toMatchObject(
    { code: "QUOTA_REACHED" },
  );
  expect(outgoing).toHaveBeenCalledTimes(1);
});
