import { useEffect, useRef, useState } from "react";
import { labels, type Location, type Place } from "../domain/contracts";
import {
  outingCategorySchema,
  outingInputSchema,
  outingResponseSchema,
  type OutingInput,
  type OutingResponse,
} from "../domain/outing";
import { Voice, apiError } from "./Voice";
import { voiceProviderSchema, type VoiceProvider } from "../domain/voice";

export function OutingPlanner({
  onMap,
  voiceEnabled,
  provider,
  onSpeak,
  stopSpeech,
  speechEnabled,
  voiceProviders,
  onProviderChange,
}: {
  onMap: (places: Place[], location: Location | null) => void;
  voiceEnabled: boolean;
  speechEnabled: boolean;
  provider: VoiceProvider;
  onSpeak: (text: string) => void;
  stopSpeech: () => void;
  voiceProviders: VoiceProvider[];
  onProviderChange: (provider: VoiceProvider) => void;
}) {
  const [input, setInput] = useState<OutingInput>({
    area: "",
    occasion: "A day out",
    localStart: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    groupSize: 2,
    transport: "walk",
    durationMinutes: 240,
    budget: null,
    requirements: [],
    preferences: "",
    stops: [
      { category: "cafe", dwellMinutes: 45 },
      { category: "park", dwellMinutes: 45 },
      { category: "restaurant", dwellMinutes: 60 },
    ],
  });
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<OutingResponse | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const submitted = useRef<OutingInput | null>(null);
  useEffect(
    () => () => {
      active.current?.abort();
    },
    [],
  );
  function patch<K extends keyof OutingInput>(key: K, value: OutingInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }
  async function request(
    path: "create" | "edit",
    body: Record<string, unknown>,
  ) {
    active.current?.abort();
    stopSpeech();
    const controller = new AbortController();
    active.current = controller;
    const requestId = crypto.randomUUID();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/outing/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, ...body }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(25000),
        ]),
      });
      if (!response.ok) throw await apiError(response);
      const parsed = outingResponseSchema.parse(await response.json());
      if (active.current !== controller) return;
      if (parsed.requestId !== requestId)
        throw new Error(
          "The reply did not match this outing. Please try again.",
        );
      if (path === "edit" && parsed.status !== "ready") {
        setNotice(
          "message" in parsed
            ? parsed.message
            : "This stop could not be changed. Your draft is preserved.",
        );
        return;
      }
      setResult(parsed);
      if (parsed.status === "ready")
        onMap(
          parsed.plan.stops.map((s, i) => ({ ...s.place, rank: i + 1 })),
          parsed.plan.location,
        );
      else onMap([], null);
    } catch (error) {
      if (active.current === controller)
        setNotice(
          error instanceof Error
            ? error.message
            : "The outing could not connect. Your details are preserved.",
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  function create() {
    const parsed = outingInputSchema.safeParse(input);
    if (!parsed.success) {
      setNotice(
        "Complete the area, occasion, local date/time and timezone, group size, transport and two to five stops together.",
      );
      return;
    }
    submitted.current = parsed.data;
    void request("create", { input: parsed.data });
  }
  function useDescription() {
    const matches = [
      ...description.matchAll(
        /\b(coffee|cafes?|parks?|dinner|lunch|restaurants?|museums?|attractions?|libraries|supermarkets?)\b/giu,
      ),
    ];
    const categories = matches.map((m) =>
      /coffee|cafe/i.test(m[0])
        ? ("cafe" as const)
        : /park/i.test(m[0])
          ? ("park" as const)
          : /dinner|lunch|restaurant/i.test(m[0])
            ? ("restaurant" as const)
            : /museum/i.test(m[0])
              ? ("museum" as const)
              : /librar/i.test(m[0])
                ? ("library" as const)
                : /supermarket/i.test(m[0])
                  ? ("supermarket" as const)
                  : ("attraction" as const),
    );
    const area =
      /\b(?:in|near|around)\s+(.+?)(?=\s+(?:on|under|with|for)\b|[.;]|$)/iu.exec(
        description,
      )?.[1];
    const budget = /(?:under|below)\s*₹\s*([\d,]+)/iu.exec(description)?.[1];
    setInput((current) => ({
      ...current,
      ...(area ? { area } : {}),
      ...(categories.length >= 2 && categories.length <= 5
        ? {
            stops: categories.map((category) => ({
              category,
              dwellMinutes: 45,
            })),
          }
        : {}),
      ...(budget
        ? {
            budget: {
              amount: Number(budget.replaceAll(",", "")),
              currency: "INR",
              strength: "must" as const,
            },
          }
        : {}),
    }));
    setNotice(
      "Recognized details filled below. Check them, add the local start time, and confirm all needs before building.",
    );
  }
  const plan = result?.status === "ready" ? result.plan : null;
  const time = (instant: string | null) =>
    instant
      ? new Intl.DateTimeFormat("en-IN", {
          timeZone: plan!.input.timezone,
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(instant))
      : "Time unverified";
  return (
    <section className="outing-planner" aria-label="Outing planner">
      <h1>A little day out.</h1>
      <p className="intro">
        Choose two to five stops. We’ll check routes and listed opening times,
        and flag what still needs a call.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <label htmlFor="outing-description">
          Describe your outing (optional)
        </label>
        <textarea
          id="outing-description"
          value={description}
          maxLength={500}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Coffee, a park walk and dinner with friends…"
        />
        <button
          type="button"
          disabled={!description.trim()}
          onClick={useDescription}
        >
          Fill details from description
        </button>
        <p className="privacy-note">
          Use the details below to confirm your request. Voice transcripts stay
          editable here before planning.
        </p>
        <div className="outing-fields">
          <label>
            City or neighborhood
            <input
              required
              maxLength={250}
              value={input.area}
              onChange={(e) => patch("area", e.target.value)}
            />
          </label>
          <label>
            Occasion
            <input
              required
              maxLength={160}
              value={input.occasion}
              onChange={(e) => patch("occasion", e.target.value)}
            />
          </label>
          <label>
            Local start
            <input
              required
              type="datetime-local"
              value={input.localStart}
              onChange={(e) => patch("localStart", e.target.value)}
            />
          </label>
          <label>
            City timezone
            <input
              required
              value={input.timezone}
              onChange={(e) => patch("timezone", e.target.value)}
              placeholder="Asia/Kolkata"
            />
          </label>
          <label>
            People
            <input
              required
              type="number"
              min={1}
              max={20}
              value={input.groupSize}
              onChange={(e) => patch("groupSize", Number(e.target.value))}
            />
          </label>
          <label>
            Travel
            <select
              value={input.transport}
              onChange={(e) =>
                patch(
                  "transport",
                  outingInputSchema.shape.transport.parse(e.target.value),
                )
              }
            >
              <option value="walk">Walking</option>
              <option value="bicycle">Bicycle</option>
              <option value="drive">Driving</option>
            </select>
          </label>
          <label>
            Available minutes
            <input
              required
              type="number"
              min={30}
              max={720}
              value={input.durationMinutes}
              onChange={(e) => patch("durationMinutes", Number(e.target.value))}
            />
          </label>
        </div>
        <fieldset>
          <legend>Budget for the whole group (optional)</legend>
          <label>
            Amount
            <input
              type="number"
              min={0}
              max={1000000}
              value={input.budget?.amount ?? ""}
              onChange={(e) =>
                patch(
                  "budget",
                  e.target.value === ""
                    ? null
                    : {
                        amount: Number(e.target.value),
                        currency: input.budget?.currency ?? "INR",
                        strength: input.budget?.strength ?? "prefer",
                      },
                )
              }
            />
          </label>
          {input.budget && (
            <div className="outing-fields">
              <label>
                Currency
                <select
                  value={input.budget.currency}
                  onChange={(e) =>
                    patch("budget", {
                      ...input.budget!,
                      currency: e.target.value,
                    })
                  }
                >
                  {["INR", "GBP", "USD", "EUR", "JPY"].map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </label>
              <label>
                Budget requirement
                <select
                  value={input.budget.strength}
                  onChange={(e) =>
                    patch("budget", {
                      ...input.budget!,
                      strength: e.target.value === "must" ? "must" : "prefer",
                    })
                  }
                >
                  <option value="prefer">Preference</option>
                  <option value="must">Hard limit</option>
                </select>
              </label>
            </div>
          )}
          <p className="privacy-note">
            Map records rarely verify total costs. A hard limit requires
            reliable price evidence.
          </p>
        </fieldset>
        <fieldset>
          <legend>Needs and preferences</legend>
          {(["wheelchair", "vegetarian", "vegan", "allergy"] as const).map(
            (kind) => (
              <label key={kind}>
                {kind === "allergy"
                  ? "Allergy safety"
                  : kind === "wheelchair"
                    ? "Wheelchair access"
                    : kind === "vegan"
                      ? "Vegan food"
                      : "Vegetarian food"}
                <select
                  value={
                    input.requirements.find((r) => r.kind === kind)?.strength ??
                    "none"
                  }
                  onChange={(e) =>
                    patch("requirements", [
                      ...input.requirements.filter((r) => r.kind !== kind),
                      ...(e.target.value === "none"
                        ? []
                        : [
                            {
                              kind,
                              strength:
                                e.target.value === "must"
                                  ? ("must" as const)
                                  : ("prefer" as const),
                            },
                          ]),
                    ])
                  }
                >
                  <option value="none">No requirement</option>
                  <option value="prefer">Prefer</option>
                  <option value="must">Must have evidence</option>
                </select>
              </label>
            ),
          )}
          <label>
            Other preferences
            <input
              maxLength={250}
              value={input.preferences}
              onChange={(e) => patch("preferences", e.target.value)}
              placeholder="Quiet, outdoors…"
            />
          </label>
          <p className="privacy-note">
            Allergy safety, reservations and group availability require direct
            confirmation. Map tags are community supplied.
          </p>
        </fieldset>
        <fieldset>
          <legend>Your stops, in order</legend>
          {input.stops.map((stop, i) => (
            <div className="outing-stop-input" key={i}>
              <label>
                Stop {i + 1}
                <select
                  value={stop.category}
                  onChange={(e) =>
                    patch(
                      "stops",
                      input.stops.map((s, j) =>
                        j === i
                          ? {
                              ...s,
                              category: outingCategorySchema.parse(
                                e.target.value,
                              ),
                            }
                          : s,
                      ),
                    )
                  }
                >
                  {outingCategorySchema.options.map((c) => (
                    <option value={c} key={c}>
                      {labels[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Visit minutes
                <input
                  type="number"
                  min={10}
                  max={240}
                  required
                  value={stop.dwellMinutes}
                  onChange={(e) =>
                    patch(
                      "stops",
                      input.stops.map((s, j) =>
                        j === i
                          ? { ...s, dwellMinutes: Number(e.target.value) }
                          : s,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                disabled={input.stops.length <= 2}
                aria-label={`Remove requested stop ${i + 1}`}
                onClick={() =>
                  patch(
                    "stops",
                    input.stops.filter((_, j) => j !== i),
                  )
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={input.stops.length >= 5}
            onClick={() =>
              patch("stops", [
                ...input.stops,
                { category: "attraction", dwellMinutes: 45 },
              ])
            }
          >
            Add a stop
          </button>
        </fieldset>
        <button type="submit" className="plan-submit" disabled={busy}>
          {busy ? "Checking real stops…" : "Build my outing"}
        </button>
      </form>
      {(voiceEnabled || speechEnabled) && (
        <label>
          Voice service
          <select
            aria-label="Voice service"
            value={provider}
            onChange={(event) =>
              onProviderChange(voiceProviderSchema.parse(event.target.value))
            }
          >
            {voiceProviders.map((value) => (
              <option key={value} value={value}>
                {value === "sarvam"
                  ? "Indian / mixed languages · Sarvam"
                  : "English / international · ElevenLabs"}
              </option>
            ))}
          </select>
        </label>
      )}
      {voiceEnabled && (
        <Voice
          key={provider}
          provider={provider}
          onTranscript={setDescription}
          onError={setNotice}
          onStart={stopSpeech}
        />
      )}
      {busy && (
        <button
          onClick={() => {
            active.current?.abort();
            active.current = null;
            setBusy(false);
            setNotice("Planning canceled. Your details are preserved.");
          }}
        >
          Cancel planning
        </button>
      )}
      <p role="status">{notice}</p>
      {result?.status === "needs_clarification" && (
        <div className="message">
          <h2>{result.question}</h2>
          {result.choices.map((choice) => (
            <button
              disabled={busy}
              key={choice.token}
              onClick={() =>
                void request("create", {
                  input: submitted.current,
                  choiceToken: choice.token,
                })
              }
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
      {(result?.status === "infeasible" || result?.status === "failed") && (
        <p role="alert">{result.message}</p>
      )}
      {plan && result?.status === "ready" && (
        <div className="outing-result">
          <h2>
            {plan.status === "infeasible"
              ? "This draft needs changes"
              : plan.status === "needs_confirmation"
                ? "Your outing — with details to confirm"
                : "Your checked outing"}
          </h2>
          <p>{plan.summary}</p>
          <p className="privacy-note">
            {plan.input.timezone} · Revision {plan.revision} · Travel estimates,
            not guarantees. Start at the first venue; travel to it is not
            included.
          </p>
          {plan.warnings.map((w) => (
            <p key={w} className="outing-warning">
              {w}
            </p>
          ))}
          {speechEnabled && (
            <button onClick={() => onSpeak(plan.summary)}>
              Read outing aloud · AI voice
            </button>
          )}
          <ol className="results">
            {plan.stops.map((stop, i) => (
              <li className="place" key={stop.id}>
                <h3>
                  {i + 1}. {stop.place.name}
                </h3>
                <p>
                  {time(stop.arrival)} – {time(stop.departure)} ·{" "}
                  {stop.dwellMinutes} min visit
                </p>
                <p>{stop.place.address ?? "Address not listed"}</p>
                <p>
                  Listed hours:{" "}
                  {stop.place.openingHours ?? "Opening hours not listed"}
                </p>
                <p>
                  Visit window:{" "}
                  {stop.hours === "open"
                    ? "Covered by listed hours"
                    : stop.hours === "closed"
                      ? "Outside listed hours"
                      : "Unverified"}
                </p>
                <p>{stop.reason}</p>
                {stop.warnings.map((w) => (
                  <p className="outing-warning" key={w}>
                    {w}
                  </p>
                ))}
                <a href={stop.place.osmUrl} target="_blank" rel="noreferrer">
                  Place evidence on OpenStreetMap
                </a>
                <small className="retrieved">
                  Retrieved {new Date(stop.place.retrievedAt).toLocaleString()}.
                  Details may be out of date.
                </small>
                <div className="voice-actions">
                  <button
                    disabled={busy || !stop.alternatives}
                    onClick={() =>
                      void request("edit", {
                        planToken: result.planToken,
                        stopId: stop.id,
                        action: "replace",
                      })
                    }
                  >
                    Replace stop {i + 1}
                  </button>
                  <button
                    disabled={busy || plan.stops.length <= 2}
                    onClick={() =>
                      void request("edit", {
                        planToken: result.planToken,
                        stopId: stop.id,
                        action: "remove",
                      })
                    }
                  >
                    Remove stop {i + 1}
                  </button>
                </div>
                {plan.legs[i] && (
                  <p className="outing-leg">
                    {plan.legs[i].verified
                      ? `${Math.ceil(plan.legs[i].seconds! / 60)} min · ${(plan.legs[i].meters! / 1000).toFixed(1)} km · ${plan.legs[i].mode} route estimate`
                      : "Route to next stop unavailable; later times are unverified."}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="privacy-note">
        Drafts stay in this page’s memory and expire after 30 minutes.
        Refreshing or Start fresh clears them. Your area and stop coordinates go
        to Geoapify for place and route checks. No booking is made.
      </p>
    </section>
  );
}
