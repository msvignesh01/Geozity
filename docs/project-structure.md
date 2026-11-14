# Project structure

## Top-level layout

```text
Geozity/
├── .dockerignore
├── .env.example
├── .gitattributes
├── .gitignore
├── .vercelignore
├── Dockerfile
├── README.md
├── render.yaml
├── backend/
├── frontend/
├── scripts/
└── docs/
```

## Backend

```text
backend/
├── app.py
├── conftest.py
├── gunicorn.conf.py
├── requirements.lock.txt
├── requirements.render.txt
├── requirements.txt
├── services/
│   ├── __init__.py
│   ├── cache.py
│   ├── errors.py
│   ├── geo_utils.py
│   ├── intent_parser.py
│   ├── nominatim_client.py
│   ├── overpass_client.py
│   ├── photon_client.py
│   ├── place_categories.py
│   ├── validation.py
│   └── wiki_client.py
└── tests/
    ├── browser_server.py
    ├── test_assistant.py
    ├── test_live_osm.py
    ├── test_photon.py
    └── test_regressions.py
```

### Important backend files

- `app.py`: Flask app, health endpoint, chat endpoint, request flow, provider fallback logic, and final result assembly.
- `services/intent_parser.py`: rule-based category and location extraction for natural-language queries.
- `services/validation.py`: request validation and safe coordinate checks.
- `services/overpass_client.py`: primary live POI search by category.
- `services/nominatim_client.py`: geocoding and fallback POI search.
- `services/photon_client.py`: mergeable OSM fallback for location and place search.
- `services/wiki_client.py`: optional Wikipedia summary lookup.
- `services/geo_utils.py`: distance, address, and place normalization logic.
- `services/place_categories.py`: OSM tag mapping for the supported categories.

## Frontend

```text
frontend/
├── index.html
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.js
├── src/
│   ├── App.tsx
│   ├── api.ts
│   ├── components/
│   │   ├── ChatPanel.tsx
│   │   ├── MapView.tsx
│   │   └── PlaceCard.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── safe-url.ts
│   └── types.ts
├── tailwind.config.js
├── tests/
│   └── api.test.mjs
├── tsconfig.json
├── vercel.json
├── vite.config.ts
└── dist/
```

### Important frontend files

- `src/App.tsx`: top-level state and message flow.
- `src/api.ts`: fetch wrappers, validation of API responses, and service readiness polling.
- `src/components/ChatPanel.tsx`: chat UI, example prompts, GPS button, and loading state.
- `src/components/MapView.tsx`: Leaflet map, pins, and popups.
- `src/components/PlaceCard.tsx`: result list cards and key metadata.

## Scripts and deployment

- `scripts/start-local.ps1`: local verification and server start
- `Dockerfile`: builds frontend and backend into a single runtime image
- `render.yaml`: Render deployment configuration for the Docker image

## Documentation folder

The `docs/` directory currently holds the project documentation and is the canonical location for user and developer references.
