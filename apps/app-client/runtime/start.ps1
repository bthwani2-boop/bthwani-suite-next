param(
    [switch] $ClearCache
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$Runner = Join-Path $RepoRoot "tools\scripts\start-mobile-runtime.ps1"

& $Runner `
    -AppKey "app-client" `
    -MetroPort 18101 `
    -ClearCache:$ClearCache

exit $LASTEXITCODE
