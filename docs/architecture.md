# Architecture

Current Version 1 scope, checked 16 November 2026. Geozity searches public places; it does not book visits, verify live availability or produce multi-stop outings.

## Current app

1. Vercel project geozity-globe builds the React 19 / TypeScript website in globe/ using Vite. MapLibre renders the globe, map and numbered pins with OpenFreeMap tiles.
2. The browser calls same-origin /api routes. globe/vercel.json forwards those requests to the geozity-api Cloudflare Worker. No provider credentials are bundled into the website.
3. Hono validates requests with Zod. A signed anonymous session cookie and signed, session-bound search context protect continuity. This is not a user login or an account permission system. Browser-origin checks restrict POST requests; they do not make a public endpoint private.
4. Geoapify resolves locations and returns real place records. Results are filtered by category and radius, deduplicated, sorted by straight-line distance and limited to ten. At most three tagged results receive optional Wikipedia/Wikidata enrichment. Missing articles or hours remain missing.
5. Direct Sarvam intent interpretation handles additional phrasing when enabled. Explicit deterministic matches take precedence; AI never invents place records. AI failure falls back to deterministic interpretation.
6. Optional Sarvam or ElevenLabs calls transcribe short audio and synthesize English answers. The visitor chooses a provider, consents to recording and reviews the transcript before search. Sarvam transcription requests English translation of Indian/mixed speech.
7. Supabase stores atomic usage reservations. The private daily_usage table holds UTC dates, meters, rotating pseudonymous client hashes and counts, not questions, recordings, raw IP addresses or location histories. Old usage rows are removed during reservations according to the SQL retention rule. The server-only function is denied to anonymous and ordinary signed-in database roles. If usage protection fails, chargeable work fails closed.

There is no DeepSpace runtime dependency. There are no accounts, saved favorites, planner, friend rooms, public templates, payments, staff portal or scheduled jobs in the current globe app. Sessions are anonymous; context expires after one hour and the cookie after one day. The tokens are signed, not encrypted; clients must treat them as sensitive context.

## Earlier app retained

frontend/ contains React 18 and Leaflet. backend/ contains Flask. Its website on geozity.vercel.app forwards /api to geozity.onrender.com. It uses Geoapify when configured, otherwise the existing Nominatim/Overpass/Photon paths, with optional Wikipedia enrichment. Its /api/chat contract differs from the current /api/location/search contract. Render/Docker configuration at the repository root belongs to this earlier app.

## Boundaries and risks

Search areas reach map providers; map tiles reach the tile service. Optional voice audio reaches the selected voice provider, and optional AI questions reach Sarvam. Geozity does not persist recordings; provider retention is separate. Provider availability, language accuracy and map completeness are not guaranteed. Distances are not route lengths or travel times. Physical-phone and human-voice acceptance remains pending. Future roadmap work is paused.
