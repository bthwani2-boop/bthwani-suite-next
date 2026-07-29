[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("reset", "all")]
  [string]$Action,

  [Parameter(Mandatory = $true)]
  [string]$Profiles,

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $Force) {
  throw "Destructive runtime action '$Action' requires -Force."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$runtimeScript = Join-Path $repoRoot "infra/docker/scripts/runtime.ps1"
if (-not (Test-Path -LiteralPath $runtimeScript -PathType Leaf)) {
  throw "Runtime engine is missing: $runtimeScript"
}

Set-Location -LiteralPath $repoRoot
$global:LASTEXITCODE = 0
& pwsh -NoProfile -ExecutionPolicy Bypass -File $runtimeScript `
  -Action $Action `
  -Profiles $Profiles `
  -Force

$exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
if ($exitCode -ne 0) {
  throw "Destructive runtime action '$Action' failed with exit code $exitCode."
}

Write-Host "Destructive runtime action completed: action=$Action profiles=$Profiles" -ForegroundColor Green
