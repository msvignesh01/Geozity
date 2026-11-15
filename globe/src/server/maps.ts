import { z } from "zod";
import {
  distanceMeters,
  type Category,
  type Location,
  type Place,
  pointSchema,
} from "../domain/contracts";
import { type Env, PublicError } from "./config";
import { reserve } from "./budget";
import { upstream, jsonBody } from "./http";

export const providerCategories: Record<Category, string[]> = {
  hospital: ["healthcare.hospital"],
  park: ["leisure.park"],
  cafe: ["catering.cafe"],
  restaurant: ["catering.restaurant", "catering.fast_food"],
  pharmacy: ["healthcare.pharmacy"],
  museum: ["entertainment.museum", "entertainment.culture.gallery"],
  attraction: ["tourism.attraction", "tourism.sights"],
  library: ["education.library"],
  supermarket: ["commercial.supermarket"],
};
const properties = pointSchema
  .extend({
    name: z.string().nullish(),
    formatted: z.string().nullish(),
    city: z.string().nullish(),
    state: z.string().nullish(),
    country: z.string().nullish(),
    result_type: z.string().nullish(),
    categories: z.array(z.string()).nullish(),
    datasource: z
      .object({ raw: z.record(z.string(), z.unknown()).nullish() })
      .nullish(),
  })
  .passthrough();
