<#
.SYNOPSIS
  Stages the exact Identity operator-context mapping required by Workforce-020.

.DESCRIPTION
  The migration scope is owned by Workforce: only actor ids already present in
  workforce_people need an Identity mapping. A fresh Workforce database therefore
  has a valid empty source scope; that state is represented by a separate proof
  row instead of fabricating an actor merely to make the migration non-empty.

  Migration inputs live in the dedicated bthwani_migration_input schema rather
  than public.workforce_* so the governed runner can continue treating every
  public Workforce table without a ledger as untracked legacy schema. The
  Workforce database owner creates and owns these inputs; Identity is read through
  the configured administrative connection only because the runtime databases are
  separate. This keeps staging ownership identical to the migration executor.

  Whenever Workforce has actors, every one must resolve to exactly one non-blank
  operator_context_id in the canonical Identity database or the cutover fails
  closed. No Workforce payload, assignment, environment value, default context,
  local bootstrap side effect, or fallback may supply the mapping.
#>

[CmdletBinding()]
param(
  [string]$IdentityDatabaseUrl = "",

  [string]$WorkforceDatabaseUrl = "",

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$SourceCommitSha,

  [switch]$UseDockerCompose,

  [string]$ComposeFile = "",

  [string]$EnvFile = "",

  [string]$PostgresAdminUser = "bthwani_runtime",

  [string]$WorkforceDatabaseUser = "workforce_runtime",

  [string]$IdentityDatabaseName = "identity_runtime",

  [string]$WorkforceDatabaseName = "workforce_runtime"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SourceCommitSha = $SourceCommitSha.ToLowerInvariant()
$MigrationInputSchema = 'bthwani_migration_input'

if ($UseDockerCompose) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw 'docker is required for compose-backed Identity operator-context import.'
  }
  if ([string]::IsNullOrWhiteSpace($ComposeFile) -or -not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) {
    throw "Compose file is required for compose-backed Identity operator-context import: $ComposeFile"
  }
  if ([string]::IsNullOrWhiteSpace($EnvFile) -or -not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw "Environment file is required for compose-backed Identity operator-context import: $EnvFile"
  }
  if ([string]::IsNullOrWhiteSpace($PostgresAdminUser) -or [string]::IsNullOrWhiteSpace($WorkforceDatabaseUser)) {
    throw 'Compose-backed Identity import requires both PostgresAdminUser and WorkforceDatabaseUser.'
  }
} else {
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql is required to import the Identity operator-context snapshot.'
  }
  if ([string]::IsNullOrWhiteSpace($WorkforceDatabaseUrl)) {
    throw 'WorkforceDatabaseUrl is required for direct PostgreSQL import.'
  }
}

function Invoke-ImportDatabaseSql {
  param(
    [Parameter(Mandatory = $true)][ValidateSet('identity', 'workforce')][string]$Target,
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$TuplesOnly,
    [switch]$Quiet
  )

  if ($UseDockerCompose) {
    $databaseName = if ($Target -eq 'identity') { $IdentityDatabaseName } else { $WorkforceDatabaseName }
    $databaseUser = if ($Target -eq 'identity') { $PostgresAdminUser } else { $WorkforceDatabaseUser }
    $arguments = @(
      'compose', '--env-file', $EnvFile, '-f', $ComposeFile,
      'exec', '-T', 'postgres', 'psql',
      '-U', $databaseUser, '-d', $databaseName, '-X', '-v', 'ON_ERROR_STOP=1'
    )
    if ($TuplesOnly) { $arguments += '-qAt' }
    elseif ($Quiet) { $arguments += '-q' }
    $output = @($Sql | & docker @arguments 2>&1)
  } else {
    $databaseUrl = if ($Target -eq 'identity') { $IdentityDatabaseUrl } else { $WorkforceDatabaseUrl }
    if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
      throw "Database URL for '$Target' is required by the non-empty migration scope."
    }
    $arguments = @($databaseUrl, '-X', '-v', 'ON_ERROR_STOP=1')
    if ($TuplesOnly) { $arguments += '-qAt' }
    elseif ($Quiet) { $arguments += '-q' }
    $output = @($Sql | & psql @arguments 2>&1)
  }

  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL import command failed for '$Target': $($output -join "`n")"
  }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Invoke-ComposeWorkforceAdminSql {
  param([Parameter(Mandatory = $true)][string]$Sql)

  if (-not $UseDockerCompose) {
    throw 'Compose Workforce admin SQL is only available in compose mode.'
  }
  $arguments = @(
    'compose', '--env-file', $EnvFile, '-f', $ComposeFile,
    'exec', '-T', 'postgres', 'psql',
    '-U', $PostgresAdminUser, '-d', $WorkforceDatabaseName,
    '-X', '-q', '-v', 'ON_ERROR_STOP=1'
  )
  $output = @($Sql | & docker @arguments 2>&1)
  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL legacy staging cleanup failed for Workforce: $($output -join "`n")"
  }
}

