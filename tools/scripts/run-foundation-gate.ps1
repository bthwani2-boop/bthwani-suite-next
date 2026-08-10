param(
  [switch]$Full,
  [string]$Guard
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifestPath = "governance\guards\guard-sets.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Guard set contract is missing: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$registeredFoundationGuards = @($manifest.guardSets.foundation)
$foundationGuards = $registeredFoundationGuards

if ($Guard) {
  if ($registeredFoundationGuards -notcontains $Guard) {
    throw "Requested guard is not registered in the foundation set: $Guard"
  }
  $foundationGuards = @($Guard)
}

function Invoke-Step {
  param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Block)
  Write-Host "[ RUN ] $Name" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  try {
    & $Block
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "exit $LASTEXITCODE" }
    Write-Host "[ OK  ] $Name" -ForegroundColor Green
  }
  catch {
    Write-Host "[ FAIL] $Name — $_" -ForegroundColor Red
    throw
  }
}

Invoke-Step "source-integrity-tests" { node --test tools/guards/source-integrity-gate.test.mjs }
Invoke-Step "source-integrity" { node tools/guards/source-integrity-gate.mjs }
Invoke-Step "git-diff-check" { git --no-pager diff --check }

if ($Full) {
  Invoke-Step "typecheck" { pnpm run typecheck }
}

foreach ($guardName in $foundationGuards) {
  $scriptName = "guard:$guardName"
  Invoke-Step $scriptName { pnpm run $scriptName }
}

$mode = if ($Full) { "full-explicit" } else { "targeted-default" }
Write-Host ""
Write-Host 'RESULT: PASS scope=static mode=' $mode -ForegroundColor Green
Write-Host 'PASS is scoped evidence only and does not imply CLOSED_WITH_EVIDENCE.' -ForegroundColor Yellow