const featuresSchema = z.object({
  features: z.array(z.object({ properties })).max(20),
});
async function features(
  env: Env,
  client: string,
  path: string,
  params: Record<string, string>,
) {
  if (!env.GEOAPIFY_API_KEY)
    throw new PublicError(
      "NOT_CONFIGURED",
      "Map search is being set up. Please try again once it is ready.",
    );
  await reserve(env, client, "map");
  const url = new URL(`https://api.geoapify.com${path}`);
  for (const [key, value] of Object.entries({
    ...params,
    apiKey: env.GEOAPIFY_API_KEY,
  }))
    url.searchParams.set(key, value);
  const parsed = featuresSchema.safeParse(
    await jsonBody(
      await upstream(url.toString(), {}, 6000, env.requestDeadline),
    ),
  );
  if (!parsed.success) {
    console.warn(
      JSON.stringify({
        event: "map_contract_invalid",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path,
          code: issue.code,
        })),
      }),
    );
    throw new PublicError(
      "INVALID_PROVIDER_DATA",
      "The map service returned unusable places. Please try another area.",
      502,
    );
  }
  return parsed.data.features.map((f) => f.properties);
}
export async function geocode(
  env: Env,
  client: string,
  text: string,
): Promise<Location[]> {
  const records = await features(env, client, "/v1/geocode/search", {
    text,
    limit: "5",
    lang: "en",
  });
  const locations = records
    .filter(
      (p) =>
        p.formatted?.trim() &&
        !["state", "country", "continent"].includes(p.result_type ?? ""),
    )
    .map((p) => ({
      lat: p.lat,
      lon: p.lon,
      label: p.formatted!.slice(0, 1000),
      city: `${p.city ?? p.formatted}|${p.state ?? ""}|${p.country ?? ""}`,
    }));
  const byCity = new Map<string, (typeof locations)[number]>();
  for (const location of locations)
    if (!byCity.has(location.city)) byCity.set(location.city, location);
  const distinct = [...byCity.values()];
  // A shared city name across regions needs a human choice, never a guessed first hit.
  return distinct
    .slice(0, 5)
    .map(({ lat, lon, label }) => ({ lat, lon, label }));
}
function text(raw: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys)
    if (typeof raw[key] === "string" && raw[key].trim())
      return raw[key].slice(0, 1000);
  return null;
}
export async function places(
  env: Env,
  client: string,
  category: Category,
  location: Location,
  radius: number,
): Promise<Place[]> {
  const filters = providerCategories[category];
  const records = await features(env, client, "/v2/places", {
    categories: filters.join(","),
    filter: `circle:${location.lon},${location.lat},${radius}`,
    bias: `proximity:${location.lon},${location.lat}`,
    limit: "20",
    lang: "en",
  });
  const collected: (Place & {
    wikipedia: string | null;
    wikidata: string | null;
  })[] = [];
  const retrievedAt = new Date().toISOString();
  for (const record of records) {
    const raw = record.datasource?.raw;
    if (
      !raw ||
      !record.categories?.some((c) =>
        filters.some((f) => c === f || c.startsWith(`${f}.`)),
      )
    )
      continue;
    const osmType =
      raw.osm_type === "n"
        ? "node"
        : raw.osm_type === "w"
          ? "way"
          : raw.osm_type === "r"
            ? "relation"
            : null;
    const osmId = raw.osm_id;
    if (!osmType || !/^[1-9]\d*$/.test(String(osmId))) continue;
    const distance = distanceMeters(location, record);
    if (distance > radius) continue;
    collected.push({
      id: `${osmType}/${osmId}`,
      rank: 1,
      name: record.name?.trim().slice(0, 300) || `Unnamed ${category}`,
      lat: record.lat,
      lon: record.lon,
      category,
      distanceMeters: distance,
      distanceLabel: `Approx. ${(distance / 1000).toFixed(1)} km straight-line from ${location.label}`,
      address: record.formatted?.slice(0, 1000) ?? null,
      openingHours: text(raw, "opening_hours"),
      osmUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
      retrievedAt,
      wikiSummary: null,
      wikiUrl: null,
      wikipedia: text(raw, "wikipedia"),
      wikidata: text(raw, "wikidata"),
    });
  }
  if (records.length && !collected.length)
    throw new PublicError(
      "INVALID_PROVIDER_DATA",
      "The provider returned no usable records for this category. Try another area.",
      502,
    );
  const ranked = [...new Map(collected.map((p) => [p.id, p])).values()]
    .sort(
      (a, b) => a.distanceMeters - b.distanceMeters || a.id.localeCompare(b.id),
    )
    .slice(0, 10);
  await Promise.all(
    ranked.slice(0, 3).map(async (place) => {
      const article = await knowledge(
        place.wikipedia,
        place.wikidata,
        env.requestDeadline,
      );
      if (article) {
        place.wikiSummary = article.summary;
        place.wikiUrl = article.url;
      }
    }),
  );
  return ranked.map(
    ({ wikipedia: _wikipedia, wikidata: _wikidata, ...place }, i) => ({
      ...place,
      rank: i + 1,
    }),
  );
}
const wikiSchema = z.object({
  type: z.string().optional(),
  extract: z.string().min(1),
});
async function knowledge(
  wikipedia: string | null,
  wikidata: string | null,
  deadline?: number,
): Promise<{ summary: string; url: string } | null> {
  try {
    let language = "en",
      title = "";
    const match = wikipedia
      ? /^([a-z]{2,3}(?:-[a-z0-9]+)*):(.+)$/u.exec(wikipedia)
      : null;
    if (match) {
      language = match[1];
      title = match[2];
    } else if (wikidata && /^Q[1-9]\d*$/u.test(wikidata)) {
      const data = z
        .object({
          entities: z.record(
            z.string(),
            z.object({
              sitelinks: z
                .object({ enwiki: z.object({ title: z.string() }).optional() })
                .optional(),
            }),
          ),
        })
        .safeParse(
          await jsonBody(
            await upstream(
              `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidata}&props=sitelinks&sitefilter=enwiki&format=json`,
              {},
              2000,
              deadline,
            ),
          ),
        );
      if (data.success)
        title = data.data.entities[wikidata]?.sitelinks?.enwiki?.title ?? "";
    }
    if (!title) return null;
    const article = wikiSchema.safeParse(
      await jsonBody(
        await upstream(
          `https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          {},
          2000,
          deadline,
        ),
      ),
    );
    if (!article.success || article.data.type === "disambiguation") return null;
    return {
      summary: article.data.extract.slice(0, 350),
      url: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    console.warn(JSON.stringify({ event: "optional_knowledge_unavailable" }));
    return null;
  }
}
