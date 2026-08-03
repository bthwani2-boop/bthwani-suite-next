Set-StrictMode -Version Latest

function ConvertTo-BthwaniSqlLiteral {
  param([AllowEmptyString()][string]$Value)
  return "'" + $Value.Replace("'", "''") + "'"
}

function Get-BthwaniSha256Hex {
  param([Parameter(Mandatory = $true)][byte[]]$Bytes)

  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($algorithm.ComputeHash($Bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
  }
}

function Get-BthwaniPortableSqlChecksums {
  param([Parameter(Mandatory = $true)][System.IO.FileInfo]$File)

  $rawBytes = [System.IO.File]::ReadAllBytes($File.FullName)
  $text = [System.Text.Encoding]::UTF8.GetString($rawBytes)
  $lfText = $text -replace "`r`n?", "`n"
  $crlfText = $lfText -replace "`n", "`r`n"
  $lfBytes = [System.Text.Encoding]::UTF8.GetBytes($lfText)
  $digests = @(
    Get-BthwaniSha256Hex -Bytes $rawBytes
    Get-BthwaniSha256Hex -Bytes $lfBytes
    Get-BthwaniSha256Hex -Bytes ([System.Text.Encoding]::UTF8.GetBytes($crlfText))
  ) | Select-Object -Unique

  return @{
    Canonical = Get-BthwaniSha256Hex -Bytes $lfBytes
    Accepted = @($digests)
  }
}

function Get-BthwaniAuthorizedHistoricalChecksums {
  param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
    [Parameter(Mandatory = $true)][System.IO.FileInfo]$File,
    [Parameter(Mandatory = $true)][string[]]$CurrentPortableChecksums
  )

  $repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
  $amendmentsPath = Join-Path $repositoryRoot 'governance/contracts/migration-amendments.json'
  if (-not (Test-Path -LiteralPath $amendmentsPath -PathType Leaf)) {
    return @()
  }

  $document = Get-Content -LiteralPath $amendmentsPath -Raw | ConvertFrom-Json
  $matches = @($document.amendments | Where-Object {
    $_.service -eq $ServiceName -and $_.migrationId -eq $File.Name
  })
  if ($matches.Count -gt 1) {
    throw "Duplicate migration amendment for $ServiceName/$($File.Name)."
  }
  if ($matches.Count -eq 0) {
    return @()
  }

  $amendment = $matches[0]
  if ($amendment.classification -ne 'PRE_RELEASE_UNAPPLIED_CORRECTION' -or
      $amendment.evidence.productionApprovalEvidence -ne $false) {
    throw "Unauthorized migration amendment for $ServiceName/$($File.Name)."
  }
  $replacementProperty = $amendment.PSObject.Properties['replacementSha256']
  if ($null -eq $replacementProperty -or [string]::IsNullOrWhiteSpace($replacementProperty.Value)) {
    return @()
  }
  $replacementSha256 = [string]$replacementProperty.Value
  if ($CurrentPortableChecksums -notcontains $replacementSha256) {
    throw "Migration amendment replacement digest does not match $ServiceName/$($File.Name)."
  }

  $manifestPath = Join-Path $File.DirectoryName 'manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Migration amendment requires manifest.json for $ServiceName/$($File.Name)."
  }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $entries = @($manifest.migrations | Where-Object { $_.file -eq $File.Name })
  if ($entries.Count -ne 1 -or $entries[0].sha256 -notmatch '^[a-f0-9]{64}$') {
    throw "Migration amendment has no unique historical manifest digest for $ServiceName/$($File.Name)."
  }

  $authorizedChecksums = @([string]$entries[0].sha256)
  $historicalProperty = $amendment.PSObject.Properties['acceptedHistoricalSha256']
  if ($null -ne $historicalProperty) {
    foreach ($historicalChecksum in @($historicalProperty.Value)) {
      if ([string]$historicalChecksum -notmatch '^[a-f0-9]{64}$') {
        throw "Migration amendment has an invalid historical digest for $ServiceName/$($File.Name)."
      }
      $authorizedChecksums += [string]$historicalChecksum
    }
  }

  return @($authorizedChecksums | Select-Object -Unique)
}

