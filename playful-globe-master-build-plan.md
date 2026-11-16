> Current status — 16 November 2026: Geozity H1–H3 implementation is on the `h1-h2-h3` branch. It passed 104 unit/integration tests and 42 controlled desktop/mobile browser cases; live routing/rehearsals and human/device acceptance remain pending. The deployed app is still the earlier Version 1 checkpoint. Approved stack overrides the historical text below: React/TypeScript/Vite with MapLibre/OpenFreeMap on Vercel, Hono on Cloudflare Workers, Supabase usage storage, and direct Sarvam/ElevenLabs. DeepSpace is not used. H4–H6 remain later horizons. The corrected Option B plan governs over earlier proposals; user-approved changes govern over both. Historical ownership/technology/proposed gates below are retained as planning history, not current deployment or acceptance claims. See [current verification](docs/verification.md) and [documentation](docs/index.md).

> Superseded status note (before H2/H3 resumed) — 16 November 2026: This is a retained planning document, not an implementation or release certificate. Geozity is currently limited to the Version 1 hackathon scope: existing globe, live place search, place details and optional voice. H2 outing planning and further H3–H6 work is paused until the owner resumes it. The corrected Option B product intent remains long-term direction. Later approved stack decisions supersede historical DeepSpace references: Vercel website, Cloudflare API, Supabase usage storage and direct Sarvam/ElevenLabs calls. No DeepSpace runtime is required. Main now contains both application generations after merge 90c3c42; screenshot V1/V2 labels are interface stages. See docs/index.md for current operating guidance. The original plan text below is preserved.

# Playful Globe — Master Product and Engineering Plan
## Hackathon delivery → trusted planning companion → social discovery product

Version: 2.0 | Written: 12 November 2026 | Status: proposed implementation contract, not evidence of implementation
Owner: M S Rishav Subhin | Readers: human builders, AI coding agents, reviewers, future operators

> Build the playful globe, not a clone. Ship a stable location assistant for the hackathon. Preserve the full planning, voice, collaboration, and discovery vision behind explicit completion and safety gates. A milestone is a stopping point, not a permanent scope restriction.

## 0. Read this before building

This document supersedes the fixture-first plan. That earlier plan incorrectly made live location data optional and prioritized private sharing before the challenge's central requirement. The corrected first milestone answers location questions using real provider results and synchronized map markers. Fixtures are for tests and explicitly labelled fallback demonstrations only.

This file is a plan, not authorization to create accounts, incur charges, publish an app, change a repository, alter permissions, delete scaffolding, or change stored data. Those actions require approval through the engagement's consent process. No repository has been surveyed for this revision; no application has been built or tested. No performance claims below are measured results. Thresholds are proposed acceptance targets.

The supplied challenge specifies a chat-plus-map assistant, live map answers, real markers, distance/address/opening information where available, and any searchable city. It lists React + Flask + Nominatim + Overpass + Leaflet. Whether that technology list is mandatory remains unresolved. Human owner must confirm organizer rules before implementation. If mandatory, record the resulting architecture change; do not silently substitute technologies or pretend compliance.

### 0.1 Product commitments versus engineering choices

Confirmed direction: playful globe; eventual social discovery/planning companion; DeepSpace selected by owner as backend platform; stable hackathon checkpoint; long-term vision retained.

Proposed defaults, not confirmed demographic or launch decisions: text first; guest location search; no accounts required for search; open map stack; Geoapify live data; friends-first social pilot; Bengaluru as primary validation area, not hard-coded geographic limit.

Unresolved: app name, repository identity, deadline, team size, judging rules, age minimum, launch countries, target phone, spend ceiling, social mode after friends pilot, paid account entitlements. Do not infer approval from this document.

## 1. Product vision and north star

A person speaks or types an intention, explores real possibilities on a playful globe, and turns those possibilities into an editable plan they can refine with friends. The experience should feel expressive and spatial, not a generic chatbot pasted over a map. Personality comes from typography, color, camera choreography, mascot reactions, restrained sound, and meaningful motion.

The product must earn trust before adding intimacy, autonomy, or viral distribution. It must not fabricate a place, conceal uncertainty, misrepresent provider data as live availability, or make private location details public to drive growth.

### 1.1 North-star measurement

Long-term candidate metric: completed useful plans per active planning group per week. Define a useful plan as one the group explicitly saves or confirms as useful, not merely a generated answer. Hackathon metric: successful location-answer tasks with valid retrieved places, correct markers, and a usable answer. Generated tokens, pin counts, registrations, and shares alone are not success.

### 1.2 Audiences and safety boundaries

The original vision includes teenagers and people in their twenties. Do not silently redefine eligibility as 16–30. Actual minimum age and supported markets require a deliberate decision and provider/legal review before a real-user pilot. Manual area entry must work without precise device location. No home/school discovery, background location trails, live people dots, or public minor routes by default.

### 1.3 Product horizons

| Horizon | Outcome | Stop/release rule |
|---|---|---|
| H0: readiness | Rules, repository, platform, data feasibility understood | No material implementation while blocking unknowns remain |
| H1: hackathon | Real location question → grounded answer → map/results | Stop adding features when H1 is stable; rehearse and fix defects |
| H2: useful planner | Evidence-backed multi-stop outings with checked travel | Launch controlled testing only after constraint tests pass |
| H3: voice/personality | Optional push-to-talk and speech using same pipeline | Text fallback and privacy controls always available |
| H4: private social | Revocable invites, votes, suggestions, conflict-safe edits | Isolation and revocation tests pass |
| H5: public discovery/growth | Explicit publication, sanitized shared plans, moderation | Youth/privacy/moderation/operational readiness gate |
| H6: broader platform | Additional cities, deeper personalization, optional native/commerce | Each expansion must justify cost, risk, and demand |

H2–H6 are retained in this plan. They are not prerequisites for H1. Do not build their databases, buttons, routes, queues, or SDK integrations prematurely.

## 2. Stack decision and evidence policy

### 2.1 Selected stack

