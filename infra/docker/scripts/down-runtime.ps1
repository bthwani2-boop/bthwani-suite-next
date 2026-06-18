Set-Location -LiteralPath "C:\bthwani-suite-next"

$ErrorActionPreference = "Stop"

$ComposeFile = "infra\docker\compose.runtime.yml"
$EnvFile = "infra\docker\env\runtime.env.example"

docker compose --env-file $EnvFile -f $ComposeFile down