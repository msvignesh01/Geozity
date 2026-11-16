# Operations runbook

Checked 16 November 2026 through the signed-in Vercel dashboard and repository configuration. Current scope is Version 1 for the hackathon; further roadmap development is paused.

## Hosting inventory

| Vercel project | Website                          | Build folder | API destination                       | Purpose                                                |
| -------------- | -------------------------------- | ------------ | ------------------------------------- | ------------------------------------------------------ |
| geozity-globe  | https://geozity-globe.vercel.app | globe/       | geozity-api.geozity-globe.workers.dev | Current globe/search/optional voice app                |
| geozity        | https://geozity.vercel.app       | frontend/    | geozity.onrender.com                  | Earlier React/Leaflet website with Flask/Render search |

Both projects are in Vicky's Workspace (Hobby), signed in as msvignesh01, connected to msvignesh01/Geozity and using Node 24. Both production deployments showed Ready from main commit 90c3c42 (merge of version-2-preview). They build different applications even from the same commit. The old preview branch was removed remotely after merge; local checkpoint branches remain. Do not describe main as containing only the earlier app.

The current Worker is geozity-api in the Vignesh Cloudflare account pinned in globe/wrangler.toml. Its browser-origin setting is https://geozity-globe.vercel.app. The website forwards /api requests; its direct Worker URL is an API, not a second website. Both Vercel projects remain intentionally preserved. No project, domain, provider key or hosting setting was changed during this documentation review.

Use geozity-globe for the hackathon. Deleting the earlier project, moving geozity.vercel.app to the new one, changing the allowed origin or stopping Render requires a separately approved plan. A domain move also needs origin/session/voice/search verification; merely changing the URL can break requests.

## First checks

1. Confirm which website the user opened. Earlier-app waking messages describe Render, not Cloudflare.
2. Open /api/health on that website. The current app reports Cloudflare Workers and Supabase; the earlier one reports rule_based under ai_mode. A healthy response does not test live providers or storage access.
3. On the current website, choose Parks in Bengaluru. Verify numbered results and pins, select a card, then choose Start fresh. If the result is an error, record the exact message and approximate time, without recording private queries, coordinates or audio.
4. Inspect that project's Vercel deployment and its actual API's logs. Vercel Ready confirms website deployment, not end-to-end search health.

## Current app failures

| Symptom/code                           | Interpretation and response                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| NOT_CONFIGURED                         | Check required Worker secret names, Supabase URL and signing-secret length privately. Never print values.                                        |
| BUDGET_UNAVAILABLE                     | Check Supabase availability, server key and the installed geozity_reserve_usage function. Chargeable work stays blocked; do not bypass counters. |
| QUOTA_REACHED / HTTP 429               | Shared or client daily allowance reached; UTC-day reset applies. Do not automatically increase limits or loop retries.                           |
| SEARCH_PAUSED                          | DISABLE_EXTERNAL_PROVIDERS is active. Confirm the owner's intent before changing it.                                                             |
| ORIGIN_DENIED                          | Confirm the visitor uses the approved current website and the forwarding/FRONTEND_ORIGIN settings agree. Do not disable the check.               |
| INVALID_CONTEXT                        | Choose Start fresh; old, modified or cross-session context is rejected.                                                                          |
| Map/provider failure                   | Check Geoapify key/account allowance, network and provider status. A valid empty result must remain distinct from an outage.                     |
| Missing Wikipedia summary              | Optional enrichment can fail independently. Only tagged place identities are enriched, up to three; never invent a replacement.                  |
| Voice unavailable or allowance reached | Check selected provider, activation and allowance. Keep typed search available when voice alone fails.                                           |
| VOICE_CONFIGURATION / VOICE_TIMEOUT    | Check account model access or provider availability. Do not silently substitute models or spend more.                                            |
| Map does not render                    | Check WebGL/browser support and OpenFreeMap tile access; the list should remain usable. Use the map retry control.                               |

Recorded daily shared caps: 200 map calls, 30 AI calls, 120 voice seconds and 3000 spoken characters. These limit app reservations, not all provider-account usage. Direct verification scripts bypass application reservations and consume credits. Never run them as a retry loop.

## Observability and recovery

Cloudflare observability is enabled. Current API logs include request ID, method, status, duration and stable error codes; budget/provider/AI warnings identify fallback or reservation failure. Correlate using request IDs and times. Do not log secret values, questions, precise coordinates, context tokens or recordings. Never disable storage or substitute fake results to restore apparent success.

For a bad deployment, identify the last known good website and Worker versions first. Reverting a website does not revert the separately hosted Worker, its secrets or Supabase data. Perform an approved rollback only after checking compatible contracts and origin settings, then repeat search, reset and optional voice checks. The latest recorded Worker correction was version 9eb8b380-e3e6-4aaa-ac7a-106de2e18d2d; verify actual dashboard state before any rollback.

## Earlier app

The old Vercel website forwards to the Render Flask service. Root Dockerfile/render.yaml and backend/gunicorn.conf.py belong to that app. It uses four concurrent search slots and bounded in-memory provider caches. Geoapify is used when configured; otherwise public OSM providers are used. Render sleep/startup and public-provider outages can delay results. Do not confuse its /api/chat contract or startup controls with the globe app. The earlier app has no Supabase usage counters.

## Remaining acceptance

Physical-phone tests, first-time human usability tests, human accents/noisy mixed-language voice and production load have not been established by automated checks. Map accuracy and provider availability remain external dependencies. See [verification](verification.md) and the local historical BROWSER_CHECKS.md.