| Layer | Selection | Decision / condition |
|---|---|---|
| Browser | React + TypeScript + Vite from DeepSpace scaffold | Keep scaffold conventions and strict types; pin actual installed versions |
| Styling | Scaffold Tailwind v4, theme variables, existing UI primitives | Do not add a competing component system |
| Motion | CSS and MapLibre camera APIs initially | Add one animation library only if concrete interactions need it and approved |
| Globe/local map | MapLibre GL JS | Version-specific globe/terrain/mobile compatibility spike required |
| Basemap | OpenFreeMap prototype endpoint | Verify current terms, attribution, hosting limits; configurable style URL; no assumed SLA |
| Worker | DeepSpace scaffold's Hono worker on Cloudflare Workers | Owner's platform choice; verify runtime paths in actual SDK |
| Application persistence | DeepSpace SQLite-backed RecordRoom data | Use only when a phase requires persistence; not Postgres/PostGIS |
| Live geocoding/POIs | Geoapify via server adapters | Selected first candidate; verify exact endpoint schemas, keys, pricing, and local quality before coding adapter |
| AI | OpenAI behind server-only provider interface | Choose eligible model after quality/cost/youth review; model ID configured, not invented |
| H1 AI role | Structured intent extraction and grounded response generation | No autonomous arbitrary tools; deterministic verified search remains available when AI fails |
| H2 routes | Geoapify routing candidate through separate adapter | Verify modes, endpoint, travel estimates, terms before implementation |
| H3 voice | Server transcription + optional TTS | Provider selected after privacy/youth review; no browser SpeechRecognition dependency |
| Testing | Scaffold Vitest + Playwright; DeepSpace testing helpers when needed | Verify commands from actual package scripts; use multi-user helpers for H4 |
| Observability | Structured redacted request/error/cost events | Error vendor later only after data-handling and cost review |
| Deploy | DeepSpace-approved deployment path | Read current quickstart; account, URL exposure, billing and environment require approval |

This is the best-fit recommendation for the stated direction, not a claim that benchmarks have established a universal winner. Google remains a comparison/fallback data path if open local-place quality fails. Do not build two complete maps at once.

### 2.2 Verified DeepSpace facts

Official documentation checked for this revision:
- SDK provides a Vite/React frontend, Hono worker, collection permissions, SQLite-backed sync, auth, presence, collaborative primitives, and deployment [S1].
- Actual scaffold entry point is `worker.ts`; worker route modules live in `src/server/`; collection exports in `src/schemas.ts`; file-based pages in `src/pages/` [S2].
- Root static pages have no auth/data providers. `(app)` pages have providers and can render signed out; protected pages are gated by a real AuthGate layout, not by the folder name alone [S2].
- Collection permissions operate server-side; privileged server actions can bypass them, so custom actions must enforce their own authorization and project returned fields [S3].
- `uniqueOn` and `userBound` can support one-vote-per-user constraints, but do not themselves establish plan membership [S3].
- Default users roster can expose public identity projection across the app. Private-room directory isolation needs explicit design; full users collection must not be member-readable [S3].

Do not turn documentation into claims about our implementation. In particular, collection-level permissions do not automatically implement parent-plan joins, separate room-specific viewer/editor roles, invite redemption, atomic multi-record edits, or plan revisions. Prove those capabilities in a spike or enforce them in worker commands and an app-owned room.

### 2.3 Live data choice

Geoapify documents category, radius, city/geometry, and proximity searches plus details where available; data completeness varies [S4]. Geocoding and exact request options still require the endpoint documentation. Do not treat marketing examples as a complete contract.

Do not default to public Nominatim as infrastructure. Its public policy caps the entire application at one request/second, forbids autocomplete, requires identification/attribution, restricts generic platform integration and sensitive input, and requires switching capability [S5]. This plan does not authorize its use. If organizer mandates it, obtain informed selection, implement an app-wide limiter, no autocomplete, and document compliance. Public Overpass is not a limitless production database; inspect service-specific policy before any use.

### 2.4 Sources / freshness ledger

[S0] Supplied challenge image, “14 Location-Based Smart Assistant.”
[S1] https://docs.deep.space/ — checked 12 November 2026.
[S2] https://docs.deep.space/get-started/project-structure — checked 12 November 2026.
[S3] https://docs.deep.space/concepts/permissions — checked 12 November 2026.
[S4] https://www.geoapify.com/places-api/ — checked 12 November 2026.
[S5] https://operations.osmfoundation.org/policies/nominatim/ — checked 12 November 2026.

Reverify before implementation: OpenFreeMap terms, MapLibre exact version/globe guide, Google display/storage/AI rules, OpenAI youth/data policies and models, speech APIs, Geoapify endpoint pricing, DeepSpace integrations/billing/deployment/runtime, launch-market legal requirements. Earlier conversation citations are not a substitute for checking current docs. No performance bake-off, account entitlement check, or legal clearance has occurred.

## 3. H1 — hackathon product contract

### 3.1 Required journey

1. Open app as a guest; see question field, playful globe, example questions, attribution.
2. Ask “Parks in Bengaluru” or “Nearest hospital to MG Road, Bengaluru.”
3. Resolve location; ask a compact clarification if ambiguous or missing.
4. Interpret category with real AI when configured; validate into allowlisted search parameters.
5. Search live provider with bounded calls.
6. Normalize actual records; reject invalid coordinates; retain evidence/provider identifiers.
7. Fit map to results, render matching cards/markers, show short grounded answer.
8. Select marker/card to inspect address, distance basis, and available opening information.
9. Refine “cafes instead” or “closer” while preserving confirmed area, unless user changes it.
10. Recover from no results, denied GPS, provider outage, invalid query, or failed map without fake success.

### 3.2 H1 scope and nonrequirements

Required: text question flow; live geocoding; live POIs; real map markers; address and opening information if supplied; straight-line distance clearly labelled; multi-city architecture and evaluation; guest-safe API; grounded AI path; no-result/failure UX; mobile/reduced-motion/list fallback; attribution; quotas; deploy smoke test; honest presentation.

Not required for H1: accounts, saved plans, invites, realtime collaboration, itineraries, route duration, voice, public feed, Wikipedia enrichment, photos, payments, bookings, precise location persistence. Keep all on future roadmap; do not wire empty controls for them.