function Remove-BthwaniLeadingSqlTrivia {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Sql)

  $remaining = $Sql.TrimStart([char]0xFEFF)
  while ($true) {
    $remaining = $remaining.TrimStart()
    if ($remaining.StartsWith("--", [System.StringComparison]::Ordinal)) {
      $newline = $remaining.IndexOf("`n", [System.StringComparison]::Ordinal)
      if ($newline -lt 0) {
        return ""
      }
      $remaining = $remaining.Substring($newline + 1)
      continue
    }
    if ($remaining.StartsWith("/*", [System.StringComparison]::Ordinal)) {
      $commentEnd = $remaining.IndexOf("*/", 2, [System.StringComparison]::Ordinal)
      if ($commentEnd -lt 0) {
        throw "Unterminated SQL block comment before the first statement."
      }
      $remaining = $remaining.Substring($commentEnd + 2)
      continue
    }
    return $remaining
  }
}

function New-BthwaniGovernedMigrationBatch {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
    [Parameter(Mandatory = $true)][System.IO.FileInfo[]]$MigrationFiles,
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$SourceCommitSha
  )

  if ($MigrationFiles.Count -eq 0) {
    throw "No migrations supplied for service '$ServiceName'."
  }

  $orderedFiles = @($MigrationFiles | Sort-Object Name)
  $seenNames = @{}
  foreach ($file in $orderedFiles) {
    if ($file.Name -notmatch '^[a-z0-9][a-z0-9._-]*\.sql$') {
      throw "Invalid migration filename '$($file.Name)'."
    }
    if ($seenNames.ContainsKey($file.Name)) {
      throw "Duplicate migration filename '$($file.Name)'."
    }
    $seenNames[$file.Name] = $true
  }

  $serviceLiteral = ConvertTo-BthwaniSqlLiteral $ServiceName
  $sourceLiteral = ConvertTo-BthwaniSqlLiteral $SourceCommitSha
  $lockNameLiteral = ConvertTo-BthwaniSqlLiteral "bthwani:schema-migrations:$ServiceName"
  $serviceTablePrefixLiteral = ConvertTo-BthwaniSqlLiteral (($ServiceName -replace '-', '_') + '_')
  $builder = [System.Text.StringBuilder]::new()

  [void]$builder.AppendLine('\set ON_ERROR_STOP on')
  [void]$builder.AppendLine(@"
CREATE TABLE IF NOT EXISTS schema_migrations (
  service_name      TEXT        NOT NULL,
  migration_id      TEXT        NOT NULL,
  checksum_sha256   TEXT        NOT NULL,
  source_commit_sha TEXT        NOT NULL,
  applied_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  execution_ms      BIGINT      NOT NULL DEFAULT 0,
  success           BOOLEAN     NOT NULL DEFAULT FALSE,
  error_code        TEXT,
  dirty             BOOLEAN     NOT NULL DEFAULT TRUE,
  PRIMARY KEY (service_name, migration_id),
  CHECK (execution_ms >= 0),
  CHECK (NOT success OR NOT dirty)
);
SELECT pg_advisory_lock(hashtextextended($lockNameLiteral, 0));

DO `$bthwani`$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE service_name = $serviceLiteral
  ) AND to_regclass('public.runtime_schema_migrations') IS NOT NULL THEN
    INSERT INTO schema_migrations (
      service_name, migration_id, checksum_sha256, source_commit_sha,
      applied_at, execution_ms, success, error_code, dirty
    )
    SELECT
      $serviceLiteral, migration_name, checksum, 'LEGACY_IMPORTED',
      applied_at, 0, TRUE, NULL, FALSE
    FROM runtime_schema_migrations
    ON CONFLICT (service_name, migration_id) DO NOTHING;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE service_name = $serviceLiteral
  ) AND to_regclass('public.runtime_schema_migrations') IS NULL AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE ($serviceTablePrefixLiteral || '%')
      AND table_name NOT IN ('schema_migrations', 'runtime_schema_migrations')
  ) THEN
    RAISE EXCEPTION 'UNTRACKED_LEGACY_SCHEMA: service % has tables but no governed migration ledger', $serviceLiteral;
  END IF;

  IF EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE service_name = $serviceLiteral AND (dirty OR NOT success)
  ) THEN
    RAISE EXCEPTION 'DIRTY_MIGRATION_STATE: service % requires an explicit governed forward recovery', $serviceLiteral;
  END IF;
