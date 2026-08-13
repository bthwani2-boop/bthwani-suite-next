Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$variableName = "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY"
$key = ([string] [Environment]::GetEnvironmentVariable($variableName, "Process")).Trim()

if ([string]::IsNullOrWhiteSpace($key)) {
    throw @"
Control Panel Google Maps is required but $variableName is not configured.
Provision the governed browser key and write the ignored local environment file:
  infra\local\control-panel.google.env
Then start the Control Panel through: pnpm control
"@
}

if ($key -notmatch '^AIza[0-9A-Za-z_-]{20,}$') {
    throw "$variableName is present but does not look like a usable Google API key. Refusing to start the Control Panel with an invalid Maps configuration."
}

Write-Host "Control Panel Google Maps browser key: configured." -ForegroundColor DarkGray
