import { describe, expect, it } from "vitest";
import {
  constraintIssues,
  hoursAt,
  localToInstant,
  outingInputSchema,
  schedulePlan,
  type Candidate,
  type OutingInput,
  type RouteLeg,
  type Slot,
} from "../src/domain/outing";

export const input: OutingInput = {
  area: "Bengaluru",
  occasion: "Friends afternoon",
  localStart: "2026-11-21T14:00",
  timezone: "Asia/Kolkata",
  groupSize: 2,
  transport: "walk",
  durationMinutes: 240,
  budget: null,
  requirements: [],
  preferences: "",
  stops: [
    { category: "cafe", dwellMinutes: 45 },
    { category: "park", dwellMinutes: 45 },
  ],
};
const location = { label: "Bengaluru", lat: 12.97, lon: 77.59 };
const candidate: Candidate = {
  id: "node/1",
  rank: 1,
  name: "Fixture cafe",
  category: "cafe",
  ...location,
  address: null,
  openingHours: "24/7",
  distanceMeters: 100,
  distanceLabel: "Approx. straight-line",
  osmUrl: "https://www.openstreetmap.org/node/1",
  wikiSummary: null,
  wikiUrl: null,
  retrievedAt: "2026-11-16T00:00:00Z",
  evidence: { wheelchair: "unknown", vegetarian: "unknown", vegan: "unknown" },
};
export const slots: Slot[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    category: "cafe",
    dwellMinutes: 45,
    candidates: [candidate],
    selected: 0,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    category: "park",
    dwellMinutes: 45,
    candidates: [
      { ...candidate, id: "node/2", name: "Fixture park", category: "park" },
    ],
    selected: 0,
  },
];
const legs: RouteLeg[] = [
  {
    fromId: slots[0].id,
    toId: slots[1].id,
    mode: "walk",
    seconds: 600,
    meters: 600,
    verified: true,
    retrievedAt: candidate.retrievedAt,
  },
];
const plan = (changes: Partial<OutingInput> = {}) =>
  schedulePlan({ ...input, ...changes }, location, slots, legs);
const at = (local: string, zone = input.timezone) =>
  localToInstant(local, zone)!;
