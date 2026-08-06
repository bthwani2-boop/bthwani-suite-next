[CmdletBinding()]
param(
  [ValidateSet("Verify", "Repair", "Full")]
  [string]$Mode = "Verify"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Push-Location $root
try {
  $command = Get-Command graphify -ErrorAction Stop
  $version = (& $command.Source --version 2>&1 | Out-String).Trim()
  if (-not $version) { throw "Graphify returned an empty version." }

  $ignore = Get-Content -LiteralPath ".graphifyignore" -Raw
  if ($ignore -match '(?m)^apps/control-panel/runtime/\s*$') {
    throw ".graphifyignore excludes the complete control-panel runtime source."
  }
  & git check-ignore -q graphify-out/graph.json
  if ($LASTEXITCODE -ne 0) { throw "graphify-out is not ignored by Git." }

  if ($Mode -in @("Repair", "Full")) {
    & $command.Source extract . --code-only --force
    if ($LASTEXITCODE -ne 0) { throw "Graphify extraction failed." }
  }

  if (-not (Test-Path -LiteralPath "graphify-out/graph.json" -PathType Leaf)) {
    throw "Required Graphify output missing: graphify-out/graph.json. Run with -Mode Repair or -Mode Full."
  }
  $analysisCandidates = @("graphify-out/.graphify_analysis.json", ".graphify_analysis.json")
  if (-not ($analysisCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf })) {
    Write-Warning "Graphify analysis metadata was not found; graph.json remains the required application-code graph."
  }

  Write-Output "graphify_version=$version"
  Write-Output "coverage=application-code"
  Write-Output "decision=PASS"
}
finally {
  Pop-Location
}
