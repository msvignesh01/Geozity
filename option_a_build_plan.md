> Current status — 16 November 2026: Geozity H1–H3 implementation is on the `h1-h2-h3` branch. It passed 104 unit/integration tests and 42 controlled desktop/mobile browser cases; live routing/rehearsals and human/device acceptance remain pending. The deployed app is still the earlier Version 1 checkpoint. Approved stack overrides the historical text below: React/TypeScript/Vite with MapLibre/OpenFreeMap on Vercel, Hono on Cloudflare Workers, Supabase usage storage, and direct Sarvam/ElevenLabs. DeepSpace is not used. H4–H6 remain later horizons. The corrected Option B plan governs over earlier proposals; user-approved changes govern over both. Historical ownership/technology/proposed gates below are retained as planning history, not current deployment or acceptance claims. See [current verification](docs/verification.md) and [documentation](docs/index.md).

> Superseded status note (before H2/H3 resumed) — 16 November 2026: This is a retained planning document, not an implementation or release certificate. Geozity is currently limited to the Version 1 hackathon scope: existing globe, live place search, place details and optional voice. H2 outing planning and further H3–H6 work is paused until the owner resumes it. The corrected Option B product intent remains long-term direction. Later approved stack decisions supersede historical DeepSpace references: Vercel website, Cloudflare API, Supabase usage storage and direct Sarvam/ElevenLabs calls. No DeepSpace runtime is required. Main now contains both application generations after merge 90c3c42; screenshot V1/V2 labels are interface stages. See docs/index.md for current operating guidance. The original plan text below is preserved.

# Location-Based Smart Assistant — Option A Build Plan
## Phase 1: Judge-Proof Hackathon Delivery (React + Flask + Leaflet + OpenStreetMap)

**Version:** 1.0 (Option A Execution Plan) | **Date:** 12 November 2026
**Status:** Ready for approval before code creation | **Phase 2 (Option B):** DeepSpace 3D Social Globe deferred until after hackathon judging

---

## 0. Plain-Language Summary

### What we are building right now (Option A)
We are building the exact **Location-Based Smart Assistant** described on Challenge Card 14. A visitor opens the webpage, sees a chat box next to an interactive map, and asks questions like *"nearest hospital to MG Road, Bengaluru"*, *"parks near me"*, or *"museums in London"*. The map smoothly flies to that location, drops numbered pins on real places pulled live from OpenStreetMap, and displays cards showing the street address, straight-line distance, opening hours (when listed), and a short Wikipedia background summary when available.

### Why this wins the hackathon
1. **100% Rule Compliance:** Every tool and data source printed on the challenge card (`React`, `Flask`, `Nominatim`, `Overpass API`, `Leaflet`, `OpenStreetMap`, `Wikipedia`, and `Wikidata`) is visibly used and easy for judges to verify.
2. **Zero API Key Failure Risk:** The map and place tools require no paid developer accounts or credit cards, and the assistant includes a built-in question parser that works even if an external AI service is slow or unconfigured.
3. **Protected Against Public Map Blocks:** Free public map servers block apps that send too many requests at once. Our Flask server saves recent searches in memory and spaces out new lookups so the live demo stays fast and never gets blocked.

### What is saved for Phase 2 (Option B — Post-Hackathon)
Once the hackathon is won, we will move the search logic into your **DeepSpace + MapLibre 3D Globe** architecture to add the spinning 3D Earth, multi-stop outing routes, push-to-talk voice, and invite-only friend voting rooms. None of those Phase 2 extras will clutter or delay your hackathon submission.

---

## 1. Challenge Card Compliance Matrix

| Card Requirement | How Option A Delivers It | How Judges Can Verify It |
| :--- | :--- | :--- |
| **Chat box for questions like "nearest hospital" or "parks near me"** | Conversational chat sidebar with quick-start example buttons, optional "Use my GPS" toggle, and follow-up memory (e.g., typing *"cafes instead"* keeps the current city). | Type *"nearest hospital to Indiranagar, Bengaluru"* or click a sample chip. |
| **Answers drawn from live map data, with markers shown** | Flask queries live OpenStreetMap records via Overpass API; Leaflet smoothly flies the camera to the result area and drops numbered markers matching the chat cards. | Click any result card in the chat to highlight and open its pin on the map. |
| **Place details: distance, address, opening info where available** | Every place card and map popup shows formatted street address, calculated straight-line distance (e.g., $\text{Approx. } 1.4\text{ km from MG Road}$), and opening hours (or *"Opening hours not listed"* when blank). | Inspect any returned card or click a map marker popup. |
| **Works for any searchable city** | Nominatim resolves any city or neighborhood worldwide (e.g., Bengaluru, Tokyo, London, New York, Paris) without hard-coding locations. | Search across 3 different countries during the live demo. |
| **Tech Stack: React + Flask, Nominatim, Overpass API, Leaflet** | `frontend/` runs React + Leaflet; `backend/` runs Python Flask calling Nominatim and Overpass API. | Inspect the clean two-folder repository structure and network responses. |
| **Data Sources: OpenStreetMap, Wikipedia, Wikidata, open city datasets** | Overpass pulls live OpenStreetMap tags (`amenity`, `leisure`, `tourism`, `opening_hours`, `wikipedia`, `wikidata`), and Flask enriches matching places with live Wikipedia/Wikidata summaries. | Ask for *"museums in London"* or *"parks in Bengaluru"* to see Wikipedia summaries on landmark cards. |

