Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$GoogleEnvironmentPath = Join-Path $RepoRoot "infra\local\control-panel.google.env"

function Import-EnvironmentFile {
    param([Parameter(Mandatory)][string] $Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return
    }

    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
            continue
        }
        $parts = $line.Split("=", 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim()
        if (-not $name) { continue }
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Test-ControlPanelPackageResolution {
    param([Parameter(Mandatory)][string] $PackageName)

    Push-Location -LiteralPath $PSScriptRoot
    try {
        & node -e "require.resolve('$PackageName/package.json')" 2>$null | Out-Null
        return $LASTEXITCODE -eq 0
    } finally {
        Pop-Location
    }
}

function Ensure-ControlPanelDependencies {
    if ((Test-ControlPanelPackageResolution -PackageName "next") -and
        (Test-ControlPanelPackageResolution -PackageName "typescript")) {
        return
    }

    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "Control Panel dependencies are missing and pnpm is unavailable. Enable Corepack and retry."
    }

    Write-Host "Control Panel dependencies are incomplete; restoring the governed workspace lockfile..."
    Push-Location -LiteralPath $RepoRoot
    try {
        & pnpm install --frozen-lockfile
        if ($LASTEXITCODE -ne 0) {
            throw "Governed workspace dependency installation failed with exit code $LASTEXITCODE."
        }
    } finally {
        Pop-Location
    }

    if (-not (Test-ControlPanelPackageResolution -PackageName "next") -or
        -not (Test-ControlPanelPackageResolution -PackageName "typescript")) {
        throw "Control Panel dependencies remain unresolved after the frozen-lockfile installation."
    }
}

Import-EnvironmentFile -Path $GoogleEnvironmentPath
Ensure-ControlPanelDependencies
Set-Location -LiteralPath $PSScriptRoot

# The browser must use the authenticated same-origin BFF. Direct service URLs
# remain server-only so access and refresh tokens never move into browser code.
$env:NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED     = "true"
$env:NEXT_PUBLIC_DSH_API_BASE_URL              = "/api/dsh"
$env:NEXT_PUBLIC_IDENTITY_API_BASE_URL         = "/api/identity"
$env:NEXT_PUBLIC_WORKFORCE_API_BASE_URL        = "/api/workforce"
$env:NEXT_PUBLIC_PROVIDERS_API_BASE_URL        = "/api/providers"
$env:NEXT_PUBLIC_PLATFORM_CONTROL_API_BASE_URL = "/api/platform-control"

$env:DSH_API_BASE_URL              = "http://127.0.0.1:58080"
$env:IDENTITY_API_BASE_URL         = "http://127.0.0.1:58082"
$env:WORKFORCE_API_BASE_URL        = "http://127.0.0.1:58086"
$env:PROVIDERS_API_BASE_URL        = "http://127.0.0.1:58087"
$env:PLATFORM_CONTROL_API_BASE_URL = "http://127.0.0.1:58088"

& pnpm dev
exit $LASTEXITCODE
