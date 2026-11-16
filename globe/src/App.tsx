import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  type Location,
  type Place,
  type SearchResponse,
  requestSchema,
  responseSchema,
} from "./domain/contracts";
import { Globe } from "./components/Globe";
import { Voice, apiError } from "./components/Voice";
import { voiceProviderSchema, type VoiceProvider } from "./domain/voice";

const configSchema = z.object({
  voiceEnabled: z.boolean(),
  speechEnabled: z.boolean(),
  mapStyleUrl: z.url(),
  voiceProviders: z.array(voiceProviderSchema).default(["elevenlabs"]),
});
const prompts = [
  "Parks in Bengaluru",
  "Nearest hospital to MG Road, Bengaluru",
  "Museums in London",
];
export function App() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [radius, setRadius] = useState<1000 | 3000 | 5000 | 10000>(5000);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [config, setConfig] = useState({
    voiceEnabled: false,
    speechEnabled: false,
    mapStyleUrl: "https://tiles.openfreemap.org/styles/liberty",
    voiceProviders: [] as VoiceProvider[],
  });
  const [voiceProvider, setVoiceProvider] =
    useState<VoiceProvider>("elevenlabs");
  const selectedProvider = config.voiceProviders.includes(voiceProvider)
    ? voiceProvider
    : (config.voiceProviders[0] ?? "elevenlabs");
  const active = useRef<AbortController | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const speechRequest = useRef<AbortController | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const gpsGeneration = useRef(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());

  function stopSpeech() {
    speechRequest.current?.abort();
    speechRequest.current = null;
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
    setSpeaking(false);
  }
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/config", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: unknown) => setConfig(configSchema.parse(data)))
      .catch(() => {
        if (!controller.signal.aborted)
          setNotice(
            "Voice settings could not load. Text search is still available.",
          );
      });
    return () => {
      controller.abort();
      active.current?.abort();
      gpsGeneration.current += 1;
      speechRequest.current?.abort();
      audio.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);
  async function search(text: string, choiceToken: string | null = null) {
    if (!text.trim()) return;
    active.current?.abort();
    stopSpeech();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setNotice("");
    setPlaces([]);
    setSelected(null);
    setResult(null);
    setLocation(null);
    setLastQuestion(text);
    try {
      const payload = requestSchema.parse({
        requestId: crypto.randomUUID(),
        question: text,
        deviceLocation: gps,
        contextToken: context,
        choiceToken,
        radiusMeters: radius,
      });
      const response = await fetch("/api/location/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(25000),
        ]),
      });
      const data: unknown = await response.json();
      const parsed = responseSchema.parse(data);
      if (active.current !== controller) return;
      if (parsed.requestId !== payload.requestId && parsed.status !== "failed")
        throw new Error(
          "The response did not match this search. Please try again.",
        );
      setResult(parsed);
      if ("contextToken" in parsed) setContext(parsed.contextToken);
      if ("resolvedLocation" in parsed) setLocation(parsed.resolvedLocation);
      if (parsed.status === "ready") {
        setPlaces(parsed.places);
        setSelected(parsed.places[0].id);
      }
      setQuestion("");
    } catch (error) {
      if (active.current !== controller) return;
      setNotice(
        error instanceof z.ZodError
          ? "The search response was incomplete. Please try again."
          : error instanceof Error && error.name === "TimeoutError"
            ? "The search took too long. Please try a smaller area."
            : "Search could not connect. Please try again.",
      );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }
  function clear() {
    active.current?.abort();
    active.current = null;
    stopSpeech();
    gpsGeneration.current += 1;
    setBusy(false);
    setGpsBusy(false);
    setResult(null);
    setPlaces([]);
    setLocation(null);
    setSelected(null);
    setContext(null);
    setGps(null);
    setQuestion("");
    setNotice("Search area and device location cleared.");
  }
  function locate() {
    if (!navigator.geolocation) {
      setNotice(
        "Device location is unavailable. Please enter a city or neighborhood.",
      );
      return;
    }
    const current = ++gpsGeneration.current;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (gpsGeneration.current !== current) return;
        setGpsBusy(false);
        setGps({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setNotice("Location is ready. Ask for places near me.");
      },
      () => {
        if (gpsGeneration.current !== current) return;
        setGpsBusy(false);
        setNotice(
          "Location was denied or unavailable. Enter a city or neighborhood to keep exploring.",
        );
      },
      { timeout: 10000, maximumAge: 0 },
    );
  }
  async function readAloud(text: string) {
    stopSpeech();
    const controller = new AbortController();
    speechRequest.current = controller;
    setSpeaking(true);
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.slice(0, 500),
          provider: selectedProvider,
        }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(20000),
        ]),
      });
      if (!response.ok) throw await apiError(response);
      if (speechRequest.current !== controller) return;
      const blob = await response.blob();
      if (speechRequest.current !== controller) return;
      audioUrl.current = URL.createObjectURL(blob);
      audio.current = new Audio(audioUrl.current);
      audio.current.onended = stopSpeech;
      audio.current.onerror = () => {
        stopSpeech();
        setNotice("Audio could not play. The text answer is still available.");
      };
      await audio.current.play();
    } catch (error) {
      if (speechRequest.current === controller) {
        stopSpeech();
        setNotice(
          error instanceof Error
            ? error.message
            : "The spoken reply could not play.",
        );
      }
    }
  }
  const medical =
    (result?.status === "ready" && !!result.safetyNotice) ||
    (busy &&
      /\b(hospital|pharmacy|pharmacies|emergency|clinic)\b/iu.test(
        lastQuestion,
      ));
  return (
    <main className="app-shell">
      <header className="masthead">
        <a className="wordmark" href="/" aria-label="Geozity home">
          <span className="brand-orbit" aria-hidden="true">
            ◎
          </span>{" "}
          geozity<span className="brand-dot">.</span>
        </a>
        <span className="header-note">A little curiosity. A whole world.</span>
        <button className="quiet" onClick={clear}>
          Start fresh
        </button>
      </header>
      <div className="workspace">
        <aside
          className={`explorer${result ? " has-results" : ""}`}
          aria-label="Ask and explore places"
        >
          <div className="explorer-content">
            <div className="eyebrow">YOUR CURIOSITY, ON THE MAP</div>
            <h1>
              Where shall <br />
              we wander?
            </h1>
            <p className="intro">
              A quiet park. A good coffee. Somewhere new. Ask a question and see
              real places come into view.
            </p>
            {!result && !busy && (
              <div className="sample-prompts" aria-label="Example questions">
                {prompts.map((prompt) => (
                  <button key={prompt} onClick={() => void search(prompt)}>
                    {prompt}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
            <div role="status" aria-live="polite" className="status-line">
              {busy
                ? "Finding real places and getting the globe ready…"
                : notice}
            </div>
            {lastQuestion && (result || busy) && (
              <p className="asked">You asked: {lastQuestion}</p>
            )}
            {result?.status === "failed" && (
              <div className="message error" role="alert">
                <p>{result.message}</p>
                {result.retryable && (
                  <button onClick={() => void search(lastQuestion)}>
                    Try this search again
                  </button>
                )}
              </div>
            )}
            {result?.status === "needs_clarification" && (
              <div className="message">
                <h2>{result.question}</h2>
                <div className="choices">
                  {result.choices.map((choice) => (
                    <button
                      key={choice.token}
                      onClick={() => void search(lastQuestion, choice.token)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {result?.status === "no_results" && (
              <div className="message">
                <p>{result.summary}</p>
                {radius < 10000 && (
                  <p>
                    Choose a wider search radius below, then send your question
                    again.
                  </p>
                )}
              </div>
            )}
            {result?.status === "ready" && (
              <>
                <div className="results-heading">
                  <h2>{result.places.length} places to explore</h2>
                  <span>
                    {result.aiMode === "ai_verified"
                      ? "AI interpreted · provider results"
                      : "Keyword search · provider results"}
                  </span>
                </div>
                <p className="result-summary">{result.summary}</p>
                {result.safetyNotice && (
                  <p className="medical-notice">{result.safetyNotice}</p>
                )}
                {config.speechEnabled && (
                  <button
                    className="read-aloud"
                    onClick={() =>
                      speaking
                        ? stopSpeech()
                        : void readAloud(
                            `${result.safetyNotice ?? ""} ${result.summary}`,
                          )
                    }
                  >
                    {speaking
                      ? "Stop voice reply"
                      : "Read answer aloud · AI voice"}
                  </button>
                )}
                <ol className="results">
                  {places.map((place) => (
                    <li
                      key={place.id}
                      className={
                        selected === place.id ? "place selected" : "place"
                      }
                    >
                      <button
                        className="place-select"
                        ref={(element) => {
                          if (element) cards.current.set(place.id, element);
                          else cards.current.delete(place.id);
                        }}
                        aria-pressed={selected === place.id}
                        onClick={() => setSelected(place.id)}
                      >
                        <span className="place-number">{place.rank}</span>
                        <span>
                          <strong>{place.name}</strong>
                          <small>{place.distanceLabel}</small>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </button>
                      <div className="place-details">
                        <p>{place.address || "Address not listed"}</p>
                        <p>
                          <span className="detail-label">Hours</span>{" "}
                          {place.openingHours || "Opening hours not listed"}
                        </p>
                        {place.wikiSummary && (
                          <p className="wiki-summary">{place.wikiSummary}</p>
                        )}
                        <div className="place-links">
                          <a
                            href={place.osmUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View on OpenStreetMap ↗
                          </a>
                          {place.wikiUrl && (
                            <a
                              href={place.wikiUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Wikipedia ↗
                            </a>
                          )}
                        </div>
                        <small className="retrieved">
                          Retrieved{" "}
                          {new Date(place.retrievedAt).toLocaleTimeString()}.
                          Provider details may be out of date.
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
          <div className="composer-wrap">
            {location && (
              <p className="context-label">Search area: {location.label}</p>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void search(question);
              }}
            >
              <label htmlFor="question">Ask Geozity</label>
              <div className="composer">
                <textarea
                  ref={input}
                  id="question"
                  value={question}
                  maxLength={500}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    context
                      ? "Try “cafes instead”…"
                      : "Find parks in Bengaluru…"
                  }
                  rows={2}
                />
                <button
                  className="send"
                  type="submit"
                  disabled={!question.trim()}
                  aria-label="Find places"
                >
                  ↗
                </button>
              </div>
              <div className="composer-tools">
                <button type="button" onClick={locate} disabled={gpsBusy}>
                  {gpsBusy
                    ? "Locating…"
                    : gps
                      ? "Location ready ✓"
                      : "Use my location"}
                </button>
                <label>
                  Within{" "}
                  <select
                    aria-label="Search radius"
                    value={radius}
                    onChange={(e) => {
                      const parsed = requestSchema.shape.radiusMeters.safeParse(
                        Number(e.target.value),
                      );
                      if (parsed.success) setRadius(parsed.data);
                    }}
                  >
                    <option value="1000">1 km</option>
                    <option value="3000">3 km</option>
                    <option value="5000">5 km</option>
                    <option value="10000">10 km</option>
                  </select>
                </label>
              </div>
            </form>
            {busy && (
              <button
                className="cancel-search"
                onClick={() => {
                  active.current?.abort();
                  active.current = null;
                  setBusy(false);
                  setNotice("Search canceled.");
                }}
              >
                Cancel search
              </button>
            )}
            {(config.voiceEnabled || config.speechEnabled) && (
              <label className="voice-choice">
                Voice service{" "}
                <select
                  aria-label="Voice service"
                  value={selectedProvider}
                  onChange={(e) => {
                    const provider = voiceProviderSchema.safeParse(
                      e.target.value,
                    );
                    if (provider.success) {
                      stopSpeech();
                      setVoiceProvider(provider.data);
                    }
                  }}
                >
                  {config.voiceProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider === "sarvam"
                        ? "Indian / mixed languages · Sarvam"
                        : "English / international · ElevenLabs"}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {config.voiceEnabled && (
              <Voice
                key={selectedProvider}
                provider={selectedProvider}
                onTranscript={(text) => {
                  setQuestion(text);
                  setNotice(
                    "Transcript ready. Review it, then choose Find places.",
                  );
                  input.current?.focus();
                }}
                onError={setNotice}
              />
            )}
            <p className="privacy-note">
              Your search area goes to map providers. Device location is
              optional.{" "}
              {config.voiceEnabled
                ? `Voice by ${selectedProvider === "sarvam" ? "Sarvam" : "ElevenLabs"}. Replies currently use English.`
                : "Text search is available; voice is not enabled."}
            </p>
          </div>
        </aside>
        <Globe
          places={places}
          location={location}
          selectedId={selected}
          onSelect={(id) => {
            setSelected(id);
            cards.current.get(id)?.scrollIntoView({
              block: "nearest",
              behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            });
          }}
          medical={medical}
          styleUrl={config.mapStyleUrl}
        />
      </div>
    </main>
  );
}
