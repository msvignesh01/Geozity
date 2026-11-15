import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

describe("actual PostgreSQL usage protection", () => {
  const db = new PGlite();
  beforeAll(async () => {
    await db.exec(
      "create role anon; create role authenticated; create role service_role;",
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611140001_usage.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  }, 30000);
  afterAll(async () => {
    await db.close();
  });
  async function reserve(
    meter: string,
    units: number,
    global: number,
    client: number,
    hash = "a".repeat(43),
  ) {
    const result = await db.query<{ allowed: boolean }>(
      "select public.geozity_reserve_usage($1,$2,$3,$4,$5) as allowed",
      [meter, units, global, client, hash],
    );
    return result.rows[0].allowed;
  }
  it("never exceeds a shared allowance under competing requests", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        reserve("map", 1, 7, 7, String.fromCharCode(65 + i).repeat(43)),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(7);
    const total = await db.query<{ total: string }>(
      "select sum(units)::text as total from geozity_private.daily_usage where meter='map'",
    );
    expect(total.rows[0].total).toBe("7");
  });
  it("reserves actual units and enforces per-client limits", async () => {
    expect(await reserve("voice_seconds", 29, 100, 30)).toBe(true);
    expect(await reserve("voice_seconds", 2, 100, 30)).toBe(false);
    expect(await reserve("voice_seconds", 1, 100, 30)).toBe(true);
  });
  it("does not expose counters or privileged functions to guests", async () => {
    await db.exec("set role anon");
    await expect(
      db.query("select * from geozity_private.daily_usage"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("select public.geozity_reserve_usage('map',1,10,10,$1)", [
        "a".repeat(43),
      ]),
    ).rejects.toThrow(/permission denied/);
    await db.exec("reset role");
  });
  it("allows only the server role to reserve, validates bounds, and keeps meters separate", async () => {
    await db.exec("set role service_role");
    expect(await reserve("ai", 1, 2, 1)).toBe(true);
    expect(await reserve("ai", 1, 2, 1)).toBe(false);
    await expect(reserve("ai", -1, 2, 1)).rejects.toThrow("Invalid usage");
    await expect(reserve("unknown", 1, 2, 1)).rejects.toThrow("Invalid usage");
    await db.exec("reset role");
  });
});
