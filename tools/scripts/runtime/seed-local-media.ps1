param()

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$MediaRoot = (Resolve-Path (Join-Path $RepoRoot "services/dsh/database/seeds/local/media/realistic")).Path
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$McImage = "minio/mc:RELEASE.2025-08-13T08-35-41Z"

if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  throw "Runtime environment file not found: $EnvFile"
}

$runtimeEnv = @{}
Get-Content -LiteralPath $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
  $parts = $line.Split("=", 2)
  $runtimeEnv[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
}

$user = if ($env:BTHWANI_MINIO_ROOT_USER) { $env:BTHWANI_MINIO_ROOT_USER } elseif ($runtimeEnv.BTHWANI_MINIO_ROOT_USER) { $runtimeEnv.BTHWANI_MINIO_ROOT_USER } else { "bthwani_minio" }
$password = if ($env:BTHWANI_MINIO_ROOT_PASSWORD) { $env:BTHWANI_MINIO_ROOT_PASSWORD } elseif ($runtimeEnv.BTHWANI_MINIO_ROOT_PASSWORD) { $runtimeEnv.BTHWANI_MINIO_ROOT_PASSWORD } else { "bthwani_minio_password" }

$requiredObjects = @(
  "node-electronics.jpg",
  "node-grocery.jpg",
  "node-pharmacy.jpg",
  "node-sweets.jpg"
)
foreach ($name in $requiredObjects) {
  $source = Join-Path $MediaRoot $name
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Required local media fixture is missing: $source"
  }
}

Write-Host "`n--- Uploading governed local media fixtures to MinIO ---"
$mount = "type=bind,source=$MediaRoot,target=/fixtures,readonly"
$command = @'
set -eu
mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb --ignore-existing local/dsh-media
mc anonymous set none local/dsh-media
mc mirror --overwrite --remove /fixtures local/dsh-media/realistic
for object in node-electronics.jpg node-grocery.jpg node-pharmacy.jpg node-sweets.jpg; do
  mc stat "local/dsh-media/realistic/$object" >/dev/null
done
'@

& docker run --rm `
  --network bthwani-runtime `
  --env "MINIO_ROOT_USER=$user" `
  --env "MINIO_ROOT_PASSWORD=$password" `
  --mount $mount `
  --entrypoint /bin/sh `
  $McImage -c $command

if ($LASTEXITCODE -ne 0) {
  throw "Local media fixture upload failed with exit code $LASTEXITCODE"
}

Write-Host "Local media fixtures: PASS"
