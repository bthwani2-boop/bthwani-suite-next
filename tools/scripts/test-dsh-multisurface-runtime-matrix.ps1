[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:58082",
  [string]$IdentityPassword = ""
)

$ErrorActionPreference = "Stop"
$Implementation = Join-Path $PSScriptRoot "test-dsh-multisurface-runtime-matrix-v2.ps1"
if (-not (Test-Path -LiteralPath $Implementation)) {
  throw "Governed DSH multi-surface implementation is missing: $Implementation"
}

& pwsh -NoProfile -ExecutionPolicy Bypass -File $Implementation `
  -DshBaseUrl $DshBaseUrl `
  -IdentityBaseUrl $IdentityBaseUrl `
  -IdentityPassword $IdentityPassword
if ($LASTEXITCODE -ne 0) {
  throw "Governed DSH multi-surface runtime matrix failed with exit code $LASTEXITCODE"
}
