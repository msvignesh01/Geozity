import { z } from "zod";

export const voiceProviderSchema = z.enum(["elevenlabs", "sarvam"]);
export type VoiceProvider = z.infer<typeof voiceProviderSchema>;
export const voiceModels = {
  elevenlabsStt: "scribe_v3",
  elevenlabsTts: "eleven_v4",
  sarvamStt: "saaras:v4",
  sarvamTts: "bulbul:v4-flash",
} as const;
export const defaultElevenVoice = "JBFqnCBsd6RMkjVDRZzb";