function ConvertTo-SqlLiteral {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return 'NULL' }
  return "'$( $Value.Replace("'", "''") )'"
}

function Test-WorkforceCutoverApplied {
  $ledgerExists = Invoke-ImportDatabaseSql -Target workforce -TuplesOnly -Sql @'
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'schema_migrations'
    AND c.relkind IN ('r','p')
) THEN '1' ELSE '0' END;
'@
  if ($ledgerExists.Trim() -ne '1') { return $false }

  $applied = Invoke-ImportDatabaseSql -Target workforce -TuplesOnly -Sql @"
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM public.schema_migrations
  WHERE service_name = 'workforce'
    AND migration_id = 'workforce-020_operator_context_scope_boundary.sql'
    AND success = true
    AND dirty = false
) THEN '1' ELSE '0' END;
"@
  return $applied.Trim() -eq '1'
}

function Reset-WorkforceImportState {
  # The pre-release implementation placed staging in public and, in compose
  # mode, created it as the PostgreSQL admin. Clean that exact obsolete state
  # with the admin before the Workforce owner recreates the dedicated namespace.
  $cleanupSql = @"
DROP TABLE IF EXISTS public.workforce_identity_operator_context_import;
DROP TABLE IF EXISTS public.workforce_identity_operator_context_import_proof;
DROP TABLE IF EXISTS $MigrationInputSchema.workforce_identity_operator_context_import;
DROP TABLE IF EXISTS $MigrationInputSchema.workforce_identity_operator_context_import_proof;
DROP SCHEMA IF EXISTS $MigrationInputSchema;
"@
  if ($UseDockerCompose) {
    Invoke-ComposeWorkforceAdminSql -Sql $cleanupSql
  } else {
    Invoke-ImportDatabaseSql -Target workforce -Quiet -Sql $cleanupSql | Out-Null
  }

  Invoke-ImportDatabaseSql -Target workforce -Quiet -Sql "CREATE SCHEMA $MigrationInputSchema;" | Out-Null
}

