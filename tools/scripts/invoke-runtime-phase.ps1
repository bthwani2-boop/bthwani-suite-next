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
$LogRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$LogPath = Join-Path $LogRoot "bthwani-runtime-$Action.log"

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

  $suffix = if ([string]::IsNullOrWhiteSpace($Subject)) {
    ""
  } else {
    "/" + (($Subject -replace "[^A-Za-z0-9_.-]", "-").Trim("-").Substring(0, [Math]::Min(48, (($Subject -replace "[^A-Za-z0-9_.-]", "-").Trim("-")).Length)))
  }
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

  try {
    Invoke-RestMethod \
      -Uri "$apiUrl/repos/$($env:GITHUB_REPOSITORY)/statuses/$($env:GITHUB_SHA)" \
      -Method Post \
      -Headers @{
        Accept = "application/vnd.github+json"
        Authorization = "Bearer $($env:BTHWANI_STATUS_TOKEN)"
        "X-GitHub-Api-Version" = "2022-11-28"
      } \
      -ContentType "application/json" \
      -Body ($payload | ConvertTo-Json -Compress) | Out-Null
  } catch {
    Write-Warning "Runtime status publication failed: $($_.Exception.Message)"
  }
}

if (-not (Test-Path -LiteralPath $RuntimeScript)) {
  Publish-RuntimeStatus -State error -Description "runtime.ps1 is missing" -Subject "missing-script"
  throw "Runtime script not found: $RuntimeScript"
}

$arguments = @("-Action", $Action, "-Profiles", $Profiles)
if ($Force) { $arguments += "-Force" }

try {
  Set-Location -LiteralPath $RepoRoot
  & $RuntimeScript @arguments 2>&1 | Tee-Object -FilePath $LogPath
  if ($LASTEXITCODE -ne 0) {
    throw "runtime phase '$Action' exited with code $LASTEXITCODE"
  }
  Publish-RuntimeStatus -State success -Description "runtime $Action passed"
} catch {
  $message = $_.Exception.Message
  $subject = if ($message -match "([A-Za-z][A-Za-z0-9_-]+(?: API| migration| smoke| health| readiness| bootstrap| start)?)") {
    $Matches[1]
  } else {
    "phase-failed"
  }
  Publish-RuntimeStatus -State failure -Description $message -Subject $subject
  Write-Error "Runtime phase '$Action' failed: $message. Full log: $LogPath"
  if (Test-Path -LiteralPath $LogPath) {
    Write-Host "--- Runtime $Action final log lines ---"
    Get-Content -LiteralPath $LogPath -Tail 160
  }
  exit 1
}
