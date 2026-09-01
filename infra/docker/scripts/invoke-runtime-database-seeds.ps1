<#
.SYNOPSIS
  Maps a runtime service to the canonical cross-transport seed runner.

.DESCRIPTION
  This adapter owns only service paths and Docker credentials. Seed discovery,
  checksums, transactions, and runtime_seed_history are owned exclusively by
  tools/scripts/invoke-service-seeds.ps1. A service without local fixtures must
  declare that empty set explicitly instead of being silently skipped.
#>

[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dsh", "wlt")]
  [string]$Service,

  [string]$SourceCommitSha = $env:CANDIDATE_SHA,

  [switch]$AllowLocalSeeds
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../../")).Path
$CanonicalSeedRunner = Join-Path $RepoRoot "tools/scripts/invoke-service-seeds.ps1"
$SourceCommitProvenancePath = Join-Path $RepoRoot "tools/scripts/lib/source-commit-provenance.ps1"
if (-not (Test-Path -LiteralPath $CanonicalSeedRunner -PathType Leaf)) {
  throw "Canonical service seed runner not found: $CanonicalSeedRunner"
}
if (-not (Test-Path -LiteralPath $SourceCommitProvenancePath -PathType Leaf)) {
  throw "Checked-out source commit resolver not found: $SourceCommitProvenancePath"
}
. $SourceCommitProvenancePath
$SourceCommitSha = Resolve-BthwaniCheckedOutSourceCommitSha -RepoRoot $RepoRoot -ExpectedSourceCommitSha $SourceCommitSha

$serviceMap = @{
  dsh = @{
    Directory = "services/dsh/database/seeds/local"
    User = "dsh_runtime"
    Database = "dsh_runtime"
    AllowEmptySeedSet = $false
  }
  wlt = @{
    Directory = "services/wlt/database/seeds/local"
    User = "wlt_runtime"
    Database = "wlt_runtime"
    AllowEmptySeedSet = $true
  }
}
$config = $serviceMap[$Service]

# Local fixtures reference the Workforce-provisioned field agent and captain
# through @@FIELD_ACTOR_ID@@ / @@CAPTAIN_ACTOR_ID@@. Those actors are created at
# runtime by tools/dev/local-workforce-provisioning.mjs, which writes this
# registry. When it is absent the seed runner reports the unresolved tokens.
$GeneratedActorRegistry = Join-Path $RepoRoot ".artifacts/local-dev/workforce-actors.json"
$placeholderFile = if (Test-Path -LiteralPath $GeneratedActorRegistry -PathType Leaf) {
  $GeneratedActorRegistry
} else {
  ""
}

$additionalPlaceholders = @{}
if ($Service -eq "wlt") {
  $runtimeEnvLines = Get-Content -LiteralPath (Join-Path $RepoRoot "infra/docker/env/runtime.env.example")
  $encryptionLine = $runtimeEnvLines | Where-Object { $_ -match '^WLT_PAYOUT_ENCRYPTION_KEY=(.+)$' } | Select-Object -First 1
  if ($null -eq $encryptionLine -or $encryptionLine -notmatch '^WLT_PAYOUT_ENCRYPTION_KEY=(.+)$') {
    throw "WLT_PAYOUT_ENCRYPTION_KEY is missing from the governed local runtime environment."
  }
  $additionalPlaceholders.WLT_PAYOUT_ENCRYPTION_KEY = $Matches[1]
}

$parameters = @{
  ServiceKey = $Service
  SeedDirectory = $config.Directory
  Transport = "docker"
  DockerUser = $config.User
  DockerDatabase = $config.Database
  ComposeFile = "infra/docker/compose.runtime.yml"
  EnvFile = "infra/docker/env/runtime.env.example"
  SourceCommitSha = $SourceCommitSha
  PlaceholderFile = $placeholderFile
  AdditionalPlaceholders = $additionalPlaceholders
  AllowLocalSeeds = [bool]$AllowLocalSeeds
  AllowEmptySeedSet = [bool]$config.AllowEmptySeedSet
}

& $CanonicalSeedRunner @parameters
if ($LASTEXITCODE -ne 0) {
  throw "Governed runtime seeds failed for '$Service' (exit $LASTEXITCODE)."
}

Write-Host "Governed runtime seed adapter: PASS service=$Service authority=tools/scripts/invoke-service-seeds.ps1"
