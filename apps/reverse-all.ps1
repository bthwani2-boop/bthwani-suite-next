$target = (Resolve-Path (Join-Path $PSScriptRoot 'mobile\reverse-all.ps1')).Path
& $target
exit $LASTEXITCODE
