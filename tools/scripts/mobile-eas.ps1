# Compatibility entrypoint only.
# Canonical mobile EAS implementation lives under tools/mobile.

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

$CanonicalEas = (
    Resolve-Path (
        Join-Path $PSScriptRoot '..\mobile\eas.ps1'
    )
).Path

& $CanonicalEas @PSBoundParameters
exit $LASTEXITCODE