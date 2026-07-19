[CmdletBinding()]
param([switch]$Cleanup)

$ErrorActionPreference = "Stop"
$Implementation = Join-Path $PSScriptRoot "run-lian-full-runtime-closure-v2.ps1"
if (-not (Test-Path -LiteralPath $Implementation)) {
  throw "Sovereign runtime closure implementation is missing: $Implementation"
}

$Arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $Implementation)
if ($Cleanup) { $Arguments += "-Cleanup" }
& pwsh @Arguments
if ($LASTEXITCODE -ne 0) {
  throw "Sovereign runtime closure v2 failed with exit code $LASTEXITCODE"
}
