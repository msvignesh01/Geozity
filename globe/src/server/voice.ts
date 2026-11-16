import { z } from "zod";
import { type Env, PublicError } from "./config";
import { reserve } from "./budget";
import { providerSpeech, providerTranscript } from "./voice-providers";
import { type VoiceProvider } from "../domain/voice";

export function voiceEnabled(
  env: Env,
  provider: VoiceProvider = "elevenlabs",
): boolean {
  return (
    env.ENABLE_VOICE === "true" &&
    !!(provider === "sarvam" ? env.SARVAM_API_KEY : env.ELEVENLABS_API_KEY) &&
    env.DISABLE_EXTERNAL_PROVIDERS !== "true"
  );
}
function requireVoice(env: Env, provider: VoiceProvider) {
  if (!voiceEnabled(env, provider))
    throw new PublicError(
      "VOICE_UNAVAILABLE",
      "Voice is not enabled yet. You can type your question.",
    );
}
export function wavSeconds(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  const tag = (offset: number, expected: string) =>
    [...expected].every(
      (c, i) => view.getUint8(offset + i) === c.charCodeAt(0),
    );
  if (
    buffer.byteLength < 3244 ||
    buffer.byteLength > 960044 ||
    !tag(0, "RIFF") ||
    !tag(8, "WAVE") ||
    !tag(12, "fmt ") ||
    !tag(36, "data") ||
    view.getUint32(4, true) !== buffer.byteLength - 8 ||
    view.getUint32(16, true) !== 16 ||
    view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 1 ||
    view.getUint32(24, true) !== 16000 ||
    view.getUint32(28, true) !== 32000 ||
    view.getUint16(32, true) !== 2 ||
    view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== buffer.byteLength - 44 ||
    (buffer.byteLength - 44) % 2 !== 0
  ) {
    throw new PublicError(
      "INVALID_AUDIO",
      "Please record between a moment and 30 seconds using the microphone button.",
      400,
      false,
    );
  }
  return Math.ceil((buffer.byteLength - 44) / 32000);
}
export async function transcribe(
  env: Env,
  client: string,
  buffer: ArrayBuffer,
  provider: VoiceProvider = "elevenlabs",
): Promise<string> {
  requireVoice(env, provider);
  const seconds = wavSeconds(buffer);
  await reserve(env, client, "voice_seconds", seconds);
  return voiceCall(() =>
    providerTranscript(
      env,
      provider,
      new Blob([buffer], { type: "audio/wav" }),
    ),
  );
}
export async function speak(
  env: Env,
  client: string,
  text: string,
  provider: VoiceProvider = "elevenlabs",
): Promise<ArrayBuffer> {
  requireVoice(env, provider);
  if (
    provider === "elevenlabs" &&
    env.ELEVENLABS_VOICE_ID &&
    !/^[A-Za-z0-9_-]{1,100}$/.test(env.ELEVENLABS_VOICE_ID)
  )
    throw new PublicError(
      "VOICE_UNAVAILABLE",
      "Spoken replies are not enabled yet. The text answer is still available.",
    );
  await reserve(env, client, "speech_characters", text.length);
  return voiceCall(() => providerSpeech(env, provider, text));
}
async function voiceCall<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : null;
    if (status === 402 || status === 429)
      throw new PublicError(
        "VOICE_ALLOWANCE",
        "The selected voice service has reached its allowance. You can still type your question.",
        429,
        false,
      );
    if (status === 401 || status === 403 || status === 404 || status === 422)
      throw new PublicError(
        "VOICE_CONFIGURATION",
        "The selected voice model is unavailable for this account. Please use text while it is checked.",
        502,
        false,
      );
    if (error instanceof Error && /Timeout|Abort/.test(error.name))
      throw new PublicError(
        "VOICE_TIMEOUT",
        "The voice service took too long. Please try again or type your question.",
        504,
      );
    if (error instanceof z.ZodError)
      throw new PublicError(
        "VOICE_RESPONSE_INVALID",
        "The voice service returned unreadable data. Please try again or type your question.",
        502,
      );
    throw new PublicError(
      "VOICE_UNAVAILABLE",
      "The selected voice service could not complete the request. Please try again or use text.",
      502,
    );
  }
}
