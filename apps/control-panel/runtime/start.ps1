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

function Resolve-ControlPanelModulePath {
    param([Parameter(Mandatory)][string] $ModulePath)

    Push-Location -LiteralPath $PSScriptRoot
    try {
        $resolved = & node -e "process.stdout.write(require.resolve('$ModulePath'))" 2>$null
        if ($LASTEXITCODE -ne 0) {
            return $null
        }
        return ([string]$resolved).Trim()
    } finally {
        Pop-Location
    }
}

function Test-ControlPanelModuleResolution {
    param([Parameter(Mandatory)][string] $ModulePath)
    return -not [string]::IsNullOrWhiteSpace((Resolve-ControlPanelModulePath -ModulePath $ModulePath))
}

function Restore-ControlPanelWorkspaceInstall {
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
}

function Ensure-ControlPanelTypeScriptCompiler {
    if (Test-ControlPanelModuleResolution -ModulePath "typescript/lib/typescript.js") {
        return
    }

    $compatPackageJson = Resolve-ControlPanelModulePath -ModulePath "@typescript/typescript6/package.json"
    $compatCompiler = Resolve-ControlPanelModulePath -ModulePath "@typescript/typescript6/lib/typescript.js"
    if ([string]::IsNullOrWhiteSpace($compatPackageJson) -or [string]::IsNullOrWhiteSpace($compatCompiler)) {
        throw "Next.js requires the JavaScript TypeScript compiler API, but @typescript/typescript6 is not installed from the locked workspace."
    }

    $runtimeNodeModules = Join-Path $PSScriptRoot "node_modules"
    $typescriptLink = Join-Path $runtimeNodeModules "typescript"
    $compatRoot = Split-Path -Parent $compatPackageJson
    New-Item -ItemType Directory -Path $runtimeNodeModules -Force | Out-Null

    if (Test-Path -LiteralPath $typescriptLink) {
        $existing = Get-Item -LiteralPath $typescriptLink -Force
        if (($existing.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -eq 0) {
            throw "Refusing to replace a non-link TypeScript directory at $typescriptLink. Run pnpm install --frozen-lockfile to restore the governed workspace layout."
        }
        Remove-Item -LiteralPath $typescriptLink -Force
    }

    New-Item -ItemType Junction -Path $typescriptLink -Target $compatRoot -Force | Out-Null
    if (-not (Test-ControlPanelModuleResolution -ModulePath "typescript/lib/typescript.js")) {
        throw "Failed to expose the locked TypeScript 6 compiler API required by Next.js."
    }

    Write-Host "Control Panel compiler: TypeScript 6 compatibility package (Next.js compiler API)." -ForegroundColor DarkGray
}

function Ensure-ControlPanelDependencies {
    if (-not (Test-ControlPanelModuleResolution -ModulePath "next/package.json") -or
        -not (Test-ControlPanelModuleResolution -ModulePath "@typescript/typescript6/lib/typescript.js")) {
        Restore-ControlPanelWorkspaceInstall
    }

    if (-not (Test-ControlPanelModuleResolution -ModulePath "next/package.json")) {
        throw "Next.js remains unresolved after the frozen-lockfile installation."
    }

    Ensure-ControlPanelTypeScriptCompiler
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
