[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("identity", "workforce", "dsh", "wlt", "providers", "platform-control")]
  [string]$Service,
  [string]$SourceCommitSha = "",
  # Explicit permission to rebuild THIS service's local database when its
  # migration ledger has drifted. Passed only by the bootstrap-dev phase; `up`
  # and `smoke` must never pass it, so a conflict stays loud there.
  [switch]$AllowLocalLedgerRecovery
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$RebuildScript = Join-Path $ScriptDir "rebuild-runtime-service-database.ps1"
$IdentityImportScript = Join-Path $RepoRoot "tools/scripts/import-identity-operator-context-to-workforce.ps1"
if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) { throw "Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { throw "Runtime env file not found: $EnvFile" }
if (-not (Test-Path -LiteralPath $RebuildScript -PathType Leaf)) { throw "Service database rebuild authority not found: $RebuildScript" }
if ($Service -eq "workforce" -and -not (Test-Path -LiteralPath $IdentityImportScript -PathType Leaf)) { throw "Identity-to-Workforce migration authority not found: $IdentityImportScript" }

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
. (Join-Path $ScriptDir "workforce-migration-input-handoff.ps1")

# Local ledger recovery is destructive, so permission is an explicit contract
# passed down from the bootstrap-dev phase -- never inferred from ambient state.
# It previously keyed off the pnpm lifecycle-event environment variable, which is
# a package-manager side effect rather than a contract: any hop through
# Start-Process, a nested pnpm invocation or a direct `pwsh -File` call silently
# revoked recovery, and its allow-list also covered the five app start scripts,
# meaning ordinary app startup was authorized to rebuild a database.
function Test-LocalDatabaseRebuildAllowed {
  $environmentValues = @($env:NODE_ENV, $env:ENVIRONMENT, $env:BTHWANI_ENVIRONMENT) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    ForEach-Object { $_.Trim().ToLowerInvariant() }
  if ($environmentValues -contains "production") { return $false }

  if ($AllowLocalLedgerRecovery) { return $true }

  # Explicit operator override for a local database, still subject to the
  # production assertion above. Nothing in the repository sets it.
  return $env:BTHWANI_ALLOW_LOCAL_DATABASE_REBUILD -eq "true"
}

function Invoke-ComposePsql {
  param([Parameter(Mandatory = $true)][string]$Sql, [switch]$Quiet)

  $sqlToExecute = Resolve-BthwaniWorkforceMigrationInputHandoff -ServiceName $Service -Sql $Sql

  $arguments = @(
    "compose", "--env-file", $EnvFile, "-f", $ComposeFile,
    "exec", "-T", "postgres", "psql",
    "-U", $config.User, "-d", $config.Database,
    "-X", "-v", "ON_ERROR_STOP=1"
  )
  if ($Quiet) { $arguments += "-q" }

  $output = @($sqlToExecute | & docker @arguments 2>&1)
  $exitCode = $LASTEXITCODE
  $psqlOutput = ($output | ForEach-Object { [string]$_ }) -join "`n"
  foreach ($line in $output) { Write-Host ([string]$line) }
  if ($exitCode -ne 0) {
    # The failure text travels on the exception itself. It used to be stashed in
    # a shared $script:LastPsqlOutput that the recovery guard read afterwards,
    # but the runner's own failure-bookkeeping UPDATE re-entered this function
    # and overwrote that variable before the guard ever looked at it -- so the
    # conflict token was always gone and the rebuild path was dead code for
    # exactly the failure it was written for.
    throw "Runtime psql failed for '$Service' with exit code $exitCode.`n$psqlOutput"
  }
}

function Invoke-WorkforceIdentityImport {
  if ($Service -ne 'workforce') { return }
  & $IdentityImportScript `
    -UseDockerCompose `
    -ComposeFile $ComposeFile `
    -EnvFile $EnvFile `
    -PostgresAdminUser 'bthwani_runtime' `
    -WorkforceDatabaseUser $config.User `
    -IdentityDatabaseName 'identity_runtime' `
    -WorkforceDatabaseName 'workforce_runtime' `
    -SourceCommitSha $SourceCommitSha
  if ($LASTEXITCODE -ne 0) {
    throw "Identity-to-Workforce import failed for runtime service '$Service' (exit $LASTEXITCODE)."
  }
}

function Invoke-GovernedMigrationPass {
  Invoke-WorkforceIdentityImport

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
  try {
    Invoke-GovernedMigrationPass
  } catch {
    $migrationFailure = $_
    $failureText = [string]$migrationFailure.Exception.Message
    $isRecoverableLedgerConflict = Test-BthwaniRecoverableLedgerConflict -FailureText $failureText

    if (-not $isRecoverableLedgerConflict) { throw $migrationFailure }
    if (-not (Test-LocalDatabaseRebuildAllowed)) {
      throw [System.InvalidOperationException]::new(
        "Migration ledger conflict for '$Service' is recoverable, but this phase holds no local recovery permission. " +
        "Run 'pnpm run runtime:full:bootstrap-dev', which passes -AllowLocalLedgerRecovery explicitly. " +
        "Original failure:`n$failureText",
        $migrationFailure.Exception)
    }

    Write-Warning "Governed migration drift detected for local service '$Service'; rebuilding only its runtime database from canonical migrations."
    & $RebuildScript `
      -Service $Service `
      -ComposeFile $ComposeFile `
      -EnvFile $EnvFile `
      -Reason "governed migration ledger conflict" `
      -AllowLocalDevelopmentRebuild

    Invoke-GovernedMigrationPass
  }
} finally {
  if ($Service -eq 'workforce') {
    Invoke-ComposePsql -Sql @'
DROP TABLE IF EXISTS public.workforce_identity_operator_context_import;
DROP TABLE IF EXISTS public.workforce_identity_operator_context_import_proof;
DROP TABLE IF EXISTS bthwani_migration_input.workforce_identity_operator_context_import;
DROP TABLE IF EXISTS bthwani_migration_input.workforce_identity_operator_context_import_proof;
'@ -Quiet
  }
}

Write-Host "Governed runtime migrations: PASS service=$Service files=$($migrationFiles.Count) sha=$SourceCommitSha"