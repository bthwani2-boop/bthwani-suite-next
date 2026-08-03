[CmdletBinding()]
param(
    [switch]$RunWorkspaceLint,
    [switch]$RunWorkspaceTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$upgradeScript = Join-Path $PSScriptRoot "upgrade-typescript-7.ps1"
if (-not (Test-Path -LiteralPath $upgradeScript)) {
    throw "Missing TypeScript 7 upgrade script: $upgradeScript"
}

& $upgradeScript `
    -VerifyOnly `
    -RunWorkspaceLint:$RunWorkspaceLint `
    -RunWorkspaceTests:$RunWorkspaceTests

exit $LASTEXITCODE
