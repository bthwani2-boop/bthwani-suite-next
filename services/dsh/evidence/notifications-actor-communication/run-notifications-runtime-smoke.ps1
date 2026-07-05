param(
  [string]$BaseUrl = "http://127.0.0.1:58080",
  [string]$DatabaseUrl = $env:DSH_DATABASE_URL,
  [string]$OutputPath = "services/dsh/evidence/notifications-actor-communication/dsh-notifications-runtime-smoke.txt",
  [string]$Ref = "implementing",
  [string]$HeadSha = ""
)

$ErrorActionPreference = "Stop"
$results = New-Object System.Collections.Generic.List[string]
$failed = $false

function Add-Result([string]$line) {
  $results.Add($line)
  Write-Output $line
}

function Test-Route([string]$method, [string]$path, [int[]]$acceptedStatuses, [string]$body = $null) {
  try {
    $headers = @{}
    if ($body) {
      $headers["Content-Type"] = "application/json"
    }
    $response = Invoke-WebRequest -Uri "$BaseUrl$path" -Method $method -Body $body -Headers $headers -TimeoutSec 10 -SkipHttpErrorCheck
    $status = [int]$response.StatusCode
    if ($status -eq 404 -or ($acceptedStatuses -notcontains $status)) {
      Add-Result "FAIL $method $path => $status"
      $script:failed = $true
      return
    }
    Add-Result "PASS $method $path => $status"
  } catch {
    Add-Result "FAIL $method $path => $($_.Exception.Message)"
    $script:failed = $true
  }
}

if ([string]::IsNullOrWhiteSpace($HeadSha)) {
  try {
    $HeadSha = (git rev-parse HEAD).Trim()
  } catch {
    $HeadSha = "unknown"
  }
}

Add-Result "Notifications runtime smoke"
Add-Result "ref=$Ref"
Add-Result "head_sha=$HeadSha"
Add-Result "base_url=$BaseUrl"
Add-Result "timestamp=$((Get-Date).ToUniversalTime().ToString('o'))"

Test-Route "GET" "/dsh/health" @(200)
Test-Route "GET" "/dsh/notifications" @(401)
Test-Route "POST" "/dsh/notifications/00000000-0000-0000-0000-000000000000/read" @(401)
Test-Route "POST" "/dsh/notifications/read-all" @(401)
Test-Route "PUT" "/dsh/notifications/preferences" @(400, 401) "{}"
Test-Route "GET" "/dsh/operator/notifications/config" @(401)
Test-Route "PUT" "/dsh/operator/notifications/config" @(400, 401) "{}"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  Add-Result "FAIL database proof => DSH_DATABASE_URL is not set"
  $failed = $true
} else {
  $psql = Get-Command psql -ErrorAction SilentlyContinue
  $tableSql = "select to_regclass('public.dsh_notifications'), to_regclass('public.dsh_notification_preferences'), to_regclass('public.dsh_platform_notification_config');"
  if (-not $psql) {
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $docker) {
      Add-Result "FAIL database proof => psql and docker are not available"
      $failed = $true
    } else {
      $containerDbUrl = $DatabaseUrl -replace '@localhost:\d+/', '@localhost:5432/' -replace '@127.0.0.1:\d+/', '@localhost:5432/'
      $tableResult = docker exec -t bthwani-postgres-runtime psql $containerDbUrl -tAc $tableSql
      if ($LASTEXITCODE -ne 0 -or $tableResult -notmatch "dsh_notifications" -or $tableResult -notmatch "dsh_notification_preferences" -or $tableResult -notmatch "dsh_platform_notification_config") {
        Add-Result "FAIL database tables => $tableResult"
        $failed = $true
      } else {
        Add-Result "PASS database tables => $tableResult"
      }
    }
  } else {
    $tableResult = & psql $DatabaseUrl -tAc $tableSql
    if ($LASTEXITCODE -ne 0 -or $tableResult -notmatch "dsh_notifications" -or $tableResult -notmatch "dsh_notification_preferences" -or $tableResult -notmatch "dsh_platform_notification_config") {
      Add-Result "FAIL database tables => $tableResult"
      $failed = $true
    } else {
      Add-Result "PASS database tables => $tableResult"
    }
  }
}

if ($failed) {
  Add-Result "final_status=FAIL"
} else {
  Add-Result "final_status=PASS"
}

$resolvedOutput = Join-Path (Get-Location) $OutputPath
$results | Set-Content -LiteralPath $resolvedOutput -Encoding UTF8

if ($failed) {
  exit 1
}

exit 0
