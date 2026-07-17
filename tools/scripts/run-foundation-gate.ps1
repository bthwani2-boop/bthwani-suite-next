param(
  [switch]$Full,
  [switch]$Soft,
  [string]$Guard
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifest = Get-Content -LiteralPath "tools\guards\guard-manifest.json" -Raw | ConvertFrom-Json
$foundationGuards = @($manifest.guardSets.foundation)
if ($Guard) { $foundationGuards = @($Guard) }

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
$status = if ($failed.Count -eq 0) { "PASS" } else { "FAIL" }

Write-Host ""
Write-Host "RESULT: $status" -ForegroundColor $(if ($failed.Count -eq 0) { "Green" } else { "Red" })
if ($failed.Count -gt 0) {
  Write-Host "Failed steps: $($failed.step -join ', ')" -ForegroundColor Red
  if ($Soft) {
    Write-Host "WARNING: -Soft was explicitly supplied; returning exit code 0." -ForegroundColor Yellow
    exit 0
  }
  exit 1
}