---

## 2. System Architecture & Safety Controls

### 2.1 Moving Parts (In Everyday Words)
1. **The Screen (`frontend/` — React + Leaflet):** Displays the chat conversation on the left (or bottom sheet on phones) and the interactive Leaflet map on the right. It never talks to external map data servers directly; it only sends the user's question to our Python server.
2. **The Brain (`backend/` — Python Flask):**
   * **Step 1 (Understand the Question):** Extracts the place category (such as hospital, park, cafe, museum) and the target city or neighborhood. If an optional AI key (OpenAI/compatible) is provided in `.env`, it uses AI structured parsing; if no key is configured or the AI fails, it automatically uses a fast built-in keyword and location rule parser so the demo never breaks.
   * **Step 2 (Find the City or Street — Nominatim):** Looks up the coordinates of the requested city or landmark using OpenStreetMap's Nominatim service.
   * **Step 3 (Find Real Places — Overpass API):** Searches OpenStreetMap within a bounded radius (default $5\text{ km}$, adjustable up to $15\text{ km}$) around those coordinates for matching places.
   * **Step 4 (Calculate Distance & Enrich — Wikipedia/Wikidata):** Calculates the exact straight-line distance from the search point to each place, formats addresses and opening hours, and fetches short Wikipedia/Wikidata summaries for places that carry knowledge tags.
   * **Step 5 (Send Back Verified Results):** Returns a clean list of places and a grounded text answer that only cites returned places—never inventing names, addresses, or hours.

### 2.2 Anti-Ban & Reliability Protections (Critical for Public OSM APIs)
Public OpenStreetMap servers enforce strict fair-use rules. Our Flask server enforces four safeguards automatically:
* **1-Request-Per-Second Gate:** Public Nominatim prohibits more than $1\text{ request per second}$ and forbids keystroke autocomplete. Flask uses a thread-safe timer lock so outbound Nominatim requests are spaced at least $1.1\text{ seconds}$ apart, and we only search when the user submits a message.
* **Custom Application Identification:** Every outbound Nominatim, Overpass, and Wikipedia request includes a compliant custom `User-Agent` header identifying our assistant.
* **In-Memory Cache (Instant Repeat Searches):** Looked-up cities, Overpass place results, and Wikipedia summaries are saved in memory for $15\text{ minutes}$. Re-asking demo questions during judging responds in under $0.1\text{ seconds}$ and uses zero external quota.
* **Overpass Mirror Failover:** If the primary public Overpass server (`overpass-api.de`) is busy or times out after $8\text{ seconds}$, Flask automatically retries once against a backup public Overpass instance (`lz4.overpass-api.de`) before reporting a polite busy message.

### 2.3 Honest Data & Medical Safety Rules
* **No Invented Facts:** Neither the server nor the optional AI layer may invent coordinates, addresses, or opening hours. If `opening_hours` is missing in OpenStreetMap, the UI explicitly displays *"Opening hours not listed in OpenStreetMap"*.
* **Clear Distance Labels:** Distances are computed using the spherical Haversine formula:
  $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
  Every card labels this clearly as *"Approx. $X\text{ km}$ straight-line from [Reference Point]"* rather than claiming driving or walking time.
* **Hospital & Emergency Note:** When a user searches for hospitals, clinics, or pharmacies, the assistant displays a clear banner: *"Map data is community-maintained and may be incomplete. In a medical emergency, contact local emergency services immediately."*

---

## 3. Supported Categories & OpenStreetMap Tag Mapping

To guarantee reliable live queries, user questions map to verified OpenStreetMap tags:

