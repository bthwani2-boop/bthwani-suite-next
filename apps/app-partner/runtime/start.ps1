param(
    [switch] $ClearCache
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$Runner = Join-Path $RepoRoot "tools\scripts\start-mobile-runtime.ps1"

& $Runner `
    -AppKey "app-partner" `
    -MetroPort 18102 `
    -NeedsDevStoreId `
    -ClearCache:$ClearCache

exit $LASTEXITCODE
