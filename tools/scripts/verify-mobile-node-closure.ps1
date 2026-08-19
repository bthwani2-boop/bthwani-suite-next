[CmdletBinding()]
param()

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

Invoke-VerifiedStep "Deterministic OpenAPI contract and client materialization" {
  node tools/scripts/materialize-openapi-artifacts.mjs
}

Invoke-VerifiedStep "Shared mobile contracts, Nx ownership, and control-panel propagation" {
  node --test apps/mobile/tests/*.test.mjs
}

foreach ($App in @("app-client", "app-partner", "app-captain", "app-field")) {
  Invoke-VerifiedStep "$App canonical package test" {
    pnpm --dir "apps/$App/runtime" test
  }
}

Invoke-VerifiedStep "control-panel canonical package test" {
  pnpm --dir apps/control-panel/runtime test
}

Invoke-VerifiedStep "Nx full typecheck" { pnpm run nx:typecheck }
Invoke-VerifiedStep "Nx full lint" { pnpm run nx:lint }
Invoke-VerifiedStep "Nx full tests" { pnpm exec nx run-many -t test --all --outputStyle=stream }
Invoke-VerifiedStep "Nx full build" { pnpm run nx:build }

Write-Host "`nmobile-and-control-node-closure: PASS" -ForegroundColor Green
