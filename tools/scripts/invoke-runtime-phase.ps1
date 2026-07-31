param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "catalog-readback", "smoke")]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$Profiles,

  [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$RuntimeSmokeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime-dispatch.ps1"
$RuntimeEnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$CatalogSeedScript = Join-Path $RepoRoot "services/dsh/database/scripts/apply-central-catalog-seed.ps1"
$LocalMediaSeedScript = Join-Path $RepoRoot "tools/scripts/runtime/seed-local-media.ps1"
$CatalogReadbackScript = Join-Path $RepoRoot "tools/scripts/verify-catalog.ps1"
$AuthenticatedWltSmokeScript = Join-Path $RepoRoot "tools/scripts/finance/smoke-wlt-authenticated-runtime.ps1"
$DshSmokeDiagnosticScript = Join-Path $RepoRoot "tools/scripts/runtime/diagnose-dsh-smoke-auth-boundary.ps1"
$LogRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$LogPath = Join-Path $LogRoot "bthwani-runtime-$Action.log"
$ProfileList = @($Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })

function Import-CanonicalRuntimeEnvironment {
  if (-not (Test-Path -LiteralPath $script:RuntimeEnvFile -PathType Leaf)) {
    throw "Canonical runtime environment file not found: $script:RuntimeEnvFile"
  }

  foreach ($rawLine in Get-Content -LiteralPath $script:RuntimeEnvFile) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      continue
    }

    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($value.StartsWith('"') -and $value.EndsWith('"')) {
      $value = $value.Substring(1, $value.Length - 2)
    } elseif ($value.StartsWith("'") -and $value.EndsWith("'")) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    $current = [System.Environment]::GetEnvironmentVariable($key, "Process")
    if ([string]::IsNullOrWhiteSpace($current)) {
      [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

Import-CanonicalRuntimeEnvironment

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
  $targetUrl = if ($env:GITHUB_RUN_ID) { "$serverUrl/$($env:GITHUB_REPOSITORY)/actions/runs/$($env:GITHUB_RUN_ID)" } else { $null }
  $payload = @{
    state = $State
    context = $context
    description = ConvertTo-StatusText -Value $Description
  }
  if ($targetUrl) { $payload.target_url = $targetUrl }

  $requestParameters = @{
    Uri = "$apiUrl/repos/$($env:GITHUB_REPOSITORY)/statuses/$($env:GITHUB_SHA)"
    Method = "Post"
    Headers = @{
      Accept = "application/vnd.github+json"
      Authorization = "Bearer $($env:BTHWANI_STATUS_TOKEN)"
      "X-GitHub-Api-Version" = "2022-11-28"
    }
    ContentType = "application/json"
    Body = ($payload | ConvertTo-Json -Compress)
  }

  try {
    Invoke-RestMethod @requestParameters | Out-Null
  } catch {
    Write-Warning "Runtime status publication failed: $($_.Exception.Message)"
  }
}

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

function Invoke-RuntimeBasePhase {
  param([switch]$Append)

  $global:LASTEXITCODE = 0
  if ($Append) {
    & $phaseRuntimeScript @runtimeParameters 2>&1 |
      Tee-Object -FilePath $LogPath -Append |
      Out-Host
  } else {
    & $phaseRuntimeScript @runtimeParameters 2>&1 |
      Tee-Object -FilePath $LogPath |
      Out-Host
  }

  # A PowerShell function emits every uncaptured pipeline object. Without
  # Out-Host above, callers receive the complete runtime log plus the integer
  # exit code, and the non-empty log is incorrectly treated as a failed code.
  $exitCode = $LASTEXITCODE
  return [int]$exitCode
}

function Test-TransientPostgresBootstrapRestart {
  if ($Action -ne "up" -or -not (Test-Path -LiteralPath $LogPath -PathType Leaf)) {
    return $false
  }

  $logText = Get-Content -LiteralPath $LogPath -Raw
  return $logText -match "database system is shutting down|the database system is starting up"
}

try {
  Set-Location -LiteralPath $RepoRoot

  if ($Action -eq "catalog-readback") {
    if ($ProfileList -notcontains "dsh") {
      "Catalog readback skipped: DSH profile is not active." | Tee-Object -FilePath $LogPath
    } else {
      if (-not (Test-Path -LiteralPath $CatalogReadbackScript -PathType Leaf)) {
        throw "Central catalog readback script not found: $CatalogReadbackScript"
      }
      Write-Host "`n=== runtime:catalog-readback ==="
      $global:LASTEXITCODE = 0
      & $CatalogReadbackScript 2>&1 | Tee-Object -FilePath $LogPath
      if ($LASTEXITCODE -ne 0) {
        throw "Central catalog readback failed with exit code $LASTEXITCODE"
      }
    }
  } elseif ($runtimeProfileList.Count -gt 0) {
    $runtimeExitCode = Invoke-RuntimeBasePhase
    if ($runtimeExitCode -ne 0 -and (Test-TransientPostgresBootstrapRestart)) {
      Write-Warning "PostgreSQL bootstrap performed its one expected temporary-server restart. Retrying runtime:up once after stabilization."
      "=== transient-postgres-bootstrap-retry: one retry ===" | Add-Content -LiteralPath $LogPath
      Start-Sleep -Seconds 5
      $runtimeExitCode = Invoke-RuntimeBasePhase -Append
    }
    if ($runtimeExitCode -ne 0) {
      throw "Runtime script action '$Action' failed with exit code $runtimeExitCode"
    }
  } else {
    "Runtime base phase skipped: no non-WLT profiles remain for action '$Action'." |
      Tee-Object -FilePath $LogPath
  }

  if ($runAuthenticatedWltSmoke) {
    if (-not (Test-Path -LiteralPath $AuthenticatedWltSmokeScript -PathType Leaf)) {
      throw "Authenticated WLT smoke script not found: $AuthenticatedWltSmokeScript"
    }
    Write-Host "`n=== runtime:wlt-authenticated-smoke ==="
    $global:LASTEXITCODE = 0
    & $AuthenticatedWltSmokeScript 2>&1 | Tee-Object -FilePath $LogPath -Append
    if ($LASTEXITCODE -ne 0) {
      throw "Authenticated WLT runtime smoke failed with exit code $LASTEXITCODE"
    }
  }

  # Development catalog convergence has governed prerequisites: canonical SQL
  # seeds establish relational truth and the media seed mirrors the exact
  # governed fixture objects into the private MinIO bucket before readback.
  if ($Action -eq "up" -and $ProfileList -contains "dsh") {
    Write-Host "`n=== runtime:seed-prerequisites ==="
    $global:LASTEXITCODE = 0
    & $RuntimeScript -Action seed -Profiles $Profiles 2>&1 | Tee-Object -FilePath $LogPath -Append
    if ($LASTEXITCODE -ne 0) {
      throw "Runtime seed prerequisites failed with exit code $LASTEXITCODE"
    }

    if (-not (Test-Path -LiteralPath $LocalMediaSeedScript -PathType Leaf)) {
      throw "Local media seed script not found: $LocalMediaSeedScript"
    }
    Write-Host "`n=== runtime:media-convergence ==="
    $global:LASTEXITCODE = 0
    & $LocalMediaSeedScript 2>&1 | Tee-Object -FilePath $LogPath -Append
    if ($LASTEXITCODE -ne 0) {
      throw "Local media convergence failed with exit code $LASTEXITCODE"
    }

    if (-not (Test-Path -LiteralPath $CatalogSeedScript -PathType Leaf)) {
      throw "Central catalog convergence script not found: $CatalogSeedScript"
    }
    Write-Host "`n=== runtime:catalog-convergence ==="
    $global:LASTEXITCODE = 0
    & $CatalogSeedScript 2>&1 | Tee-Object -FilePath $LogPath -Append
    if ($LASTEXITCODE -ne 0) {
      throw "Central catalog convergence failed with exit code $LASTEXITCODE"
    }
  }

  Publish-RuntimeStatus -State success -Description "runtime $Action passed"
} catch {
  $message = $_.Exception.Message

  if ($Action -eq "smoke" -and $ProfileList -contains "dsh" -and
      (Test-Path -LiteralPath $DshSmokeDiagnosticScript -PathType Leaf)) {
    Write-Host "`n=== runtime:dsh-smoke-request-boundary-diagnosis ==="
    try {
      & $DshSmokeDiagnosticScript 2>&1 | Tee-Object -FilePath $LogPath -Append
    } catch {
      $diagnosticMessage = $_.Exception.Message
      Write-Host "DSH smoke request-boundary diagnosis failed: $diagnosticMessage"
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
