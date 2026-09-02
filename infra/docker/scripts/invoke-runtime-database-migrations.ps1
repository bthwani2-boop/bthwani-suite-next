[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("identity", "workforce", "dsh", "wlt", "providers", "platform-control")]
  [string]$Service,
  [string]$SourceCommitSha = $env:CANDIDATE_SHA,
  # Explicit permission to reset THIS service's local database when its
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
$ResetScript = Join-Path $ScriptDir "reset-runtime-service-database.ps1"
$IdentityImportScript = Join-Path $RepoRoot "tools/scripts/import-identity-operator-context-to-workforce.ps1"
if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) { throw "Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { throw "Runtime env file not found: $EnvFile" }
if (-not (Test-Path -LiteralPath $ResetScript -PathType Leaf)) { throw "Service database reset primitive not found: $ResetScript" }
if ($Service -eq "workforce" -and -not (Test-Path -LiteralPath $IdentityImportScript -PathType Leaf)) { throw "Identity-to-Workforce migration authority not found: $IdentityImportScript" }

function Get-RuntimeEnvironmentValue {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$DefaultValue
  )

  $processValue = [System.Environment]::GetEnvironmentVariable($Name, "Process")
  if (-not [string]::IsNullOrWhiteSpace($processValue)) { return $processValue.Trim() }

  foreach ($rawLine in Get-Content -LiteralPath $EnvFile) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }
    $parts = $line.Split("=", 2)
    if ($parts[0].Trim() -ne $Name) { continue }
    $value = $parts[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not [string]::IsNullOrWhiteSpace($value)) { return $value }
  }
  return $DefaultValue
}

$serviceMap = @{
  "identity" = @{ Directory = "core/identity/database/migrations"; User = (Get-RuntimeEnvironmentValue "BTHWANI_IDENTITY_DB_USER" "identity_runtime"); Database = (Get-RuntimeEnvironmentValue "BTHWANI_IDENTITY_DB_NAME" "identity_runtime") }
  "workforce" = @{ Directory = "core/workforce/database/migrations"; User = (Get-RuntimeEnvironmentValue "BTHWANI_WORKFORCE_DB_USER" "workforce_runtime"); Database = (Get-RuntimeEnvironmentValue "BTHWANI_WORKFORCE_DB_NAME" "workforce_runtime") }
  "dsh" = @{ Directory = "services/dsh/database/migrations"; User = (Get-RuntimeEnvironmentValue "BTHWANI_DSH_DB_USER" "dsh_runtime"); Database = (Get-RuntimeEnvironmentValue "BTHWANI_DSH_DB_NAME" "dsh_runtime") }
  "wlt" = @{ Directory = "services/wlt/database/migrations"; User = (Get-RuntimeEnvironmentValue "BTHWANI_WLT_DB_USER" "wlt_runtime"); Database = (Get-RuntimeEnvironmentValue "BTHWANI_WLT_DB_NAME" "wlt_runtime") }
  "providers" = @{ Directory = "core/providers/database/migrations"; User = (Get-RuntimeEnvironmentValue "BTHWANI_PROVIDERS_DB_USER" "providers_runtime"); Database = (Get-RuntimeEnvironmentValue "BTHWANI_PROVIDERS_DB_NAME" "providers_runtime") }
  "platform-control" = @{ Directory = "core/platform-control/database/migrations"; User = (Get-RuntimeEnvironmentValue "BTHWANI_PLATFORM_CONTROL_DB_USER" "platform_control_runtime"); Database = (Get-RuntimeEnvironmentValue "BTHWANI_PLATFORM_CONTROL_DB_NAME" "platform_control_runtime") }
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

$SourceCommitProvenancePath = Join-Path $RepoRoot "tools/scripts/lib/source-commit-provenance.ps1"
if (-not (Test-Path -LiteralPath $SourceCommitProvenancePath -PathType Leaf)) {
  throw "Checked-out source commit resolver not found: $SourceCommitProvenancePath"
}
. $SourceCommitProvenancePath
$SourceCommitSha = Resolve-BthwaniCheckedOutSourceCommitSha -RepoRoot $RepoRoot -ExpectedSourceCommitSha $SourceCommitSha

. (Join-Path $ScriptDir "schema-migration-runner.ps1")
. (Join-Path $ScriptDir "workforce-migration-input-handoff.ps1")

# Destructive local ledger recovery is authorized only by the canonical
# bootstrap-dev action. There is no ambient environment-variable escape hatch:
# callers outside that lifecycle must fail closed on a ledger conflict.
function Test-LocalDatabaseResetAllowed {
  $environmentValues = @($env:NODE_ENV, $env:ENVIRONMENT, $env:BTHWANI_ENVIRONMENT) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    ForEach-Object { $_.Trim().ToLowerInvariant() }
  if ($environmentValues -contains "production") { return $false }
  return [bool]$AllowLocalLedgerRecovery
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
    if (-not (Test-LocalDatabaseResetAllowed)) {
      throw [System.InvalidOperationException]::new(
        "Migration ledger conflict for '$Service' is recoverable, but this phase holds no local recovery permission. " +
        "Run 'pnpm run runtime:full:bootstrap-dev', which passes -AllowLocalLedgerRecovery explicitly. " +
        "Original failure:`n$failureText",
        $migrationFailure.Exception)
    }

    Write-Warning "Governed migration drift detected for local service '$Service'; resetting only its runtime database before replaying canonical migrations."
    & $ResetScript `
      -Service $Service `
      -ComposeFile $ComposeFile `
      -EnvFile $EnvFile `
      -Reason "governed migration ledger conflict" `
      -AllowLocalDevelopmentReset

    # The reset primitive never restarts the service. Canonical migrations must
    # converge first; the runtime orchestrator starts/restarts APIs afterwards.
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
