param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "catalog-readback", "smoke", "bootstrap-dev")]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$Profiles,

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$RuntimeSmokeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime-dispatch.ps1"
$RuntimeEnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$CatalogReadbackScript = Join-Path $RepoRoot "tools/scripts/verify-catalog.ps1"
$AuthenticatedWltSmokeScript = Join-Path $RepoRoot "tools/scripts/finance/smoke-wlt-authenticated-runtime.ps1"
$DshSmokeDiagnosticScript = Join-Path $RepoRoot "tools/scripts/runtime/diagnose-dsh-smoke-auth-boundary.ps1"
$LogRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$LogPath = Join-Path $LogRoot "bthwani-runtime-$Action.log"
$ProfileList = @($Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$RuntimeContainerByProfile = @{
  identity  = "bthwani-identity-api-runtime"
  workforce = "bthwani-workforce-api-runtime"
  dsh       = "bthwani-dsh-api-runtime"
  wlt       = "bthwani-wlt-api-runtime"
  providers = "bthwani-providers-api-runtime"
  platform  = "bthwani-platform-control-api-runtime"
}

function Get-CurrentSourceSha {
  $sha = (& git -C $RepoRoot rev-parse HEAD 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($sha)) {
    throw "Unable to resolve current source commit SHA."
  }
  return $sha
}

$CurrentSourceSha = Get-CurrentSourceSha
$PreparedRuntimeMarkerPath = Join-Path $LogRoot "bthwani-runtime-prepared-$CurrentSourceSha.json"

function Import-CanonicalRuntimeEnvironment {
  if (-not (Test-Path -LiteralPath $script:RuntimeEnvFile -PathType Leaf)) {
    throw "Canonical runtime environment file not found: $script:RuntimeEnvFile"
  }

  foreach ($rawLine in Get-Content -LiteralPath $script:RuntimeEnvFile) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }

    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace([System.Environment]::GetEnvironmentVariable($key, "Process"))) {
      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

function ConvertTo-StatusText {
  param([string]$Value, [int]$Limit = 140)
  $normalized = ($Value -replace "`r|`n", " " -replace "\s+", " ").Trim()
  if ($normalized.Length -le $Limit) { return $normalized }
  return $normalized.Substring(0, $Limit)
}

function Publish-RuntimeStatus {
  param(
    [ValidateSet("success", "failure", "error")]
    [string]$State,
    [string]$Description,
    [string]$Subject = ""
  )

  if ([string]::IsNullOrWhiteSpace($env:BTHWANI_STATUS_TOKEN) -or
      [string]::IsNullOrWhiteSpace($env:GITHUB_REPOSITORY) -or
      [string]::IsNullOrWhiteSpace($env:GITHUB_SHA)) {
    return
  }

  $cleanSubject = ($Subject -replace "[^A-Za-z0-9_.-]", "-").Trim("-")
  if ($cleanSubject.Length -gt 48) { $cleanSubject = $cleanSubject.Substring(0, 48) }
  $suffix = if ($cleanSubject) { "/$cleanSubject" } else { "" }
  $context = "bthwani/runtime/$Action$suffix"
  if ($context.Length -gt 100) { $context = $context.Substring(0, 100) }
  $apiUrl = if ($env:GITHUB_API_URL) { $env:GITHUB_API_URL } else { "https://api.github.com" }
  $serverUrl = if ($env:GITHUB_SERVER_URL) { $env:GITHUB_SERVER_URL } else { "https://github.com" }
  $payload = @{
    state = $State
    context = $context
    description = ConvertTo-StatusText -Value $Description
  }
  if ($env:GITHUB_RUN_ID) {
    $payload.target_url = "$serverUrl/$($env:GITHUB_REPOSITORY)/actions/runs/$($env:GITHUB_RUN_ID)"
  }

  try {
    Invoke-RestMethod `
      -Uri "$apiUrl/repos/$($env:GITHUB_REPOSITORY)/statuses/$($env:GITHUB_SHA)" `
      -Method Post `
      -Headers @{
        Accept = "application/vnd.github+json"
        Authorization = "Bearer $($env:BTHWANI_STATUS_TOKEN)"
        "X-GitHub-Api-Version" = "2022-11-28"
      } `
      -ContentType "application/json" `
      -Body ($payload | ConvertTo-Json -Compress) | Out-Null
  } catch {
    Write-Warning "Runtime status publication failed: $($_.Exception.Message)"
  }
}

function Invoke-RuntimeBasePhase {
  param(
    [Parameter(Mandatory = $true)][string]$ScriptPath,
    [Parameter(Mandatory = $true)][hashtable]$Parameters,
    [switch]$Append
  )

  $global:LASTEXITCODE = 0
  if ($Append) {
    & $ScriptPath @Parameters 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Host
  } else {
    & $ScriptPath @Parameters 2>&1 | Tee-Object -FilePath $LogPath | Out-Host
  }
  return [int]$LASTEXITCODE
}

function Get-RuntimeContainerImageId {
  param([Parameter(Mandatory = $true)][string]$ContainerName)

  $imageId = (& docker inspect $ContainerName --format "{{.Image}}" 2>$null).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($imageId)) {
    throw "Prepared runtime container is not inspectable: $ContainerName"
  }
  return $imageId
}

function Write-PreparedRuntimeMarker {
  param([Parameter(Mandatory = $true)][string[]]$ProfilesToRecord)

  $imageIds = [ordered]@{}
  foreach ($profile in $ProfilesToRecord) {
    if (-not $RuntimeContainerByProfile.ContainsKey($profile)) { continue }
    $containerName = $RuntimeContainerByProfile[$profile]
    $imageIds[$profile] = Get-RuntimeContainerImageId -ContainerName $containerName
  }
  if ($imageIds.Count -eq 0) {
    return
  }

  $marker = [ordered]@{
    schemaVersion = 1
    sourceSha = $CurrentSourceSha
    createdAt = [DateTimeOffset]::UtcNow.ToString("o")
    profiles = @($ProfilesToRecord)
    imageIds = $imageIds
  }
  $marker | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $PreparedRuntimeMarkerPath -Encoding UTF8
  Write-Host "Prepared runtime marker: $PreparedRuntimeMarkerPath"
}

function Assert-PreparedRuntimeMarker {
  if (-not (Test-Path -LiteralPath $PreparedRuntimeMarkerPath -PathType Leaf)) {
    throw "Prepared runtime marker is missing for $CurrentSourceSha. Run the scoped runtime:up or runtime:bootstrap-dev phase before smoke."
  }

  try {
    $marker = Get-Content -LiteralPath $PreparedRuntimeMarkerPath -Raw | ConvertFrom-Json
  } catch {
    throw "Prepared runtime marker is invalid: $PreparedRuntimeMarkerPath"
  }
  if ([string]$marker.sourceSha -ne $CurrentSourceSha) {
    throw "Prepared runtime source SHA mismatch: expected $CurrentSourceSha, got $($marker.sourceSha)"
  }

  foreach ($profile in @($ProfileList | Where-Object { $RuntimeContainerByProfile.ContainsKey($_) })) {
    $markerProperty = $marker.imageIds.PSObject.Properties[$profile]
    if ($null -eq $markerProperty) {
      throw "Prepared runtime marker does not cover requested profile '$profile'."
    }
    $containerName = $RuntimeContainerByProfile[$profile]
    $running = (& docker inspect $containerName --format "{{.State.Running}}" 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
      throw "Prepared runtime container is not running: $containerName"
    }
    $currentImageId = Get-RuntimeContainerImageId -ContainerName $containerName
    if ($currentImageId -ne [string]$markerProperty.Value) {
      throw "Prepared runtime image mismatch for ${profile}: marker=$($markerProperty.Value), running=$currentImageId"
    }
  }
  Write-Host "Prepared runtime provenance: PASS sourceSha=$CurrentSourceSha"
}

function Test-TransientPostgresBootstrapRestart {
  if ($Action -ne "up" -or -not (Test-Path -LiteralPath $LogPath -PathType Leaf)) {
    return $false
  }
  $logText = Get-Content -LiteralPath $LogPath -Raw
  return $logText -match "database system is shutting down|the database system is starting up"
}

Import-CanonicalRuntimeEnvironment
foreach ($requiredScript in @($RuntimeScript, $RuntimeSmokeScript)) {
  if (-not (Test-Path -LiteralPath $requiredScript -PathType Leaf)) {
    Publish-RuntimeStatus -State error -Description "runtime script is missing" -Subject "missing-script"
    throw "Runtime script not found: $requiredScript"
  }
}

$runAuthenticatedWltSmoke = $Action -eq "smoke" -and $ProfileList -contains "wlt"
$runtimeProfileList = if ($runAuthenticatedWltSmoke) {
  @($ProfileList | Where-Object { $_ -ne "wlt" })
} else {
  @($ProfileList)
}
$runtimeProfiles = $runtimeProfileList -join ","
$phaseRuntimeScript = if ($Action -eq "smoke") { $RuntimeSmokeScript } else { $RuntimeScript }
$runtimeParameters = @{
  Action = $Action
  Profiles = $runtimeProfiles
}
if ($Force) { $runtimeParameters.Force = $true }

try {
  Set-Location -LiteralPath $RepoRoot

  if ($Action -eq "smoke" -and $ProfileList -contains "dsh") {
    Assert-PreparedRuntimeMarker
    $runtimeParameters.PreparedRuntime = $true
  }

  if ($Action -eq "catalog-readback") {
    if ($ProfileList -notcontains "dsh") {
      "Catalog readback skipped: DSH profile is not active." | Tee-Object -FilePath $LogPath
    } else {
      if (-not (Test-Path -LiteralPath $CatalogReadbackScript -PathType Leaf)) {
        throw "Central catalog readback script not found: $CatalogReadbackScript"
      }
      Write-Host "`n=== runtime:catalog-readback ==="
      $catalogExitCode = Invoke-RuntimeBasePhase -ScriptPath $CatalogReadbackScript -Parameters @{}
      if ($catalogExitCode -ne 0) {
        throw "Central catalog readback failed with exit code $catalogExitCode"
      }
    }
  } elseif (-not [string]::IsNullOrWhiteSpace($runtimeProfiles)) {
    $runtimeExitCode = Invoke-RuntimeBasePhase -ScriptPath $phaseRuntimeScript -Parameters $runtimeParameters
    if ($runtimeExitCode -ne 0 -and (Test-TransientPostgresBootstrapRestart)) {
      Write-Warning "PostgreSQL bootstrap performed its expected temporary-server restart. Retrying runtime:up once after stabilization."
      "=== transient-postgres-bootstrap-retry: one retry ===" | Add-Content -LiteralPath $LogPath
      Start-Sleep -Seconds 5
      $runtimeExitCode = Invoke-RuntimeBasePhase -ScriptPath $phaseRuntimeScript -Parameters $runtimeParameters -Append
    }
    if ($runtimeExitCode -ne 0) {
      throw "Runtime script action '$Action' failed with exit code $runtimeExitCode"
    }
    if ($Action -in @("up", "bootstrap-dev")) {
      Write-PreparedRuntimeMarker -ProfilesToRecord $ProfileList
    }
  } else {
    "Runtime base phase skipped: no non-WLT profiles remain for action '$Action'." | Tee-Object -FilePath $LogPath
  }

  if ($runAuthenticatedWltSmoke) {
    if (-not (Test-Path -LiteralPath $AuthenticatedWltSmokeScript -PathType Leaf)) {
      throw "Authenticated WLT smoke script not found: $AuthenticatedWltSmokeScript"
    }
    Write-Host "`n=== runtime:wlt-authenticated-smoke ==="
    $wltSmokeExitCode = Invoke-RuntimeBasePhase -ScriptPath $AuthenticatedWltSmokeScript -Parameters @{} -Append
    if ($wltSmokeExitCode -ne 0) {
      throw "Authenticated WLT runtime smoke failed with exit code $wltSmokeExitCode"
    }
  }

  # bootstrap-dev is executed exactly once by runtime.ps1. No secondary seed,
  # media, or catalog pass is permitted here; that would recreate parallel
  # orchestration and conceal which pass produced the final database state.
  Publish-RuntimeStatus -State success -Description "runtime $Action passed"
} catch {
  $message = $_.Exception.Message

  if ($Action -eq "smoke" -and $ProfileList -contains "dsh" -and
      (Test-Path -LiteralPath $DshSmokeDiagnosticScript -PathType Leaf)) {
    Write-Host "`n=== runtime:dsh-smoke-request-boundary-diagnosis ==="
    try {
      & $DshSmokeDiagnosticScript 2>&1 | Tee-Object -FilePath $LogPath -Append | Out-Host
    } catch {
      Write-Host "DSH smoke request-boundary diagnosis failed: $($_.Exception.Message)"
      ($_ | Format-List * -Force | Out-String) | Add-Content -LiteralPath $LogPath
    }
  }

  $subject = ConvertTo-StatusText -Value $message -Limit 48
  if ([string]::IsNullOrWhiteSpace($subject)) { $subject = "phase-failed" }
  Publish-RuntimeStatus -State failure -Description $message -Subject $subject
  Write-Error "Runtime phase '$Action' failed: $message. Full log: $LogPath"
  if (Test-Path -LiteralPath $LogPath) {
    Write-Host "--- Runtime $Action final log lines ---"
    Get-Content -LiteralPath $LogPath -Tail 160
  }
  exit 1
}
