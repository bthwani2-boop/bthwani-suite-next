param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$MigrationDir = Join-Path $RepoRoot "services/wlt/database/migrations"
$ProbeScript = Join-Path $RepoRoot "infra/docker/scripts/wlt-migration-probes.ps1"

foreach ($requiredPath in @($ComposeFile, $EnvFile, $MigrationDir, $ProbeScript)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "WLT migration-ledger repair prerequisite is missing: $requiredPath"
  }
}

. $ProbeScript

function Invoke-WltRepairPsql {
  param([Parameter(Mandatory = $true)][string]$Sql)

  $result = $Sql |
    docker compose --env-file $script:EnvFile -f $script:ComposeFile exec -T postgres `
      psql -U wlt_runtime -d wlt_runtime -v ON_ERROR_STOP=1 -tA
  if ($LASTEXITCODE -ne 0) {
    throw "WLT migration-ledger repair psql command failed with exit code $LASTEXITCODE."
  }
  return ($result -join "`n").Trim()
}

Set-Location -LiteralPath $RepoRoot

$MigrationFiles = @(Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name)
if ($MigrationFiles.Count -eq 0) {
  throw "No WLT migration files found in $MigrationDir."
}
Test-WltMigrationProbeCoverage -MigrationFiles $MigrationFiles

Invoke-WltRepairPsql @"
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT        PRIMARY KEY,
  checksum       TEXT        NOT NULL,
  applied_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"@ | Out-Null

$repaired = [System.Collections.Generic.List[string]]::new()
foreach ($file in $MigrationFiles) {
  $checksum = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $recorded = Invoke-WltRepairPsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($file.Name)';"

  if ($recorded) {
    if ($recorded -ne $checksum) {
      throw "Migration ledger checksum mismatch for $($file.Name): recorded $recorded, file $checksum. Applied migrations must never be edited."
    }
    continue
  }

  $probe = [string]$script:WltMigrationProbes[$file.Name]
  $probeResult = Invoke-WltRepairPsql "SELECT ($probe)::text;"
  if ($probeResult -ne "t") {
    continue
  }

  Invoke-WltRepairPsql @"
INSERT INTO runtime_schema_migrations (migration_name, checksum)
VALUES ('$($file.Name)', '$checksum')
ON CONFLICT (migration_name) DO NOTHING;
"@ | Out-Null

  $recordedAfter = Invoke-WltRepairPsql "SELECT checksum FROM runtime_schema_migrations WHERE migration_name = '$($file.Name)';"
  if ($recordedAfter -ne $checksum) {
    throw "WLT migration-ledger repair could not establish the canonical checksum for $($file.Name)."
  }

  $repaired.Add($file.Name)
  Write-Host "  Repaired verified WLT ledger gap: $($file.Name)"
}

if ($repaired.Count -eq 0) {
  Write-Host "WLT migration-ledger repair found no verified missing rows."
  exit 2
}

Write-Host "WLT migration-ledger repair: PASS ($($repaired.Count) verified row(s) restored)"
exit 0
