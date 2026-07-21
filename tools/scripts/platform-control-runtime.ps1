param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("up", "down", "reset", "status", "logs", "migrate", "smoke")]
  [string]$Action
)

$ErrorActionPreference = "Stop"
$ModuleRoot = Join-Path $PSScriptRoot "platform-control-runtime"
. (Join-Path $ModuleRoot "common.ps1")
. (Join-Path $ModuleRoot "smoke.ps1")

switch ($Action) {
  "up"      { Start-PlatformP3Runtime }
  "down"    { Invoke-PlatformCompose down --remove-orphans }
  "reset"   { Invoke-PlatformCompose down -v --remove-orphans; Start-PlatformP3Runtime }
  "status"  { Invoke-PlatformCompose ps postgres wiremock-financial-provider minio identity-api providers-api wlt-api dsh-api platform-control-api }
  "logs"    { Invoke-PlatformCompose logs --tail=250 platform-control-api dsh-api wlt-api providers-api identity-api wiremock-financial-provider postgres }
  "migrate" { Invoke-PlatformMigrations }
  "smoke"   { Invoke-PlatformP3Smoke }
}
