import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import {
  labels,
  medicalNotice,
  requestSchema,
  type Category,
  type Location,
  type SearchResponse,
} from "../domain/contracts";
import { parseIntent } from "../domain/intent";
import { type Env, PublicError, requireStorage, limit } from "./config";
import { createContext, hash, readContext, sign, verify } from "./security";
import { reserve } from "./budget";
import { geocode, places } from "./maps";
import { interpret } from "./ai";
import { speak, transcribe, voiceEnabled } from "./voice";
import { voiceProviderSchema } from "../domain/voice";
import { createOuting, editOuting } from "./outing";

export const app = new Hono<{
  Bindings: Env;
  Variables: { session: string; client: string; requestId: string };
}>();
app.use("*", async (c, next) => {
  const started = Date.now();
  c.set("requestId", crypto.randomUUID());
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(self), microphone=(self)");
  if (c.req.path.startsWith("/api/")) c.header("Cache-Control", "no-store");
  try {
    await next();
  } finally {
    if (c.req.path.startsWith("/api/"))
      console.info(
        JSON.stringify({
          event: "request",
          requestId: c.get("requestId"),
          method: c.req.method,
          status: c.res.status,
          durationMs: Date.now() - started,
        }),
      );
  }
});
app.get("/api/health", (c) =>
  c.json({
    status: "ok",
    product: "Geozity",
    platform: "Cloudflare Workers",
    storage: "Supabase",
    aiMode:
      c.env.ENABLE_AI === "true" && c.env.SARVAM_API_KEY && c.env.AI_MODEL
        ? "configured"
        : "rule_based",
  }),
);
app.get("/api/config", (c) =>
  c.json({
    voiceEnabled:
      voiceProviderSchema.options.some((provider) =>
        voiceEnabled(c.env, provider),
      ) && limit(c.env.DAILY_VOICE_SECONDS_LIMIT, 3600) > 0,
    speechEnabled:
      voiceProviderSchema.options.some((provider) =>
        voiceEnabled(c.env, provider),
      ) && limit(c.env.DAILY_SPEECH_CHAR_LIMIT, 10000) > 0,
    voiceProviders: voiceProviderSchema.options.filter((provider) =>
      voiceEnabled(c.env, provider),
    ),
    mapStyleUrl:
      c.env.MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty",
  }),
);
app.use("/api/*", async (c, next) => {
  if (c.req.method !== "POST") return next();
  c.env = { ...c.env, requestDeadline: Date.now() + 20000 };
  const origin = c.req.header("Origin");
  if (
    (origin &&
      origin !== (c.env.FRONTEND_ORIGIN || new URL(c.req.url).origin)) ||
    c.req.header("Sec-Fetch-Site") === "cross-site"
  )
    throw new PublicError(
      "ORIGIN_DENIED",
      "Please use Geozity directly to make this request.",
      403,
      false,
    );
  requireStorage(c.env);
  const secret = c.env.SESSION_HMAC_SECRET!;
  let session: string | null = null;
  const cookie = getCookie(c, "geozity_session");
  if (cookie) {
    try {
      const data = z
        .object({ id: z.string().uuid(), expires: z.number() })
        .safeParse(await verify(secret, cookie));
      if (data.success && data.data.expires > Date.now())
        session = data.data.id;
    } catch {
      console.warn(
        JSON.stringify({
          event: "invalid_session_cookie",
          requestId: c.get("requestId"),
        }),
      );
    }
  }
  if (!session) {
    session = crypto.randomUUID();
    setCookie(
      c,
      "geozity_session",
      await sign(secret, { id: session, expires: Date.now() + 86400000 }),
      {
        httpOnly: true,
        sameSite: "Strict",
        secure: new URL(c.req.url).protocol === "https:",
        path: "/",
        maxAge: 86400,
      },
    );
  }
  c.set("session", session);
  // Vercel's reverse proxy shares network addresses, so use the signed session there.
  // The shared budget remains authoritative even when clients rotate cookies.
  const identity = c.env.FRONTEND_ORIGIN
    ? session
    : c.req.header("CF-Connecting-IP") || session;
  c.set(
    "client",
    await hash(secret, `${new Date().toISOString().slice(0, 10)}:${identity}`),
  );
  await next();
});
app.use(
  "/api/location/*",
  bodyLimit({
    maxSize: 16 * 1024,
    onError: () => {
      throw new PublicError(
        "INPUT_TOO_LARGE",
        "Please send a shorter question.",
        413,
        false,
      );
    },
  }),
);
app.post("/api/location/search", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new PublicError(
      "INVALID_INPUT",
      "Please send a readable question.",
      400,
      false,
    );
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    throw new PublicError(
      "INVALID_INPUT",
      "Enter a question of up to 500 characters and a valid location.",
      400,
      false,
    );
  const request = parsed.data;
  c.set("requestId", request.requestId);
  const env = c.env,
    session = c.get("session"),
    client = c.get("client"),
    secret = env.SESSION_HMAC_SECRET!;
  const prior = request.contextToken
    ? await readContext(secret, request.contextToken, session)
    : null;
  const selected = request.choiceToken
    ? await readContext(secret, request.choiceToken, session)
    : null;
  await reserve(env, client, "requests");
  const fallback = parseIntent(
    request.question,
    prior?.category,
    prior?.location === null,
  );
  const interpretation = selected
    ? {
        intent: {
          ...fallback,
          category: selected.category,
          unsupported: false,
        },
        mode: "rule_based" as const,
      }
    : fallback.unsupported ||
        (fallback.category &&
          (fallback.locationText || fallback.nearMe || prior?.location))
      ? { intent: fallback, mode: "rule_based" as const }
      : await interpret(env, client, request.question, fallback);
  const intent = interpretation.intent;
  if (intent.unsupported || !intent.category)
    return c.json({
      status: "failed",
      requestId: request.requestId,
      errorCode: "UNSUPPORTED_CATEGORY",
      message:
        "I can find hospitals, parks, cafes, restaurants, pharmacies, museums, attractions, libraries, and supermarkets. For multi-stop outings, choose Plan an outing. Bookings and verified availability are not available.",
      retryable: false,
    } satisfies SearchResponse);
  const category: Category = intent.category;
  let location: Location | null = selected?.location ?? null;
  if (!location && intent.locationText) {
    const choices = await geocode(env, client, intent.locationText);
    if (choices.length !== 1) {
      const contextToken = await createContext(secret, session, category, null);
      return c.json({
        status: "needs_clarification",
        requestId: request.requestId,
        question: choices.length
          ? "Which location did you mean?"
          : "Please add a city or neighborhood so I can search a specific area.",
        contextToken,
        choices: await Promise.all(
          choices.map(async (loc) => ({
            label: loc.label,
            token: await createContext(secret, session, category, loc),
          })),
        ),
      } satisfies SearchResponse);
    }
    location = choices[0];
  }
  if (!location && !intent.nearMe && prior?.location) location = prior.location;
  if (!location && request.deviceLocation)
    location = {
      ...request.deviceLocation,
      label: "your shared device location",
    };
  if (!location)
    return c.json({
      status: "needs_clarification",
      requestId: request.requestId,
      question:
        "Which city or neighborhood should I search? You can also choose Use my location.",
      choices: [],
      contextToken: await createContext(secret, session, category, null),
    } satisfies SearchResponse);
  const found = await places(
    env,
    client,
    category,
    location,
    request.radiusMeters,
  );
  const contextToken = await createContext(secret, session, category, location);
  if (!found.length)
    return c.json({
      status: "no_results",
      requestId: request.requestId,
      summary: `No ${labels[category]} were returned within ${request.radiusMeters / 1000} km of ${location.label}. Try a wider radius or another area.`,
      resolvedLocation: location,
      contextToken,
      radiusMeters: request.radiusMeters,
    } satisfies SearchResponse);
  return c.json({
    status: "ready",
    requestId: request.requestId,
    aiMode: interpretation.mode,
    summary: `Found ${found.length} ${labels[category]} near ${location.label}. Closest returned result: ${found[0].name}.`,
    safetyNotice:
      category === "hospital" || category === "pharmacy" ? medicalNotice : null,
    resolvedLocation: location,
    contextToken,
    places: found,
    cached: false,
  } satisfies SearchResponse);
});
app.use(
  "/api/outing/*",
  bodyLimit({
    maxSize: 120000,
    onError: () => {
      throw new PublicError(
        "INPUT_TOO_LARGE",
        "This outing draft is too large. Start a new plan.",
        413,
        false,
      );
    },
  }),
);
for (const [path, handler] of [
  ["create", createOuting],
  ["edit", editOuting],
] as const) {
  app.post(`/api/outing/${path}`, async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new PublicError(
        "INVALID_INPUT",
        "Please send readable outing details.",
        400,
        false,
      );
    }
    const result = await handler(
      c.env,
      c.get("client"),
      c.get("session"),
      body,
    );
    c.set("requestId", result.requestId);
    return c.json(result);
  });
}
app.use(
  "/api/voice/*",
  bodyLimit({
    maxSize: 960044,
    onError: () => {
      throw new PublicError(
        "INPUT_TOO_LARGE",
        "Recordings must be 30 seconds or less.",
        413,
        false,
      );
    },
  }),
);
app.post("/api/voice/transcribe", async (c) => {
  const provider = voiceProviderSchema.safeParse(
    c.req.header("X-Voice-Provider") || "elevenlabs",
  );
  if (!provider.success)
    throw new PublicError(
      "INVALID_INPUT",
      "Choose an available voice service.",
      400,
      false,
    );
  if (!c.req.header("content-type")?.startsWith("audio/wav"))
    throw new PublicError(
      "INVALID_AUDIO",
      "Please use the microphone button to record a question.",
      400,
      false,
    );
  return c.json({
    text: await transcribe(
      c.env,
      c.get("client"),
      await c.req.arrayBuffer(),
      provider.data,
    ),
  });
});
app.post("/api/voice/speak", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    throw new PublicError(
      "INVALID_INPUT",
      "Choose a short answer to read aloud.",
      400,
      false,
    );
  }
  const data = z
    .object({
      text: z.string().trim().min(1).max(500),
      provider: voiceProviderSchema.default("elevenlabs"),
    })
    .strict()
    .safeParse(body);
  if (!data.success)
    throw new PublicError(
      "INVALID_INPUT",
      "Choose an answer of up to 500 characters to read aloud.",
      400,
      false,
    );
  const audio = await speak(
    c.env,
    c.get("client"),
    data.data.text,
    data.data.provider,
  );
  const wav =
    String.fromCharCode(
      ...new Uint8Array(audio, 0, Math.min(4, audio.byteLength)),
    ) === "RIFF";
  c.header("Content-Type", wav ? "audio/wav" : "audio/mpeg");
  return c.body(audio);
});
app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((error, c) => {
  const known = error instanceof PublicError;
  console.error(
    JSON.stringify({
      event: "request_failed",
      requestId: c.get("requestId"),
      code: known ? error.code : "INTERNAL_ERROR",
    }),
  );
  return c.json(
    {
      status: "failed",
      requestId: c.get("requestId"),
      errorCode: known ? error.code : "INTERNAL_ERROR",
      message: known
        ? error.message
        : "Something interrupted the request. Please try again.",
      retryable: known ? error.retryable : true,
    },
    known ? error.status : 503,
  );
});
