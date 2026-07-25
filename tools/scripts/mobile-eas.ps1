# Compatibility entrypoint. The shared implementation lives under apps/mobile.
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

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$SharedMobile = (Resolve-Path (Join-Path $PSScriptRoot '..\..\apps\mobile.ps1')).Path
& $SharedMobile -App $App -Mode $Mode -ClearCache:$ClearCache
exit $LASTEXITCODE
