import { z } from "zod";
import { locationSchema } from "../domain/contracts";
import {
  constraintIssues,
  localToInstant,
  outingInputSchema,
  schedulePlan,
  slotSchema,
  timezoneSchema,
  type OutingResponse,
  type Slot,
} from "../domain/outing";
import { geocode, planningPlaces } from "./maps";
import { routeLegs } from "./routes";
import { type Env, PublicError } from "./config";
import { sign, verify } from "./security";
import { reserve } from "./budget";

const createSchema = z
  .object({
    requestId: z.string().uuid(),
    input: outingInputSchema,
    choiceToken: z.string().max(4000).nullable().default(null),
  })
  .strict();
const editSchema = z
  .object({
    requestId: z.string().uuid(),
    planToken: z.string().max(100000),
    stopId: z.string().uuid(),
    action: z.enum(["replace", "remove"]),
  })
  .strict();
const locationChoiceSchema = z.object({
  scope: z.literal("outing-location"),
  session: z.string(),
  expires: z.number(),
  area: z.string(),
  location: locationSchema.extend({ timezone: timezoneSchema.optional() }),
});
const snapshotSchema = z.object({
  scope: z.literal("outing"),
  session: z.string(),
  expires: z.number(),
  revision: z.number().int().positive(),
  input: outingInputSchema,
  location: locationSchema,
  slots: z.array(slotSchema).min(2).max(5),
});

