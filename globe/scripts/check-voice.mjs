import { mkdir, writeFile } from "node:fs/promises";
import { localEnv } from "./local-env.mjs";
import {
  providerSpeech,
  providerTranscript,
} from "../src/server/voice-providers.ts";
import { voiceModels } from "../src/domain/voice.ts";
import { defaultElevenVoice } from "../src/domain/voice.ts";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const settings = await localEnv();
const results = [];
for (const provider of ["sarvam", "elevenlabs"]) {
  if (
    !(provider === "sarvam"
      ? settings.SARVAM_API_KEY
      : settings.ELEVENLABS_API_KEY)
  ) {
    results.push({ provider, status: "not_configured" });
    continue;
  }
  const env = {
    ...settings,
    SARVAM_TTS_LANGUAGE:
      provider === "sarvam" ? "hi-IN" : settings.SARVAM_TTS_LANGUAGE,
  };
  const text =
    provider === "sarvam"
      ? "बेंगलुरु में MG Road के पास parks दिखाओ।"
      : "Find parks near MG Road in Bengaluru.";
  try {
    // Exercise the installed SDK separately; the Worker uses its smaller HTTP adapter.
    const sdk =
      provider === "elevenlabs"
        ? new ElevenLabsClient({
            apiKey: env.ELEVENLABS_API_KEY,
            maxRetries: 0,
            timeoutInSeconds: 15,
            logging: { silent: true },
          })
        : null;
    const audio = sdk
      ? await new Response(
          await sdk.textToSpeech.convert(
            env.ELEVENLABS_VOICE_ID || defaultElevenVoice,
            {
              text,
              modelId: env.ELEVENLABS_TTS_MODEL || voiceModels.elevenlabsTts,
              outputFormat: "mp3_22050_32",
            },
          ),
        ).arrayBuffer()
      : await providerSpeech(env, provider, text);
    console.log(
      JSON.stringify({
        provider,
        operation: "speech",
        status: "passed",
        bytes: audio.byteLength,
      }),
    );
    await mkdir(new URL("../../.deployment/voice/", import.meta.url), {
      recursive: true,
    });
    await writeFile(
      new URL(`../../.deployment/voice/${provider}.mp3`, import.meta.url),
      new Uint8Array(audio),
    );
    const transcript = sdk
      ? (
          await sdk.speechToText.convert({
            file: new File([audio], "sample.mp3", { type: "audio/mpeg" }),
            modelId: env.ELEVENLABS_STT_MODEL || voiceModels.elevenlabsStt,
            diarize: false,
            tagAudioEvents: false,
          })
        ).text
      : await providerTranscript(
          env,
          provider,
          new Blob([audio], { type: "audio/mpeg" }),
        );
    const useful =
      /park/i.test(transcript) && /(?:Bengaluru|Bangalore)/i.test(transcript);
    results.push({
      provider,
      status: useful ? "passed" : "review_transcript",
      models:
        provider === "sarvam"
          ? [
              env.SARVAM_STT_MODEL || voiceModels.sarvamStt,
              env.SARVAM_TTS_MODEL || voiceModels.sarvamTts,
            ]
          : [
              env.ELEVENLABS_STT_MODEL || voiceModels.elevenlabsStt,
              env.ELEVENLABS_TTS_MODEL || voiceModels.elevenlabsTts,
            ],
      generatedTestText: text,
      transcript,
    });
  } catch (error) {
    // SDK errors can include headers and request bodies: report only a numeric status.
    results.push({
      provider,
      status: "failed",
      httpStatus:
        typeof error?.statusCode === "number" ? error.statusCode : null,
      errorType: error?.constructor?.name || "Error",
    });
  }
}
await mkdir(new URL("../../.deployment/", import.meta.url), {
  recursive: true,
});
await writeFile(
  new URL("../../.deployment/voice-smoke.json", import.meta.url),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      syntheticSamplesOnly: true,
      hostedDatabaseUsed: false,
      results,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ results }));
if (results.some((result) => result.status !== "passed")) process.exitCode = 1;
