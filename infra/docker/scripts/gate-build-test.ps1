#!/usr/bin/env pwsh
# gate-build-test.ps1
# ─────────────────────────────────────────────────────────────────────────────
# Phase 9: Verification & Integration Gate.
# Runs Go builds & test suites, openapi generation, frontend typechecking,
# and full workspace integration gates (foundation & journey).
# Usage: .\infra\docker\scripts\gate-build-test.ps1
# ─────────────────────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))

$results = @()

function Run-Step {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][scriptblock]$Block
  )

  Write-Host "[ RUN ] $Name" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0

  try {
    & $Block
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
      throw "exit $LASTEXITCODE"
    }
    Write-Host "[ OK  ] $Name" -ForegroundColor Green
    return $true
  }
  catch {
    Write-Host "[ FAIL] $Name — $_" -ForegroundColor Red
    return $false
  }
}

# ── 1. Verify Go builds and test suites ────────────────────────────────────────
$GoDirs = @(
  "services/dsh/backend",
  "services/wlt/backend",
  "core/identity/backend",
  "core/workforce/backend",
  "core/providers/backend"
)

foreach ($dir in $GoDirs) {
  if (Test-Path -LiteralPath $dir) {
    $results += [pscustomobject]@{
      step = "go-build-$dir"
      ok = Run-Step "go-build-$dir" { go build -C $dir ./... }
    }
    $results += [pscustomobject]@{
      step = "go-test-$dir"
      ok = Run-Step "go-test-$dir" { go test -C $dir ./... -count=1 }
    }
  }
}

# ── 2. Verify OpenAPI generation ──────────────────────────────────────────────
$results += [pscustomobject]@{
  step = "openapi-generate"
  ok = Run-Step "openapi-generate" { pnpm run openapi:generate }
}

# ── 3. Verify frontend typechecking ───────────────────────────────────────────
$results += [pscustomobject]@{
  step = "frontend-typecheck"
  ok = Run-Step "frontend-typecheck" { pnpm run typecheck }
}

# ── 4. Run foundation guards gate ──────────────────────────────────────────────
$results += [pscustomobject]@{
  step = "foundation-gate"
  ok = Run-Step "foundation-gate" { pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/run-foundation-gate.ps1 -Full -Soft }
}

# ── 5. Run journey guards gate ─────────────────────────────────────────────────
$results += [pscustomobject]@{
  step = "journey-gate"
  ok = Run-Step "journey-gate" { pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/run-journey-gate.ps1 -Soft }
}

# ── Summary ────────────────────────────────────────────────────────────────────
$failed = @($results | Where-Object { -not $_.ok })

Write-Host ""
Write-Host "========================================"
if ($failed.Count -eq 0) {
  Write-Host "INTEGRATION GATE RESULT: PASS" -ForegroundColor Green
  Write-Host "========================================"
} else {
  Write-Host "INTEGRATION GATE RESULT: FAIL" -ForegroundColor Red
  Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red
  Write-Host "========================================"
  throw "Integration gate failed: $($failed.step -join ', ')"
}
