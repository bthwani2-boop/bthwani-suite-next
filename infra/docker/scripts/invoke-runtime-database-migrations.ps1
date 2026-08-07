[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("identity", "workforce", "dsh", "wlt", "providers", "platform-control")]
  [string]$Service,
  [string]$SourceCommitSha = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$RebuildScript = Join-Path $ScriptDir "rebuild-runtime-service-database.ps1"
if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) { throw "Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { throw "Runtime env file not found: $EnvFile" }
if (-not (Test-Path -LiteralPath $RebuildScript -PathType Leaf)) { throw "Service database rebuild authority not found: $RebuildScript" }

$serviceMap = @{
  "identity" = @{ Directory = "core/identity/database/migrations"; User = "identity_runtime"; Database = "identity_runtime" }
  "workforce" = @{ Directory = "core/workforce/database/migrations"; User = "workforce_runtime"; Database = "workforce_runtime" }
  "dsh" = @{ Directory = "services/dsh/database/migrations"; User = "dsh_runtime"; Database = "dsh_runtime" }
  "wlt" = @{ Directory = "services/wlt/database/migrations"; User = "wlt_runtime"; Database = "wlt_runtime" }
  "providers" = @{ Directory = "core/providers/database/migrations"; User = "providers_runtime"; Database = "providers_runtime" }
  "platform-control" = @{ Directory = "core/platform-control/database/migrations"; User = "platform_control_runtime"; Database = "platform_control_runtime" }
}
$config = $serviceMap[$Service]
$migrationDirectory = Join-Path $RepoRoot $config.Directory
if (-not (Test-Path -LiteralPath $migrationDirectory -PathType Container)) {
  throw "Migration directory not found for '$Service': $migrationDirectory"
}
$migrationFiles = @(Get-ChildItem -LiteralPath $migrationDirectory -Filter "*.sql" -File | Sort-Object Name)
if ($migrationFiles.Count -eq 0) {
  throw "No migrations found for '$Service'."
}

if ([string]::IsNullOrWhiteSpace($SourceCommitSha)) {
  if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_SHA)) {
    $SourceCommitSha = $env:GITHUB_SHA
  } else {
    $SourceCommitSha = (& git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($SourceCommitSha)) {
      throw "Unable to resolve source commit SHA."
    }
  }
}

. (Join-Path $ScriptDir "schema-migration-runner.ps1")
$script:LastPsqlOutput = ""

function Test-LocalDatabaseRebuildAllowed {
  $environmentValues = @($env:NODE_ENV, $env:ENVIRONMENT, $env:BTHWANI_ENVIRONMENT) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    ForEach-Object { $_.Trim().ToLowerInvariant() }
  if ($environmentValues -contains "production") { return $false }

  if ($env:BTHWANI_ALLOW_LOCAL_DATABASE_REBUILD -eq "true") { return $true }

  $allowedLifecycleEvents = @(
    "runtime:bootstrap-dev",
    "runtime:full:bootstrap-dev",
    "client",
    "partner",
    "field",
    "captain",
    "control"
  )
  return $allowedLifecycleEvents -contains $env:npm_lifecycle_event
}

function Invoke-ComposePsql {
  param([Parameter(Mandatory = $true)][string]$Sql, [switch]$Quiet)

  $arguments = @(
    "compose", "--env-file", $EnvFile, "-f", $ComposeFile,
    "exec", "-T", "postgres", "psql",
    "-U", $config.User, "-d", $config.Database,
    "-X", "-v", "ON_ERROR_STOP=1"
  )
  if ($Quiet) { $arguments += "-q" }

  $output = @($Sql | & docker @arguments 2>&1)
  $exitCode = $LASTEXITCODE
  $script:LastPsqlOutput = ($output | ForEach-Object { [string]$_ }) -join "`n"
  foreach ($line in $output) { Write-Host ([string]$line) }
  if ($exitCode -ne 0) {
    throw "Runtime psql failed for '$Service' with exit code $exitCode."
  }
}

function Invoke-GovernedMigrationPass {
  $executeBatch = {
    param([string]$Sql)
    Invoke-ComposePsql -Sql $Sql
  }
  $executeStatement = {
    param([string]$Sql)
    Invoke-ComposePsql -Sql $Sql -Quiet
  }

  Invoke-BthwaniGovernedMigrations `
    -ServiceName $Service `
    -MigrationFiles $migrationFiles `
    -SourceCommitSha $SourceCommitSha `
    -ExecuteBatch $executeBatch `
    -ExecuteStatement $executeStatement
}

try {
  Invoke-GovernedMigrationPass
} catch {
  $isGovernedLedgerConflict = $script:LastPsqlOutput -match "GOVERNED_MIGRATION_LEDGER_CONFLICT"
  if (-not $isGovernedLedgerConflict -or -not (Test-LocalDatabaseRebuildAllowed)) {
    throw
  }

  Write-Warning "Governed migration drift detected for local service '$Service'; rebuilding only its runtime database from canonical migrations."
  & $RebuildScript `
    -Service $Service `
    -ComposeFile $ComposeFile `
    -EnvFile $EnvFile `
    -Reason "governed migration ledger conflict" `
    -AllowLocalDevelopmentRebuild

  $script:LastPsqlOutput = ""
  Invoke-GovernedMigrationPass
}

Write-Host "Governed runtime migrations: PASS service=$Service files=$($migrationFiles.Count) sha=$SourceCommitSha"
