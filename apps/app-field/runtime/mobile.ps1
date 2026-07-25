[CmdletBinding()]
param(
    [ValidateSet('Run', 'Initialize', 'Preflight', 'Build')]
    [string] $Mode = 'Run',
    [switch] $ClearCache,
    [switch] $MirrorDevice
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SharedMobile = (Resolve-Path (Join-Path $PSScriptRoot '..\..\mobile.ps1')).Path
& $SharedMobile -App 'app-field' -Mode $Mode -ClearCache:$ClearCache -MirrorDevice:$MirrorDevice
exit $LASTEXITCODE
