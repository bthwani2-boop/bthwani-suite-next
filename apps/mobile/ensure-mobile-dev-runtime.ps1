param(
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimePhase = Join-Path $PSScriptRoot "invoke-runtime-phase.ps1"
$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$DataScript = Join-Path $PSScriptRoot "mobile-dev-data.mjs"
$MobileEnvFile = Join-Path $RepoRoot "infra/local/mobile.env"
$Profiles = "identity,workforce,dsh,wlt,media"

foreach ($requiredPath in @($RuntimePhase, $RuntimeScript, $DataScript)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required mobile runtime file not found: $requiredPath"
  }
}

function Import-BthwaniMobileEnvironment {
  if (-not (Test-Path -LiteralPath $MobileEnvFile -PathType Leaf)) {
    return
  }

  foreach ($rawLine in Get-Content -LiteralPath $MobileEnvFile) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      continue
    }

    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (-not $key) {
      continue
    }
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not (Get-Item -Path "Env:$key" -ErrorAction SilentlyContinue)) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

function Test-BthwaniHealthEndpoint {
  param(
    [Parameter(Mandatory)][string]$Uri,
    [Parameter(Mandatory)][string]$ExpectedStatus
  )

  try {
    $response = Invoke-RestMethod -Uri $Uri -TimeoutSec 3 -ErrorAction Stop
    return [string]$response.status -eq $ExpectedStatus
  } catch {
    return $false
  }
}

function Test-BthwaniMobileBackend {
  $checks = @(
    @{ Uri = "http://127.0.0.1:58082/identity/health"; Status = "healthy" },
    @{ Uri = "http://127.0.0.1:58086/workforce/health"; Status = "healthy" },
    @{ Uri = "http://127.0.0.1:58083/wlt/health"; Status = "healthy" },
    @{ Uri = "http://127.0.0.1:58080/dsh/health"; Status = "healthy" }
  )

  foreach ($check in $checks) {
    if (-not (Test-BthwaniHealthEndpoint -Uri $check.Uri -ExpectedStatus $check.Status)) {
      return $false
    }
  }
  return $true
}

function Invoke-BthwaniProcess {
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

function Ensure-BthwaniMobileBackend {
  if (Test-BthwaniMobileBackend) {
    return
  }

  $setting = ([string]$env:BTHWANI_AUTO_START_BACKEND).Trim().ToLowerInvariant()
  $autoStart = $setting -notin @("0", "false", "off", "disabled")
  if (-not $autoStart) {
    throw "Mobile backend is not ready and BTHWANI_AUTO_START_BACKEND disables automatic startup."
  }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Mobile backend is not ready and Docker was not found. Start Docker Desktop and retry."
  }

  Invoke-BthwaniProcess `
    -Description "mobile-runtime-up" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimePhase,
      "-Action", "up", "-Profiles", $Profiles
    )

  if (-not (Test-BthwaniMobileBackend)) {
    throw "Mobile backend startup completed, but Identity, Workforce, WLT or DSH is still unhealthy."
  }
}

function Test-BthwaniMobileDevData {
  & node $DataScript --check
  return $LASTEXITCODE -eq 0
}

function Repair-BthwaniMobileDevData {
  Invoke-BthwaniProcess `
    -Description "mobile-runtime-seed" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimeScript,
      "-Action", "seed", "-Profiles", $Profiles
    )

  Invoke-BthwaniProcess `
    -Description "mobile-runtime-bootstrap-dev" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimePhase,
      "-Action", "bootstrap-dev", "-Profiles", $Profiles, "-Force"
    )

  Invoke-BthwaniProcess `
    -Description "mobile-workforce-convergence" `
    -FilePath "node" `
    -Arguments @($DataScript, "--repair")
}

Import-BthwaniMobileEnvironment

$mutex = [Threading.Mutex]::new($false, "BthwaniMobileDevRuntimeBootstrap")
$mutexAcquired = $false
try {
  try {
    $mutexAcquired = $mutex.WaitOne([TimeSpan]::FromMinutes(10))
  } catch [Threading.AbandonedMutexException] {
    $mutexAcquired = $true
  }
  if (-not $mutexAcquired) {
    throw "Timed out waiting for another mobile development bootstrap to finish."
  }

  Push-Location -LiteralPath $RepoRoot
  try {
    Ensure-BthwaniMobileBackend

    if (-not $Force -and (Test-BthwaniMobileDevData)) {
      Write-Host "Mobile full-stack development data is ready."
      return
    }

    Write-Host "Mobile APIs are healthy but governed development data is incomplete; converging DSH, WLT and Workforce..."
    Repair-BthwaniMobileDevData

    if (-not (Test-BthwaniMobileDevData)) {
      throw "Mobile development data convergence completed but one or more app surfaces remain unready."
    }
    Write-Host "Mobile full-stack development data is ready."
  } finally {
    Pop-Location
  }
} finally {
  if ($mutexAcquired) {
    try { $mutex.ReleaseMutex() } catch { }
  }
  $mutex.Dispose()
}
