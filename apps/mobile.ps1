[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $App,

    [Parameter(Mandatory)]
    [ValidateSet('Run', 'Initialize', 'Preflight', 'Build')]
    [string] $Mode,

    [switch] $ClearCache,
    [switch] $MirrorDevice
)

$target = (Resolve-Path (Join-Path $PSScriptRoot 'mobile\mobile.ps1')).Path
& $target @PSBoundParameters
exit $LASTEXITCODE
