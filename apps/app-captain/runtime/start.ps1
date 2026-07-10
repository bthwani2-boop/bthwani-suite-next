param(
    [switch] $ClearCache,
    [switch] $MirrorDevice
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$Runner = Join-Path $RepoRoot "tools\scripts\start-mobile-runtime.ps1"

& $Runner `
    -AppKey "app-captain" `
    -MetroPort 18103 `
    -NeedsDevStoreId `
    -ClearCache:$ClearCache `
    -MirrorDevice:$MirrorDevice

exit $LASTEXITCODE
