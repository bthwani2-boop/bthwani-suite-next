[CmdletBinding()]
param([switch]$Cleanup)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$FinancialComposeFile = Join-Path $RepoRoot "infra/docker/compose.financial-simulators.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$EvidenceDirectory = Join-Path $RepoRoot "artifacts"
$EvidencePath = Join-Path $EvidenceDirectory "lian-runtime-closure-evidence.json"
$CoreProfiles = "identity,workforce,dsh,wlt,financial-simulators,mail,media"
$MigrationRunner = Join-Path $RepoRoot "infra/docker/scripts/schema-migration-runner.ps1"
New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null

if (-not (Test-Path -LiteralPath $MigrationRunner)) {
  throw "Governed migration runner is missing: $MigrationRunner"
}
. $MigrationRunner

if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_SHA)) {
  $ResolvedCommitSha = $env:GITHUB_SHA.Trim()
} else {
  $ResolvedCommitSha = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to resolve the runtime closure commit SHA from Git."
  }
}
if ($ResolvedCommitSha -notmatch '^[0-9a-f]{40}$') {
  throw "Runtime closure requires an exact immutable commit SHA."
}

if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_HEAD_REF)) {
  $ResolvedBranch = $env:GITHUB_HEAD_REF.Trim()
} elseif (-not [string]::IsNullOrWhiteSpace($env:GITHUB_REF_NAME)) {
  $ResolvedBranch = $env:GITHUB_REF_NAME.Trim()
} else {
  $ResolvedBranch = (& git branch --show-current).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to resolve the runtime closure ref from Git."
  }
}
if ([string]::IsNullOrWhiteSpace($ResolvedBranch)) {
  throw "Runtime closure requires a resolved branch or ref name."
}

$Evidence = [ordered]@{
  schemaVersion = 4
  branch = $ResolvedBranch
  commitSha = $ResolvedCommitSha
  startedAt = [DateTimeOffset]::UtcNow.ToString("o")
  bootstrapMode = "CLEAN_UP_SEED_BOOTSTRAP_WITHOUT_LEGACY_SMOKE"
  migrationMode = "GOVERNED_LEDGER_CHECKSUM_IDEMPOTENT"
  state = "RUNNING"
  services = [ordered]@{}
  migrations = [ordered]@{}
  protectedRoutes = [ordered]@{}
  financialMatrix = [ordered]@{ state = "NOT_RUN" }
  disasterRecovery = [ordered]@{ state = "NOT_RUN" }
  multiSurfaceJourney = [ordered]@{ state = "NOT_RUN" }
}

function Save-Evidence([string]$State, [string]$Failure = "") {
  $Evidence.state = $State
  $Evidence.completedAt = [DateTimeOffset]::UtcNow.ToString("o")
  if ($Failure) { $Evidence.failure = $Failure }
  $Evidence | ConvertTo-Json -Depth 14 | Set-Content -LiteralPath $EvidencePath -Encoding utf8
}

function Invoke-Compose([string[]]$Arguments, [switch]$Financial) {
  $Base = @("compose", "--env-file", $EnvFile, "-f", $ComposeFile)
  if ($Financial) { $Base += @("-f", $FinancialComposeFile) }
  & docker @Base @Arguments
  if ($LASTEXITCODE -ne 0) { throw "docker compose failed: $($Arguments -join ' ')" }
}

function Invoke-Runtime([string]$Action, [string]$Profiles, [switch]$Force) {
  $Arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimeScript, "-Action", $Action, "-Profiles", $Profiles)
  if ($Force) { $Arguments += "-Force" }
  $Output = @(& pwsh @Arguments 2>&1)
  $ExitCode = $LASTEXITCODE
  $Output | ForEach-Object { Write-Host $_ }
  if ($ExitCode -ne 0) {
    $Actionable = @(
      $Output |
        ForEach-Object { [string]$_ } |
        Where-Object {
          $_ -match '(?i)(error|failed|failure|fatal|missing|invalid|conflict|refused|unhealthy|did not become|cannot|not found|checksum|dirty)'
        }
    )
    $Detail = if ($Actionable.Count -gt 0) {
      ($Actionable | Select-Object -Last 3) -join " | "
    } elseif ($Output.Count -gt 0) {
      ($Output | Select-Object -Last 3) -join " | "
    } else {
      "no child output"
    }
    $Detail = ($Detail -replace '\s+', ' ').Trim()
    throw "runtime:$Action failed for profiles $Profiles (exit $ExitCode): $Detail"
  }
}

