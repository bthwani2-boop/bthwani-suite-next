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
if (-not (Test-Path -LiteralPath $ComposeFile)) { throw "Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile)) { throw "Runtime env file not found: $EnvFile" }

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
if (-not (Test-Path -LiteralPath $migrationDirectory)) {
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

function Invoke-ComposePsql {
  param([Parameter(Mandatory = $true)][string]$Sql, [switch]$Quiet)
  $arguments = @(
    "compose", "--env-file", $EnvFile, "-f", $ComposeFile,
    "exec", "-T", "postgres", "psql",
    "-U", $config.User, "-d", $config.Database,
    "-X", "-v", "ON_ERROR_STOP=1"
  )
  if ($Quiet) { $arguments += "-q" }
  $Sql | & docker @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Runtime psql failed for '$Service' with exit code $LASTEXITCODE."
  }
}

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

Write-Host "Governed runtime migrations: PASS service=$Service files=$($migrationFiles.Count) sha=$SourceCommitSha"
