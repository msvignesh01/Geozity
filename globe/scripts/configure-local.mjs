import { writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { localEnv } from "./local-env.mjs";
import { voiceModels } from "../src/domain/voice.ts";

const destination = new URL("../.dev.vars", import.meta.url);
const root = await localEnv();
const allowed = [
  "GEOAPIFY_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ELEVENLABS_API_KEY",
  "ELEVENLABS_VOICE_ID",
  "SARVAM_API_KEY",
];
const options = [
  "SESSION_HMAC_SECRET",
  "ENABLE_VOICE",
  "DAILY_VOICE_SECONDS_LIMIT",
  "DAILY_SPEECH_CHAR_LIMIT",
  "ELEVENLABS_STT_MODEL",
  "ELEVENLABS_TTS_MODEL",
  "SARVAM_STT_MODEL",
  "SARVAM_TTS_MODEL",
  "SARVAM_TTS_LANGUAGE",
  "ENABLE_AI",
  "AI_MODEL",
  "DAILY_AI_CALL_LIMIT",
  "DAILY_MAP_CALL_LIMIT",
  "DISABLE_EXTERNAL_PROVIDERS",
  "MAP_STYLE_URL",
];
const settings = {};
for (const key of [...allowed, ...options])
  if (root[key]?.trim()) settings[key] = root[key].trim();
settings.SESSION_HMAC_SECRET ||= randomBytes(32).toString("hex");
settings.DAILY_MAP_CALL_LIMIT ||= "200";
settings.ENABLE_AI ||= "false";
settings.AI_MODEL ||= "sarvam-105b-conversations";
settings.DAILY_AI_CALL_LIMIT ||= "0";
settings.ENABLE_VOICE ||= "false";
settings.DAILY_VOICE_SECONDS_LIMIT ||= "0";
settings.DAILY_SPEECH_CHAR_LIMIT ||= "0";
settings.ELEVENLABS_STT_MODEL ||= voiceModels.elevenlabsStt;
settings.ELEVENLABS_TTS_MODEL ||= voiceModels.elevenlabsTts;
settings.SARVAM_STT_MODEL ||= voiceModels.sarvamStt;
settings.SARVAM_TTS_MODEL ||= voiceModels.sarvamTts;
settings.SARVAM_TTS_LANGUAGE ||= "en-IN";
// Activation and quota choices stay explicit; a newly copied key never starts spending.
await writeFile(
  destination,
  Object.entries(settings)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    localConfigWritten: true,
    configured: allowed.filter((key) => !!settings[key]),
    requiredMissing: [
      ...["GEOAPIFY_API_KEY", "SUPABASE_URL"].filter((key) => !settings[key]),
      ...(!(settings.SUPABASE_SECRET_KEY || settings.SUPABASE_SERVICE_ROLE_KEY)
        ? ["SUPABASE_SECRET_KEY"]
        : []),
    ],
    supabaseServerKeyConfigured: !!(
      settings.SUPABASE_SECRET_KEY || settings.SUPABASE_SERVICE_ROLE_KEY
    ),
    aiEnabled: settings.ENABLE_AI === "true",
    voiceEnabled: settings.ENABLE_VOICE === "true",
  }),
);
