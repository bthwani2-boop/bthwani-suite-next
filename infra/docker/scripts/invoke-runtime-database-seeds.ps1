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
if ($env:NODE_ENV -eq "production") {
  throw "Local runtime seeds are forbidden when NODE_ENV=production."
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) { throw "Compose file not found: $ComposeFile" }
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) { throw "Runtime env file not found: $EnvFile" }

$serviceMap = @{
  dsh = @{ Directory = "services/dsh/database/seeds/local"; User = "dsh_runtime"; Database = "dsh_runtime" }
  wlt = @{ Directory = "services/wlt/database/seeds/local"; User = "wlt_runtime"; Database = "wlt_runtime" }
}
$config = $serviceMap[$Service]
$seedDirectory = Join-Path $RepoRoot $config.Directory
if (-not (Test-Path -LiteralPath $seedDirectory -PathType Container)) {
  throw "Seed directory not found for '$Service': $seedDirectory"
}
$seedFiles = @(Get-ChildItem -LiteralPath $seedDirectory -Filter "*.sql" -File | Sort-Object Name)
if ($seedFiles.Count -eq 0) {
  throw "No local seed files found for '$Service'."
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
  service_name      text        NOT NULL,
  seed_name         text        NOT NULL,
  checksum          text        NOT NULL,
  source_commit_sha text        NOT NULL,
  applied_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_name, seed_name)
);
"@ | Out-Null

foreach ($seedFile in $seedFiles) {
  $checksum = (Get-FileHash -LiteralPath $seedFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  $recorded = (Invoke-ComposePsql -TuplesOnly -Sql "SELECT checksum FROM runtime_seed_history WHERE service_name = '$Service' AND seed_name = '$($seedFile.Name)';") -join "`n"
  $recorded = $recorded.Trim()

  if ($recorded -eq $checksum) {
    Write-Host "Skipping unchanged local seed: service=$Service file=$($seedFile.Name)"
    continue
  }

  Write-Host "Applying governed local seed: service=$Service file=$($seedFile.Name)"
  $sql = Get-Content -LiteralPath $seedFile.FullName -Raw
  Invoke-ComposePsql -Sql $sql | Out-Null

  Invoke-ComposePsql -Sql @"
INSERT INTO runtime_seed_history(service_name, seed_name, checksum, source_commit_sha, applied_at)
VALUES ('$Service', '$($seedFile.Name)', '$checksum', '$SourceCommitSha', now())
ON CONFLICT (service_name, seed_name) DO UPDATE SET
  checksum = EXCLUDED.checksum,
  source_commit_sha = EXCLUDED.source_commit_sha,
  applied_at = EXCLUDED.applied_at;
"@ | Out-Null
}

Write-Host "Governed local runtime seeds: PASS service=$Service files=$($seedFiles.Count) sha=$SourceCommitSha"
