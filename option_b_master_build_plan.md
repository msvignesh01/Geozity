> Current status — 16 November 2026: Geozity H1–H3 implementation is on the `h1-h2-h3` branch. It passed 104 unit/integration tests and 42 controlled desktop/mobile browser cases; live routing/rehearsals and human/device acceptance remain pending. The deployed app is still the earlier Version 1 checkpoint. Approved stack overrides the historical text below: React/TypeScript/Vite with MapLibre/OpenFreeMap on Vercel, Hono on Cloudflare Workers, Supabase usage storage, and direct Sarvam/ElevenLabs. DeepSpace is not used. H4–H6 remain later horizons. The corrected Option B plan governs over earlier proposals; user-approved changes govern over both. Historical ownership/technology/proposed gates below are retained as planning history, not current deployment or acceptance claims. See [current verification](docs/verification.md) and [documentation](docs/index.md).

> Superseded status note (before H2/H3 resumed) — 16 November 2026: This is a retained planning document, not an implementation or release certificate. Geozity is currently limited to the Version 1 hackathon scope: existing globe, live place search, place details and optional voice. H2 outing planning and further H3–H6 work is paused until the owner resumes it. The corrected Option B product intent remains long-term direction. Later approved stack decisions supersede historical DeepSpace references: Vercel website, Cloudflare API, Supabase usage storage and direct Sarvam/ElevenLabs calls. No DeepSpace runtime is required. Main now contains both application generations after merge 90c3c42; screenshot V1/V2 labels are interface stages. See docs/index.md for current operating guidance. The original plan text below is preserved.

# Playful Globe — Option B Corrected Build Plan (Version 2.1)

## Phase 2 Architecture: DeepSpace + MapLibre 3D Globe + Live Places + Social Horizons

**Version:** 2.1 (Corrected Master Plan) | **Date:** 13 November 2026
**Status:** Ready for post-hackathon execution (or immediate build if stack rules allow)
**Owner:** M S Rishav Subhin | **Readers:** Human builders, AI coding agents, reviewers, future operators

> Build the playful globe, not a clone. Start with a fast, grounded 3D globe location assistant (Horizon 1), and unlock multi-stop outing planning, push-to-talk voice, and invite-only friend rooms behind clear completion and safety gates.

---

## 0. Plain-Language Summary

### What Option B builds

Option B is your full **Playful Globe** vision built on **DeepSpace** (`React + TypeScript + Vite` on the screen, a `Hono` server running on `Cloudflare Workers`, and built-in `SQLite` rooms) paired with a continuous **MapLibre 3D Globe** (`OpenFreeMap` tiles) and live **Geoapify + Wikipedia/Wikidata** place data. A visitor types or speaks an intention, watches the 3D Earth spin and zoom smoothly to street level, inspects verified places with real addresses, straight-line distances, opening hours, and Wikipedia summaries, and later invites friends to vote on multi-stop hangout plans.

### Six corrections applied in this plan (vs. Version 2.0)

1. **Daily Spending Cap Fixed:** Horizon 1 now allows one lightweight daily call counter inside DeepSpace's built-in storage so your shared guest budget works across server restarts without storing personal user queries or GPS history.
2. **Built-In DeepSpace AI Checked First:** Instead of building a separate OpenAI billing and adapter stack from scratch on Day 1, the server checks DeepSpace's built-in worker AI helpers first, backed by a deterministic keyword parser so search never breaks.
3. **Wikipedia & Wikidata Included in Horizon 1:** Basic Wikipedia and Wikidata summaries are pulled in Horizon 1 whenever a place has an OpenStreetMap knowledge tag, satisfying the challenge card's data source requirements right away.
4. **One Search Route Instead of Three:** Horizon 1 collapses `/search`, `/details`, and `/clarify` (plus custom cryptographic context tokens) into a single `POST /api/location/search` endpoint alongside `GET /api/health`.
5. **Honest Verification Labels:** Top-level DeepSpace capabilities verified from official documentation are separated from expected starter-template file paths, which are verified locally in Step 1 (`T01`).
6. **4 Build Steps Instead of 13:** Horizon 1 is streamlined from 13 administrative task packets and 30 timed benchmark runs into **4 focused build steps (`T01` to `T04`)**, a **10-question test list across 5 cities**, and **3 rehearsal runs**.

---

## 1. Product Horizons & Compliance Matrix

### 1.1 Challenge Card & Vision Alignment (Horizon 1)

