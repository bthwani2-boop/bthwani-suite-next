param(
    [switch] $ClearCache,
    [switch] $MirrorDevice
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$Preflight = Join-Path $RepoRoot "tools\scripts\ensure-mobile-dev-runtime.ps1"
$Runner = Join-Path $RepoRoot "tools\scripts\start-mobile-runtime.ps1"

foreach ($requiredScript in @($Preflight, $Runner)) {
    if (-not (Test-Path -LiteralPath $requiredScript -PathType Leaf)) {
        throw "Required mobile runtime script was not found: $requiredScript"
    }
}

& $Preflight
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $Runner `
    -AppKey "app-partner" `
    -MetroPort 18102 `
    -ClearCache:$ClearCache `
    -MirrorDevice:$MirrorDevice

exit $LASTEXITCODE
