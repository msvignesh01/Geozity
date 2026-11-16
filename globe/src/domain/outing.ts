import { z } from "zod";
import { categorySchema, locationSchema, placeSchema } from "./contracts";

export const outingCategorySchema = categorySchema.exclude([
  "hospital",
  "pharmacy",
]);
export const strengthSchema = z.enum(["must", "prefer"]);
export const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((zone) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: zone });
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid city timezone, such as Asia/Kolkata.");
export const outingInputSchema = z
  .object({
    area: z.string().trim().min(2).max(250),
    occasion: z.string().trim().min(1).max(160),
    localStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    timezone: timezoneSchema,
    groupSize: z.number().int().min(1).max(20),
    transport: z.enum(["walk", "bicycle", "drive"]),
    durationMinutes: z.number().int().min(30).max(720),
    budget: z
      .object({
        amount: z.number().finite().nonnegative().max(1000000),
        currency: z.string().regex(/^[A-Z]{3}$/),
        strength: strengthSchema,
      })
      .strict()
      .nullable(),
    requirements: z
      .array(
        z
          .object({
            kind: z.enum(["wheelchair", "vegetarian", "vegan", "allergy"]),
            strength: strengthSchema,
          })
          .strict(),
      )
      .max(4),
    preferences: z.string().trim().max(250),
    stops: z
      .array(
        z
          .object({
            category: outingCategorySchema,
            dwellMinutes: z.number().int().min(10).max(240),
          })
          .strict(),
      )
      .min(2)
      .max(5),
  })
  .strict();
export type OutingInput = z.infer<typeof outingInputSchema>;
export const evidenceSchema = z.object({
  wheelchair: z.enum(["yes", "no", "unknown"]),
  vegetarian: z.enum(["yes", "no", "unknown"]),
  vegan: z.enum(["yes", "no", "unknown"]),
});
export const candidateSchema = placeSchema.extend({ evidence: evidenceSchema });
export type Candidate = z.infer<typeof candidateSchema>;
export const slotSchema = z.object({
  id: z.string().uuid(),
  category: outingCategorySchema,
  dwellMinutes: z.number().int().min(10).max(240),
  candidates: z.array(candidateSchema).min(1).max(3),
  selected: z.number().int().min(0).max(2),
});
export type Slot = z.infer<typeof slotSchema>;
export const routeLegSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  mode: z.enum(["walk", "bicycle", "drive"]),
  seconds: z.number().finite().nonnegative().max(86400).nullable(),
  meters: z.number().finite().nonnegative().max(500000).nullable(),
  verified: z.boolean(),
  retrievedAt: z.iso.datetime(),
});
export type RouteLeg = z.infer<typeof routeLegSchema>;
export const planSchema = z.object({
  revision: z.number().int().positive(),
  location: locationSchema,
  input: outingInputSchema,
  stops: z
    .array(
      z.object({
        id: z.string().uuid(),
        place: candidateSchema,
        dwellMinutes: z.number(),
        arrival: z.iso.datetime().nullable(),
        departure: z.iso.datetime().nullable(),
        hours: z.enum(["open", "closed", "unknown"]),
        reason: z.string(),
        warnings: z.array(z.string()),
        alternatives: z.number(),
      }),
    )
    .min(2)
    .max(5),
  legs: z.array(routeLegSchema).min(1).max(4),
  status: z.enum(["checked", "needs_confirmation", "infeasible"]),
  warnings: z.array(z.string()),
  summary: z.string(),
});
export type OutingPlan = z.infer<typeof planSchema>;
export const outingResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    requestId: z.string(),
    plan: planSchema,
    planToken: z.string().max(100000),
  }),
  z.object({
    status: z.literal("needs_clarification"),
    requestId: z.string(),
    question: z.string(),
    choices: z.array(z.object({ label: z.string(), token: z.string() })),
  }),
  z.object({
    status: z.literal("infeasible"),
    requestId: z.string(),
    message: z.string(),
  }),
  z.object({
    status: z.literal("failed"),
    requestId: z.string(),
    message: z.string(),
    errorCode: z.string(),
    retryable: z.boolean(),
  }),
]);
export type OutingResponse = z.infer<typeof outingResponseSchema>;

