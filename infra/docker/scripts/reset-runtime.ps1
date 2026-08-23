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

# This file is explicitly the destructive reset compatibility entrypoint.
# Destructive ownership remains solely in runtime.ps1.
& $Runtime -Action reset -Profiles $Profiles -Force