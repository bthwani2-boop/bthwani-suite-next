[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateLength(8, 200)]
    [string]$RunId,

    [ValidateRange(1, 10000)]
    [int]$BatchLimit = 500,

    [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
    $DatabaseUrl = "postgres://dsh_local:dsh_local_password@localhost:55432/dsh_local?sslmode=disable"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$backendPath = Join-Path $repoRoot "services/dsh/backend"
if (-not (Test-Path $backendPath)) {
    throw "DSH backend path not found: $backendPath"
}

$previousDatabaseUrl = $env:DATABASE_URL
$previousRunId = $env:DSH_PRIVACY_RUN_ID
$previousBatchLimit = $env:DSH_PRIVACY_BATCH_LIMIT

try {
    $env:DATABASE_URL = $DatabaseUrl
    $env:DSH_PRIVACY_RUN_ID = $RunId.Trim()
    $env:DSH_PRIVACY_BATCH_LIMIT = [string]$BatchLimit

    Push-Location $backendPath
    try {
        go run ./cmd/dsh-address-privacy
        if ($LASTEXITCODE -ne 0) {
            throw "Client address privacy worker failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    $env:DATABASE_URL = $previousDatabaseUrl
    $env:DSH_PRIVACY_RUN_ID = $previousRunId
    $env:DSH_PRIVACY_BATCH_LIMIT = $previousBatchLimit
}
