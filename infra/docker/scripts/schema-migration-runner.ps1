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

function Get-BthwaniMigrationManifestEntries {
  param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
    [Parameter(Mandatory = $true)][System.IO.DirectoryInfo]$Directory
  )

  $manifestPath = Join-Path $Directory.FullName 'manifest.json'
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Governed migration manifest missing for '$ServiceName': $manifestPath"
  }

  $documents = @()
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $documents += $manifest

  $extensionsPath = Join-Path $Directory.FullName 'manifest.extensions.json'
  if (Test-Path -LiteralPath $extensionsPath -PathType Leaf) {
    $extensions = Get-Content -LiteralPath $extensionsPath -Raw | ConvertFrom-Json
    if ($extensions.extends -ne 'manifest.json') {
      throw "Migration manifest extension must declare extends=manifest.json for '$ServiceName'."
    }
    $documents += $extensions
  }

  $entries = @()
  foreach ($document in $documents) {
    if ([string]$document.service -ne $ServiceName) {
      throw "Migration manifest service mismatch: expected='$ServiceName' actual='$($document.service)'."
    }
    foreach ($entry in @($document.migrations)) {
      $entries += $entry
    }
  }

  if ($entries.Count -eq 0) {
    throw "Governed migration manifest has no entries for '$ServiceName'."
  }

  $fileNames = @{}
  $ordinals = @{}
  foreach ($entry in $entries) {
    $fileName = [string]$entry.file
    $ordinal = [int]$entry.ordinal
    $checksum = [string]$entry.sha256
    $state = [string]$entry.state

    if ($fileName -notmatch '^[a-z0-9][a-z0-9._-]*\.sql$') {
      throw "Migration manifest contains invalid file '$fileName' for '$ServiceName'."
    }
    if ($ordinal -lt 1) {
      throw "Migration manifest contains invalid ordinal '$ordinal' for '$ServiceName/$fileName'."
    }
    if ($checksum -notmatch '^[a-f0-9]{64}$') {
      throw "Migration manifest contains invalid sha256 for '$ServiceName/$fileName'."
    }
    if ($state -notin @('HISTORICAL_IMMUTABLE', 'ACTIVE')) {
      throw "Migration manifest contains unsupported state '$state' for '$ServiceName/$fileName'."
    }
    if ($fileNames.ContainsKey($fileName)) {
      throw "Duplicate migration manifest file '$ServiceName/$fileName'."
    }
    if ($ordinals.ContainsKey($ordinal)) {
      throw "Duplicate migration manifest ordinal '$ServiceName/$ordinal'."
    }
    $fileNames[$fileName] = $true
    $ordinals[$ordinal] = $true
  }

  $orderedEntries = @($entries | Sort-Object { [int]$_.ordinal })
  for ($index = 0; $index -lt $orderedEntries.Count; $index++) {
    $expectedOrdinal = $index + 1
    if ([int]$orderedEntries[$index].ordinal -ne $expectedOrdinal) {
      throw "Migration manifest ordinals must be contiguous for '$ServiceName': expected=$expectedOrdinal actual=$($orderedEntries[$index].ordinal)."
    }
  }

  return $orderedEntries
}

# Ledger states that represent local drift between a database and the governed
# migration set. These are the only failures a governed single-service rebuild
# can legitimately resolve, and this is the one place they are enumerated: the
# codes are raised by the SQL below, so the classifier must not keep a second
# copy that can drift away from them.
#
# Deliberately excluded: DIRTY_MIGRATION_STATE, DIRTY_MIGRATION_STATE_AFTER_RUN
# and INCOMPLETE_MIGRATION_RUN. Those mean a migration failed while executing,
# not that the ledger drifted, and rebuilding on them would destroy a database
# to hide a genuinely broken migration.
$script:BthwaniRecoverableLedgerConflictCodes = @(
  'GOVERNED_MIGRATION_LEDGER_CONFLICT',
  'LEGACY_MIGRATION_LEDGER_CONFLICT',
  'LEGACY_MIGRATION_LEDGER_QUARANTINE_CONFLICT',
  'BTHWANI_MIGRATION_LEDGER_CONFLICT',
  'BTHWANI_MIGRATION_LEDGER_QUARANTINE_CONFLICT',
  'BTHWANI_MIGRATION_LEDGER_SCHEMA_CONFLICT',
  'BTHWANI_MIGRATION_LEDGER_FOREIGN_SERVICE_CONFLICT',
  'MIGRATION_CHECKSUM_MISMATCH',
  'UNTRACKED_LEGACY_SCHEMA'
)

