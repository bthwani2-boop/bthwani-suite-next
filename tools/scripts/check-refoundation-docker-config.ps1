[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $RepoRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Required command is unavailable: docker"
}

$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$RuntimeCompose = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$FinancialCompose = Join-Path $RepoRoot "infra/docker/compose.financial-simulators.yml"
$ObservabilityCompose = Join-Path $RepoRoot "infra/docker/compose.observability.yml"

foreach ($requiredFile in @($EnvFile, $RuntimeCompose, $FinancialCompose, $ObservabilityCompose)) {
  if (-not (Test-Path -LiteralPath $requiredFile -PathType Leaf)) {
    throw "Required Docker configuration file is missing: $requiredFile"
  }
}

function Invoke-ComposeConfig {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string[]]$Files,
    [Parameter(Mandatory)][string[]]$Profiles
  )

  Write-Host "`n== $Name ==" -ForegroundColor Cyan
  $arguments = @("compose", "--env-file", $EnvFile)
  foreach ($file in $Files) {
    $arguments += @("-f", $file)
  }
  foreach ($profile in $Profiles) {
    $arguments += @("--profile", $profile)
  }
  $arguments += @("config", "--quiet")

  $global:LASTEXITCODE = 0
  & docker @arguments
  $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
  if ($exitCode -ne 0) {
    throw "$Name failed with exit code $exitCode"
  }
}

Invoke-ComposeConfig `
  -Name "Core runtime Compose configuration" `
  -Files @($RuntimeCompose) `
  -Profiles @("identity", "workforce", "providers", "platform", "dsh", "media", "wlt")

Invoke-ComposeConfig `
  -Name "Financial support Compose configuration" `
  -Files @($RuntimeCompose, $FinancialCompose) `
  -Profiles @("identity", "wlt", "financial-simulators", "mail", "cache")

Invoke-ComposeConfig `
  -Name "Observability Compose configuration" `
  -Files @($RuntimeCompose, $ObservabilityCompose) `
  -Profiles @("observability")

Write-Host "`nDocker Compose configuration: PASS" -ForegroundColor Green
Write-Host "No containers were started and no volumes or data were modified." -ForegroundColor Yellow
