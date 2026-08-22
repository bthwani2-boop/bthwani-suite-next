param(
    [switch] $ClearCache
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'mobile.ps1') `
    -Mode Run `
    -ClearCache:$ClearCache

exit $LASTEXITCODE
