[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimePhase = Join-Path $RepoRoot "tools/scripts/invoke-runtime-phase.ps1"
$ReadinessCheck = Join-Path $RepoRoot "tools/scripts/check-frontend-binding-readiness.mjs"
$ReadinessContractFile = Join-Path $RepoRoot "infra/docker/runtime-readiness.contract.json"

foreach ($requiredPath in @($RuntimePhase, $ReadinessCheck, $ReadinessContractFile)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required Control Panel runtime authority not found: $requiredPath"
  }
}

$RuntimeReadinessContract = Get-Content -LiteralPath $ReadinessContractFile -Raw | ConvertFrom-Json
$ControlPanelProfiles = @(
  $RuntimeReadinessContract.bundles.controlPanelDevelopment |
    ForEach-Object { [string]$_ }
)
if ($ControlPanelProfiles.Count -eq 0) {
  throw "runtime-readiness.contract.json has no controlPanelDevelopment profiles."
}
$Profiles = $ControlPanelProfiles -join ","

function Test-ControlPanelRuntimeReadiness {
  & node $ReadinessCheck --bundle controlPanelDevelopment *> $null
  return $LASTEXITCODE -eq 0
}

function Invoke-ControlPanelProcess {
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

function Ensure-ControlPanelRuntime {
  if (Test-ControlPanelRuntimeReadiness) {
    Write-Host "Control Panel runtime dependencies are already ready."
    return
  }

  $setting = ([string]$env:BTHWANI_AUTO_START_BACKEND).Trim().ToLowerInvariant()
  $autoStart = $setting -notin @("0", "false", "off", "disabled")
  if (-not $autoStart) {
    throw "Control Panel runtime dependencies are not ready and BTHWANI_AUTO_START_BACKEND disables automatic startup."
  }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Control Panel runtime dependencies are not ready and Docker was not found. Start Docker Desktop and retry."
  }
  if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
    throw "Control Panel runtime dependencies are not ready and PowerShell 7 was not found."
  }

  Invoke-ControlPanelProcess `
    -Description "control-panel-runtime-up" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimePhase,
      "-Action", "up", "-Profiles", $Profiles
    )

  $maxWaitSeconds = 30
  $deadline = [DateTime]::UtcNow.AddSeconds($maxWaitSeconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    if (Test-ControlPanelRuntimeReadiness) {
      Write-Host "Control Panel runtime dependencies are ready."
      return
    }
    Start-Sleep -Seconds 2
  }

  throw "Control Panel runtime startup completed, but one or more declared controlPanelDevelopment profiles are still unready after $maxWaitSeconds seconds: $Profiles"
}

$mutexName = if ($IsWindows) { "Global\BthwaniControlPanelDevRuntimeBootstrap" } else { "BthwaniControlPanelDevRuntimeBootstrap" }
$mutex = [Threading.Mutex]::new($false, $mutexName)
$mutexAcquired = $false
try {
  try {
    $mutexAcquired = $mutex.WaitOne([TimeSpan]::FromMinutes(10))
  } catch [Threading.AbandonedMutexException] {
    $mutexAcquired = $true
  }
  if (-not $mutexAcquired) {
    throw "Timed out waiting for another Control Panel runtime bootstrap to finish."
  }

  Push-Location -LiteralPath $RepoRoot
  try {
    Ensure-ControlPanelRuntime
  } finally {
    Pop-Location
  }
} finally {
  if ($mutexAcquired) {
    try { $mutex.ReleaseMutex() } catch { }
  }
  $mutex.Dispose()
}
