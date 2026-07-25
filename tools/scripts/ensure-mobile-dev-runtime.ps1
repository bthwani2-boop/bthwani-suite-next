[CmdletBinding()]
param([switch] $Force)

$Target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\apps\mobile\ensure-mobile-dev-runtime.ps1')).Path
& $Target -Force:$Force
exit $LASTEXITCODE
