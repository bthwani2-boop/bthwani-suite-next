<#
.SYNOPSIS
  Applies one service's PostgreSQL migrations through an immutable checksum ledger.

.DESCRIPTION
  Discovers migrations deterministically, rejects duplicate identifiers and
  transaction-incompatible SQL, serializes concurrent runners through the ledger
  table, applies each migration atomically, and verifies the recorded checksum.
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
  [int]$StatementTimeoutMinutes = 15
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

function ConvertTo-SqlLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)
  return $Value.Replace("'", "''")
}

function Invoke-DatabaseSql {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$TuplesOnly,
    [switch]$SingleTransaction
  )

  $arguments = @($DatabaseUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1")
  if ($TuplesOnly) { $arguments += "-tA" }
  if ($SingleTransaction) { $arguments += "--single-transaction" }

  $output = $Sql | & psql @arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
    throw "PostgreSQL migration command failed for service '$ServiceKey' (exit $exitCode).`n$message"
  }

  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Get-OrderedMigrationFiles {
  $files = @(Get-ChildItem -LiteralPath $MigrationPath -File -Filter "*.sql" |
    Sort-Object { $_.Name.ToLowerInvariant() }, Name)
  if ($files.Count -eq 0) {
    throw "No SQL migrations found for service '$ServiceKey' in $MigrationPath"
  }

  $duplicateNames = $files |
    Group-Object { $_.Name.ToLowerInvariant() } |
    Where-Object Count -gt 1
  if ($duplicateNames) {
    throw "Duplicate migration filenames detected for '$ServiceKey': $($duplicateNames.Name -join ', ')"
  }

  $seenIdentifiers = @{}
  foreach ($file in $files) {
    if ($file.Length -eq 0) {
      throw "Migration is empty: $($file.Name)"
    }

    $identifierMatch = [regex]::Match(
      $file.BaseName,
      "(?i)(?:^|[-_])(?<id>[0-9]{3,}[a-z]?)(?:[-_]|$)"
    )
    if ($identifierMatch.Success) {
      $identifier = $identifierMatch.Groups["id"].Value.ToLowerInvariant()
      if ($seenIdentifiers.ContainsKey($identifier)) {
        throw "Duplicate migration identifier '$identifier' for '$ServiceKey': $($seenIdentifiers[$identifier]) and $($file.Name)"
      }
      $seenIdentifiers[$identifier] = $file.Name
    }

    $content = Get-Content -Raw -LiteralPath $file.FullName
    $forbiddenPatterns = @(
      @{ Pattern = "(?im)^\s*CREATE\s+(?:UNIQUE\s+)?INDEX\s+CONCURRENTLY\b"; Reason = "CREATE INDEX CONCURRENTLY requires a separately governed online migration" },
      @{ Pattern = "(?im)^\s*REINDEX\s+.*\s+CONCURRENTLY\b"; Reason = "REINDEX CONCURRENTLY cannot run inside the required atomic transaction" },
      @{ Pattern = "(?im)^\s*VACUUM\b"; Reason = "VACUUM cannot run inside the required atomic transaction" },
      @{ Pattern = "(?im)^\s*(?:BEGIN|COMMIT|ROLLBACK)\s*;"; Reason = "the canonical runner owns the transaction boundary" },
      @{ Pattern = "(?im)^\s*(?:CREATE|DROP)\s+DATABASE\b"; Reason = "database lifecycle changes are outside service migration authority" },
      @{ Pattern = "(?im)^\s*ALTER\s+SYSTEM\b"; Reason = "cluster configuration is outside service migration authority" }
    )
    foreach ($rule in $forbiddenPatterns) {
      if ($content -match $rule.Pattern) {
        throw "Migration $($file.Name) is not atomic: $($rule.Reason)."
      }
    }
  }

  return $files
}

function Initialize-MigrationLedger {
  Invoke-DatabaseSql -Sql @"
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT        PRIMARY KEY,
  checksum       TEXT        NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@ | Out-Null
}

$files = Get-OrderedMigrationFiles
Initialize-MigrationLedger

Write-Host "Applying canonical $ServiceKey migrations from $MigrationDirectory"
foreach ($file in $files) {
  $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $nameSql = ConvertTo-SqlLiteral $file.Name
  $recorded = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$nameSql';"

  if ($recorded -eq $checksum) {
    Write-Host "  Skipping (already applied): $($file.Name)"
    continue
  }
  if (-not [string]::IsNullOrWhiteSpace($recorded)) {
    throw "Migration checksum mismatch for $($file.Name): recorded=$recorded current=$checksum. Applied migrations are immutable; add a new migration."
  }

  $migrationSql = Get-Content -Raw -LiteralPath $file.FullName
  $payload = @"
SET LOCAL lock_timeout = '${LockTimeoutSeconds}s';
SET LOCAL statement_timeout = '${StatementTimeoutMinutes}min';
LOCK TABLE runtime_schema_migrations IN EXCLUSIVE MODE;

SELECT CASE
  WHEN EXISTS (
    SELECT 1
    FROM runtime_schema_migrations
    WHERE migration_name = '$nameSql' AND checksum <> '$checksum'
  ) THEN 'true'
  ELSE 'false'
END AS checksum_mismatch \gset

\if :checksum_mismatch
\echo 'ERROR: immutable migration checksum mismatch for $nameSql'
\quit 3
\endif

SELECT CASE
  WHEN EXISTS (SELECT 1 FROM runtime_schema_migrations WHERE migration_name = '$nameSql')
    THEN 'false'
  ELSE 'true'
END AS apply_migration \gset

\if :apply_migration
$migrationSql

INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$nameSql', '$checksum');
\endif
"@

  Write-Host "  Applying atomically: $($file.Name)"
  Invoke-DatabaseSql -Sql $payload -SingleTransaction | Out-Null

  $verified = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$nameSql';"
  if ($verified -ne $checksum) {
    throw "Migration ledger verification failed for $($file.Name)."
  }
  Write-Host "  $($file.Name): PASS"
}

Write-Host "$ServiceKey migrations: PASS ($($files.Count) files)"
