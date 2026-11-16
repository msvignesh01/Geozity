import { z } from "zod";
import { categorySchema, locationSchema } from "../domain/contracts";
import { PublicError } from "./config";

const encoder = new TextEncoder();
function base64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function unbase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(text.replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0),
  );
}
async function key(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}
export async function hash(secret: string, value: string): Promise<string> {
  return base64(
    new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        await key(secret),
        encoder.encode(value),
      ),
    ),
  );
}
export async function sign(secret: string, value: unknown): Promise<string> {
  const payload = base64(encoder.encode(JSON.stringify(value)));
  return `${payload}.${await hash(secret, payload)}`;
}
export async function verify(secret: string, token: string): Promise<unknown> {
  try {
    const [payload, signature, extra] = token.split(".");
    if (
      !payload ||
      !signature ||
      extra ||
      !(await crypto.subtle.verify(
        "HMAC",
        await key(secret),
        unbase64(signature),
        encoder.encode(payload),
      ))
    )
      throw new Error("signature");
    return JSON.parse(new TextDecoder().decode(unbase64(payload)));
  } catch {
    throw new PublicError(
      "INVALID_CONTEXT",
      "This search context expired or changed. Start a new search.",
      400,
      false,
    );
  }
}
const contextSchema = z.object({
  session: z.string(),
  expires: z.number(),
  category: categorySchema,
  location: locationSchema.nullable(),
});
export type Context = z.infer<typeof contextSchema>;
export async function readContext(
  secret: string,
  token: string,
  session: string,
): Promise<Context> {
  const parsed = contextSchema.safeParse(await verify(secret, token));
  if (
    !parsed.success ||
    parsed.data.session !== session ||
    parsed.data.expires < Date.now()
  )
    throw new PublicError(
      "INVALID_CONTEXT",
      "This search context expired. Start a new search.",
      400,
      false,
    );
  return parsed.data;
}
export function createContext(
  secret: string,
  session: string,
  category: Context["category"],
  location: Context["location"],
) {
  return sign(secret, {
    session,
    category,
    location,
    expires: Date.now() + 60 * 60 * 1000,
  });
}
