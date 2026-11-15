import { z } from "zod";
import { categorySchema } from "../domain/contracts";
import type { Intent } from "../domain/intent";
import type { Env } from "./config";
import { reserve } from "./budget";
import { generateIntent } from "./intent-provider";

const intentSchema = z
  .object({
    category: categorySchema.nullable(),
    locationText: z.string().min(1).max(300).nullable(),
    nearMe: z.boolean(),
    unsupported: z.boolean(),
  })
  .strict();
export async function interpret(
  env: Env,
  client: string,
  question: string,
  fallback: Intent,
  generate: (env: Env, question: string) => Promise<string> = generateIntent,
): Promise<{ intent: Intent; mode: "ai_verified" | "rule_based" }> {
  if (env.ENABLE_AI !== "true" || !env.SARVAM_API_KEY || !env.AI_MODEL)
    return { intent: fallback, mode: "rule_based" };
  try {
    await reserve(env, client, "ai");
    const parsed = intentSchema.safeParse(
      JSON.parse(await generate(env, question)),
    );
    if (!parsed.success) throw new Error("Invalid intent");
    // Explicit rule matches win over conflicting model output; model only handles phrasing.
    return {
      intent: {
        ...parsed.data,
        category: fallback.category ?? parsed.data.category,
        locationText: fallback.locationText ?? parsed.data.locationText,
        unsupported: fallback.unsupported || parsed.data.unsupported,
      },
      mode: "ai_verified",
    };
  } catch {
    console.warn(JSON.stringify({ event: "ai_fallback" }));
    return { intent: fallback, mode: "rule_based" };
  }
}
