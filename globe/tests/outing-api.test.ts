import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { app } from "../src/server/app";
import { outingResponseSchema, type OutingInput } from "../src/domain/outing";
import type { Env } from "../src/server/config";
const env: Env = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SECRET_KEY: "sb_secret_fixture",
  SESSION_HMAC_SECRET: "fixture-signing-secret-".repeat(3),
  GEOAPIFY_API_KEY: "fixture-map",
  DAILY_MAP_CALL_LIMIT: "200",
};
const input: OutingInput = {
  area: "Bengaluru",
  occasion: "Friends",
  localStart: "2026-11-21T14:00",
  timezone: "Asia/Kolkata",
  groupSize: 2,
  transport: "walk",
  durationMinutes: 300,
  budget: null,
  requirements: [],
  preferences: "",
  stops: [
    { category: "cafe", dwellMinutes: 30 },
    { category: "park", dwellMinutes: 30 },
    { category: "restaurant", dwellMinutes: 30 },
  ],
};
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
let cookie = "",
  routeCalls = 0,
  empty = false,
  routeMissing = false,
  budget = true;
beforeEach(() => {
  cookie = "";
  routeCalls = 0;
  empty = false;
  routeMissing = false;
  budget = true;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (raw: string | URL) => {
      const url = new URL(String(raw));
      if (url.pathname.includes("/rpc/")) return json(budget);
      if (url.pathname === "/v1/geocode/search")
        return json({
          features: [
            {
              properties: {
                lat: 12.97,
                lon: 77.59,
                formatted: "Bengaluru, India",
                city: "Bengaluru",
                timezone: { name: "Asia/Kolkata" },
              },
            },
          ],
        });
      if (url.pathname === "/v2/places") {
        const category = url.searchParams.get("categories")!.split(",")[0];
        const offset = category.includes("cafe")
          ? 100
          : category.includes("park")
            ? 200
            : 300;
        return json({
          features: empty
            ? []
            : Array.from({ length: 3 }, (_, i) => ({
                properties: {
                  lat: 12.97 + i * 0.001,
                  lon: 77.59,
                  name: `Fixture ${category} ${i}`,
                  formatted: "Fixture address",
                  categories: [category],
                  datasource: {
                    raw: {
                      osm_type: "n",
                      osm_id: offset + i,
                      opening_hours: "24/7",
                    },
                  },
                },
              })),
        });
      }
      if (url.pathname === "/v1/routing") {
        routeCalls++;
        expect(url.searchParams.get("mode")).toBe("walk");
        expect(url.searchParams.get("waypoints")).toMatch(/^12\.97,77\.59/);
        const length = url.searchParams.get("waypoints")!.split("|").length - 1;
        return json({
          features: routeMissing
            ? []
            : [
                {
                  properties: {
                    legs: Array.from({ length }, () => ({
                      time: 300,
                      distance: 500,
                    })),
                  },
                },
              ],
        });
      }
      throw new Error("Unexpected fixture request");
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());
async function post(path: string, body: object, sessionCookie = cookie) {
  const response = await app.request(
    `/api/outing/${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      },
      body: JSON.stringify({ requestId: crypto.randomUUID(), ...body }),
    },
    env,
  );
  cookie = response.headers.get("set-cookie")?.split(";")[0] || cookie;
  return {
    http: response.status,
    data: outingResponseSchema.parse(await response.json()),
  };
}
it("creates, replaces and removes real fixture stops without changing unaffected evidence", async () => {
  const created = await post("create", { input });
  expect(created.http).toBe(200);
  if (created.data.status !== "ready") throw new Error("Expected draft");
  const original = created.data.plan;
  const changed = await post("edit", {
    planToken: created.data.planToken,
    stopId: original.stops[0].id,
    action: "replace",
  });
  if (changed.data.status !== "ready") throw new Error("Expected replacement");
  expect(changed.data.plan.stops[0].id).toBe(original.stops[0].id);
  expect(changed.data.plan.stops[0].place.id).not.toBe(
    original.stops[0].place.id,
  );
  expect(changed.data.plan.stops[1].place).toEqual(original.stops[1].place);
  const removed = await post("edit", {
    planToken: changed.data.planToken,
    stopId: original.stops[0].id,
    action: "remove",
  });
  if (removed.data.status !== "ready") throw new Error("Expected removal");
  expect(removed.data.plan.stops.map((s) => s.id)).toEqual(
    original.stops.slice(1).map((s) => s.id),
  );
  expect(removed.data.plan.legs).toHaveLength(1);
  expect(routeCalls).toBe(3);
});
it("rejects a forged plan token and cross-session edits", async () => {
  const created = await post("create", { input });
  if (created.data.status !== "ready") throw new Error("Expected draft");
  const body = {
    planToken: created.data.planToken,
    stopId: created.data.plan.stops[0].id,
    action: "replace",
  };
  expect((await post("edit", body, "")).http).toBe(400);
  expect(
    (await post("edit", { ...body, planToken: body.planToken + "x" })).http,
  ).toBe(400);
  expect(routeCalls).toBe(1);
});
it("explains sparse data rather than inventing a venue", async () => {
  empty = true;
  expect((await post("create", { input })).data.status).toBe("infeasible");
  expect(routeCalls).toBe(0);
});
it("keeps unavailable routes and later arrivals visibly unverified", async () => {
  routeMissing = true;
  const result = await post("create", { input });
  if (result.data.status !== "ready") throw new Error("Expected flagged draft");
  expect(result.data.plan.legs.every((l) => !l.verified)).toBe(true);
  expect(result.data.plan.stops[1].arrival).toBeNull();
});
it("rejects unknown hard budget before place and routing requests", async () => {
  const result = await post("create", {
    input: {
      ...input,
      budget: { amount: 1500, currency: "INR", strength: "must" },
    },
  });
  expect(result.data.status).toBe("infeasible");
  expect(routeCalls).toBe(0);
});
it("does not bypass quota protection for planning", async () => {
  budget = false;
  expect((await post("create", { input })).http).toBe(429);
  expect(routeCalls).toBe(0);
});

it("expires signed evidence without rerouting or extending its lifetime", async () => {
  const created = await post("create", { input });
  if (created.data.status !== "ready") throw new Error("Expected draft");
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 31 * 60000);
  const result = await post("edit", {
    planToken: created.data.planToken,
    stopId: created.data.plan.stops[0].id,
    action: "replace",
  });
  expect(result.http).toBe(400);
  expect(result.data.status).toBe("failed");
  if (result.data.status === "failed")
    expect(result.data.errorCode).toBe("INVALID_CONTEXT");
  expect(routeCalls).toBe(1);
});
