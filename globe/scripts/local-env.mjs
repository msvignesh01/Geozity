import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

export async function localEnv() {
  const settings = {};
  // Explicit root values win; empty root entries must not hide the CLI's key.
  for (const file of ["../.dev.vars", "../.env.local", "../../.env.local"]) {
    try {
      const parsed = parseEnv(
        await readFile(new URL(file, import.meta.url), "utf8"),
      );
      for (const [name, value] of Object.entries(parsed))
        if (value.trim()) settings[name] = value.trim();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return settings;
}
