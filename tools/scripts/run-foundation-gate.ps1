param(
  [switch]$Full,
  [string]$Guard
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifestPath = "tools\guards\guard-manifest.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Guard manifest is missing: $manifestPath"
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
Write-Host "RESULT: PASS scope=static mode=$mode" -ForegroundColor Green
Write-Host "PASS is scoped evidence only and does not imply CLOSED_WITH_EVIDENCE." -ForegroundColor Yellow
