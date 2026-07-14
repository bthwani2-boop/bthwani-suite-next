param(
    [switch] $ClearCache,
    [switch] $MirrorDevice
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$Runner = Join-Path $RepoRoot "tools\scripts\start-mobile-runtime.ps1"

if (-not (Test-Path -LiteralPath $Runner -PathType Leaf)) {
    throw "Shared mobile runtime runner was not found: $Runner"
}

& $Runner `
    -AppKey "app-captain" `
    -MetroPort 18103 `
    -ClearCache:$ClearCache `
    -MirrorDevice:$MirrorDevice

exit $LASTEXITCODE