function Wait-Database([string]$DatabaseName) {
  for ($Attempt = 1; $Attempt -le 40; $Attempt++) {
    $Result = docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
      psql -U bthwani_runtime -d bthwani_runtime -tAc "SELECT 1 FROM pg_database WHERE datname = '$DatabaseName';" 2>$null
    if ($LASTEXITCODE -eq 0 -and (($Result -join "").Trim()) -eq "1") { return }
    Start-Sleep -Seconds 2
  }
  throw "Database did not become available: $DatabaseName"
}

function Invoke-Migrations([string]$Name, [string]$Directory, [string]$User, [string]$Database) {
  $Files = @(Get-ChildItem -LiteralPath $Directory -Filter "*.sql" -File | Sort-Object Name)
  if ($Files.Count -eq 0) { throw "$Name has no migrations." }

  $Batch = New-BthwaniGovernedMigrationBatch `
    -ServiceName $Name `
    -MigrationFiles $Files `
    -SourceCommitSha $ResolvedCommitSha

  $Batch | docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    psql -U $User -d $Database -X -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "$Name governed migration batch failed."
  }

  $Ledger = docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    psql -U $User -d $Database -X -qAt -v ON_ERROR_STOP=1 -c `
    "SELECT COUNT(*) || ':' || COUNT(*) FILTER (WHERE dirty OR NOT success) FROM schema_migrations WHERE service_name = '$Name';"
  if ($LASTEXITCODE -ne 0) {
    throw "$Name governed migration ledger readback failed."
  }
  $LedgerParts = (($Ledger -join "").Trim()).Split(":")
  if ($LedgerParts.Count -ne 2 -or [int]$LedgerParts[0] -ne $Files.Count -or [int]$LedgerParts[1] -ne 0) {
    throw "$Name governed migration ledger mismatch: $($Ledger -join '')"
  }

  $Evidence.migrations[$Name] = [ordered]@{
    database = $Database
    filesApplied = $Files.Count
    ledgerRows = [int]$LedgerParts[0]
    dirtyRows = [int]$LedgerParts[1]
    sourceCommitSha = $ResolvedCommitSha
    state = "PASS"
  }
}

function Wait-Status([string]$Name, [string]$Url, [string]$Expected = "healthy") {
  for ($Attempt = 1; $Attempt -le 40; $Attempt++) {
    try {
      $Response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
      if ($Response.status -eq $Expected) {
        $Evidence.services[$Name] = [ordered]@{ url = $Url; status = $Response.status; state = "PASS" }
        return
      }
    } catch { }
    Start-Sleep -Seconds 2
  }
  throw "$Name did not report $Expected at $Url"
}

function Wait-Providers {
  $Url = "http://127.0.0.1:58087/providers/health"
  $RequiredKinds = @("sms", "maps", "payment", "push", "email", "storage", "search", "fraud")
  for ($Attempt = 1; $Attempt -le 40; $Attempt++) {
    try {
      $Response = Invoke-RestMethod -Uri $Url -TimeoutSec 5 -ErrorAction Stop
      $Items = @($Response.providers)
      $Kinds = @($Items | ForEach-Object { $_.kind })
      $Missing = @($RequiredKinds | Where-Object { $Kinds -notcontains $_ })
      $Invalid = @($Items | Where-Object { $_.status -notin @("healthy", "degraded", "down", "not_configured") })
      if ($Missing.Count -eq 0 -and $Invalid.Count -eq 0) {
        $Evidence.services.providers = [ordered]@{ url = $Url; status = "reachable"; providerKinds = $Kinds; state = "PASS" }
        return
      }
    } catch { }
    Start-Sleep -Seconds 2
  }
  throw "Providers health matrix is incomplete."
}

