# Contributing and scope

The deployed target is the Version 1 hackathon app using the globe, live search, place details and optional voice. The owner explicitly resumed local H2 outing planning and H3 voice/personality work; release checks are still pending. H4–H6 are outside the current work. Screenshot V1/V2 labels are interface stages. The Version 1 source was merged into main; the local version-2-preview name is a retained checkpoint, not an active remote release branch.

Inspect the repository and relevant dependent areas before changes. Preserve both application generations and existing client work. Reuse the current contracts, provider adapters and budget checks. Do not add dependencies, unrelated architecture changes or new product scope to a documentation task.

Get informed approval before deleting features/files, changing stored data or database structure, altering sign-in/permissions, moving domains, changing hosting configuration, publishing to shared environments or rewriting saved history. Existing documentation can be updated within the requested docs scope; that is not approval to change the running app.

Run the relevant package's existing checks for behavior changes. For globe/, use pnpm test, pnpm typecheck, pnpm format:check, pnpm build and pnpm test:browser. The browser suite uses two workers to bound software-WebGL/audio contention. Tests must prove behavior; controlled browser fixtures do not prove live integration. Live AI/voice checks consume credits and require intentional opt-in. Physical-device and human acceptance are separate evidence.

Write honest docs with working relative links, real script names, accurate UI labels and clear current/earlier-app distinctions. Never include credentials, raw user audio, private locations or management tokens in docs/screenshots/source. Honor the original `.gitignore`, including its named root Markdown files, and keep `.env.local`, `.dev.vars` and `.deployment/` ignored. The three original build plans remain unchanged local inputs; do not add status banners or publish them. An already tracked ignored file still exists in Git: preserve its prior published version unless its update or removal is explicitly authorized.

Keep each change narrow and reversible. Do not delete older documentation or tests without approval. Report what was actually checked, its date and material gaps. Do not call the full roadmap complete on the strength of a passing build.
