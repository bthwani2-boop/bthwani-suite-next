param(
  [switch]$Full,
  [switch]$Runtime,
  [switch]$Soft,
  [string]$Guard,
  [string]$Journey = "UNSPECIFIED_JOURNEY"
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw |
  ConvertFrom-Json

$journeyGuards = @($manifest.guardSets.journey)
if ($Guard) {
  $journeyGuards = @($Guard)
}

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

$results += [pscustomobject]@{
  step = "git-diff-check"
  ok = Run-Step "git-diff-check" { git --no-pager diff --check }
}

# Full verification is the default. -Full remains accepted for compatibility.
$runFull = $true

if ($runFull) {
  $results += [pscustomobject]@{
    step = "nx-projects"
    ok = Run-Step "nx-projects" { pnpm run nx:projects }
  }
  $results += [pscustomobject]@{
    step = "contracts-lint"
    ok = Run-Step "contracts-lint" { pnpm run contracts:lint }
  }
  $results += [pscustomobject]@{
    step = "lint"
    ok = Run-Step "lint" { pnpm run lint }
  }
  $results += [pscustomobject]@{
    step = "typecheck"
    ok = Run-Step "typecheck" { pnpm run typecheck }
  }
  $results += [pscustomobject]@{
    step = "test"
    ok = Run-Step "test" { pnpm run test }
  }
  $results += [pscustomobject]@{
    step = "build"
    ok = Run-Step "build" { pnpm run build }
  }
}

foreach ($guardName in $journeyGuards) {
  $guardPath =
    if ($guardName -eq "no-broken-imports") {
      "tools/guards/no-broken-imports.mjs"
    }
    else {
      "tools/guards/$guardName-gate.mjs"
    }

  $results += [pscustomobject]@{
    step = "guard-$guardName"
    ok = Run-Step "guard-$guardName" { node $guardPath }
  }
}

if ($Runtime) {
  $results += [pscustomobject]@{
    step = "runtime-full-reset"
    ok = Run-Step "runtime-full-reset" { pnpm run runtime:full:reset }
  }
  $results += [pscustomobject]@{
    step = "runtime-full-smoke"
    ok = Run-Step "runtime-full-smoke" { pnpm run runtime:full:smoke }
  }
  $results += [pscustomobject]@{
    step = "wiremock-financial-smoke"
    ok = Run-Step "wiremock-financial-smoke" {
      pnpm run runtime:wiremock:financial:smoke
    }
  }
}

$failed = @($results | Where-Object { -not $_.ok })

if ($failed.Count -eq 0) {
  $status =
    if ($Runtime) {
      "LOCAL_RUNTIME_VERIFIED_AWAITING_REMOTE_CI"
    }
    else {
      "LOCAL_FULL_VERIFIED_AWAITING_REMOTE_CI"
    }

  Write-Host ""
  Write-Host "RESULT: $status journey=$Journey" -ForegroundColor Green
  return
}

Write-Host ""
Write-Host "RESULT: FAIL journey=$Journey" -ForegroundColor Red
Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red

if ($Soft) {
  Write-Host "WARNING: -Soft was explicitly supplied; returning without throwing." -ForegroundColor Yellow
  return
}

throw "Journey gate failed: $($failed.step -join ', ')"