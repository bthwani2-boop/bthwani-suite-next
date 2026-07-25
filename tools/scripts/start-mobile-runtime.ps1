[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('app-client', 'app-partner', 'app-captain', 'app-field')]
    [string] $AppKey,
    [Parameter(Mandatory)][ValidateRange(1024, 65535)][int] $MetroPort,
    [switch] $ClearCache,
    [switch] $MirrorDevice
)

$Target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\apps\mobile\start-mobile-runtime.ps1')).Path
& $Target -AppKey $AppKey -MetroPort $MetroPort -ClearCache:$ClearCache -MirrorDevice:$MirrorDevice
exit $LASTEXITCODE