const timezoneFormatters = new Map<string, Intl.DateTimeFormat>();
function localParts(instant: number, timezone: string) {
  let formatter = timezoneFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    // Cache formatting rules only, never dates, plans or user data. Bound Worker isolate memory.
    if (timezoneFormatters.size >= 16)
      timezoneFormatters.delete(timezoneFormatters.keys().next().value!);
    timezoneFormatters.set(timezone, formatter);
  }
  const p = formatter.formatToParts(instant);
  const n = (type: Intl.DateTimeFormatPartTypes) =>
    Number(p.find((v) => v.type === type)?.value);
  return [n("year"), n("month"), n("day"), n("hour"), n("minute"), n("second")];
}
function wallUtc(parts: number[]) {
  return Date.UTC(
    parts[0],
    parts[1] - 1,
    parts[2],
    parts[3],
    parts[4],
    parts[5] ?? 0,
  );
}
export function localToInstant(local: string, timezone: string): number | null {
  const parts = local.split(/[-T:]/).map(Number);
  const wall = wallUtc(parts);
  // Collect surrounding offsets. DST gaps have zero matches; repeated clock times have two.
  const offsets = new Set(
    [-36, -12, 0, 12, 36].map((h) => {
      const sample = wall + h * 3600000;
      return wallUtc(localParts(sample, timezone)) - sample;
    }),
  );
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) =>
      localParts(instant, timezone)
        .slice(0, 5)
        .every((v, i) => v === parts[i]),
    );
  return matches.length === 1 ? matches[0] : null;
}

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
type Window = { days: number[]; start: number; end: number };
function parseHours(hours: string): Window[] | null {
  // OSM's ordered rule overrides need a full grammar; leave compound rules unverified.
  if (hours.includes(";")) return null;
  if (hours === "24/7")
    return [{ days: [0, 1, 2, 3, 4, 5, 6], start: 0, end: 1440 }];
  const result: Window[] = [];
  for (const rule of hours.split(";")) {
    const match =
      /^\s*(?:(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?\s+)?((?:\d{1,2}:\d{2}-\d{1,2}:\d{2})(?:\s*,\s*\d{1,2}:\d{2}-\d{1,2}:\d{2})*|off)\s*$/.exec(
        rule,
      );
    if (!match) return null; // Holidays, seasons and conditional syntax stay explicitly unknown.
    let days = [0, 1, 2, 3, 4, 5, 6];
    if (match[1]) {
      days = [];
      const end = weekdays.indexOf(match[2] || match[1]);
      for (
        let d = weekdays.indexOf(match[1]), i = 0;
        i < 7;
        i++, d = (d + 1) % 7
      ) {
        days.push(d);
        if (d === end) break;
      }
    }
    if (match[3] === "off") {
      // Ordered overrides, such as Mo-Su 09:00-18:00; Su off.
      for (const window of result)
        window.days = window.days.filter((d) => !days.includes(d));
      continue;
    }
    for (const range of match[3].split(",")) {
      const [sh, sm, eh, em] = range.trim().split(/[:-]/).map(Number);
      if (sh > 23 || eh > 24 || sm > 59 || em > 59 || (eh === 24 && em !== 0))
        return null;
      const start = sh * 60 + sm;
      let end = eh * 60 + em;
      if (end <= start) end += 1440;
      result.push({ days: [...days], start, end });
    }
  }
  return result;
}
export function hoursAt(
  hours: string | null,
  start: number | null,
  end: number | null,
  timezone: string,
): "open" | "closed" | "unknown" {
  if (!hours || start === null || end === null) return "unknown";
  const windows = parseHours(hours);
  if (!windows) return "unknown";
  // Sample wall-clock minutes and the final instant, including sub-minute closing crossings.
  for (
    let instant = start;
    instant < end;
    instant = instant === end - 1 ? end : Math.min(end - 1, instant + 60000)
  ) {
    const p = localParts(instant, timezone),
      day = new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(),
      minute = p[3] * 60 + p[4] + p[5] / 60;
    if (
      !windows.some(
        (w) =>
          (w.days.includes(day) && minute >= w.start && minute < w.end) ||
          (w.days.includes((day + 6) % 7) &&
            minute + 1440 >= w.start &&
            minute + 1440 < w.end),
      )
    )
      return "closed";
  }
  return "open";
}
export function constraintIssues(
  candidate: Candidate,
  input: OutingInput,
  strength: "must" | "prefer",
) {
  return input.requirements
    .filter((r) => r.strength === strength)
    .flatMap((r) => {
      const food =
        candidate.category === "restaurant" || candidate.category === "cafe";
      if (r.kind !== "wheelchair" && !food) return [];
      const supported =
        r.kind !== "allergy" && candidate.evidence[r.kind] === "yes";
      return supported
        ? []
        : [
            `${r.kind === "allergy" ? "Allergy safety" : r.kind} is ${r.kind !== "allergy" && candidate.evidence[r.kind] === "no" ? "not supported" : "unverified"} for ${candidate.name}.`,
          ];
    });
}

export function schedulePlan(
  input: OutingInput,
  location: OutingPlan["location"],
  slots: Slot[],
  legs: RouteLeg[],
  revision = 1,
): OutingPlan {
  let arrival = localToInstant(input.localStart, input.timezone);
  const warnings = [
    "Costs, group availability and reservations are unverified. Confirm with each venue before travelling.",
  ];
  if (input.budget)
    warnings.push(
      `No verified total is available for your ${input.budget.currency} ${input.budget.amount} ${input.budget.strength === "must" ? "hard limit" : "budget preference"}.`,
    );
  if (input.preferences)
    warnings.push(
      "Atmosphere and other free-text preferences need your review; category matches do not prove suitability.",
    );
  let infeasible = input.budget?.strength === "must";
  if (input.requirements.some((r) => r.kind === "wheelchair")) {
    warnings.push(
      "Venue wheelchair tags do not verify the accessibility of the route. Confirm the journey separately.",
    );
    if (
      input.requirements.some(
        (r) => r.kind === "wheelchair" && r.strength === "must",
      )
    )
      infeasible = true;
  }
  const start = arrival;
  const stops = slots.map((slot, i) => {
    const place = slot.candidates[slot.selected];
    const leg = i ? legs[i - 1] : null;
    if (i)
      arrival =
        arrival !== null && leg?.verified && leg.seconds !== null
          ? arrival + leg.seconds * 1000
          : null;
    const departure =
      arrival === null ? null : arrival + slot.dwellMinutes * 60000;
    const hours = hoursAt(
      place.openingHours,
      arrival,
      departure,
      input.timezone,
    );
    const issues = constraintIssues(place, input, "must");
    if (hours === "closed" || issues.length) infeasible = true;
    const stopWarnings = [
      ...issues,
      ...constraintIssues(place, input, "prefer"),
    ];
    if (hours === "unknown")
      stopWarnings.push(
        "Opening at the intended arrival is unverified. Contact the venue.",
      );
    if (hours === "closed")
      stopWarnings.push(
        "Listed hours do not cover this visit. Replace this stop or change the time.",
      );
    const result = {
      id: slot.id,
      place,
      dwellMinutes: slot.dwellMinutes,
      arrival: arrival === null ? null : new Date(arrival).toISOString(),
      departure: departure === null ? null : new Date(departure).toISOString(),
      hours,
      reason: `Matches your requested ${slot.category} stop; selected from retrieved map records.`,
      warnings: stopWarnings,
      alternatives: slot.candidates.filter((p) => p.id !== place.id).length,
    };
    arrival = departure;
    return result;
  });
  if (start === null) {
    infeasible = true;
    warnings.push(
      "The start time is invalid or repeats during a clock change. Choose another local time.",
    );
  }
  if (
    start !== null &&
    arrival !== null &&
    arrival - start > input.durationMinutes * 60000
  ) {
    infeasible = true;
    warnings.push(
      "Travel and visits exceed your available time. Shorten a visit, remove a stop or allow more time.",
    );
  }
  if (legs.some((l) => !l.verified))
    warnings.push(
      "At least one route is unavailable. Later arrival times cannot be verified.",
    );
  const status = infeasible
    ? "infeasible"
    : stops.some((s) => s.hours === "unknown") || legs.some((l) => !l.verified)
      ? "needs_confirmation"
      : "checked";
  return {
    revision,
    location,
    input,
    stops,
    legs,
    status,
    warnings,
    summary: `${stops.length} real stops near ${location.label}. ${status === "infeasible" ? "This draft does not meet all constraints." : status === "needs_confirmation" ? "Confirm the flagged details before going." : "Routes and listed opening windows checked; costs and availability still need confirmation."}`,
  };
}
