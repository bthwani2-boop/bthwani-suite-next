[CmdletBinding()]
param(
    [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$Serial = ''
)
$ErrorActionPreference = 'Stop'
& "$PSScriptRoot\00-preflight.ps1" -RepoRoot $RepoRoot
& "$PSScriptRoot\10-root-authority-verification.ps1" -RepoRoot $RepoRoot
& "$PSScriptRoot\20-runtime-android-closure.ps1" -RepoRoot $RepoRoot -Serial $Serial
& "$PSScriptRoot\30-coverage-control-gateway.ps1" -RepoRoot $RepoRoot
& "$PSScriptRoot\40-final-exact-sha-closure.ps1" -RepoRoot $RepoRoot
