<#
.SYNOPSIS
  Compatibility adapter for the historical Store Discovery database command.

.DESCRIPTION
  Store Discovery no longer owns a partial migration/seed path. The command now
  delegates to the canonical DSH database adapter, which applies the complete
  governed DSH migration and local-fixture set with canonical ledgers.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$DshDatabaseRunner = Join-Path $RepoRoot "services/dsh/database/scripts/invoke-dsh-database.ps1"
if (-not (Test-Path -LiteralPath $DshDatabaseRunner -PathType Leaf)) {
  throw "Canonical DSH database adapter not found: $DshDatabaseRunner"
}

Write-Warning "apply-dsh-store-discovery-db.ps1 is a compatibility adapter; partial Store Discovery schema application is retired."
& $DshDatabaseRunner -Action seed -Transport docker -AllowLocalSeeds
if ($LASTEXITCODE -ne 0) {
  throw "Governed DSH database convergence failed (exit $LASTEXITCODE)."
}
Write-Host "apply-dsh-store-discovery-db: PASS authority=invoke-dsh-database.ps1"
