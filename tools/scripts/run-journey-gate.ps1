param(
  [switch]$Full,
  [switch]$Runtime,
  [string]$Guard,
  [string]$Journey,
  [switch]$PlanOnly
)

Set-Location -LiteralPath (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
$ErrorActionPreference = "Stop"

$manifestPath = "governance\guards\guard-sets.json"
$registryPath = "governance\guards\guard-registry.json"
foreach ($requiredPath in @($manifestPath, $registryPath)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Required guard configuration is missing: $requiredPath"
  }
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$registry = Get-Content -LiteralPath $registryPath -Raw | ConvertFrom-Json
$journeyProfiles = $manifest.journeyProfiles
$journeySelectors = @($Journey -split ',' | ForEach-Object { [string]$_.Trim().ToUpperInvariant() } | Where-Object { $_ } | Select-Object -Unique)
$guardSelectors = @($Guard -split ',' | ForEach-Object { [string]$_.Trim() } | Where-Object { $_ } | Select-Object -Unique)
$guardEntries = @{}
foreach ($entry in @($registry.entries)) {
  if ($entry.id) { $guardEntries[[string]$entry.id] = $entry }
}

if ($guardSelectors.Count -eq 0 -and $journeySelectors.Count -eq 0) {
  throw "A Journey profile or explicit Guard selector is required; refusing an unbounded journey run."
}

$journeyGuards = [System.Collections.Generic.List[string]]::new()
if ($guardSelectors.Count -gt 0) {
  foreach ($guardName in $guardSelectors) {
    if (-not $guardEntries.ContainsKey($guardName)) {
      throw "Requested guard is not present in the guard registry: $guardName"
    }
    if ([string]$guardEntries[$guardName].exit_level -ne "fail") {
      throw "Journey selectors may only execute fail-level guards: $guardName"
    }
    if (-not $journeyGuards.Contains($guardName)) { $journeyGuards.Add($guardName) }
  }
} else {
  foreach ($selector in $journeySelectors) {
    $profileProperty = $journeyProfiles.psobject.Properties[$selector]
    $profile = if ($null -eq $profileProperty) { $null } else { $profileProperty.Value }
    if ($null -eq $profile) {
      $available = @($journeyProfiles.psobject.Properties.Name) -join ", "
      throw "Journey profile is not registered: $selector. Available profiles: $available"
    }
    foreach ($guardName in @($profile)) {
      if (-not $guardEntries.ContainsKey([string]$guardName)) {
        throw "Journey profile references a guard missing from the registry: $selector -> $guardName"
      }
      if ([string]$guardEntries[[string]$guardName].exit_level -ne "fail") {
        throw "Journey profiles may only execute fail-level guards: $selector -> $guardName"
      }
      if (-not $journeyGuards.Contains([string]$guardName)) { $journeyGuards.Add([string]$guardName) }
    }
  }
}

$journeyGuards = @($journeyGuards)

if ($PlanOnly) {
  [ordered]@{
    journeys = $journeySelectors
    guards = $journeyGuards
    count = $journeyGuards.Count
  } | ConvertTo-Json -Depth 4
  exit 0
}

$script:StepLog = [System.Collections.Generic.List[object]]::new()
$script:SummaryPath = Join-Path ([string](Get-Location)) ".diagnostics/journey-gate/journey-gate-summary.json"

function Write-JourneyGateSummary {
  param([Parameter(Mandatory)][string]$Result, [string]$FailedStep = "", [string]$Detail = "")
  $summary = [ordered]@{
    result            = $Result
    scope             = if ($Runtime) { "runtime" } else { "static" }
    mode              = if ($Full) { "full-explicit" } else { "targeted-default" }
    capabilities      = $journeySelectors
    guardFilter       = if ($guardSelectors.Count -gt 0) { $guardSelectors -join "," } else { "journey-profile" }
    journeyGuardCount = @($journeyGuards).Count
    failedStep        = $FailedStep
    detail            = $Detail
    steps             = @($script:StepLog)
    generatedAt       = (Get-Date).ToUniversalTime().ToString("o")
  }
  $directory = Split-Path -Parent $script:SummaryPath
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }
  $summary | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $script:SummaryPath -Encoding utf8
  Write-Host "journey-gate summary: $script:SummaryPath"
}

function Invoke-Step {
  param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Block)
  Write-Host "[ RUN ] $Name"
  $global:LASTEXITCODE = 0
  $startedAt = Get-Date
  try {
    $stepOutput = & $Block 2>&1
    $nativeExitCode = $global:LASTEXITCODE
    foreach ($line in @($stepOutput)) { Write-Host $line }
    if ($nativeExitCode -ne 0) { throw "exit $nativeExitCode" }
    Write-Host "[ OK  ] $Name"
    $script:StepLog.Add([ordered]@{ step = $Name; result = "PASS"; durationSeconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2) })
  }
  catch {
    $detail = [string]$_
    $tail = @($stepOutput) | Select-Object -Last 40 | ForEach-Object { [string]$_ }
    Write-Host "[ FAIL] $Name - $detail"
    $script:StepLog.Add([ordered]@{ step = $Name; result = "FAIL"; detail = $detail; durationSeconds = [math]::Round(((Get-Date) - $startedAt).TotalSeconds, 2); outputTail = @($tail) })
    Write-JourneyGateSummary -Result "FAIL" -FailedStep $Name -Detail $detail
    Write-Output ""
    Write-Output "RESULT: FAIL step=$Name journeys=$($journeySelectors -join ',')"
    throw
  }
}

if ($Full) {
  foreach ($step in @(
    @{ Name = "nx-projects"; Command = { pnpm run nx:projects } },
    @{ Name = "contracts-lint"; Command = { pnpm run contracts:lint } },
    @{ Name = "lint"; Command = { pnpm run lint } },
    @{ Name = "typecheck"; Command = { pnpm run typecheck } },
    @{ Name = "test"; Command = { pnpm run test } },
    @{ Name = "build"; Command = { pnpm run build } }
  )) { Invoke-Step $step.Name $step.Command }
}

foreach ($guardName in $journeyGuards) {
  $entry = $guardEntries[$guardName]
  if (-not $entry) { throw "Journey guard is not present in the guard registry: $guardName" }
  $stepName = "guard:$guardName"
  if ($entry.script) {
    $scriptName = [string]$entry.script
    Invoke-Step $stepName { pnpm run $scriptName }
    continue
  }
  $sourceFile = [string]$entry.source_file
  if (-not $sourceFile -or $sourceFile -notmatch '\.(mjs|cjs|js)$') {
    throw "Journey guard has no executable package script or Node source: $guardName"
  }
  Invoke-Step $stepName { node $sourceFile }
}

if ($Runtime) {
  foreach ($step in @(
    @{ Name = "runtime-full-reset"; Command = { pnpm run runtime:full:reset } },
    @{ Name = "runtime-full-smoke"; Command = { pnpm run runtime:full:smoke } },
    @{ Name = "wiremock-financial-smoke"; Command = { pnpm run runtime:wiremock:financial:smoke } }
  )) { Invoke-Step $step.Name $step.Command }
}

$scope = if ($Runtime) { "runtime" } else { "static" }
$mode = if ($Full) { "full-explicit" } else { "targeted-default" }
Write-JourneyGateSummary -Result "PASS"
Write-Output ""
Write-Output "RESULT: PASS scope=$scope mode=$mode journeys=$($journeySelectors -join ',')"
Write-Output "PASS is scoped evidence only and does not imply CLOSED_WITH_EVIDENCE."
