param(
  [string]$Profiles = "dsh,media"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location -LiteralPath $Root

$ComposeFile = ".\infra\docker\compose.runtime.yml"
$EnvFile = ".\infra\docker\env\runtime.env"

if (-not (Test-Path -LiteralPath $EnvFile)) {
  $EnvFile = ".\infra\docker\env\runtime.env.example"
}

if (-not (Test-Path -LiteralPath $EnvFile)) {
  throw "Runtime env file was not found. Expected infra/docker/env/runtime.env or infra/docker/env/runtime.env.example"
}

$ProfileList = @()
if ($Profiles -ne "") {
  $ProfileList = $Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

docker info | Out-Null

$maxAttempts = 30

# ── Postgres smoke ────────────────────────────────────────────────────────────
for ($i = 1; $i -le $maxAttempts; $i++) {
  Write-Host "Postgres health check attempt $i/$maxAttempts"
  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    pg_isready -U bthwani_runtime -d bthwani_runtime | Out-Host
  if ($LASTEXITCODE -eq 0) {
    Write-Host "Postgres: PASS"
    break
  }
  if ($i -eq $maxAttempts) {
    throw "Postgres: FAIL after $maxAttempts attempts"
  }
  Start-Sleep -Seconds 2
}

# ── DSH API smoke ─────────────────────────────────────────────────────────────
if ($ProfileList -contains "dsh") {
  $DshApiRunning = docker ps --filter "name=bthwani-dsh-api-runtime" --filter "status=running" -q 2>$null
  if (-not $DshApiRunning) {
    throw "DSH API smoke: FAIL — dsh profile requested but bthwani-dsh-api-runtime is not running. Start with: pnpm run runtime:up"
  }

  $DshBaseUrl = "http://localhost:58080"
  $DshMaxAttempts = 20

  for ($i = 1; $i -le $DshMaxAttempts; $i++) {
    Write-Host "DSH /dsh/health attempt $i/$DshMaxAttempts"
    try {
      $health = Invoke-RestMethod "$DshBaseUrl/dsh/health" -TimeoutSec 5 -ErrorAction Stop
      Write-Host "DSH /dsh/health: PASS — $($health | ConvertTo-Json -Compress)"
      break
    } catch {
      if ($i -eq $DshMaxAttempts) { throw "DSH /dsh/health: FAIL — $_" }
      Start-Sleep -Seconds 3
    }
  }

  $readiness = Invoke-RestMethod "$DshBaseUrl/dsh/readiness" -TimeoutSec 10 -ErrorAction Stop
  Write-Host "DSH /dsh/readiness: PASS — $($readiness | ConvertTo-Json -Compress)"

  $stores = Invoke-RestMethod "$DshBaseUrl/dsh/stores?limit=10&offset=0" -TimeoutSec 10 -ErrorAction Stop
  $count = if ($stores.stores) { $stores.stores.Count } else { 0 }
  if ($count -eq 0) {
    throw "DSH /dsh/stores: FAIL — returned 0 stores. Run: pnpm run runtime:seed"
  }
  Write-Host "DSH /dsh/stores: PASS — $count stores"

  $store1 = Invoke-RestMethod "$DshBaseUrl/dsh/stores/store-test-grocery" -TimeoutSec 10 -ErrorAction Stop
  if ($store1.store.id -ne "store-test-grocery") { throw "DSH /dsh/stores/store-test-grocery: FAIL — wrong id returned" }
  Write-Host "DSH /dsh/stores/store-test-grocery: PASS — $($store1.store.displayName)"

  Write-Host "DSH API smoke: PASS"
}

# ── MinIO smoke ───────────────────────────────────────────────────────────────
if ($ProfileList -contains "media") {
  $MinioRunning = docker ps --filter "name=bthwani-minio-runtime" --filter "status=running" -q 2>$null
  if (-not $MinioRunning) {
    throw "MinIO smoke: FAIL — media profile requested but bthwani-minio-runtime is not running. Start with: pnpm run runtime:up"
  }

  $MinioUrl = "http://localhost:57000"
  $MinioMaxAttempts = 15

  for ($i = 1; $i -le $MinioMaxAttempts; $i++) {
    Write-Host "MinIO /minio/health/live attempt $i/$MinioMaxAttempts"
    try {
      Invoke-RestMethod "$MinioUrl/minio/health/live" -TimeoutSec 5 -ErrorAction Stop | Out-Null
      Write-Host "MinIO /minio/health/live: PASS"
      break
    } catch {
      if ($i -eq $MinioMaxAttempts) { throw "MinIO /minio/health/live: FAIL — $_" }
      Start-Sleep -Seconds 3
    }
  }

  try {
    Invoke-RestMethod "$MinioUrl/minio/health/ready" -TimeoutSec 10 -ErrorAction Stop | Out-Null
    Write-Host "MinIO /minio/health/ready: PASS"
  } catch {
    throw "MinIO /minio/health/ready: FAIL — $_"
  }

  Write-Host "MinIO smoke: PASS"
}

Write-Host "`nSmoke: PASS"
