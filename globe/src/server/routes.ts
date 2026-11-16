import { z } from "zod";
import { pointSchema } from "../domain/contracts";
import type { OutingInput, RouteLeg } from "../domain/outing";
import { reserve } from "./budget";
import { type Env, PublicError } from "./config";
import { jsonBody, upstream } from "./http";

const routeSchema = z.object({
  features: z
    .array(
      z.object({
        properties: z.object({
          legs: z
            .array(
              z.object({
                time: z.number().finite().nonnegative().max(86400),
                distance: z.number().finite().nonnegative().max(500000),
              }),
            )
            .min(1)
            .max(4),
        }),
      }),
    )
    .max(1),
});

// Geoapify's routing boundary uses latitude,longitude; map GeoJSON uses the opposite order.
// https://apidocs.geoapify.com/docs/routing/ — mode, stopover legs, seconds/meters, credits.
export async function routeLegs(
  env: Env,
  client: string,
  points: (z.infer<typeof pointSchema> & { id: string })[],
  mode: OutingInput["transport"],
): Promise<RouteLeg[]> {
  const at = new Date().toISOString();
  const base = points.slice(1).map((p, i) => ({
    fromId: points[i].id,
    toId: p.id,
    mode,
    seconds: null,
    meters: null,
    verified: false,
    retrievedAt: at,
  }));
  if (!env.GEOAPIFY_API_KEY)
    throw new PublicError("NOT_CONFIGURED", "Routing is being set up.");
  // A routing call costs one baseline credit per leg. Reserve conservatively for bounded local detours.
  await reserve(env, client, "map", points.length - 1 + 2);
  const url = new URL("https://api.geoapify.com/v1/routing");
  for (const [key, value] of Object.entries({
    waypoints: points.map((p) => `${p.lat},${p.lon}`).join("|"),
    mode,
    intermediate_waypoint_mode: "stopover",
    units: "metric",
    apiKey: env.GEOAPIFY_API_KEY,
  }))
    url.searchParams.set(key, value);
  try {
    const parsed = routeSchema.safeParse(
      await jsonBody(
        await upstream(url.toString(), {}, 6000, env.requestDeadline),
      ),
    );
    if (
      !parsed.success ||
      parsed.data.features.length !== 1 ||
      parsed.data.features[0].properties.legs.length !== base.length
    )
      return base;
    return parsed.data.features[0].properties.legs.map((leg, i) => ({
      ...base[i],
      verified: true,
      seconds: leg.time,
      meters: leg.distance,
    }));
  } catch (error) {
    if (
      error instanceof PublicError &&
      ["QUOTA_REACHED", "SEARCH_PAUSED", "BUDGET_UNAVAILABLE"].includes(
        error.code,
      )
    )
      throw error;
    return base;
  }
}
