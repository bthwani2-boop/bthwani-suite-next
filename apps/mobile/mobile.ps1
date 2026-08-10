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

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$SourceIntegrityGuard = Join-Path $RepoRoot 'tools\guards\source-integrity-gate.mjs'
$EasScript = Join-Path $PSScriptRoot 'eas.ps1'
$EnsureRuntimeScript = Join-Path $PSScriptRoot 'ensure-mobile-dev-runtime.ps1'
$RuntimeScript = Join-Path $PSScriptRoot 'start-mobile-runtime.ps1'

if (-not (Test-Path -LiteralPath $SourceIntegrityGuard -PathType Leaf)) {
    throw "Source-integrity guard not found: $SourceIntegrityGuard"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is required to verify repository source integrity before mobile runtime execution.'
}

& node $SourceIntegrityGuard
if ($LASTEXITCODE -ne 0) {
    throw 'Repository source integrity failed. Resolve the reported merge state before running any mobile surface.'
}

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