END
`$bthwani`$;
"@)

  foreach ($file in $orderedFiles) {
    $content = Get-Content -LiteralPath $file.FullName -Raw
    if ($content -match '(?m)^\s*\\') {
      throw "Migration '$($file.Name)' contains psql meta-commands. Migrations must contain portable SQL only."
    }

    $transactionOff = $content -match '(?mi)^\s*--\s*bthwani:transaction=off\s*$'
    $containsTransactionControl = $content -match '(?mi)^\s*(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK)\s*;'
    $statementSql = Remove-BthwaniLeadingSqlTrivia $content
    $startsWithTransaction = $statementSql -match '(?is)^\s*(BEGIN|START\s+TRANSACTION)\s*;'
    $endsWithCommit = $content.TrimEnd().TrimEnd([char]0xFEFF) -match '(?is)COMMIT\s*;\s*$'
    $fileManagedTransaction = $startsWithTransaction -and $endsWithCommit

    if ($transactionOff -and $containsTransactionControl) {
      throw "Migration '$($file.Name)' declares transaction=off but also contains transaction control."
    }
    if ($containsTransactionControl -and -not $fileManagedTransaction) {
      $shape = "startsWithTransaction=$startsWithTransaction endsWithCommit=$endsWithCommit"
      throw "Migration '$($file.Name)' contains partial or non-envelope transaction control ($shape). A file-managed transaction must begin with BEGIN and end with COMMIT."
    }
    $runnerManagedTransaction = -not $transactionOff -and -not $fileManagedTransaction

    # SQL text is portable across LF and CRLF worktrees. Persist a canonical LF
    # digest for new applications while accepting only newline-equivalent legacy
    # digests already recorded by older Windows/POSIX runners.
    $portableChecksums = Get-BthwaniPortableSqlChecksums -File $file
    $checksum = $portableChecksums.Canonical
    $historicalChecksums = @(Get-BthwaniAuthorizedHistoricalChecksums `
      -ServiceName $ServiceName `
      -File $file `
      -CurrentPortableChecksums $portableChecksums.Accepted)
    $acceptedChecksums = @($portableChecksums.Accepted + $historicalChecksums | Select-Object -Unique)
    $migrationLiteral = ConvertTo-BthwaniSqlLiteral $file.Name
    $checksumLiteral = ConvertTo-BthwaniSqlLiteral $checksum
    $acceptedChecksumArray = "ARRAY[" + (($acceptedChecksums | ForEach-Object {
      ConvertTo-BthwaniSqlLiteral $_
    }) -join ", ") + "]::TEXT[]"

    [void]$builder.AppendLine(@"
DO `$bthwani`$
DECLARE
  existing_checksum TEXT;
  existing_dirty BOOLEAN;
  existing_success BOOLEAN;
BEGIN
  SELECT checksum_sha256, dirty, success
    INTO existing_checksum, existing_dirty, existing_success
  FROM schema_migrations
  WHERE service_name = $serviceLiteral AND migration_id = $migrationLiteral;

  IF FOUND AND NOT (existing_checksum = ANY ($acceptedChecksumArray)) THEN
    RAISE EXCEPTION 'MIGRATION_CHECKSUM_MISMATCH: %', $migrationLiteral;
  END IF;
  IF FOUND AND (existing_dirty OR NOT existing_success) THEN
    RAISE EXCEPTION 'DIRTY_MIGRATION_STATE: %', $migrationLiteral;
  END IF;
END
`$bthwani`$;

SELECT CASE WHEN EXISTS (
  SELECT 1 FROM schema_migrations
  WHERE service_name = $serviceLiteral
    AND migration_id = $migrationLiteral
    AND checksum_sha256 = ANY ($acceptedChecksumArray)
    AND success
    AND NOT dirty
) THEN 'false' ELSE 'true' END AS bthwani_apply \gset

\if :bthwani_apply
"@)

    if ($runnerManagedTransaction) {
      [void]$builder.AppendLine('BEGIN;')
    }

    [void]$builder.AppendLine(@"
INSERT INTO schema_migrations (
  service_name, migration_id, checksum_sha256, source_commit_sha,
  applied_at, execution_ms, success, error_code, dirty
) VALUES (
  $serviceLiteral, $migrationLiteral, $checksumLiteral, $sourceLiteral,
  clock_timestamp(), 0, FALSE, NULL, TRUE
);
"@)

    [void]$builder.AppendLine("-- BEGIN GOVERNED MIGRATION: $($file.Name)")
    [void]$builder.AppendLine($content.TrimEnd())
    [void]$builder.AppendLine("-- END GOVERNED MIGRATION: $($file.Name)")

    if ($runnerManagedTransaction) {
      [void]$builder.AppendLine('COMMIT;')
    }

    [void]$builder.AppendLine(@"
UPDATE schema_migrations
SET success = TRUE,
    dirty = FALSE,
    error_code = NULL,
    execution_ms = GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (clock_timestamp() - applied_at)) * 1000)::BIGINT)
WHERE service_name = $serviceLiteral AND migration_id = $migrationLiteral;
\echo APPLIED $($file.Name)
\else
\echo SKIPPED $($file.Name)
\endif
"@)
  }

  [void]$builder.AppendLine(@"
DO `$bthwani`$
BEGIN
  IF EXISTS (
    SELECT 1 FROM schema_migrations
    WHERE service_name = $serviceLiteral AND (dirty OR NOT success)
  ) THEN
    RAISE EXCEPTION 'DIRTY_MIGRATION_STATE_AFTER_RUN: service %', $serviceLiteral;
  END IF;
END
`$bthwani`$;
SELECT pg_advisory_unlock(hashtextextended($lockNameLiteral, 0));
"@)

  return $builder.ToString()
}

function Invoke-BthwaniGovernedMigrations {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
    [Parameter(Mandatory = $true)][System.IO.FileInfo[]]$MigrationFiles,
    [Parameter(Mandatory = $true)][ValidateNotNullOrEmpty()][string]$SourceCommitSha,
    [Parameter(Mandatory = $true)][scriptblock]$ExecuteBatch,
    [Parameter(Mandatory = $true)][scriptblock]$ExecuteStatement
  )

  $batch = New-BthwaniGovernedMigrationBatch `
    -ServiceName $ServiceName `
    -MigrationFiles $MigrationFiles `
    -SourceCommitSha $SourceCommitSha

  try {
    & $ExecuteBatch $batch
  } catch {
    $serviceLiteral = ConvertTo-BthwaniSqlLiteral $ServiceName
    try {
      & $ExecuteStatement @"
UPDATE schema_migrations
SET error_code = COALESCE(error_code, 'MIGRATION_EXECUTION_FAILED')
WHERE service_name = $serviceLiteral AND dirty;
"@
    } catch {
      Write-Warning "Unable to persist migration failure state for '$ServiceName': $($_.Exception.Message)"
    }
    throw
  }
}
