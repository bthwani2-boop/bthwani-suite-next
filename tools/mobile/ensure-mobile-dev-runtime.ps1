param(
  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimePhase = Join-Path $PSScriptRoot "invoke-runtime-phase.ps1"
$DataScript = Join-Path $PSScriptRoot "mobile-dev-data.mjs"
$MobileEnvFile = Join-Path $RepoRoot "infra/local/mobile.env"
$ReadinessContractFile = Join-Path $RepoRoot "infra/docker/runtime-readiness.contract.json"

foreach ($requiredPath in @($RuntimePhase, $DataScript, $ReadinessContractFile)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required mobile runtime file not found: $requiredPath"
  }
}

$RuntimeReadinessContract = Get-Content -LiteralPath $ReadinessContractFile -Raw | ConvertFrom-Json
$MobileProfiles = @($RuntimeReadinessContract.bundles.mobileDevelopment | ForEach-Object { [string]$_ })
if ($MobileProfiles.Count -eq 0) {
  throw "runtime-readiness.contract.json has no mobileDevelopment profiles."
}
$Profiles = $MobileProfiles -join ","

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

function Resolve-BthwaniRuntimeReadinessUri {
  param(
    [Parameter(Mandatory)]$Definition
  )

  switch ([string]$Definition.kind) {
    "json-status" {
      $baseUrl = ""
      $baseUrlEnv = [string]$Definition.baseUrlEnv
      if ($baseUrlEnv) {
        $baseUrl = [string][Environment]::GetEnvironmentVariable($baseUrlEnv, "Process")
      }
      if ([string]::IsNullOrWhiteSpace($baseUrl)) {
        $baseUrl = [string]$Definition.defaultBaseUrl
      }
      if ([string]::IsNullOrWhiteSpace($baseUrl)) {
        throw "Readiness definition '$($Definition.name)' has no base URL."
      }
      return "$($baseUrl.TrimEnd('/'))$([string]$Definition.path)"
    }
    "http-ok" {
      $port = ""
      $portEnv = [string]$Definition.portEnv
      if ($portEnv) {
        $port = [string][Environment]::GetEnvironmentVariable($portEnv, "Process")
      }
      if ([string]::IsNullOrWhiteSpace($port)) {
        $port = [string]$Definition.defaultPort
      }
      if ([string]::IsNullOrWhiteSpace($port)) {
        throw "Readiness definition '$($Definition.name)' has no port."
      }
      return "http://$([string]$Definition.host):$port$([string]$Definition.path)"
    }
    default {
      throw "Unsupported runtime readiness kind '$([string]$Definition.kind)' for '$($Definition.name)'."
    }
  }
}

function Test-BthwaniRuntimeProfileReadiness {
  param(
    [Parameter(Mandatory)][string]$Profile
  )

  $definition = $RuntimeReadinessContract.profiles.$Profile
  if ($null -eq $definition) {
    throw "runtime-readiness.contract.json is missing profile '$Profile'."
  }
  $uri = Resolve-BthwaniRuntimeReadinessUri -Definition $definition

  try {
    $response = Invoke-RestMethod -Uri $uri -TimeoutSec 3 -ErrorAction Stop
    if ([string]$definition.kind -eq "http-ok") {
      return $true
    }
    $healthyStatuses = @($definition.healthyStatuses | ForEach-Object { [string]$_ })
    return $healthyStatuses -contains [string]$response.status
  } catch {
    return $false
  }
}

function Test-BthwaniMobileBackend {
  foreach ($profile in $MobileProfiles) {
    if (-not (Test-BthwaniRuntimeProfileReadiness -Profile $profile)) {
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
    throw "Mobile runtime dependencies are not ready and BTHWANI_AUTO_START_BACKEND disables automatic startup."
  }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Mobile runtime dependencies are not ready and Docker was not found. Start Docker Desktop and retry."
  }

  Invoke-BthwaniProcess `
    -Description "mobile-runtime-up" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimePhase,
      "-Action", "up", "-Profiles", $Profiles, "-Force"
    )

  $maxWaitSeconds = 30
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $isHealthy = $false

  while ($sw.Elapsed.TotalSeconds -lt $maxWaitSeconds) {
    if (Test-BthwaniMobileBackend) {
      $isHealthy = $true
      break
    }
    Write-Host "Waiting for declared Mobile runtime dependencies to become ready..."
    Start-Sleep -Seconds 2
  }

  if (-not $isHealthy) {
    throw "Mobile runtime startup completed, but one or more declared mobileDevelopment profiles are still unready after $maxWaitSeconds seconds: $Profiles"
  }
}

function Test-BthwaniMobileDevData {
  & node $DataScript --check
  return $LASTEXITCODE -eq 0
}

function Repair-BthwaniMobileDevData {
  try {
    Invoke-BthwaniProcess `
      -Description "mobile-dev-data-repair" `
      -FilePath "node" `
      -Arguments @($DataScript, "--repair")
    return
  } catch {
    Write-Warning "Targeted mobile data repair failed; rebuilding the canonical runtime once before the final repair attempt. $($_.Exception.Message)"
  }

  Invoke-BthwaniProcess `
    -Description "mobile-runtime-bootstrap-dev" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimePhase,
      "-Action", "bootstrap-dev", "-Profiles", $Profiles, "-Force"
    )
}

Import-BthwaniMobileEnvironment

$mutexName = if ($IsWindows) { "Global\BthwaniMobileDevRuntimeBootstrap" } else { "BthwaniMobileDevRuntimeBootstrap" }
$mutex = [Threading.Mutex]::new($false, $mutexName)
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

    Write-Host "Mobile APIs are ready but governed development data is incomplete; invoking targeted canonical data repair..."
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
