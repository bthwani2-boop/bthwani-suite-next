Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$global:LASTEXITCODE = 0

# Keep the bridge free of a param block: PowerShell would otherwise parse
# forwarded flags such as `-p` as wrapper parameters before the body runs.
# Validate the command token explicitly, resolve the executable application so
# the .ps1 shim cannot intercept it, and forward the remaining argv unchanged.
$forwarded = @($args)
if ($forwarded.Count -lt 1) { throw 'package-manager command is required' }

$requestedCommand = [string]$forwarded[0]
$allowedCommands = @('pnpm', 'npx')
if ($requestedCommand -notin $allowedCommands) {
    throw "unsupported package-manager command: $requestedCommand"
}

$forwardedArguments = @()
if ($forwarded.Count -gt 1) {
    $forwardedArguments = @($forwarded[1..($forwarded.Count - 1)])
}

$executable = Get-Command "$requestedCommand.CMD" -CommandType Application -ErrorAction Stop
& $executable.Source @forwardedArguments
if ($null -eq $LASTEXITCODE) { exit 0 }
exit [int]$LASTEXITCODE
