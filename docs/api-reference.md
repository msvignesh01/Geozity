# API reference

Globe API source on `main`, checked against `globe/src/server/app.ts` and the search/outing/voice domain contracts on 16 November 2026. The outing routes require the matching Worker release; a source push alone does not deploy that API. The website calls same-origin /api through Vercel; direct Worker origin is https://geozity-api.geozity-globe.workers.dev. Local website/API is http://127.0.0.1:8780.

## Access and safety

Anonymous search uses a signed HttpOnly, SameSite=Strict session cookie (Secure on HTTPS); it is not account authentication. POST requests validate origin, initialize/verify sessions and require configured storage. Cross-site browser requests are rejected. Origin checks are not authorization for private records. Follow-up/choice tokens are signed, session-bound and expire after one hour. Treat them as sensitive context; do not fabricate or reuse them across sessions.

## GET /api/health

Returns status, product, platform, storage and aiMode. Current platform is Cloudflare Workers and storage is Supabase. aiMode is configured or rule_based. This is process/configuration health, not a live provider or database connectivity test.

## GET /api/config

Returns voiceEnabled, speechEnabled, voiceProviders and mapStyleUrl. Provider names are sarvam and elevenlabs. Availability reflects switches, keys and configured limits, not proof of unused remaining quota. No secrets are returned.

## POST /api/location/search

JSON fields:

| Field          | Rule                                                          |
| -------------- | ------------------------------------------------------------- |
| requestId      | Required UUID                                                 |
| question       | Required trimmed string, 1–500 characters                     |
| deviceLocation | Optional/null numeric lat [-90,90], lon [-180,180]            |
| contextToken   | Optional/null signed context, maximum 5000 characters         |
| choiceToken    | Optional/null signed location choice, maximum 5000 characters |
| radiusMeters   | 1000, 3000, 5000 or 10000; default 5000                       |

Unknown root fields are rejected; maximum location-request body is 16 KiB.

Response variants:

| status              | Fields beyond status/requestId                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| ready               | summary, aiMode (ai_verified or rule_based), safetyNotice, resolvedLocation, contextToken, places (1–10), cached |
| needs_clarification | question, choices (up to five label/token pairs), contextToken                                                   |
| no_results          | summary, resolvedLocation, contextToken, radiusMeters                                                            |
| failed              | message, errorCode, retryable                                                                                    |

Locations contain label, lat and lon. Each place contains id, rank, name, category, lat, lon, address, openingHours, distanceMeters, distanceLabel, osmUrl, wikiSummary, wikiUrl and retrievedAt (UTC timestamp). Address/hours/article fields can be null. Category is hospital, park, cafe, restaurant, pharmacy, museum, attraction, library or supermarket. Distances are straight-line. Unsupported requests return failed with UNSUPPORTED_CATEGORY; do not infer success from HTTP 200 alone. Provider/cache status is explicit; current successful searches return cached=false.

## Branch outing endpoints (not released to production)

`POST /api/outing/create` accepts a UUID `requestId`, validated `input` and optional `choiceToken`. Input requires area, occasion, localStart, an IANA timezone, groupSize (1–20), transport (`walk`, `bicycle`, `drive`), durationMinutes (30–720), nullable budget, requirements, preferences and 2–5 category/dwell-minute stops. Requirements and budget distinguish `must` from `prefer`. Medical categories are excluded from outing stops. See `globe/src/domain/outing.ts` for the strict contract.

`POST /api/outing/edit` accepts UUID requestId, signed planToken, stopId and action (`replace` or `remove`). Draft tokens are session-bound and expire after 30 minutes; edits do not extend evidence expiry. Minimum remaining stops is two. Neither endpoint stores plans. Maximum request body is 120000 bytes. They share the existing session, origin, budget and 20-second provider deadline protections.

Responses are `ready` (plan and signed planToken), `needs_clarification` (question and choices), `infeasible` (message), or `failed` (message/errorCode/retryable). A `ready` response means a draft was constructed: inspect `plan.status` (`checked`, `needs_confirmation`, `infeasible`) and warnings before treating it as feasible. Unverified routing has null leg distances/times and null subsequent arrivals. `checked` covers routes and supported listed opening windows, not reservations, costs, group availability or current business status.

## POST /api/voice/transcribe

Body is audio/wav: mono 16 kHz, 16-bit PCM with the validated 44-byte WAV header, 0.1–30 seconds and at most 960044 bytes. X-Voice-Provider selects sarvam or elevenlabs (default elevenlabs). Returns JSON text, at most 500 characters. The UI records only after consent, converts audio and asks for transcript review before search. Sarvam uses translation mode to produce English text.

## POST /api/voice/speak

Strict JSON object with text (1–500 trimmed characters) and optional provider (sarvam or elevenlabs, default elevenlabs). Returns audio/wav or audio/mpeg based on returned bytes. Voice must be enabled and the relevant allowance available. The route's shared body limit is 960044 bytes; that does not relax the text limit.

## Failure semantics

Public error responses contain status=failed, requestId, errorCode, message and retryable. Relevant HTTP statuses are 400 invalid input/context/audio, 403 denied origin, 413 oversized body, 429 allowance reached, 502 invalid/unavailable provider output or configuration, 503 unavailable setup/storage/provider/service and 504 timeout. Search outcome variants such as clarification or unsupported category may be HTTP 200. Unknown routes return 404 with an error field instead of the normal failure envelope. API responses are no-store. Consumers should validate the response contract, not assume every JSON response has the same fields.

## Earlier Flask contract

frontend/ uses POST /api/chat, not /api/location/search. It sends message (1–1000 characters), optional user_location, last_context and pending_category; replies use snake_case names and ready, needs_location, unsupported_category, location_not_found, no_results or error. Its health uses ai_mode=rule_based. See backend/services/validation.py and frontend/src/api.ts. Do not interchange the two contracts.
