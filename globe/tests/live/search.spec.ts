import { afterAll, beforeAll, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { createServer, type Server } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { app } from "../../src/server/app";
import type { Env } from "../../src/server/config";
import { responseSchema } from "../../src/domain/contracts";

// Explicit opt-in suite: real Geoapify calls and an ephemeral PostgreSQL database.
// The HTTP bridge exercises our Supabase REST contract; it does not verify hosted Supabase.
const db = new PGlite();
let server: Server;
let env: Env;
const evidence: { question: string; status: string; count: number }[] = [];
beforeAll(async () => {
  const root = parseEnv(
    await readFile(new URL("../../../.env.local", import.meta.url), "utf8"),
  );
  if (!root.GEOAPIFY_API_KEY)
    throw new Error("Live verification requires the root GEOAPIFY_API_KEY.");
  await db.exec(
    "create role anon; create role authenticated; create role service_role;",
  );
  await db.exec(
    await readFile(
      new URL(
        "../../supabase/migrations/202611140001_usage.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  server = createServer(async (request, response) => {
    try {
      if (
        request.url !== "/rest/v1/rpc/geozity_reserve_usage" ||
        request.headers.authorization !== "Bearer local-verification"
      ) {
        response.writeHead(403).end();
        return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      const data = JSON.parse(Buffer.concat(chunks).toString());
      const result = await db.query<{ allowed: boolean }>(
        "select public.geozity_reserve_usage($1,$2,$3,$4,$5) as allowed",
        [
          data.p_meter,
          data.p_units,
          data.p_global_limit,
          data.p_client_limit,
          data.p_client_hash,
        ],
      );
      response
        .writeHead(200, { "Content-Type": "application/json" })
        .end(JSON.stringify(result.rows[0].allowed));
    } catch {
      response.writeHead(500).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No local database bridge");
  env = {
    SUPABASE_URL: `http://127.0.0.1:${address.port}`,
    SUPABASE_SERVICE_ROLE_KEY: "local-verification",
    SESSION_HMAC_SECRET: "local-verification-secret-".repeat(2),
    DAILY_MAP_CALL_LIMIT: "200",
    GEOAPIFY_API_KEY: root.GEOAPIFY_API_KEY,
    ENABLE_AI: "false",
  };
});
afterAll(async () => {
  if (server)
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  await db.close();
  const report = new URL(
    "../../../.deployment/globe-live-runs.json",
    import.meta.url,
  );
  await mkdir(new URL("../../../.deployment/", import.meta.url), {
    recursive: true,
  });
  const previous: unknown = JSON.parse(
    await readFile(report, "utf8").catch(() => "[]"),
  );
  if (!Array.isArray(previous))
    throw new Error("Unexpected live verification history");
  previous.push({
    at: new Date().toISOString(),
    hostedSupabaseVerified: false,
    realGeoapify: true,
    evidence,
  });
  await writeFile(report, JSON.stringify(previous, null, 2));
});
it.each([
  "Parks in Bengaluru",
  "Nearest hospital to MG Road, Bengaluru",
  "Museums in London",
  "Pharmacies near Shinjuku, Tokyo",
  "Restaurants near Marina Beach, Chennai",
  "Parks in New York",
])("real provider search: %s", async (question) => {
  const request = { requestId: crypto.randomUUID(), question };
  const response = await app.request(
    "/api/location/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    env,
  );
  let result = responseSchema.parse(await response.json());
  if (result.status === "needs_clarification" && result.choices.length) {
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    const first = result.choices[0];
    const selected = await app.request(
      "/api/location/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie || "" },
        body: JSON.stringify({ ...request, choiceToken: first.token }),
      },
      env,
    );
    result = responseSchema.parse(await selected.json());
  }
  evidence.push({
    question,
    status: result.status,
    count: result.status === "ready" ? result.places.length : 0,
  });
  expect(result.status).toBe("ready");
  if (result.status !== "ready")
    throw new Error(`Live search state: ${result.status}`);
  expect(result.places.length).toBeGreaterThan(0);
  expect(new Set(result.places.map((place) => place.id)).size).toBe(
    result.places.length,
  );
  result.places.forEach((place, index) => {
    expect(place.rank).toBe(index + 1);
    expect(place.distanceMeters).toBeLessThanOrEqual(5000);
    if (index)
      expect(place.distanceMeters).toBeGreaterThanOrEqual(
        result.status === "ready" ? result.places[index - 1].distanceMeters : 0,
      );
  });
});
