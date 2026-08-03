<#
.SYNOPSIS
  Maps a runtime service to the canonical cross-transport seed runner.

.DESCRIPTION
  This adapter owns only service paths and Docker credentials. Seed discovery,
  checksums, transactions, and runtime_seed_history are owned exclusively by
  tools/scripts/invoke-service-seeds.ps1.
#>

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

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../../")).Path
$CanonicalSeedRunner = Join-Path $RepoRoot "tools/scripts/invoke-service-seeds.ps1"
if (-not (Test-Path -LiteralPath $CanonicalSeedRunner -PathType Leaf)) {
  throw "Canonical service seed runner not found: $CanonicalSeedRunner"
}

$serviceMap = @{
  dsh = @{
    Directory = "services/dsh/database/seeds/local"
    User = "dsh_runtime"
    Database = "dsh_runtime"
  }
  wlt = @{
    Directory = "services/wlt/database/seeds/local"
    User = "wlt_runtime"
    Database = "wlt_runtime"
  }
}
$config = $serviceMap[$Service]

$parameters = @{
  ServiceKey = $Service
  SeedDirectory = $config.Directory
  Transport = "docker"
  DockerUser = $config.User
  DockerDatabase = $config.Database
  ComposeFile = "infra/docker/compose.runtime.yml"
  EnvFile = "infra/docker/env/runtime.env.example"
  SourceCommitSha = $SourceCommitSha
  AllowLocalSeeds = [bool]$AllowLocalSeeds
}

& $CanonicalSeedRunner @parameters
if ($LASTEXITCODE -ne 0) {
  throw "Governed runtime seeds failed for '$Service' (exit $LASTEXITCODE)."
}

Write-Host "Governed runtime seed adapter: PASS service=$Service authority=tools/scripts/invoke-service-seeds.ps1"
