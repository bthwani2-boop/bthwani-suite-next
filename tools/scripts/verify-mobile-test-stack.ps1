param(
  [switch]$Full,
  [switch]$LanRuntime
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location $RepoRoot

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

Invoke-VerifiedStep "Canonical command and mobile-test policy" {
  node tools/guards/required-command-integrity-gate.mjs
}

Invoke-VerifiedStep "Shared mobile contracts" {
  node --test apps/mobile/tests/*.test.mjs
}

$Apps = @("app-client", "app-partner", "app-captain", "app-field")
foreach ($App in $Apps) {
  Invoke-VerifiedStep "$App owned app + runtime tests" {
    pnpm --dir "apps/$App/runtime" test
  }
}

if ($LanRuntime) {
  Invoke-VerifiedStep "Governed mobile backend/data readiness" {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File apps/mobile/ensure-mobile-dev-runtime.ps1
  }
  Invoke-VerifiedStep "Live LAN gateway runtime proof (no ADB)" {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/verify-mobile-lan-runtime.ps1
  }
}

if ($Full) {
  Invoke-VerifiedStep "Nx full typecheck" {
    pnpm run nx:typecheck
  }
  Invoke-VerifiedStep "Nx full lint" {
    pnpm run nx:lint
  }
  Invoke-VerifiedStep "Nx full tests" {
    pnpm exec nx run-many -t test --all --outputStyle=stream
  }
  Invoke-VerifiedStep "Nx full build" {
    pnpm run nx:build
  }
}

Write-Host "`nmobile-test-stack: PASS" -ForegroundColor Green
