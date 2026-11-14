# Operations runbook

## Purpose

This runbook covers the most common operational problems in Geozity and the expected recovery path. The app is small but depends on public upstream OSM and Wikipedia services. The main operational risk is provider availability and rate limiting, not database corruption or app state loss.

## Service health

The health endpoint is:

```text
GET /api/health
```

A healthy backend returns:

```json
{
  "status": "ok",
  "product": "Geozity",
  "stack": "React + Flask + Nominatim + Overpass + Photon + Leaflet + Wikipedia",
  "ai_mode": "rule_based"
}
```

## Common issues

### 1. Search service is busy

Symptom:

- the backend responds with `503 Service Unavailable`
- message contains "Search is busy. Please try again shortly."

Cause:

- `search_slots` is a semaphore with a limit of four concurrent searches in `backend/app.py`

Action:

- ask the user to retry a moment later
- do not retry on a loop from the client side without a delay

### 2. Upstream provider outage

Symptom:

- a search fails or starts returning errors even though the app itself is healthy
- the backend logs a provider warning in the Flask process

Cause:

- Nominatim, Overpass, Photon, or Wikipedia are slow or unavailable

Expected behavior:

- Overpass is tried first
- Nominatim and Photon handle the fallback path
- the app can fail with a clear `ServiceUnavailable` response if all providers fail

### 3. No places are returned

Symptom:

- `status: "no_results"`
- the service responds successfully but the `places` list is empty

Cause:

- there are no near-by matches for that category in the selected radius
- the user may have asked for an uncommon category or a location with limited data coverage

Action:

- suggest a different area or category
- confirm that the location is valid and the search radius is appropriate

### 4. Location lookup fails

Symptom:

- `status: "location_not_found"`
- the geocoding provider did not resolve the requested place or neighborhood

Cause:

- misspelling, very local place names, or sparse map coverage

Action:

- ask the user to type a larger place name such as a city or district
- use GPS when available

## Log locations and signal patterns

The Flask app logs request timing and provider errors. The Gunicorn config writes access logs to standard output and keeps request metrics in the log line format:

```text
method=%(m)s status=%(s)s duration_ms=%(M)s
```

The app’s `after_request` hook logs the request method, status code, and duration in milliseconds. That is the main operational signal for request health.

## Deployment checks

When deployed through Render or Docker, the expected checks are:

- `GET /api/health` returns `200 OK`
- the frontend can load the root page
- map requests can reach OSM tile providers when the browser renders the Leaflet map
- the API can resolve a simple test query such as "parks near me" or "museums in London" when the providers are healthy

## Recovery strategy

1. Confirm that the app is running and the health endpoint is reachable.
2. Check whether the issue is specific to one provider or affects all place lookups.
3. Retry with a different location or category to separate a provider problem from a data issue.
4. If all providers fail, report the outage honestly instead of returning a misleading empty result.

## Operational constraints

- The app does not persist user state or business data, so there is no database restore path.
- The system depends on public map endpoints and is therefore sensitive to rate limits and network conditions.
- The project is intentionally conservative: it returns clear errors rather than pretending to have data it does not have.
