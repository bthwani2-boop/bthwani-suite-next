[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "migrate", "smoke", "status")]
  [string]$Action
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $RepoRoot

$BaseRuntimePhase = Join-Path $RepoRoot "tools/scripts/invoke-runtime-phase.ps1"
$BaseRuntime = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$PlatformRuntime = Join-Path $RepoRoot "tools/scripts/invoke-platform-foundation-runtime.ps1"
$BaseProfiles = "identity,workforce,dsh,wlt,financial-simulators,mail,media"

foreach ($requiredScript in @($BaseRuntimePhase, $BaseRuntime, $PlatformRuntime)) {
  if (-not (Test-Path -LiteralPath $requiredScript -PathType Leaf)) {
    throw "Required full-runtime script is missing: $requiredScript"
  }
}

function Invoke-ScriptChecked {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Script,
    [Parameter(Mandatory = $true)][hashtable]$Parameters
  )

  Write-Host "`n== $Name ==" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $Script @Parameters
  $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
  if ($exitCode -ne 0) {
    throw "$Name failed with exit code $exitCode"
  }
}

function Invoke-PlatformBestEffortDown {
  try {
    Invoke-ScriptChecked -Name "Stop Providers and Platform Control" -Script $PlatformRuntime -Parameters @{ Action = "down" }
  } catch {
    Write-Warning "Platform foundation cleanup failed: $($_.Exception.Message)"
  }
}

function Invoke-BaseBestEffortDown {
  try {
    Invoke-ScriptChecked -Name "Stop base runtime" -Script $BaseRuntime -Parameters @{ Action = "down"; Profiles = $BaseProfiles }
  } catch {
    Write-Warning "Base runtime cleanup failed: $($_.Exception.Message)"
  }
}

switch ($Action) {
  "up" {
    $baseAttempted = $false
    $platformAttempted = $false
    try {
      $baseAttempted = $true
      Invoke-ScriptChecked -Name "Start base full runtime" -Script $BaseRuntimePhase -Parameters @{ Action = "up"; Profiles = $BaseProfiles }
      $platformAttempted = $true
      Invoke-ScriptChecked -Name "Start Providers and Platform Control" -Script $PlatformRuntime -Parameters @{ Action = "up" }
      Write-Host "`nTrue full runtime up: PASS" -ForegroundColor Green
    } catch {
      if ($platformAttempted) { Invoke-PlatformBestEffortDown }
      if ($baseAttempted) { Invoke-BaseBestEffortDown }
      throw
    }
  }
  "down" {
    Invoke-PlatformBestEffortDown
    Invoke-ScriptChecked -Name "Stop base full runtime without deleting volumes" -Script $BaseRuntime -Parameters @{ Action = "down"; Profiles = $BaseProfiles }
    Write-Host "`nTrue full runtime down: PASS" -ForegroundColor Green
  }
  "migrate" {
    Invoke-ScriptChecked -Name "Migrate base runtime databases" -Script $BaseRuntime -Parameters @{ Action = "migrate"; Profiles = $BaseProfiles }
    Invoke-ScriptChecked -Name "Migrate Providers and Platform Control" -Script $PlatformRuntime -Parameters @{ Action = "migrate" }
    Write-Host "`nTrue full runtime migrations: PASS" -ForegroundColor Green
  }
  "smoke" {
    Invoke-ScriptChecked -Name "Smoke base full runtime" -Script $BaseRuntimePhase -Parameters @{ Action = "smoke"; Profiles = $BaseProfiles }
    Invoke-ScriptChecked -Name "Smoke Providers and Platform Control" -Script $PlatformRuntime -Parameters @{ Action = "smoke" }
    Write-Host "`nTrue full runtime smoke: PASS" -ForegroundColor Green
  }
  "status" {
    Invoke-ScriptChecked -Name "Base full runtime status" -Script $BaseRuntime -Parameters @{ Action = "status"; Profiles = $BaseProfiles }
    Invoke-ScriptChecked -Name "Providers and Platform Control status" -Script $PlatformRuntime -Parameters @{ Action = "status" }
  }
}
