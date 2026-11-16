# Developer setup

## Current globe app

Run commands from the repository root unless shown otherwise. Use Node.js 24 (the package requires >=24 and <25) and pnpm with the committed lockfile.

Copy only missing settings from the root .env.example into the existing root .env.local; preserve existing credentials. The current app needs GEOAPIFY_API_KEY, SUPABASE_URL and either SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY. The Supabase usage table/function must already be installed in the intended project. Adding keys alone does not create them. Database changes require owner approval; do not rerun the SQL blindly on an initialized database.

```powershell
Set-Location globe
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:8780/. The dev command runs setup:local and serves the website and local Worker together. setup:local reads nonempty settings from globe/.dev.vars, globe/.env.local and root .env.local in that precedence order (later files win), writes only allowed settings to ignored globe/.dev.vars and generates a session signing secret when absent. It does not upload secrets or initialize Supabase. Local requests use the configured Supabase project and real provider quotas; this is not automatically an isolated test database.

AI and voice default off in the sample. Enable only when intentionally testing a configured account, with nonzero allowances. The separate check-ai and check-voice scripts call providers directly and may consume credits outside the application's usage counters.

## Repeatable checks

Inside globe/:

```powershell
pnpm test
pnpm typecheck
pnpm format:check
pnpm build
pnpm test:browser
```

pnpm test:browser runs desktop/mobile search, outing and voice cases with intercepted API responses, using Chrome and synthetic microphone input. It uses two workers to bound software-WebGL/audio contention, without extending test timeouts. It may start the dev server and regenerate local settings. It is not proof of physical-device or live-provider behavior. No standalone ESLint command is configured. On Windows, set WRANGLER_LOG_PATH to a writable folder such as globe/.wrangler/logs if the sandbox restricts the default log folder.

The H1–H3 source maintained on `main` passed 104 unit/integration tests and 42 browser cases, plus TypeScript, formatting and build. Open Plan an outing to review H2 locally; voice controls appear only when the local service is enabled. Do not bypass exhausted live allowances by switching to the temporary-database live suite or direct-provider scripts.

To check Worker packaging without publishing:

```powershell
pnpm exec wrangler deploy --config wrangler.toml --dry-run --outdir .wrangler/horizons-dry-run
```

Keep the explicit config: generated Vite deployment redirection can refer to an obsolete output path. Packaging success does not establish hosted startup. Branch previews still forward to the existing Worker, so local planner success is not proof a preview has the matching API.

Explicit real-provider checks are pnpm test:live, pnpm test:ai:live and pnpm test:voice:live. These consume provider capacity. The map live suite uses real Geoapify with a temporary local PostgreSQL-compatible database bridge; it does not verify hosted Supabase. See [verification](verification.md).

## Earlier React/Flask app

Use Python 3.11 and Node 24. From the repository root:

```powershell
python -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
Push-Location frontend
pnpm install --frozen-lockfile
Pop-Location
.\scripts\start-local.ps1
```

Open http://127.0.0.1:5000/. That script checks/builds frontend/ and starts Flask; it does not start the globe. Earlier-app checks are Python pytest under backend/, and pnpm test, pnpm typecheck and pnpm build inside frontend/. backend/tests/browser_server.py --fixtures is only a synthetic test entrypoint and must never host the real product.

Never paste credentials into chat, commit .env files or use another person's hosting credentials. Hosted changes require the correct Vignesh account and approved scope.
