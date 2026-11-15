import { app } from "./src/server/app";
import type { Env } from "./src/server/config";

export default {
  async fetch(
    request: Request,
    env: Env,
    context: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/"))
      return app.fetch(request, env, context);
    return new Response("Not found", { status: 404 });
  },
};