Optional H1 device location: one deliberate “Use my location” request only. Manual city/area remains primary. Denial never blocks search. For nearest questions without a point, ask for one. A city centroid is not “your location.”

### 3.3 Supported question classes

Start with hospitals, parks, cafes, restaurants, pharmacies, museums, and attractions. Store internal category keys and separately verified provider mappings; no guessed external taxonomy strings. Permit named cities worldwide where the provider resolves them. Unsupported category → explanation with supported alternatives. Out-of-domain question → politely explain location scope. Venue-specific and contextual-history questions can wait unless reliably supported.

Do not equate “any searchable city” with perfect worldwide coverage. Evaluate multiple cities and show coverage limitations. Never silently fall back to Bengaluru.

### 3.4 Honest result semantics

“Live search” means a current API retrieval, not a real-time audit of the business. Display retrieved-at time; business data may be stale. Unknown hours stay unknown. Display provider-supplied hours text safely; do not evaluate arbitrary opening expressions until parser and timezone handling are tested. Do not claim open now, accessible, dietary-safe, cheap, highly rated, or stocked without evidence. Basic category matching cannot prove atmosphere, social suitability, or availability.

Distances: compute geodesic straight-line meters from a stated reference point; label “approx. straight-line from [reference].” City search may omit distance or use city center with explicit label. Route distance and travel time are H2, not derived by multiplying straight-line distance. For nearest search, retrieve a bounded candidate set and sort; label “closest returned results,” not guaranteed globally closest.

Hospital results: identify facilities, not emergency triage. Do not state ambulance availability or suitability. State that search may be incomplete and urgent users should contact local emergency services; do not invent a universal emergency number. Avoid playful celebration on urgent medical queries.

## 4. Architecture and boundaries

Browser → DeepSpace worker → intent adapter + location adapter + POI adapter → normalized answer → browser map/cards.

The map owns camera/interaction, not data authority. The worker owns validation, spend limits, provider credentials, evidence validation, and later authorization. LLM interprets or summarizes; it never owns coordinate selection or database writes. Provider text is untrusted data, never tool instructions.

### 4.1 Layers

- UI: question composer, conversation state, cards, map, details, feedback.
- Application: search state machine, clarification/refinement, request cancellation, view selection.
- Worker: request policy, provider orchestration, bounded evidence, error mapping.
- Domain: normalized intent/place/evidence/distance types, pure filter/ranking rules.
- Adapters: Geoapify geocode/POI/details; OpenAI intent/summary; fixtures only in test/demo mode.
- Future modules: itinerary, routes, voice, persisted plans, room membership, publication/moderation.

Do not introduce Kafka, Kubernetes, vector DB, Python microservices, agent swarm, or dual identity systems to prepare for hypothetical scale. Add complexity after measured bottlenecks or explicit requirements.

### 4.2 Proposed scaffold-compatible layout

Preserve actual generated paths; this is a guide, not permission to overwrite files:

    worker.ts
    wrangler.toml
    src/pages/index.tsx                  static entry, no SDK data/auth hooks
    src/pages/(app)/explore.tsx          guest-capable search experience
    src/pages/(app)/(protected)/...      later saved plans/account screens
    src/server/http-routes.ts           verified custom route wiring
    src/server/location/                orchestration, adapters, quotas
    src/domain/location/                pure contracts, distance, evidence
    src/features/explore/               question/results state machine
    src/components/map/                 lazy map + fallback
    src/components/ui/                  existing scaffold primitives
    src/schemas.ts                      later collections registry
    src/schemas/                        later app schemas
    tests/unit/ tests/integration/       planner/data/policy tests
    tests/e2e/                          browser flows, actual configured runner
    docs/                               decisions, test evidence, runbooks

Do not manually edit generated router files. Existing feature-surface stubs from scaffold must be inventoried; remove unused surfaces only after reference checks and approval. Never remove Durable Object declarations/bindings merely because unused in UI; persisted classes have lifecycle risks [S2].

## 5. Domain contracts and API

These are application-owned proposed contracts, not DeepSpace SDK API names.

### 5.1 Core normalized types

GeoPoint: latitude [-90,90], longitude [-180,180], finite numbers. GeoJSON coordinate order is longitude then latitude; adapter conversion is centralized and tested.

LocationReference: kind (manual-area | device-point | selected-place); display label; point; optional bounding geometry; provider reference; resolution confidence. Device origin is request-scoped by default.

SearchIntent: question; category enum; location text or reference; requested radius; optional named-place string; supported filters; explicit constraints; inferred preferences; clarification requirements. Provider-specific keys never originate directly from model output.

Place: internal response ID; provider enum; provider place ID; name or honest unnamed label; coordinates; categories; address nullable; hours nullable; contact nullable; distance nullable with basis; retrievedAt; source attribution; evidence fields; mode live/cache/demo.

SearchResponse union:
- ready: requestId, resolvedLocation, places, answer statements, unknowns, data mode, attribution.
- needs_clarification: requestId, question, bounded choices.
- no_results: requestId, searched location/categories/radius, truthful alternatives.
- failed: requestId, stable error code, safe message, retryability.

Each answer statement references actual result IDs and evidence fields. No result may contain a model-invented provider ID or coordinate. A cached result has a cache timestamp distinct from provider retrieval timestamp. H1 default is no persistent query/coordinate history.

### 5.2 Proposed worker endpoints

| Endpoint | Contract | Protection |
|---|---|---|
| GET /api/health | Public readiness without credentials/config details | Minimal response; no provider charge |
| POST /api/location/search | Question + selected reference + bounded context | Body limit, rate limit, budget, allowlisted tools |
| POST /api/location/details | Provider place reference from prior server-issued result | Validate reference/signature/session binding; bounded detail calls |
| POST /api/location/clarify | Request context + selected clarification | Validate context; never trust role/tool URLs |

One endpoint can implement search+clarification if simpler; do not build duplicate orchestration. If prior-result binding uses a signed short-lived context token, validate integrity/expiry and put no secrets in it. Never trust arbitrary coordinates/URLs as privileged provider instructions.

