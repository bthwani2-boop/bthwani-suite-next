Set-Location -LiteralPath "$PSScriptRoot"

$env:NEXT_PUBLIC_DSH_API_BASE_URL      = "http://127.0.0.1:58080"
$env:NEXT_PUBLIC_IDENTITY_API_BASE_URL = "http://127.0.0.1:58082"
$env:NEXT_PUBLIC_WLT_API_BASE_URL      = "http://127.0.0.1:58083"
$env:IDENTITY_API_BASE_URL             = "http://127.0.0.1:58082"
$env:DSH_API_BASE_URL                  = "http://127.0.0.1:58080"

pnpm dev
