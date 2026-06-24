# Hook executed before tools to advise on Graphify usage if graph.json is present.
$ErrorActionPreference = "SilentlyContinue"

# Check if graph.json exists
$graphJsonPath = Join-Path (Get-Location) "graphify-out/graph.json"
if (Test-Path $graphJsonPath) {
    Write-Host '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"MANDATORY: graphify-out/graph.json exists. Before reading/grepping raw files, consider running graphify query/explain/path. Example: `graphify query \"<question>\"` or `graphify path \"<A>\" \"<B>\"`."}}'
}
