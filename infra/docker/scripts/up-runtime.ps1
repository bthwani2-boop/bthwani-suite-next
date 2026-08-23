[CmdletBinding()]
param(
  [Alias("Profile")]
  [string]$Profiles = "dsh,media-storage"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Runtime = Join-Path $PSScriptRoot "runtime.ps1"

if (-not (Test-Path -LiteralPath $Runtime -PathType Leaf)) {
  throw "Canonical runtime authority not found: $Runtime"
}

& $Runtime -Action up -Profiles $Profiles