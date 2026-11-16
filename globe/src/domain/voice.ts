import { z } from "zod";

export const voiceProviderSchema = z.enum(["elevenlabs", "sarvam"]);
export type VoiceProvider = z.infer<typeof voiceProviderSchema>;
export const elevenVoiceSchema = z.enum(["jessica", "sarah"]);
export type ElevenVoice = z.infer<typeof elevenVoiceSchema>;
export const elevenVoices = {
  jessica: { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica · playful and warm" },
  sarah: { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah · calm and reassuring" },
} as const satisfies Record<ElevenVoice, { id: string; label: string }>;
export const voiceModels = {
  elevenlabsStt: "scribe_v3",
  elevenlabsTts: "eleven_v4",
  sarvamStt: "saaras:v4",
  sarvamTts: "bulbul:v4-flash",
} as const;
export const defaultElevenVoice = elevenVoices.jessica.id;
