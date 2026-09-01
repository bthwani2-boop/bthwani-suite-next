<#
.SYNOPSIS
  Verifies the generic service migration wrapper against a real PostgreSQL database.

.DESCRIPTION
  The wrapper must delegate to infra/docker/scripts/schema-migration-runner.ps1 and
  therefore record governed state only in schema_migrations. This test covers
  manifest authority, previous-version upgrade, deterministic rerun, checksum
  immutability, failed migration rollback, and roll-forward recovery. Historical
  ledger import belongs exclusively to the governed runner's own focused tests.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[a-z0-9][a-z0-9-]*$")]
  [string]$ServiceKey,

  [Parameter(Mandatory = $true)]
  [string]$MigrationDirectory,

  [string]$DatabaseUrl = $env:DATABASE_URL,

  [string]$SourceCommitSha = $env:CANDIDATE_SHA
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RunnerPath = Join-Path $PSScriptRoot "invoke-service-migrations.ps1"
$GovernedRunnerPath = Join-Path $RepoRoot "infra/docker/scripts/schema-migration-runner.ps1"
$SourceCommitProvenancePath = Join-Path $RepoRoot "tools/scripts/lib/source-commit-provenance.ps1"
$MigrationPath = if ([System.IO.Path]::IsPathRooted($MigrationDirectory)) {
  $MigrationDirectory
} else {
  Join-Path $RepoRoot $MigrationDirectory
}

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  throw "DatabaseUrl is required."
}
if (-not (Test-Path -LiteralPath $RunnerPath -PathType Leaf)) {
  throw "Migration wrapper not found: $RunnerPath"
}
if (-not (Test-Path -LiteralPath $GovernedRunnerPath -PathType Leaf)) {
  throw "Governed migration runner not found: $GovernedRunnerPath"
}
if (-not (Test-Path -LiteralPath $SourceCommitProvenancePath -PathType Leaf)) {
  throw "Checked-out source commit resolver not found: $SourceCommitProvenancePath"
}
. $SourceCommitProvenancePath
$SourceCommitSha = Resolve-BthwaniCheckedOutSourceCommitSha -RepoRoot $RepoRoot -ExpectedSourceCommitSha $SourceCommitSha
if (-not (Test-Path -LiteralPath $MigrationPath -PathType Container)) {
  throw "Migration directory not found: $MigrationPath"
}
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  throw "psql is required to test service migrations."
}
if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
  throw "pwsh is required to test service migrations."
}

. $GovernedRunnerPath

function ConvertTo-SqlLiteral {
  param([Parameter(Mandatory = $true)][string]$Value)
  return $Value.Replace("'", "''")
}

$ServiceKeySql = ConvertTo-SqlLiteral $ServiceKey
$SafeServiceKey = ($ServiceKey -replace "[^a-zA-Z0-9_]", "_").ToLowerInvariant()
$SentinelTable = "ci_migration_sentinel_$SafeServiceKey"
$ProbeOneTable = "ci_migration_probe_${SafeServiceKey}_one"
$ProbeTwoTable = "ci_migration_probe_${SafeServiceKey}_two"
$ProbePrefix = "ci-$ServiceKey-probe"
$ProbeOneFile = "$ProbePrefix-991_base.sql"
$ProbeTwoFile = "$ProbePrefix-992_followup.sql"
$PartialProbeServiceKey = "$ServiceKey-partial-probe"
$PartialProbeServiceKeySql = ConvertTo-SqlLiteral $PartialProbeServiceKey
$SentinelCreated = $false
$IdentityFixtureCreated = $false

function Invoke-DatabaseSql {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$TuplesOnly
  )

  $arguments = @($DatabaseUrl, "-X", "-q", "-v", "ON_ERROR_STOP=1")
  if ($TuplesOnly) { $arguments += "-tA" }
  $output = $Sql | & psql @arguments 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
    throw "PostgreSQL verification command failed (exit $exitCode).`n$message"
  }
  return (($output | ForEach-Object { "$_" }) -join "`n").Trim()
}