| Requirement | How Option B Delivers It | How to Verify by Clicking |
| :--- | :--- | :--- |
| **Chat box for questions like "nearest hospital" or "parks near me"** | Conversational overlay beside the 3D globe with sample chips, optional one-click GPS, and follow-up memory (typing *"cafes instead"* keeps the confirmed city). | Type *"Nearest hospital to MG Road, Bengaluru"* or click a prompt chip. |
| **Answers drawn from live map data, with markers shown** | Server queries live Geoapify/OpenStreetMap records; the 3D MapLibre globe flies smoothly from space into street view and drops numbered pins synced with result cards. | Click any place card to highlight its pin on the globe and open its details. |
| **Place details: distance, address, opening info where available** | Every card displays the street address, calculated straight-line distance ($\text{Approx. } X\text{ km from reference}$), and opening hours (or *"Opening hours not listed"*). | Click a marker or card and inspect the address, distance badge, and hours row. |
| **Works for any searchable city** | Live geocoding resolves cities and neighborhoods worldwide (Bengaluru, Chennai, London, Tokyo, New York) with disambiguation choices when a city name is shared. | Search across 3 different countries in a single session. |
| **Data Sources: OpenStreetMap, Wikipedia, Wikidata, open city datasets** | Uses OpenStreetMap-backed vector tiles (`OpenFreeMap`), OpenStreetMap-backed POIs (`Geoapify`), and live `Wikipedia REST` / `Wikidata` summaries when tags exist. | Search *"Museums in London"* or *"Parks in Bengaluru"* and read the Wikipedia summary on the card. |

### 1.2 Full Product Horizons (H0 to H6)

| Horizon | User-Visible Outcome | Release Gate |
| :--- | :--- | :--- |
| **H0: Readiness** | Stack rules, account ceiling, and starter repo confirmed | Do not write feature code while stack eligibility is unconfirmed |
| **H1: Playful Globe Assistant** | Ask a location question $\rightarrow$ 3D globe flies to real places with cards | Freeze H1 features once the 10-prompt test list and 3 rehearsals pass |
| **H2: Outing Planner** | Multi-stop itineraries with checked travel times and opening windows | Pass 20-scenario constraint and timezone check before user testing |
| **H3: Voice & Personality** | Push-to-talk audio recording, editable transcript, optional AI voice | Text input fallback and mute controls must always remain active |
| **H4: Private Friend Rooms** | Sign-in, saved plans, revocable invite links, live stop voting | Pass 3-user permission isolation and instant invite-revocation checks |
| **H5: Public Discovery** | Explicitly published, sanitized plan templates and remixing | Pass youth privacy review, reporting queue setup, and moderation gate |
| **H6: Platform Expansion** | Google Places bake-off, deeper open city data, optional native/booking | Require measured demand and explicit owner approval per addition |

---

## 2. Stack Selection & Verification Ledger

### 2.1 Selected Option B Stack

| Layer | Selected Tool | Engineering Rule |
| :--- | :--- | :--- |
| **Frontend UI** | `React + TypeScript + Vite` (DeepSpace starter) | Keep strict types and existing `Tailwind v4` primitives; do not add a competing UI library. |
| **3D Globe & Street Map** | `MapLibre GL JS` + `OpenFreeMap` vector tiles | Single WebGL map instance that transitions smoothly from 3D globe to 2D street map around zoom $12$. Keep style URL configurable. |
| **Backend Server** | `Hono` on `Cloudflare Workers` (DeepSpace scaffold) | Owns validation, rate limits, daily budget counter, API keys, and data normalization. |
| **Storage (H1 vs. H4)** | DeepSpace `RecordRoom` (SQLite in Durable Objects) | **H1:** Stores only 1 daily API usage counter (no personal queries). **H4:** Stores profiles, plans, stops, votes, and invites. |
| **Live Geocoding & POIs** | `Geoapify` Geocoding & Places APIs (or throttled Nominatim/Overpass fallback) | Called strictly from the worker with a $6\text{-second}$ timeout and bounded candidate limit ($10$ default, $20$ max). |
| **Knowledge Enrichment** | `Wikipedia REST API` + `Wikidata API` | Server fetches a concise summary and link whenever a returned POI includes a `wikipedia` or `wikidata` tag. |
| **AI Intent & Summary** | DeepSpace built-in worker AI (or `OpenAI API`) + deterministic fallback | Extracts allowlisted categories and summarizes only returned records; falls back to keyword rules if AI is unconfigured or slow. |
| **Automated Testing** | `Vitest` (unit/contract) + `Playwright` (`deepspace/testing`) | Tests distance math, adapter normalization, and browser flows. |

