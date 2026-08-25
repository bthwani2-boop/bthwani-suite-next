param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "smoke")]
  [string]$Action
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ModuleRoot = Join-Path $PSScriptRoot "platform-control-runtime"
. (Join-Path $ModuleRoot "common.ps1")
. (Join-Path $ModuleRoot "smoke.ps1")

switch ($Action) {
  "up"      { Start-PlatformP3Runtime }
  "down"    { Invoke-CanonicalPlatformRuntime -Action down }
  "reset"   { Invoke-CanonicalPlatformRuntime -Action reset -Force }
  "status"  { Invoke-CanonicalPlatformRuntime -Action status }
  "logs"    { Invoke-CanonicalPlatformRuntime -Action logs }
  "migrate" { Invoke-PlatformMigrations }
  "smoke"   { Invoke-PlatformP3Smoke }
}