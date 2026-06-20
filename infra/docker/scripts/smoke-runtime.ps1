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

for ($i = 1; $i -le $maxAttempts; $i++) {
  Write-Host "Postgres runtime health check attempt $i/$maxAttempts"
  Write-Host "Compose file: $ComposeFile"
  Write-Host "Env file: $EnvFile"

  docker compose --env-file $EnvFile -f $ComposeFile ps postgres | Out-Host

  docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres `
    pg_isready -U bthwani_runtime -d bthwani_runtime | Out-Host

  if ($LASTEXITCODE -eq 0) {
    Write-Host "Postgres runtime health: PASS"
    exit 0
  }

  Start-Sleep -Seconds 2
}

throw "Postgres runtime health: FAIL"