function Invoke-RunnerProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][bool]$ExpectSuccess,
    [string]$RunnerServiceKey = $ServiceKey,
    [string]$OverrideDatabaseUrl = ""
  )

  $effectiveDatabaseUrl = if (-not [string]::IsNullOrWhiteSpace($OverrideDatabaseUrl)) {
    $OverrideDatabaseUrl
  } else {
    $DatabaseUrl
  }
  $runnerArguments = @(
    '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $RunnerPath,
    '-ServiceKey', $RunnerServiceKey,
    '-MigrationDirectory', $Directory,
    '-DatabaseUrl', $effectiveDatabaseUrl,
    '-SourceCommitSha', $SourceCommitSha
  )
  if ($ServiceKey -eq 'workforce') {
    $runnerArguments += @('-IdentityDatabaseUrl', $effectiveDatabaseUrl)
  }
  $output = & pwsh @runnerArguments 2>&1
  $exitCode = $LASTEXITCODE

  $message = (($output | ForEach-Object { "$_" }) -join "`n").Trim()
  if ($ExpectSuccess -and $exitCode -ne 0) {
    throw "Migration wrapper unexpectedly failed for '$RunnerServiceKey' (exit $exitCode).`n$message"
  }
  if ($ExpectSuccess -and $message -notmatch [regex]::Escape("sha=$SourceCommitSha")) {
    throw "Migration wrapper did not attest the checked-out source commit for '$RunnerServiceKey': expected sha=$SourceCommitSha.`n$message"
  }
  if (-not $ExpectSuccess -and $exitCode -eq 0) {
    throw "Migration wrapper unexpectedly succeeded for the required failure probe '$RunnerServiceKey'."
  }

  foreach ($line in $output) { Write-Host "$line" }
}

function Get-GovernedLedgerCount {
  param([Parameter(Mandatory = $true)][string]$LedgerServiceKeySql)
  return Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM schema_migrations WHERE service_name = '$LedgerServiceKeySql' AND success AND NOT dirty;"
}

function Write-TestMigrationManifest {
  param(
    [Parameter(Mandatory = $true)][string]$Directory,
    [Parameter(Mandatory = $true)][string]$ManifestServiceKey,
    [string[]]$OrderedFileNames = @()
  )

  $files = if ($OrderedFileNames.Count -gt 0) {
    @($OrderedFileNames | ForEach-Object {
      $path = Join-Path $Directory $_
      if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Ordered test migration file not found: $path"
      }
      Get-Item -LiteralPath $path
    })
  } else {
    @(Get-ChildItem -LiteralPath $Directory -File -Filter "*.sql" |
      Sort-Object { $_.Name.ToLowerInvariant() }, Name)
  }
  if ($files.Count -eq 0) {
    throw "Cannot write an empty test migration manifest: $Directory"
  }

  $entries = @()
  for ($index = 0; $index -lt $files.Count; $index++) {
    $checksums = Get-BthwaniPortableSqlChecksums -File $files[$index]
    $entries += [ordered]@{
      ordinal = $index + 1
      file = $files[$index].Name
      sha256 = $checksums.Canonical
      historicalPrefix = "test-$($index + 1)"
      state = "ACTIVE"
    }
  }

  $manifest = [ordered]@{
    schemaVersion = 1
    service = $ManifestServiceKey
    ordering = "explicit"
    orderingSource = if ($OrderedFileNames.Count -gt 0) { "canonical-manifest-prefix" } else { "test-generated" }
    cutover = $files[-1].Name
    migrations = $entries
  }
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $Directory "manifest.json")
}

$discoveredCanonicalFiles = @(Get-ChildItem -LiteralPath $MigrationPath -File -Filter "*.sql")
if ($discoveredCanonicalFiles.Count -eq 0) {
  throw "No canonical migrations found for '$ServiceKey'."
}
$canonicalFiles = @(Resolve-BthwaniGovernedMigrationPlan `
  -ServiceName $ServiceKey `
  -MigrationFiles $discoveredCanonicalFiles)

$temporaryRoot = Join-Path ([System.IO.Path]::GetTempPath()) "bthwani-migration-$ServiceKey-$([guid]::NewGuid().ToString('N'))"
$previousDirectory = Join-Path $temporaryRoot "previous-version"
$driftDirectory = Join-Path $temporaryRoot "checksum-drift"
$partialDirectory = Join-Path $temporaryRoot "partial-failure"
$missingManifestDirectory = Join-Path $temporaryRoot "missing-manifest"
New-Item -ItemType Directory -Path $previousDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $driftDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $partialDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $missingManifestDirectory -Force | Out-Null

