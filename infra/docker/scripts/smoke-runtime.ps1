Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Stop"

$ComposeFile = "infra\docker\compose.runtime.yml"
$EnvFile = "infra\docker\env\runtime.env.example"

docker info | Out-Null

docker compose --env-file $EnvFile -f $ComposeFile ps

$maxAttempts = 30
for ($i = 1; $i -le $maxAttempts; $i++) {
  try {
    docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres pg_isready -U bthwani_runtime -d bthwani_runtime | Out-Null
    Write-Host "Postgres runtime health: PASS"
    exit 0
  } catch {
    Start-Sleep -Seconds 2
  }
}

throw "Postgres runtime health: FAIL"