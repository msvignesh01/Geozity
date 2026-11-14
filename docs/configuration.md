# Configuration reference

This project does not use a database or a complex runtime config system. The meaningful configuration is mainly environment variables and the startup scripts that pass them into the app.

## Environment variables

The root sample file is `.env.example` and contains the supported values the application currently uses or expects.

### `PORT`

- Default: `5000` in local development
- Purpose: the Flask app binds to this port when started directly or through the startup script
- Used in: `backend/app.py`, `scripts/start-local.ps1`, and `backend/gunicorn.conf.py`

### `ALLOWED_ORIGINS`

- Default: empty string
- Purpose: a comma-separated list of browser origins allowed to use the `/api/*` routes
- Used in: `backend/app.py`

### `NOMINATIM_URL`

- Default: `https://nominatim.openstreetmap.org/search`
- Purpose: override the Nominatim endpoint when a custom mirror or proxy is used
- Used in: `backend/services/nominatim_client.py`

### `OVERPASS_URLS`

- Default: three public Overpass endpoints defined in `OverpassClient.ENDPOINTS`
- Purpose: comma-separated list of Overpass API mirrors to try in order
- Used in: `backend/services/overpass_client.py`

### `PHOTON_URL`

- Default: `https://photon.komoot.io`
- Purpose: override the Photon geocoder endpoint
- Used in: `backend/services/photon_client.py`

## Legacy or compatibility variables

The sample `.env.example` file includes:

- `FLASK_ENV=development`
- `OPENAI_API_KEY=`

These are present as compatibility placeholders, but the runtime code does not use them for request processing. The app reports `"ai_mode": "rule_based"` in `GET /api/health`, which matches the code implementation.

## Deployment configuration

### Render

The `render.yaml` file declares a single Docker-based web service named `geozity`.

It uses:

- `runtime: docker`
- `dockerfilePath: ./Dockerfile`
- `healthCheckPath: /api/health`

### Docker

The `Dockerfile` builds the frontend first, then the backend, then packages both into the runtime stage. It exposes port `10000` and runs Gunicorn with the config in `backend/gunicorn.conf.py`.

## CORS and browser safety

The app uses a restrictive CORS policy for API routes and sets headers such as:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(self)`

These values are enforced in `app.after_request()`.

## No secrets in docs

This project does not include any real API keys, private credentials, or production hostnames in the repository. The documentation describes setting names and provider behavior without exposing secret values.