Successful application states use explicit typed bodies; validation 400, malformed JSON 400, payload too large 413, quota 429, upstream unavailable 502/503, upstream timeout 504 according to implemented semantics. Do not expose provider stack traces, keys, raw upstream errors, or private existence. Later private resources consistently hide existence from unauthorized callers.

### 5.3 Proposed H1 bounds

Defaults to validate under actual account plan, not vendor guarantees:
- Question max 1,000 characters; body max 16 KiB; context max six turns.
- Up to five geocoding choices; ten initial results; twenty maximum.
- Radius options 1/3/5/10 km; 25 km hard ceiling unless intentional area search.
- At most two model calls, one geocode call, one POI call per search; details only after selection.
- No infinite pagination, automatic radius expansion, arbitrary Overpass queries, or automatic provider fallback.
- Geocode/POI call timeout 6 seconds; model timeout 8 seconds; total request deadline 20 seconds. Fit actual runtime and cancellation support.
- Default zero automatic retries in H1; user-triggered retry is budgeted. Any later retry uses jitter, max attempts, remaining deadline and idempotency where writes exist.
- Shared provider limiter must match actual account quota; per-client limits alone cannot protect shared quota.
- Newer question cancels/invalidates older request; stale response must not move camera or replace cards.

Guest protection: trusted platform-derived network identity plus short-lived opaque session identifier and shared global budget; do not trust arbitrary forwarding headers. IP controls can affect shared campus networks; combine conservative session limits and graceful messaging. Abuse protection is required even without sign-in.

## 6. Search, AI, ranking, and map state machines

### 6.1 Search pipeline

1. Validate input, body size, session and budgets before any paid call.
2. Normalize Unicode/whitespace without changing place meaning.
3. Extract allowlisted structured intent. Rule-based common category fallback exists when model unavailable and is labelled non-AI fallback.
4. Ask for consequential missing inputs; preserve confirmed location and never infer private facts.
5. Resolve location using provider, displaying ambiguous choices with country/region.
6. Search bounded area/category, capture attribution and retrieval timestamp.
7. Validate feature geometry, normalize nullable fields, deduplicate by provider ID, reject malformed records.
8. Enforce supported hard constraints; unknown does not satisfy a required constraint.
9. Rank transparently: category fit, reference distance where meaningful, requested verified filters; no fabricated popularity score.
10. Generate answer from only returned evidence or use deterministic summary if model fails.
11. Validate answer references and permitted claims; fallback if unsupported.
12. Return response; client updates cards/markers together using request ID.

### 6.2 UI states

idle → submitting → interpreting → clarifying OR finding → ready/no-results/failed. Cancellation is explicit. Model token animation must not imply completed retrieval. Accessible status announcements are concise. Retry preserves input. Empty query never starts search. Invalid input never looks like a provider outage.

### 6.3 Map states and performance

globe-idle → user-controlled → flying-to-area → local-results → selected-place. Ambient rotation stops on interaction and respects reduced motion. New results fit one bounded region; do not fly between opposite hemispheres because malformed geometry slipped through. Keep one WebGL renderer; unmount/dispose cleanly. Do not load Sentinel's Three.js globe beside MapLibre.

Render synchronized numbered markers/cards; selection is URL/UI state where useful, not a database mutation. Handle antimeridian, polar/extreme latitudes, identical coordinates, one result, zero results, long labels, and map lifecycle errors. WebGL failure leaves a functioning result list. Map tile failure does not hide successful live search results. Never request background map searches on every pan in H1; explicit “Search this area” can be later controlled feature.

### 6.4 Mobile/accessibility targets

360 px viewport without horizontal overflow; touch targets generally 44×44 CSS px; labelled controls; visible focus; keyboard list alternative; contrast at least WCAG AA; reduced-motion nonanimated camera alternative; no required sound. Reserve attribution area even with bottom sheets. Safe-area-aware composer and sheet. No heavy globe effect blocking first question input.

## 7. H1 acceptance contract and evaluation

Every criterion needs recorded evidence: commit/version, environment, device, date, expected/actual result. Build pass alone is insufficient.

| ID | Criterion | Pass definition |
|---|---|---|
| H1-01 | Live search | Actual provider response yields real result IDs and markers; no fixtures on live path |
| H1-02 | Location clarity | Missing/ambiguous locations ask clarification; wrong city never silently chosen |
| H1-03 | Geographic reach | At least five distinct cities including Bengaluru, another Indian city and a non-Indian city tested; not hard-coded |
| H1-04 | Category reach | Hospitals, parks, cafes, restaurants, pharmacies, museums, attractions tested where data exists |
| H1-05 | Grounding | Zero invented venues/coordinates/hours/ratings in regression set |
| H1-06 | Marker/card agreement | Every card selects its matching marker and vice versa; missing map still supports list |
| H1-07 | Details | Available address/hours displayed; missing values visibly unknown |
| H1-08 | Distance | Correct reference and straight-line label; no unverified travel-time claims |
| H1-09 | Failure paths | Timeout, 429, invalid JSON, no results, AI failure, denied GPS, tile failure all recover honestly |
| H1-10 | Stale requests | Older response cannot replace newer query or selected location |
| H1-11 | Privacy/security | Keys absent from browser/source/logs; no default location history; guest quota enforced |
| H1-12 | Device usability | Actual target Android phone plus desktop pass main flow and fallback |
| H1-13 | AI authenticity | Real configured AI path demonstrated; deterministic fallback not mislabelled AI |
| H1-14 | First-use utility | At least 4 of 5 first-time testers complete assigned search without coaching within 60 seconds |
| H1-15 | Stability | Ten consecutive end-to-end rehearsal runs complete correctly; failures trigger fix/retest |
| H1-16 | Attribution | Correct basemap/data attribution visible in mobile and desktop layouts |
| H1-17 | Cost | Tool call count bounded, quota rejection tested, global kill switch tested |

Suggested performance targets to measure, not promises: input interactive within 3 seconds on agreed phone/network; warm common-search p95 under 12 seconds across at least 30 measured runs; visible usable failure by 20-second deadline; no repeated long UI freezes during camera movement. Report network conditions and sample size; do not claim universal performance from one laptop.

