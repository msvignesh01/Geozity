import { localEnv } from "./local-env.mjs";
import { generateIntent } from "../src/server/intent-provider.ts";

const env = { ...(await localEnv()), AI_MODEL: "sarvam-105b-conversations" };
const started = Date.now();
try {
  const intent = JSON.parse(
    await generateIntent(env, "बेंगलुरु में MG Road के पास parks दिखाओ।"),
  );
  const passed =
    intent.category === "park" &&
    /MG Road/i.test(intent.locationText) &&
    /Bengaluru|Bangalore/i.test(intent.locationText) &&
    intent.unsupported === false;
  console.log(
    JSON.stringify({
      provider: "sarvam",
      model: env.AI_MODEL,
      publicSamplePassed: passed,
      milliseconds: Date.now() - started,
    }),
  );
  if (!passed) process.exitCode = 1;
} catch (error) {
  console.log(
    JSON.stringify({
      passed: false,
      httpStatus:
        typeof error?.statusCode === "number" ? error.statusCode : null,
      type: error?.name || "Error",
    }),
  );
  process.exitCode = 1;
}
