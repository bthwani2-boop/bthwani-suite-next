Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Stop"

$ComposeFile = "infra\docker\compose.runtime.yml"
$EnvFile = "infra\docker\env\runtime.env.example"

docker compose --env-file $EnvFile -f $ComposeFile down -v
docker compose --env-file $EnvFile -f $ComposeFile up -d postgres

& "infra\docker\scripts\smoke-runtime.ps1"