function Get-BthwaniRecoverableLedgerConflictCodes {
  return @($script:BthwaniRecoverableLedgerConflictCodes)
}

function Test-BthwaniRecoverableLedgerConflict {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$FailureText)

  if ([string]::IsNullOrWhiteSpace($FailureText)) { return $false }
  foreach ($code in $script:BthwaniRecoverableLedgerConflictCodes) {
    if ($FailureText -like "*$code*") { return $true }
  }
  return $false
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

  $manifestEntries = Get-BthwaniMigrationManifestEntries -ServiceName $ServiceName -Directory $File.Directory
  $entries = @($manifestEntries | Where-Object { $_.file -eq $File.Name })
  if ($entries.Count -ne 1 -or [string]$entries[0].sha256 -notmatch '^[a-f0-9]{64}$') {
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

function Resolve-BthwaniGovernedMigrationPlan {
  param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
    [Parameter(Mandatory = $true)][System.IO.FileInfo[]]$MigrationFiles
  )

  if ($MigrationFiles.Count -eq 0) {
    throw "No migrations supplied for service '$ServiceName'."
  }

  $directories = @($MigrationFiles | ForEach-Object { $_.Directory.FullName } | Select-Object -Unique)
  if ($directories.Count -ne 1) {
    throw "All migrations for '$ServiceName' must come from one governed directory."
  }

  $directory = [System.IO.DirectoryInfo]::new($directories[0])
  $entries = Get-BthwaniMigrationManifestEntries -ServiceName $ServiceName -Directory $directory
  $filesByName = @{}
  foreach ($file in $MigrationFiles) {
    if ($file.Name -notmatch '^[a-z0-9][a-z0-9._-]*\.sql$') {
      throw "Invalid migration filename '$($file.Name)'."
    }
    if ($filesByName.ContainsKey($file.Name)) {
      throw "Duplicate migration filename '$($file.Name)'."
    }
    $filesByName[$file.Name] = $file
  }

  $manifestNames = @($entries | ForEach-Object { [string]$_.file })
  $missingFiles = @($manifestNames | Where-Object { -not $filesByName.ContainsKey($_) })
  $unregisteredFiles = @($MigrationFiles | Where-Object { $manifestNames -notcontains $_.Name } | ForEach-Object { $_.Name })
  if ($missingFiles.Count -gt 0 -or $unregisteredFiles.Count -gt 0) {
    throw "Migration manifest/file drift for '$ServiceName': missing=[$($missingFiles -join ', ')] unregistered=[$($unregisteredFiles -join ', ')]."
  }

  $orderedFiles = @()
  foreach ($entry in $entries) {
    $file = $filesByName[[string]$entry.file]
    $portableChecksums = Get-BthwaniPortableSqlChecksums -File $file
    $historicalChecksums = @(Get-BthwaniAuthorizedHistoricalChecksums `
      -ServiceName $ServiceName `
      -File $file `
      -CurrentPortableChecksums $portableChecksums.Accepted)
    $acceptedChecksums = @($portableChecksums.Accepted + $historicalChecksums | Select-Object -Unique)
    if ($acceptedChecksums -notcontains [string]$entry.sha256) {
      throw "Migration manifest checksum mismatch for '$ServiceName/$($file.Name)'."
    }
    $orderedFiles += $file
  }

  return $orderedFiles
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

  $orderedFiles = @(Resolve-BthwaniGovernedMigrationPlan -ServiceName $ServiceName -MigrationFiles $MigrationFiles)
  $migrationMetadata = @()
  foreach ($file in $orderedFiles) {
    $portableChecksums = Get-BthwaniPortableSqlChecksums -File $file
    $historicalChecksums = @(Get-BthwaniAuthorizedHistoricalChecksums `
      -ServiceName $ServiceName `
      -File $file `
      -CurrentPortableChecksums $portableChecksums.Accepted)
    $acceptedChecksums = @($portableChecksums.Accepted + $historicalChecksums | Select-Object -Unique)
    $migrationMetadata += [pscustomobject]@{
      File = $file
      CanonicalChecksum = $portableChecksums.Canonical
      AcceptedChecksums = $acceptedChecksums
      MigrationLiteral = ConvertTo-BthwaniSqlLiteral $file.Name
      AcceptedChecksumArray = "ARRAY[" + (($acceptedChecksums | ForEach-Object {
        ConvertTo-BthwaniSqlLiteral $_
      }) -join ", ") + "]::TEXT[]"
    }
  }

  $expectedLedgerValues = ($migrationMetadata | ForEach-Object {
    "($($_.MigrationLiteral), $($_.AcceptedChecksumArray))"
  }) -join ",`n      "

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
  IF EXISTS (
    WITH expected(migration_id, accepted_checksums) AS (
      VALUES
      $expectedLedgerValues
    )
    SELECT 1
    FROM schema_migrations governed
    LEFT JOIN expected ON expected.migration_id = governed.migration_id
    WHERE governed.service_name = $serviceLiteral
      AND (
        expected.migration_id IS NULL OR
        NOT (governed.checksum_sha256 = ANY(expected.accepted_checksums))
      )
  ) THEN
    RAISE EXCEPTION 'GOVERNED_MIGRATION_LEDGER_CONFLICT: service % contains an unknown or checksum-invalid row', $serviceLiteral;
  END IF;

  IF to_regclass('public.runtime_schema_migrations') IS NOT NULL THEN
    IF to_regclass('public.runtime_schema_migrations_legacy_retired') IS NOT NULL THEN
      RAISE EXCEPTION 'LEGACY_MIGRATION_LEDGER_QUARANTINE_CONFLICT: both active and retired legacy ledgers exist';
    END IF;

    IF EXISTS (
      WITH expected(migration_id, accepted_checksums) AS (
        VALUES
        $expectedLedgerValues
      )
      SELECT 1
      FROM runtime_schema_migrations legacy
      LEFT JOIN expected ON expected.migration_id = legacy.migration_name
      WHERE expected.migration_id IS NULL
         OR NOT (legacy.checksum = ANY(expected.accepted_checksums))
    ) THEN
      RAISE EXCEPTION 'LEGACY_MIGRATION_LEDGER_CONFLICT: service % contains an unknown or checksum-invalid legacy row', $serviceLiteral;
    END IF;

    INSERT INTO schema_migrations (
      service_name, migration_id, checksum_sha256, source_commit_sha,
      applied_at, execution_ms, success, error_code, dirty
    )
    SELECT
      $serviceLiteral, migration_name, checksum, 'LEGACY_IMPORTED',
      applied_at, 0, TRUE, NULL, FALSE
    FROM runtime_schema_migrations
    ON CONFLICT (service_name, migration_id) DO NOTHING;

    ALTER TABLE runtime_schema_migrations RENAME TO runtime_schema_migrations_legacy_retired;
  END IF;

  IF to_regclass('public.bthwani_migration_ledger') IS NOT NULL THEN
    IF to_regclass('public.bthwani_migration_ledger_legacy_retired') IS NOT NULL THEN
      RAISE EXCEPTION 'BTHWANI_MIGRATION_LEDGER_QUARANTINE_CONFLICT: both active and retired bthwani ledgers exist';
    END IF;

    IF (
      SELECT array_agg(column_name::TEXT ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bthwani_migration_ledger'
    ) IS DISTINCT FROM ARRAY['service_name', 'migration_id', 'run_at', 'checksum_sha256']::TEXT[] THEN
      RAISE EXCEPTION 'BTHWANI_MIGRATION_LEDGER_SCHEMA_CONFLICT: unexpected legacy ledger columns';
    END IF;

    IF (
      SELECT array_agg(data_type::TEXT ORDER BY ordinal_position)
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'bthwani_migration_ledger'
    ) IS DISTINCT FROM ARRAY['text', 'text', 'timestamp with time zone', 'text']::TEXT[] THEN
      RAISE EXCEPTION 'BTHWANI_MIGRATION_LEDGER_SCHEMA_CONFLICT: unexpected legacy ledger column types';
    END IF;

    IF EXISTS (
      SELECT 1 FROM bthwani_migration_ledger
      WHERE service_name <> $serviceLiteral
    ) THEN
      RAISE EXCEPTION 'BTHWANI_MIGRATION_LEDGER_FOREIGN_SERVICE_CONFLICT: legacy ledger contains rows for another service';
    END IF;

    IF EXISTS (
      WITH expected(migration_id, accepted_checksums) AS (
        VALUES
        $expectedLedgerValues
      )
      SELECT 1
      FROM bthwani_migration_ledger legacy
      LEFT JOIN expected ON expected.migration_id = legacy.migration_id
      WHERE legacy.service_name = $serviceLiteral
        AND (
          expected.migration_id IS NULL OR
          NOT (legacy.checksum_sha256 = ANY(expected.accepted_checksums))
        )
    ) THEN
      RAISE EXCEPTION 'BTHWANI_MIGRATION_LEDGER_CONFLICT: service % contains an unknown or checksum-invalid legacy row', $serviceLiteral;
    END IF;

    INSERT INTO schema_migrations (
      service_name, migration_id, checksum_sha256, source_commit_sha,
      applied_at, execution_ms, success, error_code, dirty
    )
    SELECT
      service_name, migration_id, checksum_sha256,
      'LEGACY_IMPORTED_BTHWANI_LEDGER', run_at, 0, TRUE, NULL, FALSE
    FROM bthwani_migration_ledger
    WHERE service_name = $serviceLiteral
    ON CONFLICT (service_name, migration_id) DO NOTHING;

    ALTER TABLE bthwani_migration_ledger RENAME TO bthwani_migration_ledger_legacy_retired;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM schema_migrations WHERE service_name = $serviceLiteral
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name LIKE ($serviceTablePrefixLiteral || '%')
      AND table_name NOT IN (
        'schema_migrations',
        'runtime_schema_migrations',
        'runtime_schema_migrations_legacy_retired',
        'bthwani_migration_ledger',
        'bthwani_migration_ledger_legacy_retired'
      )
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

  foreach ($metadata in $migrationMetadata) {
    $file = $metadata.File
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

    $checksum = $metadata.CanonicalChecksum
    $migrationLiteral = $metadata.MigrationLiteral
    $checksumLiteral = ConvertTo-BthwaniSqlLiteral $checksum
    $acceptedChecksumArray = $metadata.AcceptedChecksumArray

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

# Asserts the governed ledger records every manifest migration once the batch has
# run.
#
# The batch guards each migration individually and raises on dirty state, but a
# run that stops partway without leaving a dirty row — a cancelled shell, a lost
# psql connection, a transaction that rolled its own ledger insert back — leaves
# no evidence at all: the remaining migrations are simply never attempted. A DSH
# database sat at 139 of 235 migrations in exactly that shape, its ledger clean,
# while the API queried tables that did not exist. Completion is therefore
# verified explicitly rather than inferred from the absence of an error.
#
# The batch already rejects ledger rows outside the manifest, so a matching count
# is equivalent to a matching set.
function Assert-BthwaniGovernedMigrationsComplete {
  [CmdletBinding()]
  param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-z0-9-]+$')][string]$ServiceName,
    [Parameter(Mandatory = $true)][ValidateRange(1, [int]::MaxValue)][int]$ExpectedCount,
    [Parameter(Mandatory = $true)][scriptblock]$ExecuteStatement
  )

  $serviceLiteral = ConvertTo-BthwaniSqlLiteral $ServiceName
  & $ExecuteStatement @"
DO `$bthwani`$
DECLARE
  recorded INTEGER;
BEGIN
  SELECT count(*) INTO recorded
  FROM schema_migrations
  WHERE service_name = $serviceLiteral AND success AND NOT dirty;

  IF recorded <> $ExpectedCount THEN
    RAISE EXCEPTION 'INCOMPLETE_MIGRATION_RUN: service % recorded % of % governed migrations', $serviceLiteral, recorded, $ExpectedCount;
  END IF;
END
`$bthwani`$;
"@
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
    Assert-BthwaniGovernedMigrationsComplete `
      -ServiceName $ServiceName `
      -ExpectedCount $MigrationFiles.Count `
      -ExecuteStatement $ExecuteStatement
  } catch {
    # Capture the originating failure before running anything else. The
    # bookkeeping statement below issues another psql call, and a bare `throw`
    # after an inner try/catch cannot be relied on to rethrow this error rather
    # than the inner one. Callers classify the migration failure from this
    # exception, so it must survive the recovery attempt intact.
    $originalError = $_
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
    throw $originalError
  }
}
