import { PublicError } from "./config";
export async function upstream(
  url: string,
  init: RequestInit = {},
  timeout = 6000,
  deadline?: number,
): Promise<Response> {
  const remaining =
    deadline === undefined ? timeout : Math.min(timeout, deadline - Date.now());
  if (remaining <= 0)
    throw new PublicError(
      "PROVIDER_TIMEOUT",
      "The search took too long. Please try again.",
      504,
    );
  try {
    const response = await fetch(url, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(remaining),
    });
    if (!response.ok) {
      console.warn(
        JSON.stringify({
          event: "upstream_http_error",
          status: response.status,
        }),
      );
      throw new PublicError(
        response.status === 429 ? "PROVIDER_LIMIT" : "PROVIDER_UNAVAILABLE",
        response.status === 429
          ? "The map or voice provider has reached its allowance. Please try again later."
          : "A service could not complete the request. Please try again.",
        response.status === 429 ? 429 : 502,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof PublicError) throw error;
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    )
      throw new PublicError(
        "PROVIDER_TIMEOUT",
        "The service took too long. Please try again.",
        504,
      );
    throw new PublicError(
      "PROVIDER_UNAVAILABLE",
      "A service could not be reached. Please try again.",
      502,
    );
  }
}
export async function jsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new PublicError(
      "INVALID_PROVIDER_DATA",
      "A service returned unreadable data. Please try again.",
      502,
    );
  }
}
