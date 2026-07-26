<#
.SYNOPSIS
  Routes runtime actions to the established engine and versioned DSH smoke.
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
$RuntimeScript = Join-Path $ScriptDir "runtime.ps1"
$DshCatalogSmoke = Join-Path $ScriptDir "runtime/smoke-dsh-catalog.ps1"
$DshPartnerSmoke = Join-Path $ScriptDir "runtime/smoke-dsh-partner-onboarding.ps1"
$DshClientSmoke = Join-Path $ScriptDir "runtime/smoke-dsh-client-home.ps1"

foreach ($requiredFile in @($RuntimeScript, $DshCatalogSmoke, $DshPartnerSmoke, $DshClientSmoke)) {
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

$runtimeParameters = @{
  Action = $Action
  Profiles = $Profiles
  Service = $Service
}
if ($Force) { $runtimeParameters.Force = $true }

if ($Action -ne "smoke" -or -not $hasDsh) {
  $global:LASTEXITCODE = 0
  & $RuntimeScript @runtimeParameters
  if ($LASTEXITCODE -ne 0) {
    throw "Runtime action '$Action' failed with exit code $LASTEXITCODE"
  }
  return
}

Write-Host "=== runtime:smoke modular DSH routing ==="

$nonDshProfiles = @($profileList | Where-Object { $_ -ne "dsh" })
if ($nonDshProfiles.Count -gt 0) {
  $global:LASTEXITCODE = 0
  & $RuntimeScript -Action smoke -Profiles ($nonDshProfiles -join ",") -Service $Service
  if ($LASTEXITCODE -ne 0) {
    throw "Non-DSH runtime smoke failed with exit code $LASTEXITCODE"
  }
}

$global:LASTEXITCODE = 0
& $RuntimeScript -Action up -Profiles "dsh,media"
if ($LASTEXITCODE -ne 0) {
  throw "DSH runtime preparation failed with exit code $LASTEXITCODE"
}
$global:LASTEXITCODE = 0
& $RuntimeScript -Action seed -Profiles "dsh,media"
if ($LASTEXITCODE -ne 0) {
  throw "DSH runtime seed failed with exit code $LASTEXITCODE"
}

$statePath = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-dsh-smoke-$([Guid]::NewGuid().ToString('N')).json"
try {
  $global:LASTEXITCODE = 0
  & $DshCatalogSmoke -StatePath $statePath
  if ($LASTEXITCODE -ne 0) {
    throw "DSH catalog smoke failed with exit code $LASTEXITCODE"
  }

  $global:LASTEXITCODE = 0
  & $DshPartnerSmoke
  if ($LASTEXITCODE -ne 0) {
    throw "DSH partner onboarding smoke failed with exit code $LASTEXITCODE"
  }

  $clientParameters = @{ StatePath = $statePath }
  if ($profileList -contains "wlt") { $clientParameters.WltEnabled = $true }
  $global:LASTEXITCODE = 0
  & $DshClientSmoke @clientParameters
  if ($LASTEXITCODE -ne 0) {
    throw "DSH client and home smoke failed with exit code $LASTEXITCODE"
  }
} finally {
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

Write-Host "smoke: PASS"
