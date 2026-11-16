import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === "serve"
      ? [
          cloudflare({
            inspectorPort: false,
            configPath: "wrangler.local.toml",
          }),
        ]
      : []),
  ],
  server: { port: 8780, strictPort: true },
}));
