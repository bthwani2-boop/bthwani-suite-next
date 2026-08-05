param(
  [string]$Question = ""
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$graph = Join-Path $root "graphify-out/graph.json"

if (-not (Test-Path -LiteralPath $graph -PathType Leaf)) {
  Write-Output "Graphify graph unavailable. Use direct scoped inspection first. Rebuild only when relationship or architecture analysis is justified: graphify extract . --code-only --force"
  exit 0
}

Write-Output "Graphify is available as optional application-code navigation. Use direct scoped inspection first; use graphify query/path/explain only when cross-file ownership or relationships remain unclear."
if ($Question.Trim()) {
  Write-Output "Suggested scoped query: graphify query `"$Question`""
}
