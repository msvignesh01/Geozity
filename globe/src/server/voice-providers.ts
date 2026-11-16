import { SpeechToTextClient as SarvamStt } from "sarvamai/speechToText";
import { TextToSpeechClient as SarvamTts } from "sarvamai/textToSpeech";
import { z } from "zod";
import {
  defaultElevenVoice,
  elevenVoices,
  type ElevenVoice,
  voiceModels,
  type VoiceProvider,
} from "../domain/voice.ts";
import type { Env } from "./config";

function options(env: Env) {
  const remaining = Math.min(
    15000,
    (env.requestDeadline ?? Date.now() + 15000) - Date.now(),
  );
  if (remaining <= 0)
    throw new DOMException("Voice deadline reached", "TimeoutError");
  return {
    maxRetries: 0,
    timeoutInSeconds: remaining / 1000,
    abortSignal: AbortSignal.timeout(remaining),
  };
}
async function eleven(env: Env, path: string, init: RequestInit) {
  if (!env.ELEVENLABS_API_KEY) throw new Error("ElevenLabs is not configured");
  // The general SDK initializes its full API catalogue, exceeding Workers' startup allowance.
  const response = await fetch(`https://api.elevenlabs.io/v1/${path}`, {
    ...init,
    method: "POST",
    redirect: "manual",
    signal: options(env).abortSignal,
    headers: { ...init.headers, "xi-api-key": env.ELEVENLABS_API_KEY },
  });
  if (!response.ok)
    throw Object.assign(new Error("Voice provider rejected the request"), {
      statusCode: response.status,
    });
  return response;
}
function sarvam(env: Env) {
  if (!env.SARVAM_API_KEY) throw new Error("Sarvam is not configured");
  return {
    apiSubscriptionKey: env.SARVAM_API_KEY,
    maxRetries: 0,
    timeoutInSeconds: 15,
    fetch,
    logging: { silent: true },
  };
}
const transcript = z.string().trim().min(1).max(500);
export async function providerTranscript(
  env: Env,
  provider: VoiceProvider,
  audio: Blob,
): Promise<string> {
  const file = new File([audio], "question.wav", {
    type: audio.type || "audio/wav",
  });
  if (provider === "sarvam") {
    const model = z
      .enum(["saaras:v4", "saaras:v3"])
      .parse(env.SARVAM_STT_MODEL || voiceModels.sarvamStt);
    const result = await new SarvamStt(sarvam(env)).transcribe(
      { file, model, mode: "translate", language_code: "unknown" },
      options(env),
    );
    return z.object({ transcript }).parse(result).transcript;
  }
  const form = new FormData();
  form.set("file", file);
  form.set("model_id", env.ELEVENLABS_STT_MODEL || voiceModels.elevenlabsStt);
  form.set("tag_audio_events", "false");
  form.set("diarize", "false");
  const result = await (
    await eleven(env, "speech-to-text", { body: form })
  ).json();
  return z.object({ text: transcript }).parse(result).text;
}

export function validAudio(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 12 &&
    ((bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) ||
      (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) ||
      (String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.subarray(8, 12)) === "WAVE"))
  );
}
async function audioBuffer(
  stream: ReadableStream<Uint8Array>,
): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2_000_000)
        throw new Error("Voice response exceeds size limit");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    if (!validAudio(bytes)) throw new Error("Invalid voice audio");
    return bytes.buffer;
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
export async function providerSpeech(
  env: Env,
  provider: VoiceProvider,
  text: string,
  voice?: ElevenVoice,
): Promise<ArrayBuffer> {
  if (provider === "sarvam") {
    const model = z
      .enum(["bulbul:v4-flash", "bulbul:v3"])
      .parse(env.SARVAM_TTS_MODEL || voiceModels.sarvamTts);
    const language = z
      .enum([
        "en-IN",
        "hi-IN",
        "kn-IN",
        "ta-IN",
        "te-IN",
        "ml-IN",
        "mr-IN",
        "bn-IN",
        "gu-IN",
        "pa-IN",
        "od-IN",
      ])
      .parse(env.SARVAM_TTS_LANGUAGE || "en-IN");
    const result = await new SarvamTts(sarvam(env)).convert(
      { text, language_code: language, model, output_audio_codec: "mp3" },
      options(env),
    );
    const encoded = z
      .object({ audios: z.array(z.string().min(1).max(2_700_000)).length(1) })
      .parse(result).audios[0];
    const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    if (bytes.length > 2_000_000 || !validAudio(bytes))
      throw new Error("Invalid voice audio");
    return bytes.buffer;
  }
  const response = await eleven(
    env,
    `text-to-speech/${encodeURIComponent(voice ? elevenVoices[voice].id : env.ELEVENLABS_VOICE_ID || defaultElevenVoice)}?output_format=mp3_22050_32`,
    {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: env.ELEVENLABS_TTS_MODEL || voiceModels.elevenlabsTts,
      }),
    },
  );
  if (!response.body) throw new Error("Voice audio is missing");
  return audioBuffer(response.body);
}
