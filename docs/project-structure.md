# Project structure

Checked 16 November 2026. Both application generations remain deliberately preserved.

| Path                                             | Responsibility                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| globe/src/App.tsx                                | Current search UI, state, cancellation, optional location and voice selection          |
| globe/src/components/Globe.tsx                   | MapLibre globe, markers, selection and map fallback                                    |
| globe/src/components/Voice.tsx                   | Consent, recording, cancellation and transcript review                                 |
| globe/src/domain/                                | Validated search/response contracts, categories, intent rules and voice model defaults |
| globe/src/server/app.ts                          | Hono API routes and request/session boundaries                                         |
| globe/src/server/maps.ts                         | Geoapify search, result normalization/ranking and article enrichment                   |
| globe/src/server/security.ts                     | Signed anonymous sessions and search context                                           |
| globe/src/server/budget.ts                       | Fail-closed Supabase usage reservations                                                |
| globe/src/server/ai.ts and intent-provider.ts    | Optional direct Sarvam interpretation                                                  |
| globe/src/server/voice.ts and voice-providers.ts | Audio validation, allowances and provider calls                                        |
| globe/worker.ts                                  | Cloudflare API entrypoint                                                              |
| globe/supabase/migrations/                       | Database setup SQL; review before applying to any shared project                       |
| globe/scripts/                                   | Local setting preparation and opt-in live AI/voice checks                              |
| globe/tests/                                     | Unit/integration, controlled browser and separate live tests                           |
| globe/vercel.json                                | Current website's API forwarding and headers                                           |
| globe/wrangler.toml                              | Hosted Worker configuration, account and non-secret limits                             |
| globe/wrangler.local.toml                        | Local website/Worker configuration                                                     |
| frontend/                                        | Earlier React 18 / Leaflet website, with its own manifest and Vercel config            |
| backend/                                         | Earlier Flask API, provider services and Python tests                                  |
| scripts/start-local.ps1                          | Earlier app's combined local startup                                                   |
| Dockerfile and render.yaml                       | Earlier app's container/Render deployment                                              |
| readme-assets/                                   | Six original progression screenshots                                                   |
| docs/                                            | Current user, engineering and operating references                                     |
| PRODUCT_PROGRESSION.md                           | Screenshot gallery with honest stage descriptions                                      |
| .deployment/                                     | Ignored local deployment/evidence files and preserved paused drafts; not shipped       |

The repository has no root package.json; run package commands in the intended app folder. Each frontend has its own pnpm lockfile. .env.local, .dev.vars, dependency directories and build/test outputs are ignored. Some historical planning/evidence documents are local-only under existing ignore rules. Documentation updates do not change those rules.

The future outing planner is not connected to the current source. Paused drafts were preserved locally outside globe/src; they are not shipped or part of the supported API.
