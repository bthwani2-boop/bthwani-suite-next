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

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EasScript = Join-Path $PSScriptRoot 'eas.ps1'
$EnsureRuntimeScript = Join-Path $PSScriptRoot 'ensure-mobile-dev-runtime.ps1'
$RuntimeScript = Join-Path $PSScriptRoot 'start-mobile-runtime.ps1'

if ($Mode -eq 'Run') {
    $ports = @{
        'app-client' = 18101
        'app-partner' = 18102
        'app-captain' = 18103
        'app-field' = 18104
    }

    & $EnsureRuntimeScript
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    & $RuntimeScript `
        -AppKey $App `
        -MetroPort $ports[$App] `
        -ClearCache:$ClearCache `
        -MirrorDevice:$MirrorDevice
    exit $LASTEXITCODE
}

& $EasScript -App $App -Mode $Mode -ClearCache:$ClearCache
exit $LASTEXITCODE
