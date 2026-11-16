# Configuration reference

Current globe app, checked 16 November 2026. Root .env.example explains where to obtain credentials; globe/.env.example lists local Worker settings. Samples deliberately default AI/voice off. They are not a dump of hosted secrets or hosted activation state.

## Required server settings

| Name                      | Purpose                                                                   |
| ------------------------- | ------------------------------------------------------------------------- |
| GEOAPIFY_API_KEY          | Live geocoding and place records                                          |
| SUPABASE_URL              | Intended Supabase project URL                                             |
| SUPABASE_SECRET_KEY       | Preferred private server key                                              |
| SUPABASE_SERVICE_ROLE_KEY | Legacy server-key alternative; only one server key is needed              |
| SESSION_HMAC_SECRET       | At least 32 characters; signs anonymous sessions and context              |
| FRONTEND_ORIGIN           | Hosted allowed browser origin; currently https://geozity-globe.vercel.app |
| MAP_STYLE_URL             | MapLibre style; configured OpenFreeMap liberty style                      |

SUPABASE_ACCESS_TOKEN is a setup/management credential, not a runtime key. The existing local misspelled name supbase_acess_key is a setup-only historical alias; the app does not read it. Do not copy either management token to Vercel or the Worker. Render/Vercel/Cloudflare management credentials likewise stay out of runtime settings.

## Optional provider settings

ENABLE_AI=true needs SARVAM_API_KEY, AI_MODEL and a positive DAILY_AI_CALL_LIMIT. ENABLE_VOICE=true needs the selected provider key and positive voice/speech limits. Merely saving a key does not activate those features in the local sample.

| Setting              | Recorded default in current code |
| -------------------- | -------------------------------- |
| AI_MODEL             | sarvam-105b-conversations        |
| ELEVENLABS_STT_MODEL | scribe_v3                        |
| ELEVENLABS_TTS_MODEL | eleven_v4                        |
| SARVAM_STT_MODEL     | saaras:v4                        |
| SARVAM_TTS_MODEL     | bulbul:v4-flash                  |
| SARVAM_TTS_LANGUAGE  | en-IN                            |

ElevenLabs uses ELEVENLABS_API_KEY and optional ELEVENLABS_VOICE_ID; absent a voice ID, code uses its recorded default voice. Sarvam uses SARVAM_API_KEY for both voice and optional intent interpretation. Sarvam transcription translates to editable English; changing the speech language setting does not translate answer text. These are configured model names, not a claim that they will remain each provider's latest model. Account access must be checked before changing them.

## Usage limits and pause switch

Recorded hosted shared daily allowances are 200 map calls, 30 AI calls, 120 voice seconds and 3000 spoken characters. A search can consume more than one map call. Per-client limits also apply. Supabase reservations use UTC days; a failed reservation blocks chargeable work. A provider failure may still consume the reserved allowance. These are app safeguards, not a billing guarantee or substitute for account spending controls.

DISABLE_EXTERNAL_PROVIDERS=true pauses metered search/voice work; optional AI falls back to rules. Static map tiles are loaded by the browser separately. Limits are DAILY_MAP_CALL_LIMIT, DAILY_AI_CALL_LIMIT, DAILY_VOICE_SECONDS_LIMIT and DAILY_SPEECH_CHAR_LIMIT. Missing/invalid limits fail closed.

## Deployment ownership

Vercel geozity-globe builds globe/; geozity builds frontend/. Both are in Vicky's Workspace and linked to msvignesh01/Geozity. The Worker account is explicitly pinned in globe/wrangler.toml. See [runbook](operations-runbook.md). Local file edits do not update hosted secrets. Never place credentials in VITE_ variables, documentation or Git.

## Earlier Flask app

PORT controls its local port; ALLOWED_ORIGINS is an explicit browser-origin list. GEOAPIFY_API_KEY enables its Geoapify path. NOMINATIM_URL, OVERPASS_URLS and PHOTON_URL override its other providers. FLASK_ENV and OPENAI_API_KEY are historical compatibility examples, not switches for the current AI service. The earlier app reads root .env and only its allowed Geoapify setting from root .env.local. It does not use the globe's Supabase counters or voice endpoints.
