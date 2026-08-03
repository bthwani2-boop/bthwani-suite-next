<#
.SYNOPSIS
  Thin mobile adapter to the canonical runtime phase command.

.DESCRIPTION
  Mobile startup must not repair database ownership, synthesize migration-ledger
  rows, delete ledger entries, or retry schema failures through heuristics. The
  canonical runtime phase owns execution and fails closed with its original
  evidence when database convergence is required.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Target = (Resolve-Path (Join-Path $PSScriptRoot "../../tools/scripts/invoke-runtime-phase.ps1")).Path
$ForwardedArgs = @($args)

$global:LASTEXITCODE = 0
& pwsh -NoProfile -ExecutionPolicy Bypass -File $Target @ForwardedArgs
$exitCode = [int]$LASTEXITCODE
if ($exitCode -ne 0) {
  Write-Error "Canonical runtime phase failed with exit code $exitCode. No automatic database or ledger repair was attempted."
}
exit $exitCode
