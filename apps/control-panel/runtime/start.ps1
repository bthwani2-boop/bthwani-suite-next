Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Set-Location -LiteralPath $PSScriptRoot

# The browser must use the authenticated same-origin BFF. Direct service URLs
# remain server-only so access and refresh tokens never move into browser code.
$env:NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED    = "true"
$env:NEXT_PUBLIC_DSH_API_BASE_URL             = "/api/dsh"
$env:NEXT_PUBLIC_IDENTITY_API_BASE_URL        = "/api/identity"
$env:NEXT_PUBLIC_WLT_API_BASE_URL             = "/api/wlt"
$env:NEXT_PUBLIC_WORKFORCE_API_BASE_URL       = "/api/workforce"
$env:NEXT_PUBLIC_PROVIDERS_API_BASE_URL       = "/api/providers"
$env:NEXT_PUBLIC_PLATFORM_CONTROL_API_BASE_URL = "/api/platform-control"

$env:DSH_API_BASE_URL              = "http://127.0.0.1:58080"
$env:IDENTITY_API_BASE_URL         = "http://127.0.0.1:58082"
$env:WLT_API_BASE_URL              = "http://127.0.0.1:58083"
$env:WORKFORCE_API_BASE_URL        = "http://127.0.0.1:58086"
$env:PROVIDERS_API_BASE_URL        = "http://127.0.0.1:58087"
$env:PLATFORM_CONTROL_API_BASE_URL = "http://127.0.0.1:58088"

& pnpm dev
exit $LASTEXITCODE
