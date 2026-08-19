<#
.SYNOPSIS
  Applies governed DSH local fixtures and verifies central-catalog convergence.

.DESCRIPTION
  This command owns no migration or seed application engine. It delegates all
  writes to invoke-dsh-database.ps1 and executes only the catalog assertion SQL
  after the canonical governed seed run succeeds.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../../..")).Path
Set-Location -LiteralPath $RepoRoot

$DshDatabaseRunner = Join-Path $RepoRoot "services/dsh/database/scripts/invoke-dsh-database.ps1"
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$VerifyFile = Join-Path $RepoRoot "services/dsh/database/seeds/local/verify-central-catalog-seed.sql"

foreach ($requiredFile in @($DshDatabaseRunner, $ComposeFile, $EnvFile, $VerifyFile)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required central-catalog authority not found: $requiredFile"
  }
}

Write-Host "=== apply-central-catalog-seed ==="
& $DshDatabaseRunner -Action seed -Transport docker -AllowLocalSeeds
if ($LASTEXITCODE -ne 0) {
  throw "Governed DSH seed convergence failed (exit $LASTEXITCODE)."
}

Write-Host "`n--- Verifying central catalog convergence ---"
$verifyOutput = Get-Content -LiteralPath $VerifyFile -Raw |
  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    psql -U dsh_runtime -d dsh_runtime -X -v ON_ERROR_STOP=1
$exitCode = $LASTEXITCODE
$verifyOutput | ForEach-Object { Write-Host $_ }
if ($exitCode -ne 0) {
  throw "Central catalog verification failed (exit $exitCode)."
}
if (($verifyOutput -join "`n") -match '(?m)\|\s*f\s*$') {
  throw "Central catalog verification returned a failing assertion row."
}

Write-Host "apply-central-catalog-seed: PASS authority=invoke-dsh-database.ps1"