try {
  if ($ServiceKey -eq 'workforce') {
    Invoke-DatabaseSql -Sql @"
CREATE TABLE IF NOT EXISTS identity_actors (
  id text PRIMARY KEY,
  operator_context_id text NOT NULL
);
INSERT INTO identity_actors (id, operator_context_id)
VALUES ('ci-workforce-actor', 'ci-workforce-context')
ON CONFLICT (id) DO UPDATE SET operator_context_id = EXCLUDED.operator_context_id;
"@ | Out-Null
    $IdentityFixtureCreated = $true
  }

  Write-Host "--- ${ServiceKey}: manifest is mandatory and authoritative ---"
  Copy-Item -LiteralPath $canonicalFiles[0].FullName -Destination (Join-Path $missingManifestDirectory $canonicalFiles[0].Name)
  Invoke-RunnerProcess -Directory $missingManifestDirectory -ExpectSuccess $false

  Write-Host "--- ${ServiceKey}: previous-version database with existing data ---"
  $previousCount = [Math]::Max(0, $canonicalFiles.Count - 1)
  if ($previousCount -gt 0) {
    $previousFiles = @($canonicalFiles[0..($previousCount - 1)])
    foreach ($file in $previousFiles) {
      Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $previousDirectory $file.Name)
    }
    Write-TestMigrationManifest `
      -Directory $previousDirectory `
      -ManifestServiceKey $ServiceKey `
      -OrderedFileNames @($previousFiles | ForEach-Object { $_.Name })
    Invoke-RunnerProcess -Directory $previousDirectory -ExpectSuccess $true

    $previousLedgerCount = Get-GovernedLedgerCount -LedgerServiceKeySql $ServiceKeySql
    if ([int]$previousLedgerCount -ne $previousCount) {
      throw "Previous-version governed ledger count mismatch for '$ServiceKey': expected=$previousCount actual=$previousLedgerCount"
    }

    Invoke-DatabaseSql -Sql @"
CREATE TABLE IF NOT EXISTS $SentinelTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $SentinelTable (id, payload)
VALUES (1, 'preexisting-data')
ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload;
"@ | Out-Null
    $SentinelCreated = $true
  }

  Write-Host "--- ${ServiceKey}: upgrade to current migration set ---"
  Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $true

  if ($SentinelCreated) {
    $sentinelCount = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM $SentinelTable WHERE id = 1 AND payload = 'preexisting-data';"
    if ($sentinelCount -ne "1") {
      throw "Pre-existing data was not preserved while upgrading '$ServiceKey' migrations."
    }
  }

  $ledgerCount = Get-GovernedLedgerCount -LedgerServiceKeySql $ServiceKeySql
  if ([int]$ledgerCount -ne $canonicalFiles.Count) {
    throw "Governed migration ledger count mismatch for '$ServiceKey': expected=$($canonicalFiles.Count) actual=$ledgerCount"
  }

  Write-Host "--- ${ServiceKey}: deterministic re-execution ---"
  Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $true
  $rerunLedgerCount = Get-GovernedLedgerCount -LedgerServiceKeySql $ServiceKeySql
  if ([int]$rerunLedgerCount -ne $canonicalFiles.Count) {
    throw "Re-execution changed the governed ledger for '$ServiceKey'."
  }

  Write-Host "--- ${ServiceKey}: checksum and manifest immutability ---"
  Copy-Item -Path (Join-Path $MigrationPath "*") -Destination $driftDirectory -Recurse -Force
  $driftFile = Get-ChildItem -LiteralPath $driftDirectory -File -Filter "*.sql" |
    Sort-Object { $_.Name.ToLowerInvariant() }, Name |
    Select-Object -First 1
  Add-Content -LiteralPath $driftFile.FullName -Value "`n-- intentional checksum drift probe"
  Invoke-RunnerProcess -Directory $driftDirectory -ExpectSuccess $false
  Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $true

  Write-Host "--- ${ServiceKey}: legacy ledger conflict rejection ---"
  Invoke-DatabaseSql -Sql @"
CREATE TABLE IF NOT EXISTS bthwani_migration_ledger (
  service_name TEXT NOT NULL,
  migration_id TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checksum_sha256 TEXT NOT NULL,
  PRIMARY KEY (service_name, migration_id)
);
INSERT INTO bthwani_migration_ledger (service_name, migration_id, checksum_sha256)
VALUES ('$ServiceKeySql', 'legacy-unknown.sql', 'bad-checksum')
ON CONFLICT DO NOTHING;
"@ | Out-Null
  Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $false
  Invoke-DatabaseSql -Sql "DELETE FROM bthwani_migration_ledger WHERE service_name = '$ServiceKeySql' AND migration_id = 'legacy-unknown.sql';" | Out-Null

  Write-Host "--- ${ServiceKey}: amendment historical-checksum upgrade reconciliation ---"
  $amendmentsPath = Join-Path $RepoRoot 'tools/verification/migration-amendments.json'
  $amendmentsDocument = Get-Content -LiteralPath $amendmentsPath -Raw | ConvertFrom-Json
  $reconcilableAmendments = @($amendmentsDocument.amendments | Where-Object {
    $historicalProperty = $_.PSObject.Properties['acceptedHistoricalSha256']
    $_.service -eq $ServiceKey -and $null -ne $historicalProperty -and @($historicalProperty.Value).Count -gt 0
  })
  if ($reconcilableAmendments.Count -eq 0) {
    Write-Host "amendment reconciliation: SKIPPED service=$ServiceKey reason=no-amendment-with-accepted-historical-checksums"
  } else {
    $maxVariants = 0
    foreach ($amendment in $reconcilableAmendments) {
      $count = @($amendment.acceptedHistoricalSha256).Count
      if ($count -gt $maxVariants) { $maxVariants = $count }
    }

    $uri = [System.Uri]$DatabaseUrl
    $probeBaseName = ($uri.AbsolutePath.Trim('/') -replace '[^a-zA-Z0-9_]', '_')

    function New-ProbeDatabaseUrl {
      param([Parameter(Mandatory = $true)][int]$Variant)
      $probeName = "$($probeBaseName)_amendment_$Variant"
      return @{
        Name = $probeName
        Url = "$($uri.Scheme)://$($uri.UserInfo)@$($uri.Host):$($uri.Port)/$probeName$($uri.Query)"
      }
    }

    function New-ProbeDatabase {
      param([Parameter(Mandatory = $true)][string]$Name)
      Invoke-DatabaseSql -Sql "CREATE DATABASE `"$Name`";"
    }

    function Remove-ProbeDatabase {
      param([Parameter(Mandatory = $true)][string]$Name)
      Invoke-DatabaseSql -Sql "DROP DATABASE IF EXISTS `"$Name`";"
    }

    # Build the full governed ledger row set once: every migration recorded as
    # applied, with the current canonical checksum except where an amendment
    # exposes a historical variant for this index.
    $historicalByFile = @{}
    foreach ($amendment in $reconcilableAmendments) {
      $historicalByFile[[string]$amendment.migrationId] = @($amendment.acceptedHistoricalSha256)
    }

    for ($variant = 0; $variant -lt $maxVariants; $variant++) {
      $probe = New-ProbeDatabaseUrl -Variant $variant
      New-ProbeDatabase -Name $probe.Name
      $amendmentProbeCreated = $true
      try {
        # Pre-create the governed ledger exactly as the runner would, recording
        # the historical accepted checksum for every amended migration and the
        # current canonical checksum for every other migration. This is the
        # fixture of a real environment that applied the historical byte forms
        # and is now upgrading to the current migration set: the runner must
        # accept the whole ledger and skip every migration without rewriting
        # any recorded checksum.
        $hasVariant = $false
        $historicalRows = @()
        foreach ($file in $canonicalFiles) {
          $migrationIdSql = "'" + (ConvertTo-SqlLiteral $file.Name) + "'"
          $digestSql = ""
          if ($historicalByFile.ContainsKey($file.Name)) {
            $variants = @($historicalByFile[$file.Name])
            $digest = $null
            if ($variant -lt $variants.Count) { $digest = $variants[$variant] }
            if (-not [string]::IsNullOrWhiteSpace([string]$digest)) {
              $digestSql = "'" + (ConvertTo-SqlLiteral ([string]$digest)) + "'"
              $hasVariant = $true
            }
          }
          if ([string]::IsNullOrWhiteSpace($digestSql)) {
            $checksums = Get-BthwaniPortableSqlChecksums -File $file
            $digestSql = "'" + (ConvertTo-SqlLiteral ([string]$checksums.Canonical)) + "'"
          }
          $historicalRows += "('$ServiceKeySql', $migrationIdSql, $digestSql, 'HISTORICAL_AMENDMENT_FIXTURE', clock_timestamp(), 0, TRUE, NULL, FALSE)"
        }
        if (-not $hasVariant) { continue }

        $probeArguments = @($probe.Url, "-X", "-q", "-v", "ON_ERROR_STOP=1")
        $ledgerFixture = @"
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
INSERT INTO schema_migrations
  (service_name, migration_id, checksum_sha256, source_commit_sha, applied_at, execution_ms, success, error_code, dirty)
VALUES
$($historicalRows -join ",
");
"@
        $ledgerFixture | & psql @probeArguments 2>&1 | ForEach-Object { Write-Host "$_" }
        if ($LASTEXITCODE -ne 0) {
          throw "Historical amendment ledger fixture failed for variant $variant (exit $LASTEXITCODE)."
        }

        $runnerArguments = @(
          '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $RunnerPath,
          '-ServiceKey', $ServiceKey,
          '-MigrationDirectory', $MigrationPath,
          '-DatabaseUrl', $probe.Url
        )
        if ($ServiceKey -eq 'workforce') {
          $runnerArguments += @('-IdentityDatabaseUrl', $probe.Url)
        }
        $upgradeOutput = & pwsh @runnerArguments 2>&1
        $upgradeExitCode = $LASTEXITCODE
        $upgradeOutput | ForEach-Object { Write-Host "$_" }
        if ($upgradeExitCode -ne 0) {
          throw "Upgrade from recorded historical checksums failed for '$ServiceKey' variant $variant (exit $upgradeExitCode): the governed amendment registry does not reconcile recorded history."
        }

        foreach ($amendment in $reconcilableAmendments) {
          $variantDigests = @($amendment.acceptedHistoricalSha256)
          $digest = $null
          if ($variant -lt $variantDigests.Count) { $digest = $variantDigests[$variant] }
          if ([string]::IsNullOrWhiteSpace($digest)) { continue }
          $migrationIdSql2 = "'" + (ConvertTo-SqlLiteral ([string]$amendment.migrationId)) + "'"
          $digestSql2 = "'" + (ConvertTo-SqlLiteral ([string]$digest)) + "'"
          $probeQueryArguments = @($probe.Url, "-X", "-q", "-tA", "-v", "ON_ERROR_STOP=1", "-c")
          $preserved = (& psql @probeQueryArguments "SELECT count(*) FROM schema_migrations WHERE service_name = '$ServiceKeySql' AND migration_id = $migrationIdSql2 AND checksum_sha256 = $digestSql2 AND success AND NOT dirty;" | Select-Object -First 1)
          if ("$preserved".Trim() -ne "1") {
            throw "Amendment reconciliation rewrote recorded history for '$($amendment.migrationId)' variant ${variant}: expected the historical checksum row to be preserved."
          }
          $appliedQuery = (& psql @probeQueryArguments "SELECT count(*) FROM schema_migrations WHERE service_name = '$ServiceKeySql';" | Select-Object -First 1)
          if ([int]"$appliedQuery".Trim() -ne $canonicalFiles.Count) {
            throw "Amendment reconciliation ledger coverage mismatch for '$ServiceKey' variant ${variant}: expected=$($canonicalFiles.Count) actual=$appliedQuery"
          }
        }
        Write-Host "amendment reconciliation: PASS service=$ServiceKey variant=$variant migrations=$($canonicalFiles.Count)"
      } finally {
        if ($amendmentProbeCreated) {
          Remove-ProbeDatabase -Name $probe.Name
          $amendmentProbeCreated = $false
        }
      }
    }

    # Negative space: a ledger row with an unknown checksum must hard-fail the
    # governed upgrade instead of being silently tolerated.
    $negativeProbe = New-ProbeDatabaseUrl -Variant ($maxVariants + 100)
    New-ProbeDatabase -Name $negativeProbe.Name
    $amendmentProbeCreated = $true
    try {
      $firstAmendment = $reconcilableAmendments[0]
      $migrationIdSql3 = "'" + (ConvertTo-SqlLiteral ([string]$firstAmendment.migrationId)) + "'"
      $unknownDigestSql = "'" + (ConvertTo-SqlLiteral ('0' * 64)) + "'"
      $negativeArguments = @($negativeProbe.Url, "-X", "-q", "-v", "ON_ERROR_STOP=1")
      $negativeFixture = @"
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
INSERT INTO schema_migrations
  (service_name, migration_id, checksum_sha256, source_commit_sha, applied_at, execution_ms, success, error_code, dirty)
VALUES
('$ServiceKeySql', $migrationIdSql3, $unknownDigestSql, 'UNKNOWN_CHECKSUM_PROBE', clock_timestamp(), 0, TRUE, NULL, FALSE);
"@
      $negativeFixture | & psql @negativeArguments 2>&1 | ForEach-Object { Write-Host "$_" }
      if ($LASTEXITCODE -ne 0) {
        throw "Unknown-checksum negative fixture failed to seed for '$ServiceKey'."
      }
      Invoke-RunnerProcess -Directory $MigrationPath -ExpectSuccess $false -RunnerServiceKey $ServiceKey -OverrideDatabaseUrl $negativeProbe.Url
      Write-Host "amendment reconciliation negative probe: PASS service=$ServiceKey (unknown checksum rejected)"
    } finally {
      if ($amendmentProbeCreated) {
        Remove-ProbeDatabase -Name $negativeProbe.Name
        $amendmentProbeCreated = $false
      }
    }
  }

  Write-Host "--- ${ServiceKey}: partial failure rollback and roll-forward ---"
  Set-Content -LiteralPath (Join-Path $partialDirectory $ProbeOneFile) -Value @"
CREATE TABLE $ProbeOneTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeOneTable (id, payload) VALUES (1, 'first-committed');
"@
  Set-Content -LiteralPath (Join-Path $partialDirectory $ProbeTwoFile) -Value @"
CREATE TABLE $ProbeTwoTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeTwoTable (id, payload) VALUES (1, 'must-rollback');
SELECT 1 / 0;
"@
  Write-TestMigrationManifest -Directory $partialDirectory -ManifestServiceKey $PartialProbeServiceKey

  Invoke-RunnerProcess -Directory $partialDirectory -ExpectSuccess $false -RunnerServiceKey $PartialProbeServiceKey

  $firstApplied = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM $ProbeOneTable WHERE id = 1 AND payload = 'first-committed';"
  if ($firstApplied -ne "1") {
    throw "The successful migration before the partial failure was not retained."
  }
  $secondRolledBack = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT CASE WHEN to_regclass('public.$ProbeTwoTable') IS NULL THEN '1' ELSE '0' END;"
  if ($secondRolledBack -ne "1") {
    throw "The failed migration left a partial table behind."
  }
  $probeTwoNameSql = ConvertTo-SqlLiteral $ProbeTwoFile
  $failedLedgerCount = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM schema_migrations WHERE service_name = '$PartialProbeServiceKeySql' AND migration_id = '$probeTwoNameSql';"
  if ($failedLedgerCount -ne "0") {
    throw "The failed migration was recorded in the governed ledger."
  }

  Set-Content -LiteralPath (Join-Path $partialDirectory $ProbeTwoFile) -Value @"
CREATE TABLE $ProbeTwoTable (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL
);
INSERT INTO $ProbeTwoTable (id, payload) VALUES (1, 'recovered');
"@
  Write-TestMigrationManifest -Directory $partialDirectory -ManifestServiceKey $PartialProbeServiceKey
  Invoke-RunnerProcess -Directory $partialDirectory -ExpectSuccess $true -RunnerServiceKey $PartialProbeServiceKey

  $recovered = Invoke-DatabaseSql -TuplesOnly -Sql "SELECT count(*) FROM $ProbeTwoTable WHERE id = 1 AND payload = 'recovered';"
  if ($recovered -ne "1") {
    throw "Roll-forward after the partial failure did not recover the second migration."
  }

  $partialLedgerCount = Get-GovernedLedgerCount -LedgerServiceKeySql $PartialProbeServiceKeySql
  if ([int]$partialLedgerCount -ne 2) {
    throw "Partial probe governed ledger count mismatch: expected=2 actual=$partialLedgerCount"
  }

  Write-Host "service-migration-wrapper-test: PASS service=$ServiceKey files=$($canonicalFiles.Count) ledger=schema_migrations manifest=authoritative"
} finally {
  if ($IdentityFixtureCreated) {
    Invoke-DatabaseSql -Sql 'DROP TABLE IF EXISTS identity_actors;' | Out-Null
  }
  if (Test-Path -LiteralPath $temporaryRoot) {
    Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
  }
}