function Assert-Protected([string]$Name, [string]$Method, [string]$Url, [string]$Body = "") {
  $Parameters = @{ Uri = $Url; Method = $Method; SkipHttpErrorCheck = $true; TimeoutSec = 10 }
  if ($Body) { $Parameters.ContentType = "application/json"; $Parameters.Body = $Body }
  $Response = Invoke-WebRequest @Parameters
  $Status = [int]$Response.StatusCode
  if ($Status -notin @(401, 403)) { throw "$Name expected 401/403 but received $Status" }
  $Evidence.protectedRoutes[$Name] = [ordered]@{ method = $Method; url = $Url; status = $Status; state = "PASS" }
}

function Invoke-EvidenceScript([string]$Name, [string]$Path, [string[]]$Arguments = @()) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "$Name script is missing: $Path" }
  $Output = & pwsh -NoProfile -ExecutionPolicy Bypass -File $Path @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) { throw "$Name failed with exit code $LASTEXITCODE`n$($Output -join "`n")" }
  return [ordered]@{ state = "PASS"; output = ($Output -join "`n") }
}

function Verify-AllServices {
  Wait-Status "dsh" "http://127.0.0.1:58080/dsh/health"
  Wait-Status "identity" "http://127.0.0.1:58082/identity/health"
  Wait-Status "wlt" "http://127.0.0.1:58083/wlt/health"
  Wait-Status "workforce" "http://127.0.0.1:58086/workforce/health"
  Wait-Providers
  Wait-Status "platform-control" "http://127.0.0.1:58088/platform/health"
  Wait-Status "platform-control-readiness" "http://127.0.0.1:58088/platform/readiness" "ready"
}

try {
  Invoke-Compose @("down", "-v", "--remove-orphans") -Financial
  Invoke-Runtime "up" $CoreProfiles
  Invoke-Runtime "seed" $CoreProfiles
  Invoke-Runtime "bootstrap-dev" "dsh,media" -Force

  Wait-Database "providers_runtime"
  Wait-Database "platform_control_runtime"
  Invoke-Migrations "providers" (Join-Path $RepoRoot "core/providers/database/migrations") "providers_runtime" "providers_runtime"
  Invoke-Migrations "platform-control" (Join-Path $RepoRoot "core/platform-control/database/migrations") "platform_control_runtime" "platform_control_runtime"
  Invoke-Compose @("--profile", "providers", "--profile", "platform", "up", "-d", "--build", "providers-api", "platform-control-api")
  Verify-AllServices

  $Evidence.financialMatrix = Invoke-EvidenceScript "WLT runtime failure matrix" `
    (Join-Path $RepoRoot "tools/scripts/test-wlt-runtime-failure-matrix.ps1")
  $Evidence.multiSurfaceJourney = Invoke-EvidenceScript "DSH governed domain matrices" `
    (Join-Path $RepoRoot "tools/scripts/test-dsh-multisurface-runtime-matrix.ps1")
  $Evidence.disasterRecovery = Invoke-EvidenceScript "Runtime disaster recovery" `
    (Join-Path $RepoRoot "tools/scripts/test-runtime-backup-restore.ps1") @("-EnvFile", $EnvFile)

  Verify-AllServices
  Assert-Protected "client-map-search" "POST" "http://127.0.0.1:58080/dsh/client/maps/search" '{"query":"Sanaa"}'
  Assert-Protected "client-map-reverse" "POST" "http://127.0.0.1:58080/dsh/client/maps/reverse" '{"latitude":15.35,"longitude":44.20}'
  Assert-Protected "service-area-governance" "GET" "http://127.0.0.1:58080/dsh/operator/platform/service-areas"
  Assert-Protected "platform-zones" "GET" "http://127.0.0.1:58080/dsh/operator/platform/zones"
  Assert-Protected "address-privacy-policy" "GET" "http://127.0.0.1:58080/dsh/operator/platform/client-address-privacy"

  Save-Evidence "PASS"
  Write-Host "Sovereign full-runtime closure v2: PASS"
} catch {
  Save-Evidence "FAIL" $_.Exception.Message
  throw
} finally {
  if ($Cleanup) {
    try { Invoke-Runtime "down" $CoreProfiles } catch { }
    try { Invoke-Compose @("--profile", "providers", "--profile", "platform", "down", "--remove-orphans") } catch { }
  }
}
