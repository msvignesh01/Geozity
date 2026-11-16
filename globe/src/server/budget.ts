import { z } from "zod";
import { type Env, limit, PublicError, requireStorage } from "./config";
import { upstream, jsonBody } from "./http";
export type Meter =
  "map" | "ai" | "voice_seconds" | "speech_characters" | "requests";
const config: Record<Meter, [keyof Env, number, number]> = {
  map: ["DAILY_MAP_CALL_LIMIT", 3000, 30],
  ai: ["DAILY_AI_CALL_LIMIT", 200, 10],
  voice_seconds: ["DAILY_VOICE_SECONDS_LIMIT", 3600, 120],
  speech_characters: ["DAILY_SPEECH_CHAR_LIMIT", 10000, 1500],
  requests: ["DAILY_MAP_CALL_LIMIT", 3000, 60],
};
export async function reserve(
  env: Env,
  clientHash: string,
  meter: Meter,
  units = 1,
): Promise<void> {
  requireStorage(env);
  if (env.DISABLE_EXTERNAL_PROVIDERS === "true")
    throw new PublicError(
      "SEARCH_PAUSED",
      "Search and voice are paused. Please try again later.",
    );
  const [setting, ceiling, clientCeiling] = config[meter];
  const allowance = limit(
    typeof env[setting] === "string" ? env[setting] : undefined,
    ceiling,
  );
  if (allowance < units)
    throw new PublicError(
      "QUOTA_REACHED",
      "This service has no remaining allowance today. Text search may still be available.",
      429,
      false,
    );
  try {
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) throw new Error("Missing server key");
    const response = await upstream(
      `${env.SUPABASE_URL?.replace(/\/+$/, "")}/rest/v1/rpc/geozity_reserve_usage`,
      {
        method: "POST",
        headers: {
          apikey: key,
          // Secret keys must be identified as server calls even behind a browser-facing proxy.
          "User-Agent": "Geozity-Server/1.0",
          ...(key.startsWith("sb_secret_")
            ? {}
            : { Authorization: `Bearer ${key}` }),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_meter: meter,
          p_units: units,
          p_global_limit: allowance,
          p_client_limit: Math.min(allowance, clientCeiling),
          p_client_hash: clientHash,
        }),
      },
      2000,
      env.requestDeadline,
    );
    const result = z.boolean().safeParse(await jsonBody(response));
    if (!result.success) throw new Error("Invalid budget response");
    if (!result.data)
      throw new PublicError(
        "QUOTA_REACHED",
        "Today’s usage allowance has been reached. Please return tomorrow.",
        429,
        false,
      );
  } catch (error) {
    if (error instanceof PublicError && error.code === "QUOTA_REACHED")
      throw error;
    console.warn(
      JSON.stringify({
        event: "usage_reservation_failed",
        code:
          error instanceof PublicError ? error.code : "INVALID_BUDGET_RESPONSE",
        status: error instanceof PublicError ? error.status : null,
      }),
    );
    // Never fall back to in-memory counters: restarts and multiple workers would bypass the cap.
    throw new PublicError(
      "BUDGET_UNAVAILABLE",
      "Usage protection is temporarily unavailable. Please try again later.",
    );
  }
}
