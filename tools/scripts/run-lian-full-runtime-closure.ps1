[CmdletBinding()]
param(
  [switch]$Cleanup
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$FinancialComposeFile = Join-Path $RepoRoot "infra/docker/compose.financial-simulators.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$EvidenceDirectory = Join-Path $RepoRoot "artifacts"
$EvidencePath = Join-Path $EvidenceDirectory "lian-runtime-closure-evidence.json"
$CoreProfiles = "identity,workforce,dsh,wlt,financial-simulators,mail,media"

New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null

$Evidence = [ordered]@{
  schemaVersion = 1
  branch = "lian"
  commitSha = if ($env:GITHUB_SHA) { $env:GITHUB_SHA } else { "LOCAL_UNPINNED" }
  startedAt = [DateTimeOffset]::UtcNow.ToString("o")
  state = "RUNNING"
  services = [ordered]@{}
  protectedRoutes = [ordered]@{}
  migrations = [ordered]@{}
}

function Save-Evidence {
  param([string]$State, [string]$Failure = "")
  $Evidence.state = $State
  $Evidence.completedAt = [DateTimeOffset]::UtcNow.ToString("o")
  if ($Failure) { $Evidence.failure = $Failure }
  $Evidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $EvidencePath -Encoding utf8
}

function Invoke-Compose {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [switch]$IncludeFinancial
  )

  $Base = @("compose", "--env-file", $EnvFile, "-f", $ComposeFile)
  if ($IncludeFinancial) { $Base += @("-f", $FinancialComposeFile) }
  & docker @Base @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose failed with exit code $LASTEXITCODE: $($Arguments -join ' ')"
  }
}

function Wait-Database {
  param([Parameter(Mandatory = $true)][string]$DatabaseName)

  for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    $Result = & docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
      psql -U bthwani_runtime -d bthwani_runtime -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';" 2>$null
    if ($LASTEXITCODE -eq 0 -and (($Result -join "").Trim()) -eq "1") { return }
    Start-Sleep -Seconds 2
  }
  throw "Database did not become available: $DatabaseName"
}

function Invoke-ServiceMigrations {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$DatabaseUser,
    [Parameter(Mandatory = $true)][string]$DatabaseName
  )

  if (-not (Test-Path -LiteralPath $Directory)) {
    throw "$Name migration directory is missing: $Directory"
  }

  $Files = Get-ChildItem -LiteralPath $Directory -Filter "*.sql" | Sort-Object Name
  if ($Files.Count -eq 0) { throw "$Name has no migration files in $Directory" }

  foreach ($File in $Files) {
    Write-Host "[$Name] applying $($File.Name)"
    Get-Content -LiteralPath $File.FullName -Raw |
      docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
        psql -U $DatabaseUser -d $DatabaseName -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) {
      throw "$Name migration failed: $($File.Name)"
    }
  }

  $Evidence.migrations[$Name] = [ordered]@{
    database = $DatabaseName
    filesApplied = $Files.Count
    state = "PASS"
  }
}

function Wait-JsonHealth {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$ExpectedStatus = "healthy"
  )

  for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    try {
      $Response = Invoke-RestMethod $Url -TimeoutSec 5 -ErrorAction Stop
      if ($Response.status -eq $ExpectedStatus) {
        $Evidence.services[$Name] = [ordered]@{
          url = $Url
          status = $Response.status
          state = "PASS"
        }
        return
      }
    } catch { }
    Start-Sleep -Seconds 2
  }

  throw "$Name did not report status '$ExpectedStatus' at $Url"
}

function Wait-ProvidersHealth {
  param([Parameter(Mandatory = $true)][string]$Url)

  for ($Attempt = 1; $Attempt -le 30; $Attempt++) {
    try {
      $Response = Invoke-RestMethod $Url -TimeoutSec 5 -ErrorAction Stop
      $Items = @($Response.providers)
      $Kinds = @($Items | ForEach-Object { $_.kind })
      $RequiredKinds = @("sms", "maps", "payment", "push", "email", "storage", "search", "fraud")
      $MissingKinds = @($RequiredKinds | Where-Object { $Kinds -notcontains $_ })
      $InvalidStates = @($Items | Where-Object { $_.status -notin @("healthy", "degraded", "down", "not_configured") })
      if ($Items.Count -ge $RequiredKinds.Count -and $MissingKinds.Count -eq 0 -and $InvalidStates.Count -eq 0) {
        $MapState = @($Items | Where-Object { $_.kind -eq "maps" } | Select-Object -First 1)
        $Evidence.services["providers"] = [ordered]@{
          url = $Url
          status = "reachable"
          providerKinds = $Kinds
          mapsStatus = if ($MapState.Count -gt 0) { $MapState[0].status } else { "missing" }
          state = "PASS"
        }
        return
      }
    } catch { }
    Start-Sleep -Seconds 2
  }

  throw "providers health did not return the governed provider-kind matrix at $Url"
}

