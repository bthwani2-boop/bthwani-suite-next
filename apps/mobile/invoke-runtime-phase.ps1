$Target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\tools\scripts\invoke-runtime-phase.ps1')).Path
& $Target @args
exit $LASTEXITCODE
