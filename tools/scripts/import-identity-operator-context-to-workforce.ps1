<#
.SYNOPSIS
  Loads a verified Identity actor-to-operator-context snapshot for Workforce-020.

.DESCRIPTION
  Reads only identity_actors.id and identity_actors.operator_context_id from the
  canonical Identity database, validates complete deterministic coverage, and
  stages the snapshot in the Workforce database. Workforce-020 consumes this
  staging table inside its governed transaction and drops it after recording the
  migration proof. No Workforce payload, assignment, environment, or fallback
  value is consulted.
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

  [string]$IdentityDatabaseName = "identity_runtime",

  [string]$WorkforceDatabaseName = "workforce_runtime"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SourceCommitSha = $SourceCommitSha.ToLowerInvariant()

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
} else {
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql is required to import the Identity operator-context snapshot.'
  }
  if ([string]::IsNullOrWhiteSpace($IdentityDatabaseUrl) -or [string]::IsNullOrWhiteSpace($WorkforceDatabaseUrl)) {
    throw 'IdentityDatabaseUrl and WorkforceDatabaseUrl are required for direct PostgreSQL import.'
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
    $arguments = @(
      'compose', '--env-file', $EnvFile, '-f', $ComposeFile,
      'exec', '-T', 'postgres', 'psql',
      '-U', $PostgresAdminUser, '-d', $databaseName, '-X', '-v', 'ON_ERROR_STOP=1'
    )
    if ($TuplesOnly) { $arguments += '-qAt' }
    elseif ($Quiet) { $arguments += '-q' }
    $output = $Sql | & docker @arguments 2>&1
  } else {
    $databaseUrl = if ($Target -eq 'identity') { $IdentityDatabaseUrl } else { $WorkforceDatabaseUrl }
    $arguments = @($databaseUrl, '-X', '-v', 'ON_ERROR_STOP=1')
    if ($TuplesOnly) { $arguments += '-qAt' }
    elseif ($Quiet) { $arguments += '-q' }
    $output = $Sql | & psql @arguments 2>&1
  }

  if ($LASTEXITCODE -ne 0) {
    throw "PostgreSQL import command failed for '$Target': $($output -join "`n")"
  }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Test-WorkforceCutoverApplied {
  $ledgerTable = Invoke-ImportDatabaseSql -Target workforce -TuplesOnly -Sql "SELECT COALESCE(to_regclass('public.schema_migrations')::text, '');"
  if ([string]::IsNullOrWhiteSpace($ledgerTable)) {
    return $false
  }
  $applied = Invoke-ImportDatabaseSql -Target workforce -TuplesOnly -Sql @"
SELECT CASE WHEN EXISTS (
  SELECT 1
  FROM schema_migrations
  WHERE service_name = 'workforce'
    AND migration_id = 'workforce-020_operator_context_scope_boundary.sql'
    AND success = true
    AND dirty = false
) THEN '1' ELSE '0' END;
"@
  return $applied.Trim() -eq '1'
}

function Remove-WorkforceImportTable {
  Invoke-ImportDatabaseSql -Target workforce -Quiet -Sql 'DROP TABLE IF EXISTS workforce_identity_operator_context_import;'
}

if (Test-WorkforceCutoverApplied) {
  Remove-WorkforceImportTable
  Write-Host 'Identity operator-context staging: SKIP workforce-020 is already applied; residual staging was removed.'
  return
}

function ConvertTo-SqlLiteral {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) {
    return 'NULL'
  }
  return "'$( $Value.Replace("'", "''") )'"
}

$identityQuery = @'
COPY (
  SELECT row_to_json(actor_row)
  FROM (
    SELECT id::text AS actor_id, operator_context_id::text AS operator_context_id
    FROM identity_actors
    ORDER BY id
  ) actor_row
) TO STDOUT
'@

$identityOutput = Invoke-ImportDatabaseSql -Target identity -TuplesOnly -Sql $identityQuery

$records = @(
  foreach ($line in $identityOutput) {
    if ([string]::IsNullOrWhiteSpace([string]$line)) {
      continue
    }
    try {
      $line | ConvertFrom-Json
    } catch {
      throw "Identity snapshot returned a non-JSON row."
    }
  }
)

if ($records.Count -eq 0) {
  throw 'Identity snapshot contains no actors; refusing an empty authoritative cutover.'
}

$normalized = @(
  $records | ForEach-Object {
    $actorId = [string]$_.actor_id
    $contextId = [string]$_.operator_context_id
    if ([string]::IsNullOrWhiteSpace($actorId) -or [string]::IsNullOrWhiteSpace($contextId)) {
      throw 'Identity snapshot contains a blank actor or operator context; refusing to guess.'
    }
    [pscustomobject]@{
      actor_id = $actorId
      operator_context_id = $contextId
    }
  } | Sort-Object actor_id
)

$duplicateActor = @($normalized | Group-Object actor_id | Where-Object Count -gt 1)
if ($duplicateActor.Count -gt 0) {
  throw 'Identity snapshot contains duplicate actor identifiers.'
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
$values = @(
  $normalized | ForEach-Object {
    $actorLiteral = ConvertTo-SqlLiteral $_.actor_id
    $contextLiteral = ConvertTo-SqlLiteral $_.operator_context_id
    $commitLiteral = ConvertTo-SqlLiteral $SourceCommitSha
    "($actorLiteral, $contextLiteral, $commitLiteral, $rowCount, '$checksum', now())"
  }
)

$workforceSql = @"
BEGIN;
CREATE TABLE IF NOT EXISTS workforce_identity_operator_context_import (
  actor_id text PRIMARY KEY,
  operator_context_id text NOT NULL CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL),
  source_commit_sha text NOT NULL CHECK (source_commit_sha ~ '^[0-9a-f]{40}$'),
  source_row_count integer NOT NULL CHECK (source_row_count > 0),
  source_checksum_md5 text NOT NULL CHECK (source_checksum_md5 ~ '^[0-9a-f]{32}$'),
  imported_at timestamptz NOT NULL DEFAULT now()
);
DELETE FROM workforce_identity_operator_context_import;
INSERT INTO workforce_identity_operator_context_import(
  actor_id, operator_context_id, source_commit_sha, source_row_count,
  source_checksum_md5, imported_at
) VALUES
$($values -join ",`n");
COMMIT;
"@

$null = Invoke-ImportDatabaseSql -Target workforce -Sql $workforceSql

Write-Host "Identity operator-context staging: PASS actors=$rowCount checksum=$checksum source=$SourceCommitSha"
