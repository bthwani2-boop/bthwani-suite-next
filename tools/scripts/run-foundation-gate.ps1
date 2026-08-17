param(
  [switch]$Full,
  [string]$Guard,
  [switch]$Affected,
  [string[]]$ChangedPath
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifestPath = "governance\guards\guard-sets.json"
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Guard set contract is missing: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$registeredFoundationGuards = @($manifest.guardSets.foundation)
$registeredFoundationSet = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($guardName in $registeredFoundationGuards) { [void]$registeredFoundationSet.Add([string]$guardName) }

function Normalize-Paths {
  param([string[]]$Paths)
  return @($Paths | ForEach-Object { ([string]$_).Trim().Replace('\', '/') } | Where-Object { $_ } | Select-Object -Unique)
}

if (-not $Full -and -not $Affected -and [string]::IsNullOrWhiteSpace($Guard)) { $Affected = $true }

if (-not [string]::IsNullOrWhiteSpace($Guard)) {
  $requestedGuards = @($Guard -split ',' | ForEach-Object { ([string]$_).Trim() } | Where-Object { $_ } | Select-Object -Unique)
  foreach ($guardName in $requestedGuards) {
    if (-not $registeredFoundationSet.Contains($guardName)) {
      throw "Requested guard is not registered in the foundation set: $guardName"
    }
  }
  $foundationGuards = $requestedGuards
} elseif ($Full) {
  $foundationGuards = @($registeredFoundationGuards)
} elseif ($Affected) {
  $paths = Normalize-Paths $ChangedPath
  if ($paths.Count -eq 0) {
    $paths = Normalize-Paths @(git diff --name-only HEAD --)
  }
  if ($paths.Count -eq 0) {
    $paths = Normalize-Paths @(git diff --name-only HEAD^ HEAD --)
  }
  if ($paths.Count -eq 0) { throw "Affected foundation routing requires at least one changed path." }

  $previousChangedFiles = $env:CI_CHANGED_FILES
  $previousMode = $env:CI_MODE
  try {
    $env:CI_CHANGED_FILES = $paths -join "`n"
    $env:CI_MODE = "affected"
    $routerOutput = node tools/scripts/detect-ci-context.mjs
    if ($LASTEXITCODE -ne 0) { throw "Canonical CI impact router failed with exit $LASTEXITCODE." }
    $router = ($routerOutput -join [Environment]::NewLine) | ConvertFrom-Json
    $foundationGuards = @($router.foundation_guard_ids | ForEach-Object { [string]$_ } | Select-Object -Unique)
  } finally {
    if ($null -eq $previousChangedFiles) { Remove-Item Env:CI_CHANGED_FILES -ErrorAction SilentlyContinue } else { $env:CI_CHANGED_FILES = $previousChangedFiles }
    if ($null -eq $previousMode) { Remove-Item Env:CI_MODE -ErrorAction SilentlyContinue } else { $env:CI_MODE = $previousMode }
  }
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
  Invoke-Step "workspace-typecheck" { pnpm run workspace:typecheck }
}

foreach ($guardName in $foundationGuards) {
  $scriptName = "guard:$guardName"
  Invoke-Step $scriptName { pnpm run $scriptName }
}

$mode = if ($Full) { "full-explicit" } elseif ($Guard) { "guard-selector" } else { "affected" }
Write-Host ""
Write-Host 'RESULT: PASS scope=static mode=' $mode -ForegroundColor Green
Write-Host 'PASS is scoped evidence only and does not imply CLOSED_WITH_EVIDENCE.' -ForegroundColor Yellow
