<#
.SYNOPSIS
  Applies the explicit DSH local-media overlay.

.DESCRIPTION
  Local media binaries are workstation state and are never tracked. This script
  fail-closes on the tracked manifest, validates every local file, uploads only
  manifest-listed objects, materializes DAM bindings under .artifacts/local-dev,
  then delegates SQL application to the canonical service seed engine.
#>

[CmdletBinding()]
param(
  [string]$SourceCommitSha = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($env:NODE_ENV -eq "production") {
  throw "DSH local media overlay is forbidden when NODE_ENV=production."
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../../")).Path
$ManifestPath = Join-Path $RepoRoot "services/dsh/database/seeds/media/local-media.manifest.json"
$MediaRoot = Join-Path $RepoRoot "services/dsh/database/seeds/local/media"
$Validator = Join-Path $RepoRoot "tools/scripts/check-local-media-contract.mjs"
$Materializer = Join-Path $RepoRoot "tools/scripts/materialize-dsh-local-media.mjs"
$SeedRunner = Join-Path $RepoRoot "tools/scripts/invoke-service-seeds.ps1"
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$GeneratedSeedDirectory = Join-Path $RepoRoot ".artifacts/local-dev/dsh-media-seed"

foreach ($requiredFile in @($ManifestPath, $Validator, $Materializer, $SeedRunner, $ComposeFile, $EnvFile)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required DSH local media authority not found: $requiredFile"
  }
}

& node $Validator --mode runtime
if ($LASTEXITCODE -ne 0) {
  throw "DSH local media runtime validation failed (exit $LASTEXITCODE)"
}

& node $Materializer
if ($LASTEXITCODE -ne 0) {
  throw "DSH local media SQL materialization failed (exit $LASTEXITCODE)"
}

$manifest = Get-Content -Raw -LiteralPath $ManifestPath | ConvertFrom-Json
$relativePaths = @($manifest.media | ForEach-Object { [string]$_.relativeSourcePath })
if ($relativePaths.Count -eq 0) {
  throw "Canonical DSH local media manifest contains no objects."
}

$rootUser = if ($env:BTHWANI_MINIO_ROOT_USER) { $env:BTHWANI_MINIO_ROOT_USER } else { "bthwani_minio" }
$rootPassword = if ($env:BTHWANI_MINIO_ROOT_PASSWORD) { $env:BTHWANI_MINIO_ROOT_PASSWORD } else { "bthwani_minio_password" }
$mcImage = "minio/mc:RELEASE.2025-08-13T08-35-41Z"

# The validator rejects traversal/backslashes before any path reaches the shell.
# Each object is copied explicitly; recursive mirror/copy is forbidden because it
# would turn incidental workstation files into runtime truth.
$copyCommands = @($relativePaths | ForEach-Object {
  $relativePath = $_
  "mc cp --overwrite `"/seed/$relativePath`" `"local/dsh-media/$relativePath`""
})
$verifyCommands = @($relativePaths | ForEach-Object {
  $relativePath = $_
  "mc stat `"local/dsh-media/$relativePath`" >/dev/null"
})
$command = @(
  "set -eu",
  "mc alias set local http://minio:9000 `"`$MINIO_ROOT_USER`" `"`$MINIO_ROOT_PASSWORD`"",
  "mc mb --ignore-existing local/dsh-media",
  "mc anonymous set none local/dsh-media"
) + $copyCommands + $verifyCommands

$mount = "type=bind,source=$MediaRoot,target=/seed,readonly"
& docker run --rm `
  --network bthwani-runtime `
  --env "MINIO_ROOT_USER=$rootUser" `
  --env "MINIO_ROOT_PASSWORD=$rootPassword" `
  --mount $mount `
  --entrypoint /bin/sh `
  $mcImage -c ($command -join "`n")
if ($LASTEXITCODE -ne 0) {
  throw "DSH local media object upload failed (exit $LASTEXITCODE)"
}

if ([string]::IsNullOrWhiteSpace($SourceCommitSha)) {
  $SourceCommitSha = (& git -C $RepoRoot rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($SourceCommitSha)) {
    throw "Unable to resolve source commit SHA for DSH local media seed history."
  }
}

& $SeedRunner `
  -ServiceKey "dsh-media" `
  -SeedDirectory $GeneratedSeedDirectory `
  -Transport docker `
  -DockerUser "dsh_runtime" `
  -DockerDatabase "dsh_runtime" `
  -ComposeFile $ComposeFile `
  -EnvFile $EnvFile `
  -SourceCommitSha $SourceCommitSha `
  -AllowLocalSeeds
if ($LASTEXITCODE -ne 0) {
  throw "Canonical DSH local media metadata seed failed (exit $LASTEXITCODE)"
}

Write-Host "DSH local media overlay: PASS objects=$($relativePaths.Count) authority=services/dsh/database/seeds/media/local-media.manifest.json"