### 7.1 Evaluation dataset

Version a test-question manifest with ID, input, category, area, expected state, constraints, evidence expectations, and notes. Minimum 30 cases: 10 ordinary category/location searches, 5 location ambiguities/missing references, 5 refinement/distance questions, 5 failure/coverage cases, 5 adversarial/unsafe/unsupported cases. Include “parks in Bengaluru,” “hospital near MG Road Bengaluru,” “cafes instead,” “parks near me” without permission, an ambiguous Springfield, a misspelled city, an unsupported category, a rural area with sparse POIs, a prompt asking model to invent a venue, and oversized input.

Live provider changes mean exact result names/counts are not stable golden assertions. Assert invariants, category/area correctness and evidence; manually sample top results against provider records. Integration fixtures are sanitized recorded/synthetic responses, isolated from production mode and compliant with provider retention terms.

### 7.2 Test layers

Unit: category mapping; coordinate conversion; distance math; parsing; constraints; evidence references; sorting; state transitions; request race handling.
Adapter contract: provider 200/empty/malformed/429/5xx/timeouts; missing name/address/hours; invalid geometry; duplicate IDs; no secrets in errors.
Worker integration: invalid bodies and budgets reject before paid calls; detail-reference tampering denied; kill switch fail closed; limited context; max tool fan-out.
Browser: guest search, clarification, card/marker selection, input during pending query, mobile sheet, map failure, keyboard, reduced motion, no-result, denied location.
Security: prompt injection in provider text, HTML in names, arbitrary URL attempts, fake forwarded identity, session quota abuse, browser key scan, logs redaction.
Later social: two included users plus an excluded third; raw WebSocket/API access, not merely hidden buttons; revocation/reconnect and forged membership tests.

## 8. Implementation work breakdown — human + agents

### 8.1 Ownership

Human product owner: judging rules, user scope, budgets, naming, account ownership, approval of external writes, target-device access, product feedback, launch eligibility decisions.
Lead integration agent/human engineer: survey, contracts, dependency decisions, task allocation, integration, security review, final evidence. Do not pretend an AI is a licensed professional or legal approver.
Specialist tasks: UI/map, worker/data, testing/release. Each specialist receives file ownership, contract version, acceptance IDs, allowed tools, and explicit no-go changes.

One writer per shared file. Shared `worker.ts`, `src/schemas.ts`, package manifest, routing/layout, and adapter contracts are integration-owner controlled. Parallelize independent reads/tests/UI modules only after contracts agree. No agent silently changes another agent's contract.

### 8.2 Required pre-write survey each session

Inspect root apps/packages/services/docs/infra/scripts; manifests/lockfiles/version constraints; README/AGENTS/CLAUDE/contribution/runbooks; entry points; config/env templates/CI/deploy; data schemas and change history; identity/permissions/tenant boundaries; shared helpers/twins; tests/commands; dead or hanging surfaces. Do not print live secrets.

Produce project map: plain product description, moving parts, healthy areas, risks, inaccessible unknowns, excluded scope, requested changes. Revalidate branch/commit and uncommitted work before edits. Large repo survey in passes, without silently ignoring top-level apps. Sentinel identity is unconfirmed; no reuse/deletion or claims of review based on prior messages.

### 8.3 Task packet template

Task ID / horizon / owner / prerequisites / current commit.
User outcome and explicit exclusions.
Files allowed; shared contracts used; externally visible behavior changes.
Exact acceptance criteria and automated/manual tests.
Risk and reversibility; approval reference if needed.
Documentation updates and evidence artifact location.
Completion status: NOT STARTED / IN PROGRESS / BLOCKED / BUILT UNVERIFIED / VERIFIED.

### 8.4 Ordered H0/H1 tasks

| Task | Deliverable | Depends | Verification |
|---|---|---|---|
| T00 | Confirm rules, deadline, stack substitution, spend/device | Human | Written decision record |
| T01 | Repo/platform survey and project map | Repo identified | All survey categories covered, unknowns named |
| T02 | SDK spike: local boot/build, guest HTTP route, deployment feasibility | T01/approved account actions | Current SDK/scripts documented; no fake capabilities |
| T03 | Provider spike: geocode/POI/details and field audit | Key/account approval | Five-city sample, rates, attribution and missing fields recorded |
| T04 | Contracts, query manifest, call budgets | T02/T03 | Reviewed domain types and error union |
| T05 | Map spike and list fallback | T04 | Actual phone globe/local transition and WebGL failure |
| T06 | Live adapters + validation + quotas | T04 | Adapter/integration tests; no leaked keys |
| T07 | AI extraction/grounded summary + deterministic fallback | T06/model approval | Injection tests, no invented evidence, bounded calls |
| T08 | Search UI/state machine/cards/map synchronization | T05/T06 | Guest flow, stale-query and accessibility tests |
| T09 | Details/refinement and all failure states | T07/T08 | H1-02/07/08/09/10 pass |
| T10 | Security/performance/mobile polish | T09 | Evaluation and device report |
| T11 | Approved deployment, smoke test, rollback plan | T10/deploy consent | Fresh guest session on actual URL |
| T12 | Rehearsals, pitch, recorded labelled fallback | T11 | H1 acceptance checklist and ten rehearsal runs |

No trustworthy calendar estimate until deadline/team constraints and spikes are known. Estimate each task after T02/T03; maintain risk buffer. If time shrinks, cut ornament and optional GPS before live data, grounding, mobile usability, error handling, attribution, or spend controls.

### 8.5 Hackathon stop rule

Once H1 gates pass, freeze features. Only defect fixes, performance/accessibility improvements, rehearsal, documentation and pitch work remain until submission. H2 work starts afterward unless the owner explicitly approves changing the freeze. A labelled recording/fixture fallback is insurance, not proof the live-data requirement works.

## 9. H2 — real outing planning, retained in full

Outcome: request an occasion/atmosphere/budget/time/transport and receive a small feasible, editable sequence based on real places and checked travel.

