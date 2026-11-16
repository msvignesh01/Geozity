# Contributing and scope

The current delivery target is a stable Version 1 hackathon app using the existing globe, live search, place details and optional voice. H2 outing planning and further H3–H6 development are paused until the owner explicitly resumes them. Screenshot V1/V2 labels are interface stages. The current source has been merged into main; the local version-2-preview name is a retained checkpoint, not an active remote release branch.

Inspect the repository and relevant dependent areas before changes. Preserve both application generations and existing client work. Reuse the current contracts, provider adapters and budget checks. Do not add dependencies, unrelated architecture changes or new product scope to a documentation task.

Get informed approval before deleting features/files, changing stored data or database structure, altering sign-in/permissions, moving domains, changing hosting configuration, publishing to shared environments or rewriting saved history. Existing documentation can be updated within the requested docs scope; that is not approval to change the running app.

Run the relevant package's existing checks for behavior changes. For globe/, use pnpm test, pnpm typecheck, pnpm format:check and pnpm build. Tests must prove behavior; controlled browser fixtures do not prove live integration. Live AI/voice checks consume credits and require intentional opt-in. Physical-device and human acceptance are separate evidence.

Write honest docs with working relative links, real script names, accurate UI labels and clear current/earlier-app distinctions. Preserve dated evidence and label historical plans rather than presenting them as implemented. Never include credentials, raw user audio, private locations or management tokens in docs/screenshots/source. Keep .env.local, .dev.vars and .deployment/ ignored. Some original planning/evidence files remain local-only under existing ignore rules; do not silently change that publishing policy.

Keep each change narrow and reversible. Do not delete older documentation or tests without approval. Report what was actually checked, its date and material gaps. Do not call the full roadmap complete on the strength of a passing build.