async function finish(
  env: Env,
  client: string,
  snapshot: z.infer<typeof snapshotSchema>,
  requestId: string,
): Promise<OutingResponse> {
  const chosen = snapshot.slots.map((s) => ({
    ...s.candidates[s.selected],
    id: s.id,
  }));
  const legs = await routeLegs(env, client, chosen, snapshot.input.transport);
  const plan = schedulePlan(
    snapshot.input,
    snapshot.location,
    snapshot.slots,
    legs,
    snapshot.revision,
  );
  const planToken = await sign(env.SESSION_HMAC_SECRET!, snapshot);
  if (planToken.length > 100000)
    throw new PublicError(
      "PLAN_TOO_LARGE",
      "This draft has too much detail. Please try fewer stops.",
      400,
      false,
    );
  return { status: "ready", requestId, plan, planToken };
}
export async function createOuting(
  env: Env,
  client: string,
  session: string,
  body: unknown,
): Promise<OutingResponse> {
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    throw new PublicError(
      "INVALID_INPUT",
      "Complete the outing details together: area, occasion, local time and timezone, group, transport and two to five stops.",
      400,
      false,
    );
  const { requestId, input, choiceToken } = parsed.data;
  const start = localToInstant(input.localStart, input.timezone);
  if (start === null)
    return {
      status: "needs_clarification",
      requestId,
      question:
        "That local time is invalid or repeats during a clock change. Choose another start time.",
      choices: [],
    };
  await reserve(env, client, "requests");
  let location: z.infer<typeof locationChoiceSchema>["location"];
  if (choiceToken) {
    const choice = locationChoiceSchema.safeParse(
      await verify(env.SESSION_HMAC_SECRET!, choiceToken),
    );
    if (
      !choice.success ||
      choice.data.session !== session ||
      choice.data.area !== input.area ||
      choice.data.expires < Date.now()
    )
      throw new PublicError(
        "INVALID_CONTEXT",
        "Choose the outing area again.",
        400,
        false,
      );
    location = choice.data.location;
  } else {
    const choices = await geocode(env, client, input.area, true);
    if (choices.length !== 1)
      return {
        status: "needs_clarification",
        requestId,
        question: choices.length
          ? "Which area is this outing in?"
          : "Enter a more specific city or neighborhood.",
        choices: await Promise.all(
          choices.map(async (location) => ({
            label: location.label,
            token: await sign(env.SESSION_HMAC_SECRET!, {
              scope: "outing-location",
              session,
              expires: Date.now() + 1800000,
              area: input.area,
              location,
            }),
          })),
        ),
      };
    location = choices[0];
  }
  if (location.timezone) {
    // IANA aliases such as Asia/Calcutta and Asia/Kolkata identify the same zone.
    const canonical = (zone: string) =>
      new Intl.DateTimeFormat("en", { timeZone: zone }).resolvedOptions()
        .timeZone;
    if (canonical(location.timezone) !== canonical(input.timezone))
      return {
        status: "needs_clarification",
        requestId,
        question: `The map provider lists ${location.timezone} for this area. Update the timezone and check the local start time.`,
        choices: [],
      };
  }
  if (input.budget?.strength === "must")
    return {
      status: "infeasible",
      requestId,
      message:
        "This hard budget cannot be verified: the map records do not provide reliable admission, meal and transport totals. Confirm prices with the venues, or change the budget to a preference.",
    };
  const categories = [...new Set(input.stops.map((s) => s.category))];
  // At most five bounded POI requests; run together within the shared request deadline.
  const groups = await Promise.all(
    categories.map(async (category) => ({
      category,
      candidates: await planningPlaces(env, client, category, location),
    })),
  );
  const selected = new Set<string>();
  const slots: Slot[] = [];
  for (const stop of input.stops) {
    const candidates = groups
      .find((g) => g.category === stop.category)!
      .candidates.filter((p) => !constraintIssues(p, input, "must").length)
      .sort(
        (a, b) =>
          constraintIssues(a, input, "prefer").length -
            constraintIssues(b, input, "prefer").length ||
          a.distanceMeters - b.distanceMeters,
      );
    const first = candidates.find((p) => !selected.has(p.id));
    if (!first)
      return {
        status: "infeasible",
        requestId,
        message: `No distinct ${stop.category} with evidence for your hard requirements was returned within 5 km. Try another area, fewer stops or contact venues to verify the requirements.`,
      };
    selected.add(first.id);
    slots.push({
      id: crypto.randomUUID(),
      ...stop,
      candidates: [
        first,
        ...candidates.filter((p) => p.id !== first.id).slice(0, 2),
      ],
      selected: 0,
    });
  }
  return finish(
    env,
    client,
    {
      scope: "outing",
      session,
      expires: Date.now() + 1800000,
      revision: 1,
      input,
      location,
      slots,
    },
    requestId,
  );
}
export async function editOuting(
  env: Env,
  client: string,
  session: string,
  body: unknown,
): Promise<OutingResponse> {
  const parsed = editSchema.safeParse(body);
  if (!parsed.success)
    throw new PublicError(
      "INVALID_INPUT",
      "Choose a stop to replace or remove.",
      400,
      false,
    );
  const { requestId, planToken, stopId, action } = parsed.data;
  const parsedSnapshot = snapshotSchema.safeParse(
    await verify(env.SESSION_HMAC_SECRET!, planToken),
  );
  if (
    !parsedSnapshot.success ||
    parsedSnapshot.data.session !== session ||
    parsedSnapshot.data.expires < Date.now()
  )
    throw new PublicError(
      "INVALID_CONTEXT",
      "This outing draft expired. Build a fresh plan.",
      400,
      false,
    );
  await reserve(env, client, "requests");
  const snapshot = parsedSnapshot.data;
  const slot = snapshot.slots.find((s) => s.id === stopId);
  if (!slot)
    throw new PublicError(
      "INVALID_INPUT",
      "This stop is no longer in the draft.",
      400,
      false,
    );
  if (action === "remove") {
    if (snapshot.slots.length <= 2)
      return {
        status: "infeasible",
        requestId,
        message:
          "An outing needs at least two stops. Keep these stops or build a shorter request.",
      };
    snapshot.slots = snapshot.slots.filter((s) => s.id !== stopId);
    snapshot.input = {
      ...snapshot.input,
      stops: snapshot.slots.map(({ category, dwellMinutes }) => ({
        category,
        dwellMinutes,
      })),
    };
  } else {
    const used = new Set(
      snapshot.slots
        .filter((s) => s.id !== stopId)
        .map((s) => s.candidates[s.selected].id),
    );
    const next = slot.candidates.findIndex(
      (p, i) => i !== slot.selected && !used.has(p.id),
    );
    if (next < 0)
      return {
        status: "infeasible",
        requestId,
        message:
          "No unused verified alternative remains for this stop. Try another area or change the request.",
      };
    slot.selected = next;
  }
  snapshot.revision += 1;
  // Keep the original expiry: repeated edits must not extend provider evidence indefinitely.
  return finish(env, client, snapshot, requestId);
}
