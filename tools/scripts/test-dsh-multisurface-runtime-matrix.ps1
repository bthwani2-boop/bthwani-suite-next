[CmdletBinding()]
param(
  [string]$DshBaseUrl = "http://127.0.0.1:58080",
  [string]$IdentityBaseUrl = "http://127.0.0.1:58082",
  [string]$IdentityPassword = ""
)

$ErrorActionPreference = "Stop"

$DispatchFixture = Join-Path $PSScriptRoot "prepare-dsh-runtime-captain-dispatch.ps1"
if (-not (Test-Path -LiteralPath $DispatchFixture)) {
  throw "Required runtime captain dispatch fixture is missing: $DispatchFixture"
}
Write-Host "Preparing governed captain dispatch runtime fixture"
& pwsh -NoProfile -ExecutionPolicy Bypass -File $DispatchFixture
if ($LASTEXITCODE -ne 0) {
  throw "governed captain dispatch runtime fixture failed with exit code $LASTEXITCODE"
}

$Matrices = @(
  [ordered]@{
    name = "governed five-surface commerce and field journey"
    path = Join-Path $PSScriptRoot "test-dsh-multisurface-runtime-matrix-v2.ps1"
  },
  [ordered]@{
    name = "support ownership and notifications journey"
    path = Join-Path $PSScriptRoot "test-dsh-support-notifications-runtime-matrix.ps1"
  },
  [ordered]@{
    name = "focused partner multi-surface journey"
    path = Join-Path $PSScriptRoot "test-partner-multisurface-runtime-journey.ps1"
  }
)

foreach ($Matrix in $Matrices) {
  if (-not (Test-Path -LiteralPath $Matrix.path)) {
    throw "Required runtime matrix is missing: $($Matrix.path)"
  }
  Write-Host "Running $($Matrix.name)"
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $Matrix.path `
    -DshBaseUrl $DshBaseUrl `
    -IdentityBaseUrl $IdentityBaseUrl `
    -IdentityPassword $IdentityPassword
  if ($LASTEXITCODE -ne 0) {
    throw "$($Matrix.name) failed with exit code $LASTEXITCODE"
  }
}

Write-Host "DSH sovereign commerce, field, support, notifications, and focused partner matrix: PASS"