function Get-RequiredWorkforceActorIds {
  $peopleTableExists = Invoke-ImportDatabaseSql -Target workforce -TuplesOnly -Sql @'
SELECT CASE WHEN to_regclass('public.workforce_people') IS NULL THEN '0' ELSE '1' END;
'@
  if ($peopleTableExists.Trim() -ne '1') { return @() }

  $output = Invoke-ImportDatabaseSql -Target workforce -TuplesOnly -Sql @'
COPY (
  SELECT DISTINCT actor_id::text
  FROM public.workforce_people
  WHERE NULLIF(BTRIM(actor_id), '') IS NOT NULL
  ORDER BY actor_id
) TO STDOUT;
'@
  if ([string]::IsNullOrWhiteSpace($output)) { return @() }
  return @($output -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
}

if (Test-WorkforceCutoverApplied) {
  Reset-WorkforceImportState
  Write-Host 'Identity operator-context staging: SKIP workforce-020 is already applied; residual staging was removed.'
  return
}

Reset-WorkforceImportState

$requiredActorIds = @(Get-RequiredWorkforceActorIds)
$normalized = @()

if ($requiredActorIds.Count -gt 0) {
  if (-not $UseDockerCompose -and [string]::IsNullOrWhiteSpace($IdentityDatabaseUrl)) {
    throw 'IdentityDatabaseUrl is required because Workforce contains actors that must be authoritatively bound.'
  }

  $actorLiterals = @($requiredActorIds | ForEach-Object { ConvertTo-SqlLiteral $_ })
  $identityQuery = @"
COPY (
  SELECT row_to_json(actor_row)
  FROM (
    SELECT id::text AS actor_id, operator_context_id::text AS operator_context_id
    FROM public.identity_actors
    WHERE id = ANY(ARRAY[$($actorLiterals -join ',')]::text[])
    ORDER BY id
  ) actor_row
) TO STDOUT;
"@
  $identityOutput = Invoke-ImportDatabaseSql -Target identity -TuplesOnly -Sql $identityQuery
  $records = @()
  if (-not [string]::IsNullOrWhiteSpace($identityOutput)) {
    $records = @(
      $identityOutput -split "`r?`n" | ForEach-Object {
        $line = [string]$_
        if ([string]::IsNullOrWhiteSpace($line)) { return }
        try { $line | ConvertFrom-Json }
        catch { throw 'Identity snapshot returned a non-JSON row.' }
      }
    )
  }

  $normalized = @(
    $records | ForEach-Object {
      $actorId = [string]$_.actor_id
      $contextId = [string]$_.operator_context_id
      if ([string]::IsNullOrWhiteSpace($actorId) -or [string]::IsNullOrWhiteSpace($contextId)) {
        throw 'Identity snapshot contains a blank actor or operator context; refusing to guess.'
      }
      [pscustomobject]@{ actor_id = $actorId; operator_context_id = $contextId }
    } | Sort-Object actor_id
  )

  $duplicateActor = @($normalized | Group-Object actor_id | Where-Object Count -gt 1)
  if ($duplicateActor.Count -gt 0) {
    throw 'Identity snapshot contains duplicate actor identifiers.'
  }

  $resolvedIds = @($normalized | ForEach-Object { $_.actor_id })
  $missingIds = @($requiredActorIds | Where-Object { $resolvedIds -notcontains $_ })
  $unexpectedIds = @($resolvedIds | Where-Object { $requiredActorIds -notcontains $_ })
  if ($missingIds.Count -gt 0 -or $unexpectedIds.Count -gt 0 -or $normalized.Count -ne $requiredActorIds.Count) {
    throw "Identity snapshot does not exactly cover Workforce actors: missing=[$($missingIds -join ',')] unexpected=[$($unexpectedIds -join ',')]."
  }
}

$canonicalLines = @($normalized | ForEach-Object { "$($_.actor_id):$($_.operator_context_id)" })
$canonicalSnapshot = $canonicalLines -join "`n"
$md5 = [System.Security.Cryptography.MD5]::Create()
try {
  $checksum = -join ($md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($canonicalSnapshot)) | ForEach-Object { $_.ToString('x2') })
} finally {
  $md5.Dispose()
}

$rowCount = $normalized.Count
$commitLiteral = ConvertTo-SqlLiteral $SourceCommitSha
$mappingTable = "$MigrationInputSchema.workforce_identity_operator_context_import"
$proofTable = "$MigrationInputSchema.workforce_identity_operator_context_import_proof"
$values = @(
  $normalized | ForEach-Object {
    $actorLiteral = ConvertTo-SqlLiteral $_.actor_id
    $contextLiteral = ConvertTo-SqlLiteral $_.operator_context_id
    "($actorLiteral, $contextLiteral, $commitLiteral, $rowCount, '$checksum', now())"
  }
)

$mappingInsert = ''
if ($values.Count -gt 0) {
  $mappingInsert = @"
INSERT INTO $mappingTable(
  actor_id, operator_context_id, source_commit_sha, source_row_count,
  source_checksum_md5, imported_at
) VALUES
$($values -join ",`n");
"@
}

$workforceSql = @"
BEGIN;
CREATE TABLE $mappingTable (
  actor_id text PRIMARY KEY,
  operator_context_id text NOT NULL CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL),
  source_commit_sha text NOT NULL CHECK (source_commit_sha ~ '^[0-9a-f]{40}$'),
  source_row_count integer NOT NULL CHECK (source_row_count > 0),
  source_checksum_md5 text NOT NULL CHECK (source_checksum_md5 ~ '^[0-9a-f]{32}$'),
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE $proofTable (
  proof_id boolean PRIMARY KEY DEFAULT true CHECK (proof_id),
  source_commit_sha text NOT NULL CHECK (source_commit_sha ~ '^[0-9a-f]{40}$'),
  source_row_count integer NOT NULL CHECK (source_row_count >= 0),
  source_checksum_md5 text NOT NULL CHECK (source_checksum_md5 ~ '^[0-9a-f]{32}$'),
  imported_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO $proofTable(
  proof_id, source_commit_sha, source_row_count, source_checksum_md5, imported_at
) VALUES (true, $commitLiteral, $rowCount, '$checksum', now());
$mappingInsert
COMMIT;
"@

$null = Invoke-ImportDatabaseSql -Target workforce -Sql $workforceSql
Write-Host "Identity operator-context staging: PASS requiredActors=$rowCount checksum=$checksum source=$SourceCommitSha schema=$MigrationInputSchema"