Pipeline: capture request → structured intent → clarify consequential inputs → bounded candidate search → details evidence → hard constraint filtering → ranking soft preferences → route legs → intended-time hours checks → plan with unknowns/alternatives → targeted refinement.

Required input model: city/area; date/local timezone when scheduling; group size; transport; budget/currency when important; accessibility/dietary hard constraints; occasion; stated vs inferred preferences. No assumption of relationship history from an anniversary example. Ask at most one compact batch of consequential clarifications.

Hard constraints only pass when evidence supports them. Unknown dietary suitability cannot pass “must be safe for allergy.” Provider price band is not a menu quote. Dessert category does not prove cupcake stock or surprise arrangements. Do not guarantee reservations, availability or exact spend.

Route design: separate provider adapter; explicit travel mode; travel estimates not guarantees; dwell times; opening windows at intended time; timezone-aware edge conversions; no UTC/local confusion. Infeasible route returns explanation, narrower plan or alternative—not hidden constraint violations. Cache routing only where terms allow, with freshness and input key. Cap stops initially at five and route legs accordingly.

Plan edit model: stable stop IDs, order, reasons, selected alternatives, evidence, unresolved facts, revision. Refine affected stops without resetting the whole plan. Save only provider fields allowed by terms. Version evidence separately from user notes.

H2 success: 20 outing scenarios including late-night closure, time zone/date boundary, no route, sparse data, hard budget unknown, accessibility unknown, and a stop removal; no invented venue/stock/opening claims; every route leg checked or visibly unverified; hard-constraint failures explicit; changing one stop preserves unaffected choices; measured cost per useful plan within approved target.

## 10. H3 — voice and personality

Push-to-talk → visible recording → stop → server transcription → editable transcript → same planner/search pipeline → optional disclosed AI voice. No always-listening wake-word promise, no hidden microphone activation, no raw audio retention by default.

Requirements: explicit recording permission and unmistakable state; cancel; transcript repair; retry; text alternative; speech stop control; output volume/mute; avoid automatic speech on page load. Handle noisy venue, accents, interrupted upload, empty audio, duration/size limits, denied microphone, unsupported format, transcription uncertainty. Set audio duration cap and usage budget before shipping.

Use provider interface for transcription/TTS, no keys in browser. Verify provider youth/data rules and integration-proxy data flow; a proxy does not erase provider terms. Streaming speech-to-speech is a separate latency/interruption/safety spike, not automatic next step.

Personality: warm, witty, expressive but not emotionally exclusive or manipulative, especially for minors. No streak pressure or guilt. Context-sensitive tone for medical/safety queries. Sound/motion preferences persisted only with appropriate user control.

H3 success: editable text fallback works for every voice failure; no invisible recording; no retained raw audio contrary to policy; measured transcription accuracy on agreed test utterances; interruptions reliably stop playback; accessibility unchanged; AI-voice disclosure visible.

## 11. H4 — private social planning

Friends-first is a proposed lowest-risk mode, not permission to implement stranger features. Introduce auth only when saving/sharing requires it. Configure email/account recovery and production delivery deliberately; test recovery and session expiry.

### 11.1 Logical entities (not promised SDK schema syntax)

Profile: minimal display identity, safety/age-band state if needed; no unnecessary birth date or public school/home.
Plan: owner, title, constraints, timezone, status private/draft/archived, revision, timestamps.
Membership: plan ID, user ID, plan role owner/editor/viewer, active/revoked state, timestamps.
Stop: stable stop ID, plan ID, provider reference, allowed evidence snapshot, order, duration, notes, version.
Vote: plan ID, stable stop ID, authenticated user ID, value, timestamps. Unique per user+stop+plan.
Suggestion: target plan/revision/stop, proposed edit, author, accepted/rejected state.
Invitation: plan, creator, role granted, token hash, expiry, use limit, revoked state.
Report: reporter, target reference, reason, triage state, restricted access.
Access event: minimal security event, subject reference, actor, timestamp; retention defined.

Do not store plaintext invite tokens or email addresses in public payloads. Signed URLs are bearer capabilities until redeemed; define one-time/limited use deliberately. Shared links must not be auto-published or exposed in previews/logs.

### 11.2 Authorization design

App-global DeepSpace roles are not equivalent to plan-specific roles. Do not promote a user globally to admin to let them edit one plan. Scope each read/write to plan membership. Prevent client edits to owner, collaborators, role, status, invite authority and publication fields.

DeepSpace `shared` can include a visibility rule; for genuinely private rows choose/verify owner+collaborator-only semantics and never accidentally enable public visibility. A child stop/vote with planId does not automatically inherit the plan's permissions. Prove inheritance via an app-owned room/worker action strategy; otherwise default deny.

Revocation must cover future API reads/writes, subscriptions, reconnects and cached private UI. You cannot guarantee deletion of data someone already legitimately downloaded; communicate that limitation. Ensure directory/presence does not leak identities across private rooms. Privileged actions explicitly project safe fields.

### 11.3 Concurrency and integrity

Persist edits before broadcasting success. Use expected revision compare-and-swap or a documented serialized command path in the responsible Durable Object. Verify transaction support in actual SDK; do not assume multi-collection atomicity. On conflict, show current version and allow retry/reapply. Stable IDs prevent votes attaching to a newly reordered index. Invite redemption needs atomic use-limit enforcement. Reconnect resyncs canonical state without duplicate writes; idempotency keys for retryable commands.

H4 success: owner/editor/viewer matrix verified; two members and excluded third tested through API and raw realtime access; revoked user denied immediately on next operation and reconnect; invite expiry/use/revocation enforced; viewer cannot grant self editor; duplicate/replayed vote refused or idempotently updated; concurrent edits never silently erase changes; plan removal/deletion lifecycle tested; private metadata absent from public previews/search.

## 12. H5 — public discovery and responsible growth

Public plan discovery, existing-friend collaboration, and meeting strangers are different products. Preserve all as possible directions, but do not quietly combine them.

### 12.1 Public plan publishing

Explicit private→published action with preview of exactly what becomes visible. Public projection excludes invite tokens, precise future meeting times, home/school references, private notes, member identities/social graph and personal route origins. Share a sanitized template where possible, not a live private itinerary. Unpublish removes future public access and discovery indexes; downloaded copies cannot be fully recalled.

