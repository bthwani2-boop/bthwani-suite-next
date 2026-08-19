<#
.SYNOPSIS
  Applies one service's PostgreSQL migrations through the governed schema_migrations runner.

.DESCRIPTION
  This script preserves the generic service-migration CLI for local and CI callers,
  but it no longer owns a separate ledger or SQL application engine. All ordering,
  checksum, dirty-state, amendment, and legacy-ledger import behavior is delegated
  to infra/docker/scripts/schema-migration-runner.ps1.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[a-z0-9][a-z0-9-]*$")]
  [string]$ServiceKey,

  [Parameter(Mandatory = $true)]
  [string]$MigrationDirectory,

  [string]$DatabaseUrl = $env:DATABASE_URL,

  [ValidateRange(1, 600)]
  [int]$LockTimeoutSeconds = 30,

  [ValidateRange(1, 120)]
  [int]$StatementTimeoutMinutes = 15,

  [string]$SourceCommitSha = "",

  [string]$IdentityDatabaseUrl = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$MigrationPath = if ([System.IO.Path]::IsPathRooted($MigrationDirectory)) {
  $MigrationDirectory
} else {
  Join-Path $RepoRoot $MigrationDirectory
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DatabaseUrl is required."
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required to apply service migrations."
}
if (-not (Test-Path -LiteralPath $MigrationPath -PathType Container)) {
  throw "Migration directory not found: $MigrationPath"
}

$MigrationFiles = @(Get-ChildItem -LiteralPath $MigrationPath -File -Filter "*.sql" | Sort-Object Name)
if ($MigrationFiles.Count -eq 0) {
  throw "No SQL migrations found for service '$ServiceKey' in $MigrationPath"
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

. (Join-Path $RepoRoot "infra/docker/scripts/schema-migration-runner.ps1")

function Invoke-DatabaseSql {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$Quiet
  )

  # Workforce-020 consumes two migration-input relations from the dedicated
  # migration namespace. Public remains first so every ordinary unqualified
  # CREATE/ALTER/SELECT in governed migrations continues to own public service
  # schema; the input schema is only a fallback for the reserved staging names.
  $sqlToExecute = if ($ServiceKey -eq 'workforce') {
    "SET search_path TO public, bthwani_migration_input;`n$Sql"
  } else {
    $Sql
  }

  $arguments = @(
    $DatabaseUrl,
    "-X",
    "-v", "ON_ERROR_STOP=1",
    "-v", "bthwani_lock_timeout_seconds=$LockTimeoutSeconds",
    "-v", "bthwani_statement_timeout_minutes=$StatementTimeoutMinutes"
  )
  if ($Quiet) { $arguments += "-q" }

  $output = $sqlToExecute | & psql @arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
    throw "PostgreSQL governed migration command failed for service '$ServiceKey' (exit $exitCode).`n$message"
  }

  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

$executeBatch = {
  param([string]$Sql)
  Invoke-DatabaseSql -Sql $Sql
}
$executeStatement = {
  param([string]$Sql)
  Invoke-DatabaseSql -Sql $Sql -Quiet
}

function Invoke-WorkforceIdentityImport {
  if ($ServiceKey -ne 'workforce') { return }

  # The import script is the single owner of Workforce-020 scope discovery and
  # already-applied detection. A fresh database has no schema_migrations table
  # yet, so probing that ledger here created a second, order-sensitive authority
  # and failed before the canonical runner could create it.
  $importScript = Join-Path $RepoRoot 'tools/scripts/import-identity-operator-context-to-workforce.ps1'
  if (-not (Test-Path -LiteralPath $importScript -PathType Leaf)) {
    throw "Identity-to-Workforce migration authority not found: $importScript"
  }
  & $importScript `
    -IdentityDatabaseUrl $IdentityDatabaseUrl `
    -WorkforceDatabaseUrl $DatabaseUrl `
    -SourceCommitSha $SourceCommitSha
}

try {
  Invoke-WorkforceIdentityImport
  Invoke-BthwaniGovernedMigrations `
    -ServiceName $ServiceKey `
    -MigrationFiles $MigrationFiles `
    -SourceCommitSha $SourceCommitSha `
    -ExecuteBatch $executeBatch `
    -ExecuteStatement $executeStatement
} finally {
  if ($ServiceKey -eq 'workforce') {
    Invoke-DatabaseSql -Sql @'
DROP TABLE IF EXISTS public.workforce_identity_operator_context_import;
DROP TABLE IF EXISTS public.workforce_identity_operator_context_import_proof;
DROP TABLE IF EXISTS bthwani_migration_input.workforce_identity_operator_context_import;
DROP TABLE IF EXISTS bthwani_migration_input.workforce_identity_operator_context_import_proof;
'@ -Quiet | Out-Null
  }
}

Write-Host "Governed service migrations: PASS service=$ServiceKey files=$($MigrationFiles.Count) sha=$SourceCommitSha"