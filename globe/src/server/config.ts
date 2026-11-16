export interface Env {
  FRONTEND_ORIGIN?: string;
  GEOAPIFY_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SESSION_HMAC_SECRET?: string;
  DAILY_MAP_CALL_LIMIT?: string;
  DAILY_AI_CALL_LIMIT?: string;
  DAILY_VOICE_SECONDS_LIMIT?: string;
  DAILY_SPEECH_CHAR_LIMIT?: string;
  DISABLE_EXTERNAL_PROVIDERS?: string;
  ENABLE_AI?: string;
  AI_MODEL?: string;
  ENABLE_VOICE?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  ELEVENLABS_STT_MODEL?: string;
  ELEVENLABS_TTS_MODEL?: string;
  SARVAM_API_KEY?: string;
  SARVAM_STT_MODEL?: string;
  SARVAM_TTS_MODEL?: string;
  SARVAM_TTS_LANGUAGE?: string;
  MAP_STYLE_URL?: string;
  requestDeadline?: number;
}
export class PublicError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: 400 | 403 | 413 | 429 | 502 | 503 | 504 = 503,
    public retryable = true,
  ) {
    super(message);
  }
}
export function limit(value: string | undefined, ceiling: number): number {
  if (!value || !/^\d+$/.test(value)) return 0;
  return Math.min(Number(value), ceiling);
}
export function requireStorage(env: Env): void {
  if (
    !env.SUPABASE_URL ||
    !(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY) ||
    !env.SESSION_HMAC_SECRET ||
    env.SESSION_HMAC_SECRET.length < 32
  ) {
    throw new PublicError(
      "NOT_CONFIGURED",
      "Search is being set up. Please try again once the service is ready.",
    );
  }
  const url = new URL(env.SUPABASE_URL);
  if (url.protocol !== "https:" && url.hostname !== "127.0.0.1")
    throw new PublicError(
      "NOT_CONFIGURED",
      "Search configuration needs attention.",
    );
}