Before launch: reporting/blocking, moderation queue, abuse escalation, staff ownership/coverage, takedown/deletion procedure, age-appropriate content controls, spam/rate limits, retention, appeal policy where needed. No hidden adult categories in youth search suggestions.

### 12.2 Growth hypotheses and experiments

Hypothesis A: users share a visually appealing plan recap because it is useful, not because forced signup blocks utility. Test optional sanitized share card versus plain link.
Hypothesis B: “Remix this plan” increases useful plan creation. Import public template into a new private draft; never copy private members/notes or disallowed provider content.
Hypothesis C: friends return when someone proposes a meaningful change. Opt-in, rate-limited notifications; clear unsubscribe and no guilt language.
Hypothesis D: curated city collections improve discovery quality. Use sourced, moderated editorial collections, not fabricated rankings.

Measure activation (first useful result/plan), time to value, save rate, invited-user participation, useful remix rate, group repeat planning, negative feedback, abuse, and cost per retained useful group. Track invite conversion without invasive fingerprinting. Keep analytics aggregate/redacted; do not log raw prompts or precise coordinates by default. Define experiment audience, success threshold, guardrails and stop rule before launch; no invented growth promises.

### 12.3 Stranger interaction gate

Do not bolt DMs/matching onto friend schema. Separate review of adult/minor separation, age assurance, discoverability, contact permissions, grooming/harassment response, location exposure, blocking, staffing, emergency escalation, provider terms and legal rules. Launch only if operational capacity exists. It may remain out of product indefinitely even while the vision stays broad.

H5 success: publication preview matches actual public response; unpublish propagates; shared pages reveal no private metadata; reports reach staffed queue; block/takedown paths tested; no critical privacy finding; growth gains do not increase safety incidents or runaway spend.

## 13. H6 — expansion, deeper data and optional commerce

Retained opportunities, each with an independent business case:
- Local-data bake-off against Google for nuanced venue coverage, branch correctness, contact/hours, routes, latency, terms and phone behavior. Same query set/neighborhoods. Do not compare only pin count.
- If Google wins: supported Google results map/view; review attribution, storage, derived-content and AI/voice restrictions. No casual Google Places pins on MapLibre. Verify current rules before design.
- Wikipedia/Wikidata/open city datasets for contextual questions and heritage. Preserve sources/licenses, avoid unsourced synthesized facts, treat retrieved text as untrusted; avoid scraping when licensed API available.
- PostGIS/spatial warehouse only when measured spatial requirements exceed DeepSpace design; approved export/migration plan, dual-write risk review, backup and rollback. Not preselected today.
- Native apps only when push, offline, platform integrations or retention evidence justify maintenance; responsive web/PWA first, no unjustified rewrite.
- Advanced personalization with explicit consent, edit/reset/delete controls; no inferred sensitive characteristics or minors' behavior exploitation.
- Terrain/realistic Earth/Cesium only if product testing proves realism is core; separate imagery/hosting licensing and mobile budget.
- Booking/venue messaging/payments: independent transaction system, consent, money reconciliation, cancellation/refunds, webhook verification/idempotency, support and regulatory review. A generated itinerary is never a reservation.
- Monetization after utility validation: evaluate subscriptions or optional premium planning without selling precise location/social graphs. Paid providers/platform terms must permit commercial use.

## 14. Security, youth privacy and content obligations

No secrets in browser/git/chat/screenshots; `.dev.vars`/SDK-managed secrets follow actual docs. Rotate exposed credentials through approved replacement process; redact reports. Validate all boundaries; least privilege; safe HTML rendering; no arbitrary provider URLs/SSRF; restrict tool schemas; avoid raw review/website instruction execution; protect APIs with quotas; do not disable auth to make demo work.

Precise device location optional, purpose-specific, request-scoped by default. Do not silently log raw prompts, voice, coordinates, invites, email, or full provider requests with query keys. Logs should use opaque request IDs and redacted event categories. Backups/deletion/retention require documented policies once persistence begins. Browser local storage can also retain sensitive plans; define lifecycle and clear on logout/revocation where practical.

Youth gate: exact minimum age/markets, age assurance, privacy notices, account contract eligibility, AI disclosures, provider retention and youth terms, moderation/reporting, and legal review. Earlier proposal identified OpenAI youth constraints and Gemini Developer API audience restrictions; treat those as recheck-required items, not automatically validated facts for launch. Do not infer a paid plan or integration proxy grants an exception.

Vendors process user text/location/audio even when the app stores nothing; map that data flow, vendor identity, retention and region. No legal clearance is supplied by this plan.

## 15. Cost, operations and scaling

### 15.1 Budget contract

No spend amount is approved. Before live calls, record owner/account, currency, ceiling, allowed services, pricing/date, per-endpoint unit, quotas and who can stop them. Student chat subscriptions do not automatically pay API usage. Credits, free tiers and staging are not production promises.

Cost model: searches × (geocode + POI + optional detail + AI input/output) + later route legs + audio minutes + realtime connections + storage/egress + deployment/platform charges. Measure cost per successful answer/plan, not just per HTTP request. Geoapify notes credit-based POI billing; verify geocoding/details separately [S4].

Implement global daily budget ledger/limits, per-session/IP/user quotas, bounded fan-out, in-flight concurrency guard, configurable provider kill switch. Reserve estimated cost before paid call to prevent concurrent overshoot; reconcile observed usage. If provider billing has no exact synchronous cost, use conservative unit accounting and explicit margin. Budget alerts alone do not cap spend. Test near-limit concurrent requests.

### 15.2 Observability

Events: search_started/completed/failed; clarification_required; provider_timeout/rate_limited; invalid_provider_record; model_fallback; quota_denied; map_failed; later plan_revision_conflict/invite_revoked/access_denied. Fields: request ID, operation, provider, status, latency, candidate count, token/credit estimates, coarse error code, environment. No raw sensitive payloads by default.

