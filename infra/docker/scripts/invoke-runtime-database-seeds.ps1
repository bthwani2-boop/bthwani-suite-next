[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dsh", "wlt")]
  [string]$Service,

  [string]$SourceCommitSha = "",

  [switch]$AllowLocalSeeds
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $AllowLocalSeeds) {
  throw "Local runtime seeds require the explicit -AllowLocalSeeds switch."
}

$environmentName = @($env:BTHWANI_ENVIRONMENT, $env:APP_ENV, $env:NODE_ENV) |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
  Select-Object -First 1
if ($environmentName) {
  $allowedEnvironments = @("local", "development", "dev", "test", "ci")
  if ($allowedEnvironments -notcontains $environmentName.ToLowerInvariant()) {
    throw "Local runtime seeds are forbidden in environment '$environmentName'."
  }
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
foreach ($requiredFile in @($ComposeFile, $EnvFile)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required runtime file not found: $requiredFile"
  }
}

$serviceMap = @{
  dsh = @{ Directory = "services/dsh/database/seeds/local"; User = "dsh_runtime"; Database = "dsh_runtime" }
  wlt = @{ Directory = "services/wlt/database/seeds/local"; User = "wlt_runtime"; Database = "wlt_runtime" }
}
$config = $serviceMap[$Service]
$seedDirectory = Join-Path $RepoRoot $config.Directory
if (-not (Test-Path -LiteralPath $seedDirectory -PathType Container)) {
  throw "Seed directory not found for '$Service': $seedDirectory"
}

$seedFiles = @(Get-ChildItem -LiteralPath $seedDirectory -Filter "*.local.sql" -File | Sort-Object Name)
if ($seedFiles.Count -eq 0) {
  throw "No governed local seed files found for '$Service'. Expected *.local.sql."
}

$duplicateNames = @($seedFiles |
  Group-Object { $_.Name.ToLowerInvariant() } |
  Where-Object Count -gt 1)
if ($duplicateNames.Count -gt 0) {
  throw "Duplicate local seed filenames: $($duplicateNames.Name -join ', ')"
}
foreach ($seedFile in $seedFiles) {
  if ($seedFile.Name -notmatch '^[a-z0-9][a-z0-9._-]*\.local\.sql$') {
    throw "Invalid governed local seed filename: $($seedFile.Name)"
  }
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

function ConvertTo-SqlLiteral {
  param([AllowEmptyString()][string]$Value)
  return "'" + $Value.Replace("'", "''") + "'"
}

function Get-PortableSeedChecksum {
  param([Parameter(Mandatory = $true)][System.IO.FileInfo]$File)

  $rawBytes = [System.IO.File]::ReadAllBytes($File.FullName)
  $text = [System.Text.Encoding]::UTF8.GetString($rawBytes)
  $normalized = $text -replace "`r`n?", "`n"
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($normalized)
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    return ([System.BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace("-", "").ToLowerInvariant()
  } finally {
    $algorithm.Dispose()
  }
}

function Invoke-ComposePsql {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$TuplesOnly
  )

  $arguments = @(
    "compose", "--env-file", $EnvFile, "-f", $ComposeFile,
    "exec", "-T", "postgres", "psql",
    "-U", $config.User, "-d", $config.Database,
    "-X", "-v", "ON_ERROR_STOP=1"
  )
  if ($TuplesOnly) { $arguments += @("-t", "-A") }

  $result = $Sql | & docker @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Runtime seed psql failed for '$Service' with exit code $LASTEXITCODE."
  }
  return $result
}

Invoke-ComposePsql -Sql @"
CREATE TABLE IF NOT EXISTS runtime_seed_history (
  service_name      TEXT        NOT NULL,
  seed_name         TEXT        NOT NULL,
  checksum          TEXT        NOT NULL,
  source_commit_sha TEXT        NOT NULL,
  run_count         BIGINT      NOT NULL DEFAULT 1 CHECK (run_count > 0),
  applied_at        TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (service_name, seed_name)
);
ALTER TABLE runtime_seed_history
  ADD COLUMN IF NOT EXISTS run_count BIGINT NOT NULL DEFAULT 1;
"@ | Out-Null

$serviceLiteral = ConvertTo-SqlLiteral $Service
$sourceCommitLiteral = ConvertTo-SqlLiteral $SourceCommitSha

foreach ($seedFile in $seedFiles) {
  $checksum = Get-PortableSeedChecksum -File $seedFile
  $seedNameLiteral = ConvertTo-SqlLiteral $seedFile.Name
  $checksumLiteral = ConvertTo-SqlLiteral $checksum
  $recorded = (Invoke-ComposePsql -TuplesOnly -Sql @"
SELECT checksum
FROM runtime_seed_history
WHERE service_name = $serviceLiteral AND seed_name = $seedNameLiteral;
"@) -join "`n"
  $recorded = $recorded.Trim()

  if ($recorded -eq $checksum) {
    Write-Host "Skipping unchanged local seed: service=$Service file=$($seedFile.Name)"
    continue
  }

  $sql = Get-Content -LiteralPath $seedFile.FullName -Raw
  if ($sql -match '(?m)^\s*\\') {
    throw "Seed '$($seedFile.Name)' contains psql meta-commands."
  }
  if ($sql -match '(?mi)^\s*(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK)\s*;') {
    throw "Seed '$($seedFile.Name)' contains transaction control. The governed seed runner owns the atomic transaction."
  }

  Write-Host "Applying governed local seed atomically: service=$Service file=$($seedFile.Name)"
  Invoke-ComposePsql -Sql @"
BEGIN;
$sql

INSERT INTO runtime_seed_history(
  service_name, seed_name, checksum, source_commit_sha, run_count, applied_at
)
VALUES (
  $serviceLiteral, $seedNameLiteral, $checksumLiteral, $sourceCommitLiteral, 1, clock_timestamp()
)
ON CONFLICT (service_name, seed_name) DO UPDATE SET
  checksum = EXCLUDED.checksum,
  source_commit_sha = EXCLUDED.source_commit_sha,
  run_count = runtime_seed_history.run_count + 1,
  applied_at = EXCLUDED.applied_at;
COMMIT;
"@ | Out-Null

  $verified = (Invoke-ComposePsql -TuplesOnly -Sql @"
SELECT checksum
FROM runtime_seed_history
WHERE service_name = $serviceLiteral AND seed_name = $seedNameLiteral;
"@) -join "`n"
  if ($verified.Trim() -ne $checksum) {
    throw "Seed history verification failed for '$Service/$($seedFile.Name)'."
  }
}

$recordedCount = (Invoke-ComposePsql -TuplesOnly -Sql @"
SELECT count(*)
FROM runtime_seed_history
WHERE service_name = $serviceLiteral;
"@) -join "`n"
if ([int]$recordedCount.Trim() -lt $seedFiles.Count) {
  throw "Governed seed history is incomplete for '$Service': expected=$($seedFiles.Count) recorded=$($recordedCount.Trim())."
}

Write-Host "Governed local runtime seeds: PASS service=$Service files=$($seedFiles.Count) sha=$SourceCommitSha"