### 2.2 Verified Facts vs. Expected Scaffold Defaults

* **Verified from `https://docs.deep.space/` (`v0.43.0`) and `docs.deep.space` architecture docs:**
  * Initialized via `npm create deepspace@latest my-app`, run locally via `npx deepspace dev start`, tested via `npx deepspace test run`, and deployed via `npx deepspace deploy`.
  * Provides `deepspace` client hooks (`RecordProvider`, `useQuery`, `useMutations`, `useAuth`), `deepspace/worker` utilities (`RecordRoom`, `verifyJwt`, `CHANNELS_SCHEMA`, plus built-in AI helpers and metering), and `deepspace/testing` Playwright fixtures.
  * Runs as a Cloudflare Worker backed by SQLite inside Cloudflare Durable Objects (`RecordRoom`).
* **Expected scaffold defaults to verify locally in Step 1 (`T01`):**
  * Exact generated paths (`worker.ts`, `wrangler.toml`, `src/server/`, `src/schemas.ts`, `src/pages/`, `(app)` vs. `(protected)` route folders, and `AuthGate` components) must be inspected right after running the create command before any file edits happen.
  * **Critical Durable Object Rule:** Never delete Durable Object declarations or bindings from `wrangler.toml` just because Horizon 1 only uses a single counter; removing persisted Durable Object classes breaks deployment migrations.

---

## 3. System Architecture, Honest Semantics & Safety Rules

### 3.1 How a Search Works (End-to-End Pipeline)

1. **Budget & Input Check:** The worker verifies the request body is under $16\text{ KiB}$, checks the per-session rate limit, and increments the shared daily API counter inside DeepSpace storage before calling any external service.
2. **Intent Extraction:** Extracts one of the allowlisted categories and the target location text using DeepSpace worker AI (or the deterministic rule parser if AI is unavailable).
3. **Location Clarification:** If the user asks *"nearest hospital"* without enabling GPS or naming a city—or types an ambiguous city like *"Springfield"*—the server returns `needs_clarification` with clickable location choices.
4. **Live Geocoding & Bounded POI Search:** Resolves the area coordinates via Geoapify Geocoding, queries Geoapify Places within a bounded radius ($1\text{ km}$ to $10\text{ km}$, hard ceiling $25\text{ km}$), and enriches top results that have `wikipedia` or `wikidata` tags.
5. **Grounded Normalization:** Validates coordinates ($\text{latitude} \in [-90, 90]$, $\text{longitude} \in [-180, 180]$), converts to GeoJSON $[\text{lon}, \text{lat}]$ order in one tested helper, computes spherical Haversine distance:
   $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
   and strips any malformed records.
6. **Synchronized Globe & Card Update:** The browser checks the `requestId` so stale responses never hijack the camera, smoothly flies the 3D globe to the bounding box, and renders matching numbered pins and cards.

### 3.2 Honest Data & Medical Safety Rules

* **Zero Invented Venues:** The AI model never generates coordinates, place IDs, addresses, or opening hours. Every statement in the assistant's summary must reference a returned `place.id`.
* **Honest Unknowns:** Missing opening hours are displayed as *"Opening hours not listed"*. Straight-line distances are labeled *"Approx. $X\text{ km}$ straight-line from [Reference]"*, never disguised as driving or walking times.
* **Urgent Medical Query Notice:** Searches for `hospital`, `clinic`, or `pharmacy` suppress playful animations/celebrations and display a clear notice: *"Results come from map providers and may be incomplete. For a medical emergency, contact local emergency services immediately."*
* **WebGL & Tile Fallback:** If a low-end phone cannot initialize the 3D WebGL globe or map tiles fail to load, the result cards and chat remain 100% functional in a clean list view.

---

## 4. Expected DeepSpace Repository Layout

Verify these exact paths during Step 1 (`T01`) after generating the starter project:

