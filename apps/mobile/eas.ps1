[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [Parameter(Mandatory)]
    [ValidateSet('Initialize', 'Preflight', 'Build')]
    [string] $Mode,

    [switch] $ClearCache
)

$workflow = Join-Path $PSScriptRoot 'eas\workflow.ps1'
if (-not (Test-Path -LiteralPath $workflow -PathType Leaf)) {
    throw "Mobile EAS workflow is missing: $workflow"
}
& $workflow -App $App -Mode $Mode -ClearCache:$ClearCache
exit $LASTEXITCODE
