<#
.SYNOPSIS
  Clears failed Identity login attempts for canonical local-development actors only.

.DESCRIPTION
  This is a local recovery utility for development bootstrap convergence. It never
  changes the production lockout policy, passwords, actors, or remote databases.
  The command is intentionally scoped to the canonical Docker runtime and the
  usernames declared in tools/dev/local-actors.json.
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$LocalActorsScript = Join-Path $RepoRoot "tools/dev/local-actors.ps1"

foreach ($required in @($ComposeFile, $EnvFile, $LocalActorsScript)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "Required local runtime authority not found: $required"
  }
}

if (([string]$env:NODE_ENV).Trim().ToLowerInvariant() -eq "production" -or
    ([string]$env:ENVIRONMENT).Trim().ToLowerInvariant() -eq "production" -or
    ([string]$env:BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED).Trim().ToLowerInvariant() -eq "true") {
  throw "Local Identity lockout recovery is forbidden for production-authorized environments."
}

. $LocalActorsScript

function Import-RuntimeEnvironment {
  foreach ($rawLine in Get-Content -LiteralPath $EnvFile) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }

    $parts = $line.Split("=", 2)
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
        ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, "Process"))) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

function Quote-SqlLiteral {
  param([Parameter(Mandatory)][string]$Value)
  return "'" + $Value.Replace("'", "''") + "'"
}

Import-RuntimeEnvironment

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI was not found. Start Docker Desktop and retry."
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Desktop is not reachable."
}

$registry = Get-LocalActorsRegistry
$usernames = @()
foreach ($property in $registry.actors.PSObject.Properties) {
  if (-not [string]::IsNullOrWhiteSpace([string]$property.Value.username)) {
    $usernames += [string]$property.Value.username
  }
}
foreach ($property in $registry.platformActors.PSObject.Properties) {
  if (-not [string]::IsNullOrWhiteSpace([string]$property.Value.username)) {
    $usernames += [string]$property.Value.username
  }
}
$usernames = @($usernames | Sort-Object -Unique)
if ($usernames.Count -eq 0) {
  throw "Canonical local actor registry contains no usernames."
}

$postgresUser = if ([string]::IsNullOrWhiteSpace([string]$env:BTHWANI_POSTGRES_USER)) {
  "bthwani_runtime"
} else {
  [string]$env:BTHWANI_POSTGRES_USER
}
$identityDb = if ([string]::IsNullOrWhiteSpace([string]$env:BTHWANI_IDENTITY_DB_NAME)) {
  "identity_runtime"
} else {
  [string]$env:BTHWANI_IDENTITY_DB_NAME
}

$composeBase = @("--env-file", $EnvFile, "-f", $ComposeFile, "--profile", "identity")
$running = & docker compose @composeBase ps --status running --services postgres
if ($LASTEXITCODE -ne 0 -or (@($running) -notcontains "postgres")) {
  throw "Canonical local PostgreSQL runtime is not running. Start the identity runtime first."
}

$quotedUsernames = ($usernames | ForEach-Object { Quote-SqlLiteral -Value $_ }) -join ","
$sql = @"
WITH deleted AS (
  DELETE FROM identity_login_attempts
  WHERE succeeded = false
    AND username IN ($quotedUsernames)
  RETURNING username
)
SELECT count(*) FROM deleted;
"@

Write-Host "=== local Identity lockout recovery ==="
Write-Host "database: $identityDb"
Write-Host "actors: $($usernames -join ', ')"

$result = & docker compose @composeBase exec -T postgres psql `
  -U $postgresUser `
  -d $identityDb `
  -v ON_ERROR_STOP=1 `
  -tAc $sql
if ($LASTEXITCODE -ne 0) {
  throw "Failed to clear local Identity login attempts."
}

$deletedCount = (($result -join "").Trim())
if ([string]::IsNullOrWhiteSpace($deletedCount)) { $deletedCount = "0" }
Write-Host "cleared_failed_attempts: $deletedCount"
Write-Host "Local Identity lockout recovery: PASS"
