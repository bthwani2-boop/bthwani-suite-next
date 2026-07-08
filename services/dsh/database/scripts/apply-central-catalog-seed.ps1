$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))))

$ComposeFile = ".\infra\docker\compose.runtime.yml"
$EnvFile     = ".\infra\docker\env\runtime.env.example"
$Migration30 = ".\services\dsh\database\migrations\dsh-030_central_catalog_sovereignty.sql"
$Migration31 = ".\services\dsh\database\migrations\dsh-031_product_proposal_review_pipeline.sql"
$Migration32 = ".\services\dsh\database\migrations\dsh-032_catalog_pim_dam_attributes_bulk_closure.sql"
$Seed        = ".\services\dsh\database\seeds\central_catalog_seed.sql"
$Verify      = ".\services\dsh\database\scripts\verify-central-catalog-seed.sql"

Write-Host "=== apply-central-catalog-seed ==="
Write-Host "Repo root: $(Get-Location)"

foreach ($f in @($Migration30, $Migration31, $Migration32, $Seed, $Verify)) {
  if (-not (Test-Path $f)) { throw "Required file missing: $f" }
}

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

Write-Host "`n--- Applying central catalog seed (upsert) ---"
Get-Content -LiteralPath $Seed -Raw |
  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1
if ($LASTEXITCODE -ne 0) { throw "Central catalog seed failed (exit $LASTEXITCODE)" }
Write-Host "Seed applied successfully"

Write-Host "`n--- Verifying seed convergence ---"
$verifyOutput = Get-Content -LiteralPath $Verify -Raw |
  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1
Write-Host $verifyOutput
if ($LASTEXITCODE -ne 0) { throw "Seed verification query failed (exit $LASTEXITCODE)" }
if ($verifyOutput -match '\|\s*f\s*$' -or $verifyOutput -match '\|\s*f\s*\r?\n') {
  throw "Seed verification found at least one failing check (see 'f' rows above)"
}

Write-Host "`napply-central-catalog-seed: PASS"
