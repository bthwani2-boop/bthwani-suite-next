param(
  [switch]$Full,
  [switch]$Runtime,
  [switch]$Soft,
  [string]$Guard,
  [string]$Journey = "UNSPECIFIED_JOURNEY"
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json
$journeyGuards = @($manifest.guardSets.journey)
if ($Guard) { $journeyGuards = @($Guard) }

$results = @()

function Run-Step {
  param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Block)
  Write-Host "[ RUN ] $Name" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  try {
    & $Block
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    Write-Host "[ OK  ] $Name" -ForegroundColor Green
    return $true
  }
  catch {
    Write-Host "[ FAIL] $Name — $_" -ForegroundColor Red
    return $false
  }
}

$results += [pscustomobject]@{ step = "git-diff-check"; ok = (Run-Step "git-diff-check" { git --no-pager diff --check }) }

if ($Full) {
  foreach ($step in @(
    @{ Name = "nx-projects"; Command = { pnpm run nx:projects } },
    @{ Name = "contracts-lint"; Command = { pnpm run contracts:lint } },
    @{ Name = "lint"; Command = { pnpm run lint } },
    @{ Name = "typecheck"; Command = { pnpm run typecheck } },
    @{ Name = "test"; Command = { pnpm run test } },
    @{ Name = "build"; Command = { pnpm run build } }
  )) {
    $results += [pscustomobject]@{ step = $step.Name; ok = (Run-Step $step.Name $step.Command) }
  }
}

foreach ($guardName in $journeyGuards) {
  $scriptName = "guard:$guardName"
  $results += [pscustomobject]@{
    step = $scriptName
    ok = Run-Step $scriptName { pnpm run $scriptName }
  }
}

if ($Runtime) {
  foreach ($step in @(
    @{ Name = "runtime-full-reset"; Command = { pnpm run runtime:full:reset } },
    @{ Name = "runtime-full-smoke"; Command = { pnpm run runtime:full:smoke } },
    @{ Name = "wiremock-financial-smoke"; Command = { pnpm run runtime:wiremock:financial:smoke } }
  )) {
    $results += [pscustomobject]@{ step = $step.Name; ok = (Run-Step $step.Name $step.Command) }
  }
}

$failed = @($results | Where-Object { -not $_.ok })
if ($failed.Count -eq 0) {
  $status = if ($Runtime) { "LOCAL_RUNTIME_VERIFIED_AWAITING_REMOTE_CI" } elseif ($Full) { "LOCAL_FULL_VERIFIED_AWAITING_REMOTE_CI" } else { "LOCAL_TARGETED_VERIFIED_AWAITING_REMOTE_CI" }
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
