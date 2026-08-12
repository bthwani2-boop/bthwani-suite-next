[CmdletBinding()]
param(
    [ValidateSet('Run', 'Initialize', 'Preflight', 'Build')]
    [string] $Mode = 'Run',
    [switch] $ClearCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SharedMobile = (Resolve-Path (Join-Path $PSScriptRoot '..\..\mobile\mobile.ps1')).Path
& $SharedMobile -App 'app-captain' -Mode $Mode -ClearCache:$ClearCache
exit $LASTEXITCODE
