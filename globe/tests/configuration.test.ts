import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { expect, it } from "vitest";

it("root setup example has no duplicate keys and leaves spending features off", async () => {
  const text = await readFile(
    new URL("../../.env.example", import.meta.url),
    "utf8",
  );
  const keys = [...text.matchAll(/^([A-Za-z_][A-Za-z0-9_]*)=/gm)].map(
    (match) => match[1],
  );
  expect(new Set(keys).size).toBe(keys.length);
  const env = parseEnv(text);
  for (const key of [
    "GEOAPIFY_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "SARVAM_API_KEY",
    "SESSION_HMAC_SECRET",
  ])
    expect(env[key]).toBe("");
  expect(env.ENABLE_AI).toBe("false");
  expect(env.ELEVENLABS_STT_MODEL).toBe("scribe_v3");
  expect(env.ELEVENLABS_TTS_MODEL).toBe("eleven_v4");
  expect(env.SARVAM_STT_MODEL).toBe("saaras:v4");
  expect(env.SARVAM_TTS_MODEL).toBe("bulbul:v4-flash");
  expect(env.ENABLE_VOICE).toBe("false");
  expect(env.DAILY_AI_CALL_LIMIT).toBe("0");
  expect(env.DAILY_VOICE_SECONDS_LIMIT).toBe("0");
  expect(env.DAILY_SPEECH_CHAR_LIMIT).toBe("0");
});
