# Current verification pointer — 16 November 2026

The `h1-h2-h3` branch contains H1 fixes, the outing planner and expanded voice controls. Fresh checks passed: 104 globe unit/integration tests, 42 controlled browser cases, TypeScript, formatting, frontend build and Worker packaging. The earlier app also passed 34 frontend tests, TypeScript/build, 164 Python tests (four opt-in live tests skipped) and Python dependency checks. See [the maintained verification record](docs/verification.md) for live quota, human/device and release gaps. This branch is source publication, not a production deployment.

The records below are retained historical observations and must not override that current record.

# Earlier verification context — 16 November 2026

The target is the Version 1 hackathon scope, not completion of every horizon. GitHub main now includes the globe app (merge 90c3c42); the remote version-2-preview branch was removed after merge. Both Vercel projects showed Ready from that commit during this documentation review, with roots frontend/ and globe/ respectively. This observation proves deployment status, not current live search/provider health.

Previously recorded globe checks in this conversation: 66 unit/integration tests, typecheck, formatting and build passed after the Wikipedia enrichment correction. An earlier checkpoint recorded 16 controlled desktop/mobile browser cases; three fresh-connection live rehearsals recorded 30/30 search checks; both voice providers passed synthesized-audio/transcription checks. A subsequent live Bengaluru park search included Cubbon Park's Wikipedia summary. These are dated results, not claims that all checks were rerun during this docs-only update. Earlier pooled network runs encountered ECONNRESET; that evidence was preserved.

Local evidence is in ignored .deployment/release-verification.json and .deployment/version-1-hackathon-checkpoint.json. These contain historical branch/hosting statements valid at their timestamps; the later merge is described above. They are local evidence, not guaranteed files in a fresh clone. No tests were replaced with fabricated live results.

Pending: physical-phone behavior, first-time human usability, actual human accents/noisy mixed speech, production load and wider privacy/license acceptance. Controlled mobile viewports and synthetic microphone audio do not resolve those gaps. No full production readiness or full H1/H3 roadmap acceptance is claimed. H2 and further H3–H6 work remains paused.

See [developer setup](docs/developer-setup.md) for repeatable and opt-in live checks. The dated Flask/Leaflet verification below is retained as earlier-app evidence, not the current globe's test report.

---

## Historical verification retained

# Delivery verification — 14 November 2026 (Asia/Kolkata)

The existing location assistant was repaired and verified as a local working product. The normal entrypoint serves the built React website and real Flask search API together at `http://127.0.0.1:5000/`. No public deployment or shared-environment change was performed.

## Observed checks

| Check | Result |
| --- | --- |
| Deterministic backend suite | **118 passed**. The four live checks are explicitly skipped in this mode. |
| Separate live-provider suite | **4 passed**, including Bengaluru hospitals, London parks, Tokyo museums, and a linked Cubbon Park Wikipedia summary. Final live suite duration: 57.26 seconds. |
| Frontend tests | **29 passed** using Node's test runner and the existing TypeScript compiler. |
| Strict TypeScript validation | Passed, both separately and as part of the build. |
| Final website build | Passed. Output includes bundled Leaflet CSS and the compiled website assets. |
| Python compilation | Passed for app, services, and tests. |
| Python dependency consistency | `pip check`: no broken requirements found. |
| Website dependency advisory check | `pnpm audit --json`: zero reported advisories across all severity levels, including development dependencies. This is a point-in-time registry check, not a complete security certification. |
| Single-server startup | `scripts/start-local.ps1` checked and built the website, then started the normal application. |
| Real local HTTP delivery | Homepage returned 200 HTML; referenced JavaScript and CSS returned 200 with the expected content types; health returned `rule_based`; `/.env` returned 404. |
| Existing preview command | Served the built website and forwarded `/api/health` to the real backend successfully. The temporary preview process was stopped afterwards. |
| Controlled browser journeys | Success, follow-up memory, keyboard/card selection, empty search, provider outage, medical caution, location clarification, irregular category suggestions, cancellation/reset, historical-result restoration, and unsafe provider-text/link handling checked. See `BROWSER_CHECKS.md`. |
| Real browser journey | The built product returned **10 real London park cards and 10 matching numbered pins**. Bloomsbury Square Gardens included a linked Wikipedia summary. Selecting Channel 4 Park highlighted rank 2 and opened its matching popup. Twelve map tile images were observed loaded successfully. No fixture text appeared. |
| Phone layout | Checked at 360 × 800 CSS pixels; no horizontal page overflow. The map kept its 400-pixel-high area, and the selected popup remained readable after resizing from desktop. The temporary viewport override was reset. |

There are **151 passing automated checks** across the deterministic backend, frontend, and separate live suites. Browser observations are additional checks and are not included in that count. No standalone lint configuration exists; no standalone lint pass is claimed.

## Important live-service observation

The first built-product browser search (`Museums in London`) encountered provider timeouts and displayed an honest retry message. A subsequent real London park search recovered through the Nominatim fallback after primary Overpass failures and returned real records in about 20 seconds. The separate live suite passed all four checks. These facts demonstrate both real integration and a remaining dependency on variable public-provider availability; they do not establish uninterrupted service or complete place coverage.

Initially, sandboxed network calls could not connect even to loopback services. Live and local HTTP/browser checks were therefore run with the permitted network access outside that restriction. No certificate validation was disabled and no fake results were substituted in the normal application.

## Evidence

- `verification/live-product-desktop.jpg`: real park cards, selected rank-2 popup, and loaded London map tiles.
- `verification/live-product-mobile.jpg`: final real-product phone layout with the selected popup readable.
- The synthetic browser fixture process and temporary Vite development/preview processes were stopped. The normal single-server product was started separately.

## Scope and remaining limits

- No source files, features, dependencies, accounts, customer records, or saved project history were deleted. Generated website build outputs were replaced during normal builds. The original proposal remains unchanged as historical material.
- No database, sign-in system, payments, production infrastructure, or public exposure was added or changed. Existing anonymous search and wildcard cross-origin access remain.
- Public map services may be slow or unavailable. The public Nominatim limit is application-wide; the implemented gate only coordinates one process. Multi-process or public hosting needs a separately approved provider/traffic/access setup.
- Device GPS permission and a physical device location were not exercised. Numeric-coordinate requests were tested automatically. Full assistive-technology, penetration, load, and production-hosting assessments were not performed and are not claimed.
- No external language-model parser exists; health and documentation now say so. Legacy unused example keys were retained with explicit explanations, in line with the instruction to preserve existing configuration names.
- Python package versions were recorded in `backend/requirements.lock.txt`; original minimum-version requirements were preserved. The website's existing pnpm dependency lockfile and framework versions were preserved.
- This verifies the existing local place-finding product. Deferred features in the historical proposal are not represented as implemented.