Dashboards: success/error rate, p50/p95 latency, tool-call fan-out, cost per success, quota rejections, invalid records, map fallback. H4 adds authorization failures, reconnect/conflict rate, persistence lag. Alerts need named owner and actual destination; no silent broken alert integration.

### 15.3 Runbooks

Provider outage: confirm scope → disable affected call path → show honest degraded state → preserve input → no silent fixture substitution → restore with smoke test.
Cost spike: use kill switch → inspect counts/redacted events → block abuse/bug → owner approves restore.
Wrong locations: stop affected category/provider → reproduce query without retaining private data → fix normalization/evidence → regression test.
Privacy incident: restrict exposure safely → preserve minimal incident evidence → notify accountable human → assess obligations → remediate/retest. Do not publish secrets in incident notes.
Deployment failure: keep last known-good deployment; verify documented rollback compatibility. Stored-data changes may prevent simple code rollback; plan forward-safe changes and backups first.

### 15.4 Production readiness

Before public launch: provider contracts/terms, age/market decisions, moderation if public content, traffic/concurrency tests, account recovery, backup and actual restore drill, retention/deletion, monitoring, release/rollback procedure, support owner, spend controls and accessible UX. Choose RPO/RTO (acceptable lost data and recovery time) with owner; test against them, do not invent guarantee. DeepSpace scaling/room limits and backup/export mechanisms require verification before promising viral capacity.

## 16. Definition of done and handoff

For every feature: surveyed scope and twins; approved change scope; real implementation; parsed input; permission and privacy review; bounded work; complete pending/empty/error/forbidden states; tests; actual build/type/lint results; relevant browser/device checks; truthful docs; no new TODO/stub/fake success/dead routes/unused dependencies; no obsolete surfaces removed without consent; evidence and remaining risks recorded.

Acceptance evidence table: criterion ID, commit, test/command or click path, environment/device, timestamp, actual result, pass/fail/blocked, artifact reference. Agent cannot mark VERIFIED without executing or receiving actual user confirmation of that check in this session.

Required handoff documents by horizon:
H1: README, project map, architecture decisions, env-name template without secrets, provider/attribution ledger, evaluation manifest/results, demo script, incident/rollback steps, known limitations.
H2: planner constraints, evidence/storage policy, routing/timezone tests.
H3: audio data flow, retention, disclosures, voice test results.
H4: authorization matrix, membership/revision/invite design, three-user tests, data recovery/deletion procedure.
H5: publication projection, moderation/reporting operations, analytics/growth experiment definitions.

Client report format:
Done / What I inspected / What changed / What did not change / How to check by clicking / What I could not verify / Risks remaining / Deletions or irreversible actions and approval reference.

## 17. Consent and change control

All external writes require exact target/content approval through available confirmation tools. Especially: repository creation/commits, dependencies, auth, schema/stored record changes, deploy/DNS/CI, billing/accounts, deleting files/features/flags, history rewrites, shared environment commands. Read-only investigation is allowed; do not expose secret values.

Plain-language change request:
What I want to do:
What people will notice:
What could go wrong:
What is hard to undo:
What I will not touch:
How we can undo it:
Time/disruption:
Recommendation:
Please approve this exact action or tell me what to change.

Do not use a master plan as blanket approval. No YES means no irreversible change. “Do whatever is best” permits only previously agreed small reversible work, not data/auth/production changes.

## 18. Risk and decision registers

| Risk | Detection / mitigation | Gate |
|---|---|---|
| Organizer mandates listed stack | Human verifies rules; record allowed substitutions | H0 |
| DeepSpace custom guest APIs/runtime unclear | Local SDK spike; inspect actual scaffold and docs | H0 |
| Open local data inadequate | Five-city/target-neighborhood audit; later Google bake-off | H1/H2 |
| Globe stalls low-end GPU | Early target-phone spike; simplify style/list fallback | H1 |
| AI invents facts | Evidence-only output, reference validation, deterministic fallback | All |
| Public API cost/abuse | Global budget reservation, quotas, bounded fan-out, kill switch | H1 |
| Private child rows leak | Explicit membership checks; excluded third-session test | H4 |
| Roster leaks social identities | Scoped directory/presence design, raw traffic tests | H4 |
| Concurrent edits lose work | Serialized revision commands/conflict UI | H4 |
| Viral traffic exceeds platform | Load test, provider capacity, product limits, operations owner | H5 |
| Youth/provider/legal mismatch | Eligibility and data-flow review; no launch before resolution | Pilot |
| Feature creep before demo | H1 stop rule and later backlog | Hackathon |

Decision record format: ID, question, options (at most two for client decision), recommendation, evidence, business impact, approval status/date, revisit trigger. Engineering-equivalent options should be decided by engineer, not offloaded as jargon choices.

## 19. Demo script and honest claims

60–90 seconds:
1. Say: “Ask a location question; the globe brings real results into view.”
2. Ask a rehearsed live parks/hospital/cafe question in a city.
3. Show actual live markers/cards and available detail/unknown hours.
4. Select result; explain approximate straight-line distance and source.
5. Refine category while retaining area.
6. Briefly show another city if stable.
7. End with roadmap: real outings, voice, private friend planning, then carefully moderated public discovery.

Never call a fixture recording live. Never call the prototype globally complete or production-ready. No claim of reservations, current stock, actual walking time, perfect nearest facility, medical triage, or youth compliance. Demo the actual stable product; roadmap can remain ambitious without pretending it exists.

## 20. Next build session checklist

[ ] Confirm organizer technology rules, deadline, repository and target phone.
[ ] Confirm DeepSpace identity/account path and hard spend ceiling; no keys pasted in chat.
[ ] Survey repository and produce project map.
[ ] Run platform/data feasibility spikes with required approvals.
[ ] Lock H1 contracts, evaluation set and task packets.
[ ] Build live search/map loop before collaboration or voice.
[ ] Pass H1 acceptance and rehearse; stop features for hackathon.
[ ] Resume H2–H6 only through their dependencies and release gates.

The entire vision remains in scope for the master roadmap. Only the next delivery checkpoint is narrow. Build the smallest complete thing at each horizon, preserve evidence and user trust, and expand because the prior layer works—not because a new button is easy to draw.
