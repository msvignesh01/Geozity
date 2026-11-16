# Current project map — 16 November 2026

Geozity lets visitors explore a globe, search nine categories of nearby places and read honest map-sourced details. Optional Sarvam/ElevenLabs voice turns short recordings into editable questions and reads English answers. The deployed checkpoint is Version 1; this branch implements H2 outing drafts and expanded H3 voice controls, with live/human acceptance still pending. H4–H6 remain outside this work.

The current website/server are in globe/: Vercel website, Cloudflare API, Geoapify search, optional Wikipedia, direct Sarvam/ElevenLabs calls and Supabase usage counters. The earlier frontend/ and backend/ remain separately hosted through Vercel/Render. No accounts, payments, saved outings or social rooms are implemented. DeepSpace is absent from the active stack.

Survey this session covered root layout and ignore/deployment files; both frontend manifests and lockfile locations; Python requirements and Flask provider flow; globe entrypoints, contracts, map/AI/voice/security/budget modules, SQL, local setup and test configurations; documentation and both Vercel build/repository/production settings. No repository AGENTS.md or CLAUDE.md was found. No CI workflow directory was found. Generated dependencies and private credential values were not printed. This was an architecture/documentation survey, not an exhaustive security certification or proof of zero dead code.

Healthy: separated server credentials, validated contracts, bounded results and provider work, fail-closed shared usage protection, explicit errors, anonymous signed context and automated coverage. Risks/unknowns: external coverage/availability, free-account allowances, physical phone and human speech acceptance, privacy/license requirements before wider release. Supabase contains usage counters, not a user-history database.

This branch changes application code, tests and documentation. It adds a browser-memory outing planner, separate routing adapter, stable targeted stop edits and expanded voice/motion controls. Database structure, credentials, domains and hosted settings remain unchanged. The tested source is on `h1-h2-h3`, without a `codex/` prefix. Original plans and dated records are retained; the earlier map below describes the pre-hosting app and must not be read as current architecture. See [current architecture](docs/architecture.md) and [runbook](docs/operations-runbook.md).

---

## Historical survey retained

# Project map — surveyed 13 November, revalidated 14 November 2026

The product lets a visitor ask for nine kinds of nearby places, see numbered map pins, read community-supplied details, and continue searching around the same location. Device location is optional. Results are not guarantees that a business is open or that a medical facility is available.

The moving parts are a React website, a Flask search server, OpenStreetMap location and place services, Wikipedia/Wikidata article services, and external map tiles. There are no accounts, payments, database, staff application, scheduled jobs, or deployment files in this repository.

The initial local checks found that the website builds and 12 existing isolated server tests pass. All three existing live searches failed; the application reported unknown locations when the provider could not be reached. These are baseline results, not delivery verification.

The repair scope is the existing search journey: input validation, provider failure reporting, bounded caching, accurate results, article association, conversational follow-ups, current map state, accessible selection, and repeatable tests. Preserve the current appearance and nine categories. Do not publish, add accounts, change access permissions, remove features, or alter stored customer records. No such records exist locally.

Unknowns: intended hosting, expected traffic, owner-approved provider contact identity, production privacy requirements, and public-service availability. A production launch needs a separate operating/access decision; a local repair cannot establish those facts.

## Technical detail (optional)

- Inventory: all application source files under `frontend/src` and `backend`, both root documents, `.env.example`, frontend HTML/build/style/TypeScript configuration, package manifest, pnpm lockfile, Python requirements, and existing tests were inspected. Generated `node_modules`, `.venv`, `dist`, and caches are dependencies/build outputs. No local Git repository or additional repository instruction files were found.
- Entrypoints: `frontend/src/main.tsx` → `App.tsx` → `ChatPanel`, `PlaceCard`, `MapView`; `backend/app.py` → `GET /api/health`, `POST /api/chat`. Vite proxies `/api` to loopback port 5000 during development. Preview initially has no API proxy.
- Dependencies: React 18, Leaflet 1.9, TypeScript 5, Vite 6, Tailwind 3, Lucide; Flask 3, Flask-CORS, requests, python-dotenv, pytest. pnpm lockfile exists; Python requirements use open minimum versions. No frontend test/lint commands initially exist. The project Python environment is `backend/.venv`.
- Data/access: anonymous, read-only public-place search; conversation/GPS state lives in browser memory and is submitted to the server. Server-side provider caches are process-local. No schema, migrations, tenancy, identity checks, personal records, or background jobs exist. Wildcard cross-origin access is existing behavior and is outside the small-fix scope.
- Shared rules/twins: nine category aliases in `intent_parser.py`; Overpass tag filters; Nominatim fallback formatting duplicates Overpass formatting. All three provider clients initially use separate unbounded mutable caches and broad exception suppression. `geo_utils.py` owns distance/address/hours formatting. Both Leaflet popups and React cards display provider text/links.
- Initial defects: unvalidated coordinates/context; service errors disguised as empty results; destructive mutation of cached place dictionaries; incomplete cache keys; lost Nominatim addresses; fallback results outside the advertised radius; omitted OSM relations; same-name branches merged; name-only Wikipedia association; unused Wikidata input; ASCII-only location extraction; invalid category plurals; stale pins, concurrent/reset races, and stale-card selection; unsafe HTML insertion in popups; inaccessible card selection; CDN-only Leaflet CSS; preview cannot reach API.
- Verification approach: deterministic provider fixtures and HTTP failures, endpoint integration tests, parser/geometry/cache tests, strict frontend compilation and build, browser checks, then separately requested live-provider checks. Live failures must remain visible rather than being skipped or replaced with invented places.
- Original build proposal remains historical material, not proof of delivery. README additions and a final verification record must describe observed behavior and limitations.