```text
playful-globe/
├── worker.ts                          # DeepSpace worker entrypoint (preserve DO exports)
├── wrangler.toml                      # Cloudflare config (NEVER delete DO bindings)
├── .dev.vars.example                  # Template for GEOAPIFY_API_KEY, DAILY_CALL_LIMIT, etc.
├── src/
│   ├── schemas.ts                     # H1: daily quota counter schema; H4: plans/votes/members
│   ├── domain/
│   │   └── location/
│   │       ├── types.ts               # GeoPoint, Place, SearchIntent, SearchResponse union
│   │       ├── geo.ts                 # Haversine math & [lon, lat] GeoJSON boundary conversion
│   │       └── categories.ts          # Allowlisted categories -> verified Geoapify/OSM tags
│   ├── server/
│   │   ├── http-routes.ts             # Mounts GET /api/health and POST /api/location/search
│   │   └── location/
│   │       ├── search-handler.ts      # Request pipeline, budget check, and response builder
│   │       ├── intent-adapter.ts      # DeepSpace AI / OpenAI parser + deterministic fallback
│   │       ├── geoapify-adapter.ts    # Live geocoding and bounded POI search
│   │       └── wiki-adapter.ts        # Wikipedia REST & Wikidata summary fetcher
│   ├── components/
│   │   ├── map/
│   │   │   └── PlayfulGlobe.tsx       # MapLibre 3D globe, camera flyTo, pins, list fallback
│   │   └── explore/
│   │       ├── QuestionComposer.tsx   # Chat input, sample chips, GPS button, status pill
│   │       └── PlaceCard.tsx          # Synced card with address, distance, hours, Wiki blurb
│   └── pages/
│       ├── index.tsx                  # Static landing / entry
│       └── (app)/
│           └── explore.tsx            # Guest-accessible 3D globe + chat assistant screen
└── tests/
    ├── unit/                          # Distance math, coordinate bounds, category mapping
    ├── integration/                   # Adapter normalization, quota rejection, timeout handling
    └── e2e/                           # Playwright guest search and marker-card sync checks
```

---

## 5. Streamlined Horizon 1 Server API Contract

### 5.1 `GET /api/health`

Returns worker readiness without making paid external calls or exposing secret keys.

