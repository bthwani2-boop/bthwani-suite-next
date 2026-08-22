[CmdletBinding()]
param(
  [switch]$StopRuntimeAfter
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot

function Invoke-VerifiedStep {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  & $Action
  $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
  if ($exitCode -ne 0) {
    throw "$Name failed with exit code $exitCode"
  }
}

$passed = $false
try {
  # Closure must converge governed migrations and seeds, not merely observe that
  # currently running APIs are healthy. runtime:full:bootstrap-dev is the sole
  # local authority allowed to rebuild one service database when its immutable
  # migration ledger has drifted, then restart APIs and re-provision canonical
  # Identity/Workforce/DSH/WLT development state before smoke begins.
  Invoke-VerifiedStep "Governed runtime bootstrap and development data" {
    pnpm run runtime:full:bootstrap-dev
  }

  Invoke-VerifiedStep "Full runtime smoke" {
    pnpm run runtime:full:smoke
  }

  Invoke-VerifiedStep "Four-app multisurface integration matrix" {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/test-dsh-multisurface-runtime-matrix-v2.ps1
  }

  Invoke-VerifiedStep "LAN gateway runtime proof without ADB" {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/verify-mobile-lan-runtime.ps1
  }

  $passed = $true
  Write-Host "`nmobile-runtime-closure: PASS" -ForegroundColor Green
}
finally {
  if ($StopRuntimeAfter) {
    Write-Host "`n=== Stop governed runtime ===" -ForegroundColor Cyan
    pnpm run runtime:full:down
    if ($LASTEXITCODE -ne 0 -and $passed) {
      throw "Runtime verification passed but runtime cleanup failed with exit code $LASTEXITCODE."
    }
  }
}
