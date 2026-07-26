param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "bootstrap-dev", "smoke")]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$Profiles,

  [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$CatalogSeedScript = Join-Path $RepoRoot "services/dsh/database/scripts/apply-central-catalog-seed.ps1"
$AuthenticatedWltSmokeScript = Join-Path $RepoRoot "tools/scripts/finance/smoke-wlt-authenticated-runtime.ps1"
$DshSmokeDiagnosticScript = Join-Path $RepoRoot "tools/scripts/runtime/diagnose-dsh-smoke-auth-boundary.ps1"
$LogRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$LogPath = Join-Path $LogRoot "bthwani-runtime-$Action.log"
$ProfileList = @($Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ })

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

if (-not (Test-Path -LiteralPath $RuntimeScript)) {
  Publish-RuntimeStatus -State error -Description "runtime.ps1 is missing" -Subject "missing-script"
  throw "Runtime script not found: $RuntimeScript"
}

$runAuthenticatedWltSmoke = $Action -eq "smoke" -and $ProfileList -contains "wlt"
$runtimeProfileList = if ($runAuthenticatedWltSmoke) {
  @($ProfileList | Where-Object { $_ -ne "wlt" })
} else {
  @($ProfileList)
}
$runtimeProfiles = $runtimeProfileList -join ","

$runtimeParameters = @{
  Action = $Action
  Profiles = $runtimeProfiles
}
if ($Force) { $runtimeParameters.Force = $true }

try {
  Set-Location -LiteralPath $RepoRoot

  if ($runtimeProfileList.Count -gt 0) {
    & $RuntimeScript @runtimeParameters 2>&1 | Tee-Object -FilePath $LogPath
    if ($LASTEXITCODE -ne 0) {
      throw "Runtime script action '$Action' failed with exit code $LASTEXITCODE"
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

  # Development catalog convergence has a governed prerequisite: the canonical
  # local seeds must create baseline stores and WLT references before store-level
  # catalog bindings can be upserted. Running the complete selected-profile seed
  # phase avoids partial, order-dependent SQL execution on fresh volumes.
  if ($Action -eq "up" -and $ProfileList -contains "dsh") {
    Write-Host "`n=== runtime:seed-prerequisites ==="
    & $RuntimeScript -Action seed -Profiles $Profiles 2>&1 | Tee-Object -FilePath $LogPath -Append
    if ($LASTEXITCODE -ne 0) {
      throw "Runtime seed prerequisites failed with exit code $LASTEXITCODE"
    }

    if (-not (Test-Path -LiteralPath $CatalogSeedScript)) {
      throw "Central catalog convergence script not found: $CatalogSeedScript"
    }
    Write-Host "`n=== runtime:catalog-convergence ==="
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
    Write-Host "`n=== runtime:dsh-smoke-auth-boundary-diagnosis ==="
    try {
      & $DshSmokeDiagnosticScript 2>&1 | Tee-Object -FilePath $LogPath -Append
    } catch {
      $diagnosticMessage = $_.Exception.Message
      Write-Host "DSH smoke auth-boundary diagnosis failed: $diagnosticMessage"
      ($_ | Format-List * -Force | Out-String) | Add-Content -LiteralPath $LogPath
    }
  }

  if ($Action -eq "smoke" -and $ProfileList -contains "dsh") {
    "=== BEGIN_RUNTIME_SOURCE_SNAPSHOT ===" | Add-Content -LiteralPath $LogPath
    Get-Content -LiteralPath $RuntimeScript -Raw | Add-Content -LiteralPath $LogPath
    "=== END_RUNTIME_SOURCE_SNAPSHOT ===" | Add-Content -LiteralPath $LogPath
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
