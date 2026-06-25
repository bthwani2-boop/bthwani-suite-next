$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

$ComposeFile = ".\infra\docker\compose.runtime.yml"
$EnvFile     = ".\infra\docker\env\runtime.env.example"
$Migration   = ".\services\dsh\database\migrations\dsh-001_store_discovery.sql"
$Seed        = ".\services\dsh\database\seeds\local\dsh-001_store_discovery.local.sql"

Write-Host "=== apply-dsh-store-discovery-db ==="
Write-Host "Repo root: $(Get-Location)"

if (-not (Test-Path $Migration)) { throw "Migration file missing: $Migration" }
if (-not (Test-Path $Seed))      { throw "Seed file missing: $Seed" }

Write-Host "`n--- Checking postgres health ---"
$maxRetries = 20
$attempt = 0
do {
  $attempt++
  $status = docker compose --env-file $EnvFile -f $ComposeFile ps --format json 2>$null |
    ConvertFrom-Json -ErrorAction SilentlyContinue |
    Where-Object { $_.Service -eq "postgres" } |
    Select-Object -ExpandProperty Health -ErrorAction SilentlyContinue
  if ($status -eq "healthy") { break }
  if ($attempt -ge $maxRetries) { throw "Postgres not healthy after $maxRetries attempts" }
  Write-Host "  Waiting for postgres (attempt $attempt/$maxRetries)..."
  Start-Sleep -Seconds 3
} while ($true)
Write-Host "Postgres: healthy"

Write-Host "`n--- Applying DSH-001 migration ---"
Get-Content -LiteralPath $Migration -Raw |
  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) { throw "DSH-001 migration failed (exit $LASTEXITCODE)" }
Write-Host "Migration: OK"

Write-Host "`n--- Applying DSH-001 local seed ---"
Get-Content -LiteralPath $Seed -Raw |
  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1

if ($LASTEXITCODE -ne 0) { throw "DSH-001 seed failed (exit $LASTEXITCODE)" }
Write-Host "Seed: OK"

Write-Host "`napply-dsh-store-discovery-db: PASS"
