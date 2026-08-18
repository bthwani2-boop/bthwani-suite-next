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
if (-not (Test-Path -LiteralPath $manifestPath)) {
  throw "Required verification routing is missing: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$journeyProfiles = $manifest.journeyProfiles
$journeySelectors = @($Journey -split ',' | ForEach-Object { [string]$_.Trim().ToUpperInvariant() } | Where-Object { $_ } | Select-Object -Unique)
$guardSelectors = @($Guard -split ',' | ForEach-Object { [string]$_.Trim() } | Where-Object { $_ } | Select-Object -Unique)

if ($guardSelectors.Count -eq 0 -and $journeySelectors.Count -eq 0) {
  throw "A Journey profile or explicit Guard selector is required; refusing an unbounded journey run."
}

$journeyGuards = [System.Collections.Generic.List[string]]::new()
if ($guardSelectors.Count -gt 0) {
  foreach ($guardName in $guardSelectors) {
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

function Invoke-Step {
  param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][scriptblock]$Block)
  Write-Host "[ RUN ] $Name"
  $global:LASTEXITCODE = 0
  & $Block
  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "$Name failed with exit $LASTEXITCODE" }
  Write-Host "[ OK  ] $Name"
}

if ($Full) {
  Invoke-Step "workspace-verification" { pnpm run workspace:verify }
}

foreach ($guardName in $journeyGuards) {
  $scriptName = "guard:$guardName"
  Invoke-Step $scriptName { pnpm run $scriptName }
}

if ($Runtime) {
  Invoke-Step "runtime-full-bootstrap" { pnpm run runtime:full:bootstrap-dev }
  try {
    Invoke-Step "runtime-full-smoke" { pnpm run runtime:full:smoke }
    Invoke-Step "wiremock-financial-smoke" { pnpm run runtime:wiremock:financial:smoke }
  } finally {
    Invoke-Step "runtime-full-down" { pnpm run runtime:full:down }
  }
}

$scope = if ($Runtime) { "runtime" } else { "static" }
$mode = if ($Full) { "full-explicit" } else { "targeted-default" }
Write-Output ""
Write-Output "RESULT: PASS scope=$scope mode=$mode journeys=$($journeySelectors -join ',')"
