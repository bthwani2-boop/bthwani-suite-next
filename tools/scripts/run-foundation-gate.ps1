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
  $results += [pscustomobject]@{ step = "typecheck"; ok = (Run-Step "typecheck" { pnpm run typecheck }) }
}

foreach ($guardName in $foundationGuards) {
  $scriptName = "guard:$guardName"
  $results += [pscustomobject]@{
    step = $scriptName
    ok = Run-Step $scriptName { pnpm run $scriptName }
  }
}

$failed = @($results | Where-Object { -not $_.ok })
if ($failed.Count -gt 0) {
  Write-Host ""
  Write-Host "RESULT: FIX_REQUIRED scope=static" -ForegroundColor Red
  Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red
  throw "Foundation gate failed: $($failed.step -join ', ')"
}

$mode = if ($Full) { "full-explicit" } else { "targeted-default" }
Write-Host ""
Write-Host "RESULT: PASS scope=static mode=$mode" -ForegroundColor Green
Write-Host "PASS is scoped evidence only and does not imply CLOSED_WITH_EVIDENCE." -ForegroundColor Yellow
