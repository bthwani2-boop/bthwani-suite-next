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

docker info | Out-Null

$maxAttempts = 30

# ── Postgres smoke ────────────────────────────────────────────────────────────
for ($i = 1; $i -le $maxAttempts; $i++) {
  Write-Host "Postgres runtime health check attempt $i/$maxAttempts"

  docker compose --env-file $EnvFile -f $ComposeFile ps postgres | Out-Host

  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    pg_isready -U bthwani_runtime -d bthwani_runtime | Out-Host

  if ($LASTEXITCODE -eq 0) {
    Write-Host "Postgres runtime health: PASS"
    break
  }

  if ($i -eq $maxAttempts) {
    throw "Postgres runtime health: FAIL after $maxAttempts attempts"
  }

  Start-Sleep -Seconds 2
}

# ── DSH API smoke (only if dsh-api container is running) ─────────────────────
$DshApiRunning = docker compose --env-file $EnvFile -f $ComposeFile ps dsh-api --format json 2>$null |
  ConvertFrom-Json -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "running" -or $_.Health -eq "healthy" }

if (-not $DshApiRunning) {
  # Try plain docker ps as fallback
  $DshApiRunning = docker ps --filter "name=bthwani-dsh-api-runtime" --filter "status=running" -q 2>$null
}

if ($DshApiRunning) {
  Write-Host "DSH API detected — running API smoke checks..."

  $DshBaseUrl = "http://localhost:58080"
  $DshMaxAttempts = 20

  # health
  for ($i = 1; $i -le $DshMaxAttempts; $i++) {
    Write-Host "DSH /dsh/health check attempt $i/$DshMaxAttempts"
    try {
      $health = Invoke-RestMethod "$DshBaseUrl/dsh/health" -TimeoutSec 5 -ErrorAction Stop
      Write-Host "DSH /dsh/health: PASS — $($health | ConvertTo-Json -Compress)"
      break
    } catch {
      if ($i -eq $DshMaxAttempts) { throw "DSH /dsh/health: FAIL — $_" }
      Start-Sleep -Seconds 3
    }
  }

  # readiness
  try {
    $readiness = Invoke-RestMethod "$DshBaseUrl/dsh/readiness" -TimeoutSec 10 -ErrorAction Stop
    Write-Host "DSH /dsh/readiness: PASS — $($readiness | ConvertTo-Json -Compress)"
  } catch {
    throw "DSH /dsh/readiness: FAIL — $_"
  }

  # stores list
  try {
    $stores = Invoke-RestMethod "$DshBaseUrl/dsh/stores?limit=10&offset=0" -TimeoutSec 10 -ErrorAction Stop
    $count = if ($stores.stores) { $stores.stores.Count } else { 0 }
    Write-Host "DSH /dsh/stores: PASS — returned $count stores"
    if ($count -eq 0) {
      Write-Host "WARNING: /dsh/stores returned 0 stores — seed may not have run"
    }
  } catch {
    throw "DSH /dsh/stores: FAIL — $_"
  }

  Write-Host "DSH API smoke: PASS"
} else {
  Write-Host "DSH API container not running — skipping DSH API smoke (start with --profile dsh to include)"
}
