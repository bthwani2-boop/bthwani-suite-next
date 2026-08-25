#!/usr/bin/env pwsh
[CmdletBinding()]
param(
  [string]$Profiles = "dsh,media-storage"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$Runtime = Join-Path $PSScriptRoot "runtime.ps1"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.local-production.env"

if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  throw @"
runtime.local-production.env not found.
Run:
  .\infra\docker\scripts\generate-local-production-env.ps1
"@
}

$Raw = Get-Content -LiteralPath $EnvFile -Raw

if ($Raw -match "REPLACE_WITH_GENERATED_") {
  throw "runtime.local-production.env contains unresolved secret placeholders."
}

# Import into this child process. Shell environment has precedence over the
# committed example env used by the canonical orchestrator.
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()

  if (
    -not $line -or
    $line.StartsWith("#") -or
    -not $line.Contains("=")
  ) {
    return
  }

  $parts = $line.Split("=", 2)
  $key = $parts[0].Trim()
  $value = $parts[1].Trim()

  if (
    ($value.StartsWith('"') -and $value.EndsWith('"')) -or
    ($value.StartsWith("'") -and $value.EndsWith("'"))
  ) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  [Environment]::SetEnvironmentVariable($key, $value, "Process")
}

if (-not (Test-Path -LiteralPath $Runtime -PathType Leaf)) {
  throw "Canonical runtime authority not found: $Runtime"
}

& $Runtime -Action up -Profiles $Profiles