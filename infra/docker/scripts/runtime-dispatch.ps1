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

function Invoke-RuntimeEngine {
  param(
    [Parameter(Mandatory = $true)][string]$EngineAction,
    [Parameter(Mandatory = $true)][string]$EngineProfiles,
    [string]$EngineService = ""
  )

  # runtime.ps1 predates the strict modular dispatcher and intentionally owns
  # its own execution policy and scope. Run it in a fresh PowerShell process so
  # Set-StrictMode from this wrapper cannot change legacy collection/null
  # semantics inside the established engine.
  $arguments = @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", $RuntimeScript,
    "-Action", $EngineAction,
    "-Profiles", $EngineProfiles
  )
  if (-not [string]::IsNullOrWhiteSpace($EngineService)) {
    $arguments += @("-Service", $EngineService)
  }
  if ($Force) {
    $arguments += "-Force"
  }

  $global:LASTEXITCODE = 0
  & pwsh @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Runtime action '$EngineAction' failed with exit code $LASTEXITCODE"
  }
}

function Invoke-FinancialSimulatorHealthSmoke {
  Write-Host "`n--- Financial simulator isolated smoke ---"
  Invoke-RestMethod "http://localhost:58090/__admin/mappings" -TimeoutSec 10 -ErrorAction Stop | Out-Null
  $health = Invoke-RestMethod "http://localhost:58090/financial/health" -TimeoutSec 10 -ErrorAction Stop
  if ([string]$health.status -ne "healthy") {
    throw "WireMock financial simulator health is not healthy: $($health.status)"
  }
  Write-Host "Financial simulator isolated smoke: PASS"
}

function Invoke-DshSmokeScript {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$ScriptPath,
    [hashtable]$Parameters = @{}
  )

  Write-Host "`n=== $Name ==="
  $global:LASTEXITCODE = 0
  try {
    & $ScriptPath @Parameters
  } catch {
    Write-Host "DSH smoke slice '$Name' failed: $($_.Exception.Message)"
    if ($null -ne $_.ErrorDetails -and -not [string]::IsNullOrWhiteSpace([string]$_.ErrorDetails.Message)) {
      Write-Host "DSH smoke response details: $($_.ErrorDetails.Message)"
    }
    Write-Host (($_ | Format-List * -Force | Out-String).TrimEnd())
    throw
  }
  if ($LASTEXITCODE -ne 0) {
    throw "DSH smoke slice '$Name' failed with exit code $LASTEXITCODE"
  }
}

if ($Action -ne "smoke" -or -not $hasDsh) {
  Invoke-RuntimeEngine -EngineAction $Action -EngineProfiles $Profiles -EngineService $Service
  return
}

Write-Host "=== runtime:smoke modular DSH routing ==="

# The caller deliberately removes WLT from this phase and executes the governed
# authenticated WLT smoke afterward. Running runtime.ps1 with only the financial
# simulator profile would nevertheless invoke the WLT provider path and create a
# false operator-context failure. Verify the simulator directly here, and leave the
# WLT-to-provider contract to the dedicated authenticated smoke.
$financialSimulatorsRequested = $profileList -contains "financial-simulators"
$nonDshProfiles = @(
  $profileList |
    Where-Object { $_ -ne "dsh" -and $_ -ne "financial-simulators" }
)
if ($nonDshProfiles.Length -gt 0) {
  Invoke-RuntimeEngine -EngineAction "smoke" -EngineProfiles ($nonDshProfiles -join ",") -EngineService $Service
}
if ($financialSimulatorsRequested) {
  Invoke-FinancialSimulatorHealthSmoke
}

Invoke-RuntimeEngine -EngineAction "up" -EngineProfiles "dsh,media"
Invoke-RuntimeEngine -EngineAction "seed" -EngineProfiles "dsh,media"

$statePath = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-dsh-smoke-$([Guid]::NewGuid().ToString('N')).json"
try {
  Invoke-DshSmokeScript -Name "DSH catalog smoke" -ScriptPath $DshCatalogSmoke -Parameters @{ StatePath = $statePath }
  Invoke-DshSmokeScript -Name "DSH partner onboarding smoke" -ScriptPath $DshPartnerSmoke

  $clientParameters = @{ StatePath = $statePath }
  if ($profileList -contains "wlt") { $clientParameters.WltEnabled = $true }
  Invoke-DshSmokeScript -Name "DSH client and home smoke" -ScriptPath $DshClientSmoke -Parameters $clientParameters
} finally {
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
}

Write-Host "smoke: PASS"