function Assert-ProtectedRoute {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [string]$Body = ""
  )

  $Parameters = @{
    Uri = $Url
    Method = $Method
    SkipHttpErrorCheck = $true
    TimeoutSec = 10
  }
  if ($Body) {
    $Parameters.ContentType = "application/json"
    $Parameters.Body = $Body
  }

  $Response = Invoke-WebRequest @Parameters
  $Status = [int]$Response.StatusCode
  if ($Status -ne 401 -and $Status -ne 403) {
    throw "$Name is not mounted behind authentication; expected 401/403, received $Status"
  }

  $Evidence.protectedRoutes[$Name] = [ordered]@{
    method = $Method
    url = $Url
    status = $Status
    state = "PASS"
  }
}

try {
  Write-Host "=== Lian sovereign full-runtime closure ==="
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimeScript -Action reset -Profiles $CoreProfiles
  if ($LASTEXITCODE -ne 0) { throw "Core runtime reset failed with exit code $LASTEXITCODE" }

  Invoke-Compose -Arguments @("--profile", "providers", "--profile", "platform", "up", "-d", "postgres")
  Wait-Database -DatabaseName "providers_runtime"
  Wait-Database -DatabaseName "platform_control_runtime"

  Invoke-ServiceMigrations -Name "providers" `
    -Directory (Join-Path $RepoRoot "core/providers/database/migrations") `
    -DatabaseUser "providers_runtime" -DatabaseName "providers_runtime"
  Invoke-ServiceMigrations -Name "platform-control" `
    -Directory (Join-Path $RepoRoot "core/platform-control/database/migrations") `
    -DatabaseUser "platform_control_runtime" -DatabaseName "platform_control_runtime"

  Invoke-Compose -Arguments @(
    "--profile", "providers",
    "--profile", "platform",
    "up", "-d", "--build",
    "providers-api", "platform-control-api"
  )

  Wait-JsonHealth -Name "dsh" -Url "http://127.0.0.1:58080/dsh/health"
  Wait-JsonHealth -Name "identity" -Url "http://127.0.0.1:58082/identity/health"
  Wait-JsonHealth -Name "wlt" -Url "http://127.0.0.1:58083/wlt/health"
  Wait-JsonHealth -Name "workforce" -Url "http://127.0.0.1:58086/workforce/health"
  Wait-ProvidersHealth -Url "http://127.0.0.1:58087/providers/health"
  Wait-JsonHealth -Name "platform-control" -Url "http://127.0.0.1:58088/platform/health"
  Wait-JsonHealth -Name "platform-control-readiness" -Url "http://127.0.0.1:58088/platform/readiness" -ExpectedStatus "ready"

  Assert-ProtectedRoute -Name "client-map-search" -Method "POST" `
    -Url "http://127.0.0.1:58080/dsh/client/maps/search" -Body '{"query":"Sanaa"}'
  Assert-ProtectedRoute -Name "client-map-reverse" -Method "POST" `
    -Url "http://127.0.0.1:58080/dsh/client/maps/reverse" -Body '{"latitude":15.35,"longitude":44.20}'
  Assert-ProtectedRoute -Name "service-area-governance" -Method "GET" `
    -Url "http://127.0.0.1:58080/dsh/operator/platform/service-areas"
  Assert-ProtectedRoute -Name "platform-zones" -Method "GET" `
    -Url "http://127.0.0.1:58080/dsh/operator/platform/zones"
  Assert-ProtectedRoute -Name "address-privacy-policy" -Method "GET" `
    -Url "http://127.0.0.1:58080/dsh/operator/platform/client-address-privacy"

  Save-Evidence -State "PASS"
  Write-Host "Lian sovereign full-runtime closure: PASS"
  Write-Host "Evidence: $EvidencePath"
} catch {
  Save-Evidence -State "FAIL" -Failure $_.Exception.Message
  throw
} finally {
  if ($Cleanup) {
    try {
      & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimeScript -Action down -Profiles $CoreProfiles
    } catch { }
    try {
      Invoke-Compose -Arguments @("--profile", "providers", "--profile", "platform", "down", "--remove-orphans")
    } catch { }
  }
}