* **Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "platform": "DeepSpace Worker + MapLibre Globe",
    "data_mode": "live"
  }
  ```

### 5.2 `POST /api/location/search`

Single unified endpoint handling initial natural-language questions, follow-up category switches (e.g., *"cafes instead"*), and location clarifications.

* **Request Body (Max $16\text{ KiB}$, Question Max $500\text{ chars}$):**
  ```json
  {
    "requestId": "req_01JCH9X",
    "question": "Nearest hospital to MG Road, Bengaluru",
    "deviceLocation": null,
    "confirmedLocation": null,
    "lastCategory": null
  }
  ```

* **Response Body (`200 OK` — `status: "ready"`):**
  ```json
  {
    "requestId": "req_01JCH9X",
    "status": "ready",
    "aiMode": "ai_verified",
    "summary": "Found 6 hospitals near MG Road, Bengaluru. Closest returned result is Bowring and Lady Curzon Hospital (approx. 1.1 km straight-line).",
    "safetyNotice": "Results come from map providers and may be incomplete. For a medical emergency, contact local emergency services immediately.",
    "resolvedLocation": {
      "label": "MG Road, Bengaluru, Karnataka, India",
      "lat": 12.9756,
      "lon": 77.6066,
      "bbox": [77.5866, 12.9556, 77.6266, 12.9956]
    },
    "places": [
      {
        "id": "geoapify_place_01",
        "rank": 1,
        "name": "Bowring and Lady Curzon Hospital",
        "category": "hospital",
        "lat": 12.9821,
        "lon": 77.6042,
        "distanceMeters": 1120,
        "distanceLabel": "Approx. 1.1 km straight-line from MG Road, Bengaluru",
        "address": "Lady Curzon Road, Shivajinagar, Bengaluru 560001",
        "openingHours": "24/7",
        "wikiSummary": "A major teaching and government hospital in Bengaluru established in 1868.",
        "wikiUrl": "https://en.wikipedia.org/wiki/Bowring_%26_Lady_Curzon_Hospitals",
        "retrievedAt": "2026-11-13T16:30:00Z"
      }
    ],
    "attribution": "© OpenFreeMap © OpenStreetMap contributors, Powered by Geoapify, Wikipedia/Wikidata"
  }
  ```

* **Other Explicit Union States:**
  * `needs_clarification`: Returns `question` and up to $5$ `locationChoices` (with region/country labels) or prompts the user to share GPS / enter a city.
  * `no_results`: Returns the searched area, category, and radius with one-click suggestions to widen the radius or switch categories.
  * `failed`: Returns a safe `errorCode` (`QUOTA_REACHED`, `PROVIDER_TIMEOUT`, `UNSUPPORTED_CATEGORY`, `INVALID_INPUT`), a plain-English message, and `retryable: boolean`.

---

## 6. 4-Step Fast Build Sequence (Horizon 1)

### Step 1 (`T01`): DeepSpace Scaffold Survey & Key Configuration
* Run `npm create deepspace@latest` (or inspect the existing repo), map all generated files, and confirm how `worker.ts` mounts custom HTTP routes and built-in AI helpers.
* Configure `.dev.vars` locally with `GEOAPIFY_API_KEY` and `DAILY_CALL_LIMIT` without committing any secrets to Git.
* **Exit check:** `npx deepspace dev start` boots cleanly and `GET /api/health` returns `200 OK`.

### Step 2 (`T02`): Live Search Worker, Budget Counter & Wikipedia Enricher
* Implement `src/domain/location/` pure types, Haversine distance math, and allowlisted category mappings (`hospital`, `park`, `cafe`, `restaurant`, `pharmacy`, `museum`, `attraction`).
* Implement `POST /api/location/search` with the daily budget counter, AI/rule intent extraction, Geoapify geocoding + POI lookup, and Wikipedia/Wikidata summary enrichment.
* **Exit check:** Unit and integration tests (`Vitest`) pass for valid queries, missing hours, ambiguous cities, prompt-injection strings, and quota limits.

### Step 3 (`T03`): MapLibre 3D Playful Globe & Synchronized Cards UI
* Build `PlayfulGlobe.tsx` using `MapLibre GL JS` with `globe` projection enabled at low zoom, gentle idle rotation that pauses immediately on user touch/drag and respects `prefers-reduced-motion`, and smooth camera flight (`flyTo` / `fitBounds`) to street level.
* Build `QuestionComposer.tsx` and `PlaceCard.tsx` with synchronized marker-to-card selection, emergency medical notices, visible map attribution, and a clean list-only fallback if WebGL is unavailable.
* **Exit check:** Works smoothly at both desktop width and a $360\text{ px}$ mobile viewport with $44 \times 44\text{ CSS px}$ touch targets.

### Step 4 (`T04`): 5-City Evaluation, Deploy & Rehearsal
* Execute the **10-Prompt Test Manifest** across **Bengaluru, Chennai, London, Tokyo, and New York**:
  1. *"Parks in Bengaluru"* (standard category + city + Wikipedia blurb on major parks).
  2. *"Nearest hospital to MG Road, Bengaluru"* (proximity sorting + medical disclaimer banner).
  3. *"Cafes instead"* immediately after #2 (preserves MG Road context, updates pins to cafes).
  4. *"Museums in London"* (verifies international city + Wikipedia summary + opening hours).
  5. *"Pharmacies near Shinjuku, Tokyo"* (verifies international non-Latin place resolution).
  6. *"Restaurants near Marina Beach, Chennai"* (second Indian city check).
  7. *"Parks in Springfield"* (ambiguous city name triggers disambiguation choices).
  8. *"Nearest hospital"* with no city and GPS denied (requests location clarification instead of guessing).
  9. *"Book a flight to Paris"* (unsupported category returns polite scope explanation and supported chips).
  10. Simulated provider timeout / daily quota limit reached (shows honest recovery UI without crashing the globe).
* With owner approval, deploy via `npx deepspace deploy` and complete **3 consecutive end-to-end demo rehearsals**. Freeze H1 features once all checks pass.

---

## 7. Verification Click-Path (2-Minute Stakeholder Demo)

1. **Open the Globe:** Open the app URL as a guest. Observe the slowly rotating 3D globe, sample prompt chips, and visible OpenFreeMap/OpenStreetMap attribution.
2. **Ask a Live Question:** Click or type *"Nearest hospital to MG Road, Bengaluru"*. Watch the globe spin from space and zoom smoothly into central Bengaluru with numbered pins. Point out the medical safety notice, street address, straight-line distance badge, and listed hours.
3. **Refine in Place:** Type *"Parks instead"*. Confirm the camera stays in Bengaluru, updates the markers to nearby parks, and displays a Wikipedia summary card for landmarks like Cubbon Park.
4. **Cross-Continent Jump:** Type *"Museums in London"*. Watch the camera arc smoothly back out across the globe and zoom into London with verified museum pins and Wikipedia links.
5. **Ambiguity & Safety Check:** Clear the location context and type *"Parks near me"* with GPS off. Confirm the assistant asks you to pick a city or enable GPS rather than inventing a location.

---

## 8. Retained Post-H1 Roadmap (Horizons H2 to H6)

Do not build or expose half-wired buttons for these horizons during H1. Unlock each horizon in order only after the previous horizon passes its acceptance gate:

### Horizon 2 (H2): Real Multi-Stop Outing Planner
* **What it adds:** Turns intentions like *"Plan a 3-stop Saturday afternoon in Indiranagar under ₹1,500 with coffee, a park walk, and dinner"* into an ordered, editable sequence of real stops ($2$ to $5$ stops max).
* **Engineering rules:** Adds a separate Geoapify Routing adapter for leg travel times; checks intended arrival times against venue opening hours in the target city's local timezone; separates hard constraints (e.g., wheelchair access) from soft preferences; allows replacing a single stop without resetting the rest of the itinerary.
* **Release gate:** Pass 20 outing test scenarios (including late-night closures, timezone edges, and single-stop replacements) with zero invented venues or silent constraint violations.

### Horizon 3 (H3): Push-to-Talk Voice & Expressive Personality
* **What it adds:** Hold-to-talk microphone button $\rightarrow$ unmistakable recording indicator $\rightarrow$ server-side speech-to-text transcription $\rightarrow$ editable transcript box $\rightarrow$ same H1/H2 planning pipeline $\rightarrow$ optional disclosed AI voice reply with instant mute/stop controls.
* **Engineering rules:** Never use always-listening wake words; never retain raw voice recordings by default; keep text input equally prominent; review youth data-retention terms before enabling voice for minors.

### Horizon 4 (H4): Private Social Planning Rooms (DeepSpace Sync)
* **What it adds:** Sign-in via DeepSpace Auth, saving plans into DeepSpace `RecordRoom` collections (`plans`, `plan_members`, `stops`, `votes`, `suggestions`, `invitations`), revocable expiring invite links, and real-time multi-user voting.
* **Engineering rules:**
  * Enforce plan-specific membership (`owner`, `editor`, `viewer`) on every custom worker read/write action—never rely on hiding UI buttons or global app roles.
  * Ensure the default DeepSpace user roster does not leak member identities across private plans.
  * Use revision numbers (`expectedRevision`) on plan edits so two friends editing at the same time never silently overwrite each other's changes.
* **Release gate:** Automated 3-user Playwright test (`owner`, `invited friend`, `excluded outsider` + `revoked member`) proving outsiders and revoked users cannot read or mutate private plans via UI, HTTP, or raw WebSocket connections.

### Horizon 5 (H5): Sanitized Public Plan Discovery & Remixing
* **What it adds:** Explicit *"Publish as Template"* flow with a preview showing that member names, private notes, invite tokens, and future meeting times are stripped before publication; *"Remix this Plan"* clones the public stops into a fresh private draft.
* **Release gate:** Requires youth/privacy legal clearance, in-app abuse reporting, and a staffed moderation/takedown workflow before launch. (Meeting strangers / DMs remains strictly out of scope unless a separate safety architecture is approved.)

### Horizon 6 (H6): Local-Data Bake-Off & Platform Expansion
* **What it adds:** Side-by-side quality evaluation comparing the open stack (`MapLibre + OpenFreeMap + Geoapify`) against `Google Maps + Places API (New)` using identical neighborhood queries.
* **Engineering rules:** Never display Google Places data on a non-Google map (`MapLibre`). If Google wins the bake-off for a specific market, switch the results view to a compliant Google map adapter through the shared domain interface.

---

## 9. Security, Youth Privacy, Cost Controls & Consent Gate

* **No Secrets in Browser or Git:** All provider keys (`GEOAPIFY_API_KEY`, AI keys) live exclusively in server environment variables (`.dev.vars` locally, DeepSpace secret store in production).
* **Youth & Provider Compliance:** If teenagers under 18 are included in a live pilot, enforce OpenAI's under-18 safety/retention rules (and do not use the Gemini Developer API, whose terms prohibit under-18 consumer clients).
* **Hard Cost Protection:** The worker enforces a global daily call ceiling stored in DeepSpace's SQLite room plus an emergency `DISABLE_EXTERNAL_PROVIDERS=true` kill switch. Budget alerts alone are never treated as a spending cap.
* **Mandatory Client Consent Gate:** Before creating external accounts, deploying to a public URL, altering database schemas, or deleting files, the engineer must present a plain-language Change Request stating what will change, what could go wrong, how to undo it, and wait for an explicit **YES** from the owner.