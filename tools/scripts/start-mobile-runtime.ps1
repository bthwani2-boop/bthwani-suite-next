[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $AppKey,

    [Parameter(Mandatory)]
    [ValidateRange(1024, 65535)]
    [int] $MetroPort,

    [switch] $ClearCache
)

$Target = (
    Resolve-Path (
        Join-Path $PSScriptRoot '..\mobile\start-mobile-runtime.ps1'
    )
).Path

& $Target `
    -AppKey $AppKey `
    -MetroPort $MetroPort `
    -ClearCache:$ClearCache

exit $LASTEXITCODE