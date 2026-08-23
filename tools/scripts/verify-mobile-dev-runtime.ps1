<#
.SYNOPSIS
  Verifies the governed local runtime required by client, partner, field, and captain apps.
#>

[CmdletBinding()]
param(
  [switch]$SkipRuntimeSmoke
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimePhase = Join-Path $RepoRoot "tools/scripts/invoke-runtime-phase.ps1"
$MobileData = Join-Path $RepoRoot "tools/mobile/mobile-dev-data.mjs"
$MigrationGuard = Join-Path $RepoRoot "tools/guards/migration-manifest-drift-gate.mjs"
$CatalogVerify = Join-Path $RepoRoot "tools/scripts/verify-catalog.ps1"
$Profiles = "identity,workforce,dsh,wlt,media-storage"

foreach ($required in @($RuntimePhase, $MobileData, $MigrationGuard, $CatalogVerify)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "Required verification authority not found: $required"
  }
}

function Invoke-NativeChecked {
  param(
    [Parameter(Mandatory)][string]$Description,
    [Parameter(Mandatory)][string]$FilePath,
    [Parameter(Mandatory)][string[]]$Arguments
  )

  Write-Host "`n=== $Description ==="
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE."
  }
}

function Assert-Health {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Uri
  )

  try {
    $response = Invoke-RestMethod -Uri $Uri -TimeoutSec 8 -ErrorAction Stop
  } catch {
    throw "$Name health request failed at $Uri : $($_.Exception.Message)"
  }

  $status = [string]$response.status
  if ($status -notin @("healthy", "ready", "HEALTHY")) {
    throw "$Name returned unexpected health status '$status' at $Uri"
  }
  # ${Name} is required: PowerShell reads "$Name:" as a scoped variable reference
  # (like $env:PATH) and fails to parse the whole file.
  Write-Host "${Name}: $status"
}

if (([string]$env:NODE_ENV).Trim().ToLowerInvariant() -eq "production" -or
    ([string]$env:ENVIRONMENT).Trim().ToLowerInvariant() -eq "production") {
  throw "Local mobile runtime verification is not intended for production."
}

Push-Location -LiteralPath $RepoRoot
try {
  Write-Host "=== bthwani mobile runtime verification ==="
  Write-Host "branch: $((& git branch --show-current).Trim())"
  Write-Host "commit: $((& git rev-parse HEAD).Trim())"

  Invoke-NativeChecked -Description "migration-manifest-drift" -FilePath "node" -Arguments @($MigrationGuard)

  Assert-Health -Name "Identity" -Uri "http://127.0.0.1:18082/identity/health"
  Assert-Health -Name "Workforce" -Uri "http://127.0.0.1:58086/workforce/health"
  Assert-Health -Name "DSH" -Uri "http://127.0.0.1:58080/dsh/health"
  Assert-Health -Name "WLT" -Uri "http://127.0.0.1:58083/wlt/health"

  Invoke-NativeChecked -Description "mobile-dev-data-check" -FilePath "node" -Arguments @($MobileData, "--check")
  Invoke-NativeChecked -Description "central-catalog-readback" -FilePath "pwsh" -Arguments @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $CatalogVerify
  )

  if (-not $SkipRuntimeSmoke) {
    Invoke-NativeChecked -Description "full-mobile-runtime-smoke" -FilePath "pwsh" -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimePhase,
      "-Action", "smoke", "-Profiles", $Profiles
    )
  }

  Write-Host "`nMobile runtime verification: PASS"
} finally {
  Pop-Location
}
