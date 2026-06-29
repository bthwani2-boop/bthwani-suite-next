param(
  [string]$Profiles = ""
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

$ComposeFile = "infra\docker\compose.runtime.yml"
$EnvFile     = "infra\docker\env\runtime.env.example"

$ProfileArgs = @()
if ($Profiles -ne "") {
  $Profiles.Split(",") | ForEach-Object {
    $p = $_.Trim()
    if ($p) { $ProfileArgs += @("--profile", $p) }
  }
}

docker compose --env-file $EnvFile -f $ComposeFile @ProfileArgs down --remove-orphans
Write-Host "Runtime stopped."
