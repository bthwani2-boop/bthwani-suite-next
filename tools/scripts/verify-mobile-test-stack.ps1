param(
  [switch]$Full
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
  $exitCode = $LASTEXITCODE
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
