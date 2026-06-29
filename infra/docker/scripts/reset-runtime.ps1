param(
  [string]$Profiles = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

$ComposeFile = "infra\docker\compose.runtime.yml"
$EnvFile     = "infra\docker\env\runtime.env.example"

$ProfileList = @()
if ($Profiles -ne "") {
  $ProfileList = $Profiles.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

$ProfileArgs = @()
foreach ($p in $ProfileList) { $ProfileArgs += @("--profile", $p) }

# Tear down including volumes
docker compose --env-file $EnvFile -f $ComposeFile @ProfileArgs down -v --remove-orphans
Write-Host "Volumes removed."

# Restart
docker compose --env-file $EnvFile -f $ComposeFile @ProfileArgs up -d
Write-Host "Containers started."

# If dsh profile active: migrate + seed via central orchestrator
if ($ProfileList -contains "dsh") {
  & "infra\docker\scripts\runtime.ps1" -Action migrate -Profiles $Profiles
  & "infra\docker\scripts\runtime.ps1" -Action seed    -Profiles $Profiles
}

& "infra\docker\scripts\smoke-runtime.ps1"

Write-Host "reset-runtime: PASS"
