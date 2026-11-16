import { z } from "zod";

export const categorySchema = z.enum([
  "hospital",
  "park",
  "cafe",
  "restaurant",
  "pharmacy",
  "museum",
  "attraction",
  "library",
  "supermarket",
]);
export type Category = z.infer<typeof categorySchema>;
export const labels: Record<Category, string> = {
  hospital: "hospitals",
  park: "parks",
  cafe: "cafes",
  restaurant: "restaurants",
  pharmacy: "pharmacies",
  museum: "museums",
  attraction: "attractions",
  library: "libraries",
  supermarket: "supermarkets",
};
export const pointSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
});
export const locationSchema = pointSchema.extend({
  label: z.string().min(1).max(1000),
});
export type Location = z.infer<typeof locationSchema>;
export const requestSchema = z
  .object({
    requestId: z.string().uuid(),
    question: z.string().trim().min(1).max(500),
    deviceLocation: pointSchema.nullable().default(null),
    contextToken: z.string().max(5000).nullable().default(null),
    choiceToken: z.string().max(5000).nullable().default(null),
    radiusMeters: z
      .union([
        z.literal(1000),
        z.literal(3000),
        z.literal(5000),
        z.literal(10000),
      ])
      .default(5000),
  })
  .strict();
export type SearchRequest = z.infer<typeof requestSchema>;
export const placeSchema = pointSchema.extend({
  id: z.string().min(1),
  rank: z.number().int().min(1).max(10),
  name: z.string().min(1),
  category: categorySchema,
  address: z.string().nullable(),
  openingHours: z.string().nullable(),
  distanceMeters: z.number().finite().nonnegative(),
  distanceLabel: z.string(),
  osmUrl: z
    .url()
    .refine(
      (value) =>
        new URL(value).protocol === "https:" &&
        new URL(value).hostname === "www.openstreetmap.org",
    ),
  wikiSummary: z.string().nullable(),
  wikiUrl: z
    .url()
    .refine(
      (value) =>
        new URL(value).protocol === "https:" &&
        /^[a-z]{2,3}(?:-[a-z0-9]+)*\.wikipedia\.org$/.test(
          new URL(value).hostname,
        ),
    )
    .nullable(),
  retrievedAt: z.iso.datetime(),
});
export type Place = z.infer<typeof placeSchema>;
export const responseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    requestId: z.string(),
    summary: z.string(),
    aiMode: z.enum(["ai_verified", "rule_based"]),
    safetyNotice: z.string().nullable(),
    resolvedLocation: locationSchema,
    contextToken: z.string(),
    places: z.array(placeSchema).min(1).max(10),
    cached: z.boolean(),
  }),
  z.object({
    status: z.literal("needs_clarification"),
    requestId: z.string(),
    question: z.string(),
    choices: z.array(z.object({ label: z.string(), token: z.string() })).max(5),
    contextToken: z.string().nullable(),
  }),
  z.object({
    status: z.literal("no_results"),
    requestId: z.string(),
    summary: z.string(),
    resolvedLocation: locationSchema,
    contextToken: z.string(),
    radiusMeters: z.number(),
  }),
  z.object({
    status: z.literal("failed"),
    requestId: z.string(),
    message: z.string(),
    errorCode: z.string(),
    retryable: z.boolean(),
  }),
]);
export type SearchResponse = z.infer<typeof responseSchema>;
export const medicalNotice =
  "Results come from map providers and may be incomplete. For a medical emergency, contact local emergency services immediately.";

export function distanceMeters(
  a: Location | z.infer<typeof pointSchema>,
  b: z.infer<typeof pointSchema>,
): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