| Category Key | Example User Phrasing | OpenStreetMap Overpass Tag Filter |
| :--- | :--- | :--- |
| `hospital` | "nearest hospital", "emergency clinic", "medical center" | `amenity="hospital"` or `amenity="clinic"` |
| `park` | "parks near me", "gardens", "green space" | `leisure="park"` or `leisure="garden"` |
| `cafe` | "coffee shops", "cafes near MG Road" | `amenity="cafe"` |
| `restaurant` | "restaurants", "places to eat", "dinner spots" | `amenity="restaurant"` or `amenity="fast_food"` |
| `pharmacy` | "pharmacy", "chemist", "medical store" | `amenity="pharmacy"` |
| `museum` | "museums", "art galleries", "history" | `tourism="museum"` or `tourism="gallery"` |
| `attraction` | "tourist attractions", "landmarks", "monuments", "sights" | `tourism="attraction"` or `historic="monument"` |
| `library` | "public library", "study space" | `amenity="library"` |
| `supermarket` | "grocery store", "supermarket" | `shop="supermarket"` |

If a user asks for a category outside this list (for example, *"buy movie tickets"*), the assistant politely explains which place types it can search and offers clickable suggestions.

---

## 4. Clean Repository Structure

We will keep the project small, auditable, and free of unused scaffolding:

```text
location-smart-assistant/
├── README.md                        # Setup, architecture, and judge verification guide
├── .env.example                     # Optional AI key and port settings (no real secrets)
├── backend/
│   ├── requirements.txt             # flask, flask-cors, requests, python-dotenv, pytest
│   ├── app.py                       # Flask entrypoint: /api/health and /api/chat routes
│   ├── services/
│   │   ├── intent_parser.py         # Rule-based + optional LLM question & follow-up parser
│   │   ├── nominatim_client.py      # 1-req/sec throttled, cached Nominatim geocoder
│   │   ├── overpass_client.py       # Bounded Overpass QL builder + mirror failover
│   │   ├── wiki_client.py           # Wikipedia REST & Wikidata summary enrichment
│   │   └── geo_utils.py             # Haversine distance math and address/hours formatting
│   └── tests/
│       └── test_assistant.py        # Automated tests for parsing, distance, and API shapes
└── frontend/
    ├── package.json                 # react, react-dom, leaflet, react-leaflet, lucide-react, tailwindcss, vite
    ├── index.html                   # Includes Leaflet CSS and responsive viewport settings
    └── src/
        ├── main.tsx                 # App bootstrap
        ├── App.tsx                  # Split-screen layout, session state, and GPS handler
        ├── types.ts                 # Strict TypeScript interfaces matching Flask JSON
        └── components/
            ├── ChatPanel.tsx        # Message history, prompt chips, input bar, safety banner
            ├── MapView.tsx          # Leaflet map, smooth flyTo controller, numbered pins
            └── PlaceCard.tsx        # Address, distance badge, opening hours, Wikipedia blurb
```

---

## 5. Server API Contract

### 5.1 `GET /api/health`
Confirms the Flask server is running without calling external APIs.
* **Response (`200 OK`):**
  ```json
  {
    "status": "ok",
    "stack": "React + Flask + Nominatim + Overpass + Leaflet + Wikipedia",
    "ai_mode": "hybrid_rule_and_llm"
  }
  ```

### 5.2 `POST /api/chat`
Handles natural-language questions, follow-up refinements, and optional device coordinates.
* **Request Body:**
  ```json
  {
    "message": "Nearest hospital to MG Road, Bengaluru",
    "user_location": { "lat": 12.9716, "lon": 77.5946 },
    "last_context": {
      "location_name": "MG Road, Bengaluru",
      "lat": 12.9756,
      "lon": 77.6066,
      "category": "hospital"
    }
  }
  ```
* **Response Body (`200 OK`):**
  ```json
  {
    "status": "ready",
    "reply": "I found 6 hospitals near MG Road, Bengaluru. The closest returned result is Bowring and Lady Curzon Hospital (approx. 1.1 km away).",
    "safety_notice": "Map data is community-maintained and may be incomplete. In a medical emergency, contact local emergency services immediately.",
    "resolved_location": {
      "label": "MG Road, Bengaluru, Karnataka, India",
      "lat": 12.9756,
      "lon": 77.6066,
      "source": "Nominatim / OpenStreetMap"
    },
    "context": {
      "location_name": "MG Road, Bengaluru",
      "lat": 12.9756,
      "lon": 77.6066,
      "category": "hospital"
    },
    "places": [
      {
        "id": "node/12345678",
        "rank": 1,
        "name": "Bowring and Lady Curzon Hospital",
        "category": "hospital",
        "lat": 12.9821,
        "lon": 77.6042,
        "distance_km": 1.1,
        "distance_label": "Approx. 1.1 km straight-line from MG Road, Bengaluru",
        "address": "Lady Curzon Road, Shivajinagar, Bengaluru 560001",
        "opening_hours": "24/7",
        "phone": "+91-80-25591325",
        "website": null,
        "wiki_summary": "A major teaching and government hospital in Bengaluru established in 1868.",
        "wiki_url": "https://en.wikipedia.org/wiki/Bowring_%26_Lady_Curzon_Hospitals",
        "osm_url": "https://www.openstreetmap.org/node/12345678"
      }
    ],
    "attribution": "Map data © OpenStreetMap contributors (ODbL), Nominatim, Overpass API, Wikipedia/Wikidata."
  }
  ```
