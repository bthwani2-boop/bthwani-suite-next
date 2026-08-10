[CmdletBinding()]
param(
  [ValidateSet("Verify", "Repair", "Full")]
  [string]$Mode = "Verify"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$repairScript = Join-Path $PSScriptRoot "repair-leanctx-local.ps1"
$diagnosticScript = Join-Path $PSScriptRoot "diagnose-leanctx.ps1"

Push-Location $root
try {
  if ($Mode -in @("Repair", "Full")) {
    & $repairScript
    if (-not $?) {
      throw "LeanCTX unified repair failed."
    }
  }

  & $diagnosticScript -Strict
  if (-not $?) {
    throw "LeanCTX strict diagnostic failed."
  }

  Write-Output "leanctx_mode=$Mode"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
