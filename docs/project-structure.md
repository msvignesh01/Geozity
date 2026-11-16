# Project structure

Checked 16 November 2026. Both application generations remain deliberately preserved.

| Path                                             | Responsibility                                                                                  |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| globe/src/App.tsx                                | Search/outing mode, state, cancellation, location, voice selection and speech/motion controls   |
| globe/src/components/Globe.tsx                   | MapLibre globe, markers, selection and map fallback                                             |
| globe/src/components/Voice.tsx                   | Consent, recording, cancellation and transcript review                                          |
| globe/src/components/OutingPlanner.tsx           | Confirmed outing form, reviewable description/transcript, drafts and targeted edits             |
| globe/src/domain/outing.ts                       | Outing schemas, hard/preference evidence rules, local-time conversion and opening-window checks |
| globe/src/server/outing.ts                       | Bounded candidate selection, session-bound signed drafts and edit orchestration                 |
| globe/src/server/routes.ts                       | Separate mode-specific Geoapify routing adapter and honest unverified legs                      |
| globe/src/domain/                                | Validated search/response contracts, categories, intent rules and voice model defaults          |
| globe/src/server/app.ts                          | Hono API routes and request/session boundaries                                                  |
| globe/src/server/maps.ts                         | Geoapify search, result normalization/ranking and article enrichment                            |
| globe/src/server/security.ts                     | Signed anonymous sessions and search context                                                    |
| globe/src/server/budget.ts                       | Fail-closed Supabase usage reservations                                                         |
| globe/src/server/ai.ts and intent-provider.ts    | Optional direct Sarvam interpretation                                                           |
| globe/src/server/voice.ts and voice-providers.ts | Audio validation, allowances and provider calls                                                 |
| globe/worker.ts                                  | Cloudflare API entrypoint                                                                       |
| globe/supabase/migrations/                       | Database setup SQL; review before applying to any shared project                                |
| globe/scripts/                                   | Local setting preparation and opt-in live AI/voice checks                                       |
| globe/tests/                                     | Unit/integration, controlled browser and separate live tests                                    |
| globe/vercel.json                                | Current website's API forwarding and headers                                                    |
| globe/wrangler.toml                              | Hosted Worker configuration, account and non-secret limits                                      |
| globe/wrangler.local.toml                        | Local website/Worker configuration                                                              |
| frontend/                                        | Earlier React 18 / Leaflet website, with its own manifest and Vercel config                     |
| backend/                                         | Earlier Flask API, provider services and Python tests                                           |
| scripts/start-local.ps1                          | Earlier app's combined local startup                                                            |
| Dockerfile and render.yaml                       | Earlier app's container/Render deployment                                                       |
| readme-assets/                                   | Six original progression screenshots                                                            |
| docs/                                            | Current user, engineering and operating references                                              |
| PRODUCT_PROGRESSION.md                           | Screenshot gallery with honest stage descriptions                                               |
| .deployment/                                     | Ignored local deployment/evidence files and preserved paused drafts; not shipped                |

The repository has no root package.json; run package commands in the intended app folder. Each frontend has its own pnpm lockfile. `.env.local`, `.dev.vars`, dependency directories, build/test outputs and the named historical root Markdown files remain ignored under the original rules. The original three build plans and historical evidence guides stay on disk but are not tracked. The previously tracked README retains its version from before the H1–H3 commit. Maintained public guidance lives in `docs/` and `PRODUCT_PROGRESSION.md`.

The outing planner is connected in this branch, including `/api/outing/create` and `/api/outing/edit`. Historical paused copies remain under ignored `.deployment/`; they are not runtime inputs. Current tests include search/provider/budget/voice regressions, outing scenarios, signed-edit/expiry cases and routing contracts. The new API requires an approved Worker release before it can work on a hosted website.
