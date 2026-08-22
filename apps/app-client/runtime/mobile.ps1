[CmdletBinding()]
param(
    [ValidateSet('Run', 'Initialize', 'Preflight', 'Build')]
    [string] $Mode = 'Run',
    [switch] $ClearCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SharedMobile = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\tools\mobile\mobile.ps1')).Path
& $SharedMobile -App 'app-client' -Mode $Mode -ClearCache:$ClearCache
exit $LASTEXITCODE
