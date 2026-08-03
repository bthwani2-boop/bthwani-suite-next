<#
.SYNOPSIS
  Applies one service's governed local SQL fixtures through a single cross-transport engine.

.DESCRIPTION
  This is the canonical SQL seed execution authority for local Docker and isolated
  CI PostgreSQL databases. It owns seed discovery, portable checksums, atomic
  execution, and runtime_seed_history. Service/runtime wrappers may map paths and
  credentials, but must not reimplement this logic.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern("^[a-z0-9][a-z0-9-]*$")]
  [string]$ServiceKey,

  [Parameter(Mandatory = $true)]
  [string]$SeedDirectory,

  [ValidateSet("auto", "url", "docker")]
  [string]$Transport = "auto",

  [string]$DatabaseUrl = $env:DATABASE_URL,

  [string]$DockerUser = "",
  [string]$DockerDatabase = "",
  [string]$ComposeFile = "infra/docker/compose.runtime.yml",
  [string]$EnvFile = "infra/docker/env/runtime.env.example",

  [string]$SourceCommitSha = "",

  [switch]$AllowLocalSeeds,
  [switch]$AllowEmptySeedSet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $AllowLocalSeeds) {
  throw "Local service seeds require the explicit -AllowLocalSeeds switch."
}

$environmentName = @($env:BTHWANI_ENVIRONMENT, $env:APP_ENV, $env:NODE_ENV) |
  Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
  Select-Object -First 1
if ($environmentName) {
  $allowedEnvironments = @("local", "development", "dev", "test", "ci")
  if ($allowedEnvironments -notcontains $environmentName.ToLowerInvariant()) {
    throw "Local service seeds are forbidden in environment '$environmentName'."
  }
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$SeedPath = if ([System.IO.Path]::IsPathRooted($SeedDirectory)) {
  $SeedDirectory
} else {
  Join-Path $RepoRoot $SeedDirectory
}
$ComposeFilePath = if ([System.IO.Path]::IsPathRooted($ComposeFile)) {
  $ComposeFile
} else {
  Join-Path $RepoRoot $ComposeFile
}
$EnvFilePath = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile
} else {
  Join-Path $RepoRoot $EnvFile
}

if ($Transport -eq "auto") {
  $Transport = if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { "docker" } else { "url" }
}
if (-not (Test-Path -LiteralPath $SeedPath -PathType Container)) {
  if ($AllowEmptySeedSet) {
    Write-Host "Governed service seeds: PASS service=$ServiceKey transport=$Transport files=0 policy=explicit-absent-empty-directory"
    return
  }
  throw "Seed directory not found for '$ServiceKey': $SeedPath"
}
if ($Transport -eq "url") {
  if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    throw "DatabaseUrl is required when Transport=url."
  }
  if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw "psql is required when Transport=url."
  }
} else {
  if ([string]::IsNullOrWhiteSpace($DockerUser) -or [string]::IsNullOrWhiteSpace($DockerDatabase)) {
    throw "DockerUser and DockerDatabase are required when Transport=docker."
  }
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "docker is required when Transport=docker."
  }
  foreach ($requiredFile in @($ComposeFilePath, $EnvFilePath)) {
    if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
      throw "Required Docker runtime file not found: $requiredFile"
    }
  }
}

$seedFiles = @(Get-ChildItem -LiteralPath $SeedPath -Filter "*.local.sql" -File |
  Sort-Object { $_.Name.ToLowerInvariant() }, Name)
if ($seedFiles.Count -eq 0) {
  if ($AllowEmptySeedSet) {
    Write-Host "Governed service seeds: PASS service=$ServiceKey transport=$Transport files=0 policy=explicit-empty-set"
    return
  }
  throw "No governed local seed files found for '$ServiceKey'. Expected *.local.sql."
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
    $SourceCommitSha = (& git -C $RepoRoot rev-parse HEAD).Trim()
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

function Invoke-ServicePsql {
  param(
    [Parameter(Mandatory = $true)][string]$Sql,
    [switch]$TuplesOnly
  )

  if ($Transport -eq "url") {
    $arguments = @($DatabaseUrl, "-X", "-v", "ON_ERROR_STOP=1")
    if ($TuplesOnly) { $arguments += @("-t", "-A") }
    $result = $Sql | & psql @arguments
  } else {
    $arguments = @(
      "compose", "--env-file", $EnvFilePath, "-f", $ComposeFilePath,
      "exec", "-T", "postgres", "psql",
      "-U", $DockerUser, "-d", $DockerDatabase,
      "-X", "-v", "ON_ERROR_STOP=1"
    )
    if ($TuplesOnly) { $arguments += @("-t", "-A") }
    $result = $Sql | & docker @arguments
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Governed seed psql failed for '$ServiceKey' using '$Transport' (exit $LASTEXITCODE)."
  }
  return $result
}

Invoke-ServicePsql -Sql @"
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

$serviceLiteral = ConvertTo-SqlLiteral $ServiceKey
$sourceCommitLiteral = ConvertTo-SqlLiteral $SourceCommitSha

foreach ($seedFile in $seedFiles) {
  $checksum = Get-PortableSeedChecksum -File $seedFile
  $seedNameLiteral = ConvertTo-SqlLiteral $seedFile.Name
  $checksumLiteral = ConvertTo-SqlLiteral $checksum
  $recorded = (Invoke-ServicePsql -TuplesOnly -Sql @"
SELECT checksum
FROM runtime_seed_history
WHERE service_name = $serviceLiteral AND seed_name = $seedNameLiteral;
"@) -join "`n"
  $recorded = $recorded.Trim()

  if ($recorded -eq $checksum) {
    Write-Host "Skipping unchanged local seed: service=$ServiceKey file=$($seedFile.Name)"
    continue
  }

  $sql = Get-Content -LiteralPath $seedFile.FullName -Raw
  if ($sql -match '(?m)^\s*\\') {
    throw "Seed '$($seedFile.Name)' contains psql meta-commands."
  }
  if ($sql -match '(?mi)^\s*(BEGIN|START\s+TRANSACTION|COMMIT|ROLLBACK)\s*;') {
    throw "Seed '$($seedFile.Name)' contains transaction control. The governed seed runner owns the atomic transaction."
  }

  Write-Host "Applying governed local seed atomically: service=$ServiceKey file=$($seedFile.Name)"
  Invoke-ServicePsql -Sql @"
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

  $verified = (Invoke-ServicePsql -TuplesOnly -Sql @"
SELECT checksum
FROM runtime_seed_history
WHERE service_name = $serviceLiteral AND seed_name = $seedNameLiteral;
"@) -join "`n"
  if ($verified.Trim() -ne $checksum) {
    throw "Seed history verification failed for '$ServiceKey/$($seedFile.Name)'."
  }
}

$recordedCount = (Invoke-ServicePsql -TuplesOnly -Sql @"
SELECT count(*)
FROM runtime_seed_history
WHERE service_name = $serviceLiteral;
"@) -join "`n"
if ([int]$recordedCount.Trim() -lt $seedFiles.Count) {
  throw "Governed seed history is incomplete for '$ServiceKey': expected=$($seedFiles.Count) recorded=$($recordedCount.Trim())."
}

Write-Host "Governed service seeds: PASS service=$ServiceKey transport=$Transport files=$($seedFiles.Count) sha=$SourceCommitSha"
