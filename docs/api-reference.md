# API reference

## Overview

Geozity exposes a small HTTP API for the frontend. The API is not a general-purpose backend; it is a single chat-oriented search endpoint with a health check.

## Base URL

When the app is running locally, the base URL is:

```text
http://127.0.0.1:5000
```

In deployment, the same environment hosts both the frontend and API under the same origin.

## Authentication and access control

There is no login, bearer token, or role-based access system in the application code. The service is effectively anonymous and public. The only route protection present is the CORS policy and request validation on the API endpoints.

## `GET /api/health`

Returns the service status and a brief product description.

### Example response

```json
{
  "status": "ok",
  "product": "Geozity",
  "stack": "React + Flask + Nominatim + Overpass + Photon + Leaflet + Wikipedia",
  "ai_mode": "rule_based"
}
```

### Status codes

- `200 OK` when the backend is running

## `POST /api/chat`

Accepts a natural-language search request and returns a structured result payload.

### Request body

```json
{
  "message": "parks near me",
  "user_location": { "lat": 12.97, "lon": 77.59 },
  "last_context": {
    "location_name": "Bengaluru",
    "lat": 12.9716,
    "lon": 77.5946,
    "category": "park"
  },
  "pending_category": null
}
```

### Validation rules

- `message` must be a non-empty string under 1000 characters
- `user_location` must have numeric `lat` and `lon` values within valid bounds
- `last_context` must include a valid location name and a supported category
- `pending_category` must be one of the supported categories or `null`

### Success responses

#### `status: "ready"`

```json
{
  "status": "ready",
  "reply": "I found 5 parks near Bengaluru. The closest returned result is Cubbon Park (Approx. 1.2 km straight-line from Bengaluru).",
  "safety_notice": null,
  "resolved_location": {
    "label": "Bengaluru",
    "lat": 12.9716,
    "lon": 77.5946,
    "source": "Nominatim / OpenStreetMap"
  },
  "context": {
    "location_name": "Bengaluru",
    "lat": 12.9716,
    "lon": 77.5946,
    "category": "park"
  },
  "places": [
    {
      "id": "node/12345",
      "rank": 1,
      "name": "Cubbon Park",
      "category": "park",
      "lat": 12.976,
      "lon": 77.592,
      "distance_km": 1.2,
      "distance_label": "Approx. 1.2 km straight-line from Bengaluru",
      "address": "Cubbon Road, Bengaluru",
      "opening_hours": "Opening hours not listed in OpenStreetMap",
      "phone": null,
      "website": null,
      "wiki_summary": "A public park in central Bengaluru.",
      "wiki_url": "https://en.wikipedia.org/wiki/Cubbon_Park",
      "osm_url": "https://www.openstreetmap.org/node/12345"
    }
  ],
  "attribution": "Map data © OpenStreetMap contributors (ODbL), Nominatim, Overpass API, Photon, Wikipedia/Wikidata."
}
```

#### `status: "needs_location"`

Returned when the user indicates a near-me search but GPS is not available or not yet supplied.

#### `status: "unsupported_category"`

Returned when the category is not among the supported categories. The response includes `suggested_categories`.

#### `status: "location_not_found"`

Returned when a geocoding lookup returns no usable place.

#### `status: "no_results"`

Returned when the downstream providers return no results for a valid request.

### Error responses

- `400 Bad Request` for invalid JSON or invalid request payloads
- `413 Payload Too Large` when the message is too long
- `503 Service Unavailable` when the provider stack is unavailable or busy
- `500 Internal Server Error` for unexpected application failures

The API always includes a JSON response with `status` and `reply` in the error and success paths.

## Client-side validation

The frontend also validates API responses in `frontend/src/api.ts` before trusting them. This is a hard boundary check to prevent broken or malformed JSON from being treated as a valid place search result.
