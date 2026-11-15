import { type Category, categorySchema } from "./contracts";

const aliases: Record<Category, string[]> = {
  hospital: ["hospital", "hospitals", "emergency room", "medical center"],
  park: ["park", "parks", "garden", "gardens"],
  cafe: ["cafe", "cafes", "café", "cafés", "coffee", "coffee shops"],
  restaurant: [
    "restaurant",
    "restaurants",
    "dinner",
    "lunch",
    "places to eat",
    "food",
  ],
  pharmacy: ["pharmacy", "pharmacies", "chemist", "medical store"],
  museum: ["museum", "museums", "art gallery", "galleries"],
  attraction: [
    "attraction",
    "attractions",
    "landmark",
    "landmarks",
    "monument",
    "monuments",
    "sights",
  ],
  library: ["library", "libraries"],
  supermarket: ["supermarket", "supermarkets", "groceries", "grocery"],
};
export interface Intent {
  category: Category | null;
  locationText: string | null;
  nearMe: boolean;
  unsupported: boolean;
}
export function parseIntent(
  question: string,
  previous?: Category,
  awaitingLocation = false,
): Intent {
  const text = question.normalize("NFKC").trim();
  const lower = text.toLocaleLowerCase();
  const matches = Object.entries(aliases)
    .flatMap(([category, words]) =>
      words.flatMap((word) => {
        const match = new RegExp(
          `(?:^|[^\\p{L}])(${word})(?=$|[^\\p{L}])`,
          "iu",
        ).exec(lower);
        return match
          ? [
              {
                category: categorySchema.parse(category),
                index: match.index,
                length: word.length,
              },
            ]
          : [];
      }),
    )
    .sort((a, b) => a.index - b.index || b.length - a.length);
  let category = matches[0]?.category ?? null;
  const nearMe =
    /\b(?:near me|near here|nearby|around me|my location|current location)\b/iu.test(
      text,
    );
  const locationMatch = /\b(?:in|near|around|at|to)\s+(.+?)[?!.]*$/iu.exec(
    text.replace(/places to eat/giu, "restaurants"),
  );
  let locationText = locationMatch?.[1]?.trim().replace(/[?!.]+$/, "") || null;
  if (
    /^(switch|change) to\b/iu.test(text) ||
    (locationText &&
      /^(me|here|my location|current location)$/iu.test(locationText))
  )
    locationText = null;
  if (!category && previous && awaitingLocation && !nearMe && !locationText) {
    category = previous;
    locationText = text;
  }
  if (!category && previous && locationText) category = previous;
  const unsupported =
    /\b(book|flight|hotel|weather|stock|reservation|open now|wheelchair|allergy|cheapest|itinerary|budget|plan an? outing|plan a trip)\b|(?:under|below)\s*[₹$£€]/iu.test(
      text,
    );
  return {
    category,
    locationText,
    nearMe: nearMe && !locationText,
    unsupported,
  };
}
