[CmdletBinding()]
param(
    [switch]$RunLint,
    [switch]$RunTests,
    [switch]$CommitAndPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$expectedBranch = "task/typescript-7-readiness"
$typeScript7Version = "7.0.2"
$typeScript6RuntimeVersion = "6.0.3"

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)
    Write-Host ""
    Write-Host "=== $Title ==="
}

function Invoke-Step {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    Write-Section $Name
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE."
    }
}

function Invoke-Captured {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    $output = & $FilePath @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE.`n$($output | Out-String)"
    }
    return ($output | Out-String).Trim()
}

function Assert-Exact {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Actual,
        [Parameter(Mandatory)][string]$Expected
    )

    if ($Actual -ne $Expected) {
        throw "$Label mismatch. Expected '$Expected', got '$Actual'."
    }
}

function Write-Utf8LfFile {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Content
    )

    $absolutePath = [System.IO.Path]::GetFullPath($Path)
    $normalized = $Content.Replace("`r`n", "`n").Replace("`r", "`n")
    $normalized = $normalized.TrimEnd("`n", " ", "`t") + "`n"
    [System.IO.File]::WriteAllText(
        $absolutePath,
        $normalized,
        [System.Text.UTF8Encoding]::new($false)
    )
}

function Normalize-TrackedTextFile {
    param([Parameter(Mandatory)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }
    Write-Utf8LfFile -Path $Path -Content (Get-Content -LiteralPath $Path -Raw)
}

function Test-AllowedUpgradePath {
    param([Parameter(Mandatory)][string]$Path)

    if ($Path -in @(
        ".pnpmfile.cjs",
        "package.json",
        "pnpm-lock.yaml",
        "apps/control-panel/runtime/next.config.mjs",
        "apps/control-panel/runtime/next.config.ts",
        "tools/scripts/fix-typescript-7-manual-upgrade.ps1",
        "tools/scripts/finalize-typescript-7-upgrade.ps1"
    )) {
        return $true
    }

    return $Path -match '^(apps/[^/]+/runtime|core/[^/]+|services/[^/]+|shared/[^/]+)/package\.json$'
}

Push-Location (Resolve-Path ".").Path
try {
    Write-Section "Preflight"

    foreach ($command in @("git", "node", "pnpm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is not available in PATH."
        }
    }

    $currentBranch = Invoke-Captured -Name "Resolve current branch" -FilePath "git" -Arguments @("branch", "--show-current")
    if ($currentBranch -ne $expectedBranch) {
        throw "Wrong branch '$currentBranch'. Expected '$expectedBranch'."
    }

    Invoke-Step -Name "Fetch remote branch" -FilePath "git" -Arguments @("fetch", "origin", $expectedBranch, "--prune")
    $localSha = Invoke-Captured -Name "Resolve local HEAD" -FilePath "git" -Arguments @("rev-parse", "HEAD")
    $remoteSha = Invoke-Captured -Name "Resolve remote HEAD" -FilePath "git" -Arguments @("rev-parse", "origin/$expectedBranch")
    if ($localSha -ne $remoteSha) {
        throw "Local HEAD '$localSha' differs from origin/$expectedBranch '$remoteSha'. Synchronize the branch before finalizing."
    }

    Write-Host "Repository: $((Resolve-Path ".").Path)"
    Write-Host "Branch:     $currentBranch"
    Write-Host "HEAD:       $localSha"

    Write-Section "Normalize tracked configuration"
    Normalize-TrackedTextFile -Path ".pnpmfile.cjs"
    Normalize-TrackedTextFile -Path "apps/control-panel/runtime/next.config.mjs"
    Normalize-TrackedTextFile -Path "apps/control-panel/runtime/next.config.ts"

    foreach ($file in @("apps/control-panel/runtime/next.config.mjs", "apps/control-panel/runtime/next.config.ts")) {
        if (-not (Test-Path -LiteralPath $file)) { continue }
        $content = Get-Content -LiteralPath $file -Raw
        if ($content -match "ignoreBuildErrors\s*:\s*true") {
            throw "Unsafe Next.js ignoreBuildErrors remains in $file."
        }
    }

    Write-Section "Verify TypeScript toolchains"
    $rootTsc7 = Invoke-Captured -Name "Resolve root tsc" -FilePath "pnpm" -Arguments @("exec", "tsc", "--version")
    $rootTsc6 = Invoke-Captured -Name "Resolve root tsc6" -FilePath "pnpm" -Arguments @("exec", "tsc6", "--version")
    $rootApi = Invoke-Captured -Name "Resolve root TypeScript API" -FilePath "node" -Arguments @(
        "--input-type=module", "--eval", "import ts from 'typescript'; process.stdout.write(ts.version);"
    )
    $nextTsc7 = Invoke-Captured -Name "Resolve control-panel tsc" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "exec", "tsc", "--version"
    )
    $nextApi = Invoke-Captured -Name "Resolve control-panel TypeScript API" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "exec", "node", "--input-type=module", "--eval",
        "import ts from 'typescript'; process.stdout.write(ts.version);"
    )

    Assert-Exact -Label "Root TypeScript 7 compiler" -Actual $rootTsc7 -Expected "Version $typeScript7Version"
    Assert-Exact -Label "Root TypeScript 6 compiler" -Actual $rootTsc6 -Expected "Version $typeScript6RuntimeVersion"
    Assert-Exact -Label "Root TypeScript API" -Actual $rootApi -Expected $typeScript6RuntimeVersion
    Assert-Exact -Label "Control-panel TypeScript 7 compiler" -Actual $nextTsc7 -Expected "Version $typeScript7Version"
    Assert-Exact -Label "Control-panel TypeScript API" -Actual $nextApi -Expected $typeScript6RuntimeVersion

    Write-Host "root tsc:          $rootTsc7"
    Write-Host "root tsc6/API:     $rootTsc6 / $rootApi"
    Write-Host "control-panel tsc: $nextTsc7"
    Write-Host "control-panel API: $nextApi"

    if (Test-Path -LiteralPath "tools/guards/_typescript-readiness-config-gate.mjs") {
        Invoke-Step -Name "TypeScript configuration governance" -FilePath "node" -Arguments @(
            "tools/guards/_typescript-readiness-config-gate.mjs"
        )
    }

    Invoke-Step -Name "Workspace TypeScript 7 typecheck" -FilePath "pnpm" -Arguments @("run", "typecheck")
    Invoke-Step -Name "Control-panel production build" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "build"
    )

    Normalize-TrackedTextFile -Path ".pnpmfile.cjs"
    Normalize-TrackedTextFile -Path "apps/control-panel/runtime/next.config.mjs"
    Normalize-TrackedTextFile -Path "apps/control-panel/runtime/next.config.ts"

    if ($RunLint) {
        Invoke-Step -Name "Workspace lint" -FilePath "pnpm" -Arguments @("run", "lint")
    }
    if ($RunTests) {
        Invoke-Step -Name "Workspace tests" -FilePath "pnpm" -Arguments @("run", "test")
    }

    Invoke-Step -Name "Diff whitespace validation" -FilePath "git" -Arguments @("diff", "--check")

    Write-Section "Validate final change scope"
    $statusLines = @(& git status --porcelain=v1)
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to read git status."
    }

    $unexpected = [System.Collections.Generic.List[string]]::new()
    foreach ($line in $statusLines) {
        if (-not $line) { continue }
        $path = $line.Substring(3).Trim()
        if ($path -match " -> ") {
            $path = ($path -split " -> ")[-1]
        }
        if (-not (Test-AllowedUpgradePath -Path $path)) {
            $unexpected.Add($path)
        }
    }
    if ($unexpected.Count -gt 0) {
        throw "Unexpected files changed during TypeScript finalization:`n$($unexpected -join "`n")"
    }

    if ($statusLines.Count -eq 0) {
        Write-Host "Working tree is clean; no final commit is required."
    }
    else {
        Write-Host ($statusLines -join "`n")
    }

    if ($CommitAndPush -and $statusLines.Count -gt 0) {
        Invoke-Step -Name "Stage final TypeScript 7 closure" -FilePath "git" -Arguments @("add", "--all")
        Invoke-Step -Name "Commit final TypeScript 7 closure" -FilePath "git" -Arguments @(
            "commit", "-m", "fix(ts): close TypeScript 7 upgrade verification"
        )
        Invoke-Step -Name "Push final TypeScript 7 closure" -FilePath "git" -Arguments @(
            "push", "origin", "HEAD:$expectedBranch"
        )
    }

    Write-Section "Decision"
    Write-Host "TYPESCRIPT_7_UPGRADE_CLOSED"
}
finally {
    Pop-Location
}
