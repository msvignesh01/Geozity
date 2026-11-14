# Developer setup

## Required tools

- Python 3.11+
- Node.js 20+
- pnpm 12+
- PowerShell 7+ or Windows PowerShell 5.1+

## Recommended local layout

The repository root is the project root. The expected local structure is:

```text
Geozity/
├── backend/
│   ├── .venv/
│   ├── requirements.txt
│   ├── requirements.lock.txt
│   ├── app.py
│   └── services/
├── frontend/
│   ├── node_modules/
│   ├── package.json
│   └── src/
├── scripts/
│   └── start-local.ps1
├── Dockerfile
├── render.yaml
├── .env.example
└── README.md
```

## Install the backend

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.lock.txt
```

If the lock file is not present or a dependency change has occurred, install from `requirements.txt` first and then regenerate the lock file in the project’s normal workflow. This repository currently includes `requirements.lock.txt` and `requirements.txt` together.

## Install the frontend

```powershell
cd frontend
pnpm install --frozen-lockfile
```

The `frontend/package.json` script set includes:

- `pnpm dev` to start Vite in watch mode
- `pnpm build` to build the frontend bundle
- `pnpm typecheck` to perform TypeScript checking
- `pnpm test` to run the frontend API validation test

## Local startup

The canonical local startup script is:

```powershell
cd C:\Users\HP\Documents\GitHub\Geozity
pwsh ./scripts/start-local.ps1
```

The script:

1. checks that the backend virtual environment exists
2. checks that frontend dependencies are installed
3. runs the TypeScript check
4. builds the frontend with Vite
5. starts the Flask server at the configured port

The default port is `5000` unless `.env` or the environment sets `PORT`.

## Environment setup

Copy `.env.example` to a project-root `.env` if you need an explicit local configuration file. The sample file contains values for the local server port and upstream OpenStreetMap hosts.

The database is not used; the app keeps all request and provider caching in memory.

## Verification

The repo includes Python tests under `backend/tests/`. These are the source of truth for behavior, and they cover:

- request validation
- route behavior
- category handling
- fallback logic between providers
- cache isolation and request correctness

The frontend includes a small API validation test in `frontend/tests/api.test.mjs`.

## Common setup issues

### Missing Python environment

The startup script throws:

> The project Python environment is missing. Create backend/.venv and install backend/requirements.lock.txt first.

### Missing frontend dependencies

The startup script throws:

> The website dependencies are missing. Run pnpm install --frozen-lockfile in frontend first.

### Port already in use

Set `PORT` in the environment or `.env` before starting the app. The script reads `PORT` from the environment and passes it through to the Flask app.

## Running the backend directly

You can also run the Flask app directly:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python app.py
```

This starts the same API service, but it skips the frontend build check and is not the project’s preferred startup path.
