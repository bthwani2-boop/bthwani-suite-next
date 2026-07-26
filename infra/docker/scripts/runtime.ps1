<#
.SYNOPSIS
  Canonical Docker runtime entry point for bthwani-suite-next.

.DESCRIPTION
  Preserves the established runtime engine for every action and profile while
  routing DSH smoke verification through focused scripts that follow the current
  optimistic-concurrency contracts. The legacy engine remains read-only and is
  not duplicated or modified.
#>

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "seed", "smoke", "doctor", "all", "bootstrap-dev", "verify-catalog")]
  [string]$Action,

  [string]$Profiles = "",

  [string]$Service = "",

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LegacyScript = Join-Path $ScriptDir "runtime-legacy.ps1"
$DshCatalogSmoke = Join-Path $ScriptDir "runtime/smoke-dsh-catalog.ps1"
$DshPartnerSmoke = Join-Path $ScriptDir "runtime/smoke-dsh-partner-onboarding.ps1"
$DshClientSmoke = Join-Path $ScriptDir "runtime/smoke-dsh-client-home.ps1"

foreach ($requiredFile in @($LegacyScript, $DshCatalogSmoke, $DshPartnerSmoke, $DshClientSmoke)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required runtime component is missing: $requiredFile"
  }
}

$profileList = @(
  $Profiles.Split(",") |
    ForEach-Object { $_.Trim() } |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
)
$hasDsh = $profileList -contains "dsh"

$legacyParameters = @{
  Action = $Action
  Profiles = $Profiles
  Service = $Service
}
if ($Force) { $legacyParameters.Force = $true }

if ($Action -ne "smoke" -or -not $hasDsh) {
  & $LegacyScript @legacyParameters
  if ($LASTEXITCODE -ne 0) {
    throw "Legacy runtime action '$Action' failed with exit code $LASTEXITCODE"
  }
  exit 0
}

Write-Host "=== runtime:smoke modular DSH routing ==="

$nonDshProfiles = @($profileList | Where-Object { $_ -ne "dsh" })
if ($nonDshProfiles.Count -gt 0) {
  & $LegacyScript -Action smoke -Profiles ($nonDshProfiles -join ",") -Service $Service
  if ($LASTEXITCODE -ne 0) {
    throw "Non-DSH runtime smoke failed with exit code $LASTEXITCODE"
  }
}

# Reconcile the DSH schema and deterministic local fixtures before exercising
# the focused smoke scripts. These commands retain the established engine and
# avoid replaying its stale embedded DSH smoke implementation.
& $LegacyScript -Action up -Profiles "dsh,media"
if ($LASTEXITCODE -ne 0) {
  throw "DSH runtime preparation failed with exit code $LASTEXITCODE"
}
& $LegacyScript -Action seed -Profiles "dsh,media"
if ($LASTEXITCODE -ne 0) {
  throw "DSH runtime seed failed with exit code $LASTEXITCODE"
}

$statePath = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-dsh-smoke-$([Guid]::NewGuid().ToString('N')).json"
try {
  & $DshCatalogSmoke -StatePath $statePath
  if ($LASTEXITCODE -ne 0) {
    throw "DSH catalog smoke failed with exit code $LASTEXITCODE"
  }

  & $DshPartnerSmoke
  if ($LASTEXITCODE -ne 0) {
    throw "DSH partner onboarding smoke failed with exit code $LASTEXITCODE"
  }

  $clientParameters = @{ StatePath = $statePath }
  if ($profileList -contains "wlt") { $clientParameters.WltEnabled = $true }
  & $DshClientSmoke @clientParameters
  if ($LASTEXITCODE -ne 0) {
    throw "DSH client and home smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

Write-Host "smoke: PASS"
