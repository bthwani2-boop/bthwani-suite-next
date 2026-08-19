<#
.SYNOPSIS
  Docker compatibility adapter for governed DSH central-catalog fixtures.

.DESCRIPTION
  The implementation authority lives at
  services/dsh/database/scripts/apply-central-catalog-seed.ps1. This adapter
  intentionally contains no SQL execution, migration list, seed list, or ledger.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$CanonicalScript = Join-Path $RepoRoot "services/dsh/database/scripts/apply-central-catalog-seed.ps1"
if (-not (Test-Path -LiteralPath $CanonicalScript -PathType Leaf)) {
  throw "Canonical central-catalog seed command not found: $CanonicalScript"
}

& $CanonicalScript
if ($LASTEXITCODE -ne 0) {
  throw "Canonical central-catalog seed command failed (exit $LASTEXITCODE)."
}
Write-Host "apply-dsh-central-catalog-seed: PASS authority=services/dsh/database/scripts/apply-central-catalog-seed.ps1"