describe("outing acceptance scenarios", () => {
  it("detects a closing time crossed in a partial final minute", () => {
    const start = at("2026-11-21T17:59") + 30000;
    expect(hoursAt("09:00-18:00", start, start + 40000, input.timezone)).toBe(
      "closed",
    );
  });
  it("does not infer route accessibility from a venue tag", () => {
    expect(
      plan({ requirements: [{ kind: "wheelchair", strength: "must" }] }).status,
    ).toBe("infeasible");
  });
  it("01 schedules real candidate evidence with dwell and verified travel", () => {
    const p = plan();
    expect(p.status).toBe("checked");
    expect(p.stops[1].arrival).toBe("2026-11-21T09:25:00.000Z");
    expect(p.stops[0].place.id).toBe("node/1");
  });
  it("02 rejects late-night closure", () =>
    expect(
      hoursAt(
        "09:00-18:00",
        at("2026-11-21T23:00"),
        at("2026-11-21T23:45"),
        input.timezone,
      ),
    ).toBe("closed"));
  it("03 supports overnight windows across local midnight", () =>
    expect(
      hoursAt(
        "Fr 20:00-02:00",
        at("2026-11-21T00:30"),
        at("2026-11-21T01:30"),
        input.timezone,
      ),
    ).toBe("open"));
  it("04 converts Tokyo across the UTC date boundary", () =>
    expect(new Date(at("2026-11-21T00:30", "Asia/Tokyo")).toISOString()).toBe(
      "2026-11-20T15:30:00.000Z",
    ));
  it("05 rejects DST spring gaps", () =>
    expect(localToInstant("2026-03-08T02:30", "America/New_York")).toBeNull());
  it("06 rejects DST repeated clock times", () =>
    expect(localToInstant("2026-11-01T01:30", "America/New_York")).toBeNull());
  it("07 rejects impossible calendar dates", () =>
    expect(localToInstant("2026-02-30T12:00", input.timezone)).toBeNull());
  it("08 keeps complex holiday hours unknown", () =>
    expect(
      hoursAt(
        "Mo-Su 09:00-18:00; PH off",
        at(input.localStart),
        at("2026-11-21T15:00"),
        input.timezone,
      ),
    ).toBe("unknown"));
  it("09 does not invent missing hours", () =>
    expect(
      hoursAt(
        null,
        at(input.localStart),
        at("2026-11-21T15:00"),
        input.timezone,
      ),
    ).toBe("unknown"));
  it("10 leaves ordered weekday overrides unverified", () =>
    expect(
      hoursAt(
        "Mo-Su 09:00-18:00; Sa off",
        at(input.localStart),
        at("2026-11-21T15:00"),
        input.timezone,
      ),
    ).toBe("unknown"));
  it("11 rejects hard budget with unknown costs", () =>
    expect(
      plan({ budget: { amount: 1500, currency: "INR", strength: "must" } })
        .status,
    ).toBe("infeasible"));
  it("12 labels soft budget as unknown", () =>
    expect(
      plan({
        budget: { amount: 1500, currency: "INR", strength: "prefer" },
      }).warnings.join(" "),
    ).toContain("No verified total"));
  it("13 unknown wheelchair evidence fails a hard requirement", () =>
    expect(
      constraintIssues(
        candidate,
        { ...input, requirements: [{ kind: "wheelchair", strength: "must" }] },
        "must",
      ),
    ).toHaveLength(1));
  it("14 positive wheelchair tag can support the venue requirement", () =>
    expect(
      constraintIssues(
        {
          ...candidate,
          evidence: { ...candidate.evidence, wheelchair: "yes" },
        },
        { ...input, requirements: [{ kind: "wheelchair", strength: "must" }] },
        "must",
      ),
    ).toHaveLength(0));
  it("15 vegetarian category alone does not verify dietary needs", () =>
    expect(
      constraintIssues(
        candidate,
        { ...input, requirements: [{ kind: "vegetarian", strength: "must" }] },
        "must",
      ),
    ).toHaveLength(1));
  it("16 allergy safety remains unknown even with vegan tags", () =>
    expect(
      constraintIssues(
        { ...candidate, evidence: { ...candidate.evidence, vegan: "yes" } },
        { ...input, requirements: [{ kind: "allergy", strength: "must" }] },
        "must",
      ),
    ).toHaveLength(1));
  it("17 missing route does not fabricate later arrival times", () => {
    const p = schedulePlan(input, location, slots, [
      { ...legs[0], verified: false, seconds: null, meters: null },
    ]);
    expect(p.stops[1].arrival).toBeNull();
    expect(p.status).toBe("needs_confirmation");
  });
  it("18 rejects plans that overrun the available time", () =>
    expect(plan({ durationMinutes: 30 }).status).toBe("infeasible"));
  it("19 rejects sparse one-stop and excessive six-stop requests", () => {
    expect(
      outingInputSchema.safeParse({ ...input, stops: input.stops.slice(0, 1) })
        .success,
    ).toBe(false);
    expect(
      outingInputSchema.safeParse({
        ...input,
        stops: Array(6).fill(input.stops[0]),
      }).success,
    ).toBe(false);
  });
  it("20 edits retain unaffected stop identities and provider evidence", () => {
    const replaced = structuredClone(slots);
    replaced[0].candidates[0] = {
      ...candidate,
      id: "node/3",
      name: "Replacement fixture",
    };
    const p = schedulePlan(input, location, replaced, legs, 2);
    expect(p.revision).toBe(2);
    expect(p.stops[1].id).toBe(slots[1].id);
    expect(p.stops[1].place).toEqual(slots[1].candidates[0]);
    expect(p.stops[0].id).toBe(slots[0].id);
  });
});
