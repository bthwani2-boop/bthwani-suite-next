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
  [Parameter(Mandatory = $true)]
  [string]$IdentityDatabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$WorkforceDatabaseUrl,

  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[0-9a-fA-F]{40}$')]
  [string]$SourceCommitSha
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw 'psql is required to import the Identity operator-context snapshot.'
}

$SourceCommitSha = $SourceCommitSha.ToLowerInvariant()

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

$identityOutput = $identityQuery | & psql $IdentityDatabaseUrl '-X' '-qAt' '-v' 'ON_ERROR_STOP=1' 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Identity snapshot query failed: $($identityOutput -join "`n")"
}

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

$workforceOutput = $workforceSql | & psql $WorkforceDatabaseUrl '-X' '-v' 'ON_ERROR_STOP=1' 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "Workforce operator-context staging failed: $($workforceOutput -join "`n")"
}

Write-Host "Identity operator-context staging: PASS actors=$rowCount checksum=$checksum source=$SourceCommitSha"
