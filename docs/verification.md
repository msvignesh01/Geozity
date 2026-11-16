# Current verification context — 16 November 2026

The target is the Version 1 hackathon scope, not completion of every horizon. GitHub main now includes the globe app (merge 90c3c42); the remote version-2-preview branch was removed after merge. Both Vercel projects showed Ready from that commit during this documentation review, with roots frontend/ and globe/ respectively. This observation proves deployment status, not current live search/provider health.

Previously recorded globe checks in this conversation: 66 unit/integration tests, typecheck, formatting and build passed after the Wikipedia enrichment correction. An earlier checkpoint recorded 16 controlled desktop/mobile browser cases; three fresh-connection live rehearsals recorded 30/30 search checks; both voice providers passed synthesized-audio/transcription checks. A subsequent live Bengaluru park search included Cubbon Park's Wikipedia summary. These are dated results, not claims that all checks were rerun during this docs-only update. Earlier pooled network runs encountered ECONNRESET; that evidence was preserved.

Local evidence is in ignored .deployment/release-verification.json and .deployment/version-1-hackathon-checkpoint.json. These contain historical branch/hosting statements valid at their timestamps; the later merge is described above. They are local evidence, not guaranteed files in a fresh clone. No tests were replaced with fabricated live results.

Pending: physical-phone behavior, first-time human usability, actual human accents/noisy mixed speech, production load and wider privacy/license acceptance. Controlled mobile viewports and synthetic microphone audio do not resolve those gaps. No full production readiness or full H1/H3 roadmap acceptance is claimed. H2 and further H3–H6 work remains paused.

See [developer setup](developer-setup.md) for repeatable and opt-in live checks. The dated Flask/Leaflet verification remains in the local historical VERIFICATION.md; it is not the current globe's test report.