* **Other Status States:**
  * `needs_location`: Returned when the user asks *"parks near me"* without sharing GPS or naming a city. Prompts the user to click **"Use my GPS"** or type a city name.
  * `no_results`: Returned when Overpass finds zero places within the radius, offering to expand the search radius or try another category.
  * `unsupported_category`: Returned with clickable buttons for the 9 supported place categories.
  * `error`: Returned with a clear, non-technical retry button if external map servers are unreachable.

---

## 6. 4-Step Fast Build Sequence

We will build and verify this in four focused steps so you have a working application immediately:

### Step 1: Flask Backend + Live OSM & Wikipedia Engine
* Create `backend/` with `geo_utils.py`, `nominatim_client.py`, `overpass_client.py`, `wiki_client.py`, and `intent_parser.py`.
* Wire `/api/health` and `/api/chat` in `app.py` with input validation, $1\text{ req/sec}$ rate limiting, and $15\text{-minute}$ in-memory caching.
* Run `pytest` unit tests to confirm Haversine distance accuracy, question parsing, and graceful handling of missing opening hours.

### Step 2: Interactive Leaflet Map & Synchronized Pins
* Create `frontend/` with React, TypeScript, Tailwind CSS, and `react-leaflet`.
* Build `MapView.tsx` featuring a smooth camera `flyTo` animation whenever the resolved city changes, numbered markers (`1` through `10`), and detailed popups with OpenStreetMap and Wikipedia links.

### Step 3: Conversational Assistant UI & Follow-Up Memory
* Build `ChatPanel.tsx` and `PlaceCard.tsx` with sample question chips (*"Nearest hospital to MG Road, Bengaluru"*, *"Parks in Cubbon Park area, Bengaluru"*, *"Museums in London"*, *"Cafes near Shinjuku, Tokyo"*).
* Connect the **"Use my GPS"** button and follow-up context so typing *"cafes instead"* or *"pharmacies instead"* searches the same neighborhood without re-typing the city.
* Ensure clicking a card highlights and opens the matching pin on the map, and clicking a pin scrolls to the card.

### Step 4: 5-City Rehearsal & Polish
* Test 10 real queries across **Bengaluru, Chennai, London, Tokyo, and New York**.
* Verify the emergency banner on hospital searches, the clarification prompt when no city is given, and responsive layout on both desktop and mobile widths ($360\text{ px}$).

---

## 7. Judge Verification Click-Path (2-Minute Demo Script)

Anyone—including a non-technical judge—can verify the entire system in five clicks:

1. **Open the App:** Open the browser URL. Notice the interactive Leaflet map with OpenStreetMap attribution and the chat assistant with suggested questions.
2. **Test a Live Hospital Query:** Click or type *"Nearest hospital to MG Road, Bengaluru"*. Watch the map smoothly fly to central Bengaluru and drop numbered pins. Point out the emergency disclaimer banner, the street address, the straight-line distance in $\text{km}$, and the opening hours on Card #1.
3. **Test Conversational Memory:** Type *"Parks instead"*. Notice the assistant remembers you are looking around MG Road, Bengaluru, updates the pins to nearby parks (like Cubbon Park), and displays a Wikipedia summary right inside the card.
4. **Test Any Searchable City Worldwide:** Type *"Museums in London"* or *"Cafes near Shinjuku, Tokyo"*. Watch the map fly across the world and drop real pins with local addresses and Wikipedia links.
5. **Test Missing Location Handling:** Click **"Clear Context"** and type *"Pharmacies near me"* without enabling GPS. Confirm the assistant politely asks you to either click **"Use my GPS"** or type a city name rather than guessing or crashing.

---

## 8. Phase 2 Bridge: How This Ports to Option B Later

Nothing we write in Option A is wasted when you move to the **DeepSpace 3D Social Globe (Option B)** after the hackathon:
* The React TypeScript interfaces (`types.ts`) and UI card components (`ChatPanel.tsx`, `PlaceCard.tsx`) carry straight over into the DeepSpace frontend.
* The Leaflet component (`MapView.tsx`) is isolated in a single file so it can be swapped cleanly for the `MapLibre GL JS` 3D globe component in Phase 2.
* The category rules, Haversine distance math, and Wikipedia enrichment logic translate directly into your DeepSpace worker routes before you layer on multi-stop routing, voice, and friend rooms.