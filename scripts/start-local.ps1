[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $projectRoot 'backend/.venv/Scripts/python.exe'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$frontendPath = Join-Path $projectRoot 'frontend'

if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw 'The project Python environment is missing. Create backend/.venv and install backend/requirements.lock.txt first.'
}
if (-not (Test-Path -LiteralPath (Join-Path $frontendPath 'node_modules/vite/bin/vite.js'))) {
    throw 'The website dependencies are missing. Run pnpm install --frozen-lockfile in frontend first.'
}

Push-Location $frontendPath
try {
    Write-Host 'Checking and building the website...'
    & $nodePath 'node_modules/typescript/bin/tsc' '--noEmit'
    if ($LASTEXITCODE -ne 0) { throw 'The website checks failed. The server was not started.' }
    & $nodePath 'node_modules/vite/bin/vite.js' 'build'
    if ($LASTEXITCODE -ne 0) { throw 'The website build failed. The server was not started.' }
} finally {
    Pop-Location
}

$localPort = if ($env:PORT) { $env:PORT } else { '5000' }
Write-Host "Open http://127.0.0.1:$localPort/ to use the product. Press Ctrl+C here to stop it."
& $pythonPath (Join-Path $projectRoot 'backend/app.py')
if ($LASTEXITCODE -ne 0) { throw 'The local server stopped with an error. Read the message above.' }
