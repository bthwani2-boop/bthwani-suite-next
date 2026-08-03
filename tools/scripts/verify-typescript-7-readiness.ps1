[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$expectedBranch = "task/typescript-7-readiness"
$baseBranch = "smsm"
$expectedTypeScriptVersion = "6.0.3"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$packageJsonPath = Join-Path $repoRoot "package.json"
$steps = [System.Collections.Generic.List[object]]::new()
$failureMessage = ""
$exitCode = 0
$pinnedSha = ""
$currentBranch = ""
$declaredTypeScript = ""
$resolvedTypeScript = ""
$tsconfigFiles = @()
$changedConfigFiles = @()

function Write-Section {
    param([Parameter(Mandatory)][string]$Title)

    Write-Host ""
    Write-Host "=== $Title ==="
}

function Invoke-Captured {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments,
        [Parameter(Mandatory)][string]$Name
    )

    $output = & $FilePath @Arguments 2>&1
    $nativeExitCode = $LASTEXITCODE
    if ($nativeExitCode -ne 0) {
        throw "$Name failed with exit code $nativeExitCode.`n$($output | Out-String)"
    }

    return ($output | Out-String).Trim()
}

function Invoke-Step {
    param(
        [Parameter(Mandatory)][string]$Name,
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$Arguments
    )

    Write-Section $Name
    $startedAt = Get-Date
    & $FilePath @Arguments
    $nativeExitCode = $LASTEXITCODE
    $elapsed = (Get-Date) - $startedAt

    $steps.Add([pscustomobject]@{
        Name = $Name
        ExitCode = $nativeExitCode
        Duration = $elapsed
    })

    if ($nativeExitCode -ne 0) {
        throw "$Name failed with exit code $nativeExitCode."
    }

    Write-Host ("Completed in {0:hh\:mm\:ss}." -f $elapsed)
}

function Assert-CleanWorktree {
    param([Parameter(Mandatory)][string]$Stage)

    $status = Invoke-Captured -FilePath "git" -Arguments @("status", "--porcelain") -Name "git status ($Stage)"
    if ($status) {
        throw "Unexpected repository drift during '$Stage':`n$status"
    }

    Invoke-Step -Name "Diff whitespace check ($Stage)" -FilePath "git" -Arguments @("diff", "--check")
    Invoke-Step -Name "Tracked diff check ($Stage)" -FilePath "git" -Arguments @("diff", "--exit-code")
}

Push-Location $repoRoot
try {
    Write-Section "Preflight"

    foreach ($command in @("git", "node", "pnpm")) {
        if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
            throw "$command is not available in PATH."
        }
    }

    if (-not (Test-Path -LiteralPath $packageJsonPath)) {
        throw "Missing file: $packageJsonPath"
    }

    $currentBranch = Invoke-Captured -FilePath "git" -Arguments @("branch", "--show-current") -Name "Resolve current branch"
    if ($currentBranch -ne $expectedBranch) {
        throw "Wrong branch: '$currentBranch'. Switch to '$expectedBranch' before running this script."
    }

    Invoke-Step -Name "Clean stale Windows Go build artifacts" -FilePath "node" -Arguments @(
        "tools/scripts/verify-go-build.mjs",
        "--cleanup-stale"
    )

    $initialStatus = Invoke-Captured -FilePath "git" -Arguments @("status", "--porcelain") -Name "Initial git status"
    if ($initialStatus) {
        throw "The worktree must be clean before verification:`n$initialStatus"
    }

    Invoke-Step -Name "Fetch immutable remote refs" -FilePath "git" -Arguments @(
        "fetch",
        "origin",
        $expectedBranch,
        $baseBranch,
        "--prune"
    )

    $pinnedSha = Invoke-Captured -FilePath "git" -Arguments @("rev-parse", "HEAD") -Name "Resolve local HEAD"
    $remoteSha = Invoke-Captured -FilePath "git" -Arguments @("rev-parse", "refs/remotes/origin/$expectedBranch") -Name "Resolve remote HEAD"

    if ($pinnedSha -ne $remoteSha) {
        throw "Local HEAD '$pinnedSha' does not match origin/$expectedBranch '$remoteSha'. Pull with --ff-only before running verification."
    }

    Write-Host "Repository: $repoRoot"
    Write-Host "Branch:     $currentBranch"
    Write-Host "Pinned SHA: $pinnedSha"

    Write-Section "Inventory TypeScript configuration"
    $tsconfigFiles = @(
        & git ls-files -- "tsconfig*.json" ":(glob)**/tsconfig*.json"
    ) | Where-Object { $_ }
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to inventory tracked TypeScript configuration files."
    }
    $tsconfigFiles = @($tsconfigFiles | Sort-Object -Unique)

    if ($tsconfigFiles.Count -eq 0) {
        throw "No tracked tsconfig files were found."
    }

    $changedConfigFiles = @(
        & git diff --name-only "origin/$baseBranch...HEAD" -- "tsconfig*.json" ":(glob)**/tsconfig*.json"
    ) | Where-Object { $_ }
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to calculate changed TypeScript configuration files."
    }
    $changedConfigFiles = @($changedConfigFiles | Sort-Object -Unique)

    Write-Host "Tracked tsconfig files: $($tsconfigFiles.Count)"
    foreach ($file in $tsconfigFiles) {
        Write-Host "- $file"
    }

    Write-Host "Changed tsconfig files in this readiness branch: $($changedConfigFiles.Count)"
    foreach ($file in $changedConfigFiles) {
        Write-Host "- $file"
    }

    Invoke-Step -Name "TypeScript configuration governance" -FilePath "node" -Arguments @(
        "tools/guards/_typescript-readiness-config-gate.mjs"
    )

    $packageJson = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json
    $declaredTypeScript = [string]$packageJson.devDependencies.typescript
    if ($declaredTypeScript -ne "~$expectedTypeScriptVersion") {
        throw "Expected package.json to keep TypeScript at '~$expectedTypeScriptVersion', but found '$declaredTypeScript'."
    }

    Write-Host "TypeScript declaration: $declaredTypeScript"

    Invoke-Step -Name "Install locked dependencies" -FilePath "pnpm" -Arguments @(
        "install",
        "--frozen-lockfile"
    )

    Assert-CleanWorktree -Stage "postinstall generation"

    Write-Section "Resolve TypeScript toolchain"
    $versionOutput = Invoke-Captured -FilePath "pnpm" -Arguments @("exec", "tsc", "--version") -Name "Resolve TypeScript version"
    Write-Host $versionOutput
    if ($versionOutput -ne "Version $expectedTypeScriptVersion") {
        throw "Expected TypeScript $expectedTypeScriptVersion, but received '$versionOutput'."
    }
    $resolvedTypeScript = $expectedTypeScriptVersion

    Invoke-Step -Name "Explain workspace TypeScript resolution" -FilePath "pnpm" -Arguments @(
        "why",
        "-r",
        "typescript"
    )

    Write-Section "Targeted verification"
    Invoke-Step -Name "Control panel typecheck" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "typecheck"
    )
    Invoke-Step -Name "Control panel build" -FilePath "pnpm" -Arguments @(
        "--dir", "apps/control-panel/runtime", "build"
    )
    Invoke-Step -Name "Shared control panel typecheck" -FilePath "pnpm" -Arguments @(
        "--dir", "shared/control-panel", "typecheck"
    )
    Invoke-Step -Name "DSH typecheck" -FilePath "pnpm" -Arguments @(
        "--dir", "services/dsh", "typecheck"
    )
    Invoke-Step -Name "WLT typecheck" -FilePath "pnpm" -Arguments @(
        "--dir", "services/wlt", "typecheck"
    )

    Write-Section "Full workspace verification"
    Invoke-Step -Name "Workspace typecheck" -FilePath "pnpm" -Arguments @("run", "typecheck")
    Invoke-Step -Name "Workspace lint" -FilePath "pnpm" -Arguments @("run", "lint")
    Invoke-Step -Name "Workspace tests" -FilePath "pnpm" -Arguments @("run", "test")
    Invoke-Step -Name "Workspace build" -FilePath "pnpm" -Arguments @("run", "build")
    Invoke-Step -Name "Assert no Windows Go build artifacts" -FilePath "node" -Arguments @(
        "tools/scripts/verify-go-build.mjs",
        "--assert-clean"
    )
    Invoke-Step -Name "Governance gates" -FilePath "pnpm" -Arguments @("run", "guard:governance-all")

    Invoke-Step -Name "Final TypeScript configuration governance" -FilePath "node" -Arguments @(
        "tools/guards/_typescript-readiness-config-gate.mjs"
    )
    Invoke-Step -Name "Final Go artifact hygiene" -FilePath "node" -Arguments @(
        "tools/scripts/verify-go-build.mjs",
        "--assert-clean"
    )

    $finalSha = Invoke-Captured -FilePath "git" -Arguments @("rev-parse", "HEAD") -Name "Resolve final HEAD"
    if ($finalSha -ne $pinnedSha) {
        throw "HEAD moved during verification: pinned '$pinnedSha', final '$finalSha'."
    }

    Assert-CleanWorktree -Stage "final verification"
}
catch {
    $exitCode = 1
    $failureMessage = $_.Exception.Message
}
finally {
    Pop-Location
}

Write-Section "Verification summary"
Write-Host "Branch:                      $currentBranch"
Write-Host "Pinned SHA:                  $pinnedSha"
Write-Host "TypeScript declared:         $declaredTypeScript"
Write-Host "TypeScript resolved:         $resolvedTypeScript"
Write-Host "Tracked tsconfig files:      $($tsconfigFiles.Count)"
Write-Host "Changed tsconfig files:      $($changedConfigFiles.Count)"

if ($steps.Count -gt 0) {
    Write-Host ""
    Write-Host "Stages:"
    foreach ($step in $steps) {
        Write-Host ("- {0}: exit={1}, duration={2:hh\:mm\:ss}" -f $step.Name, $step.ExitCode, $step.Duration)
    }
}

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "Decision: READY_FOR_TYPESCRIPT_7_EXPERIMENT"
    exit 0
}

Write-Host ""
Write-Host "Decision: NOT_READY"
Write-Host "First blocker: $failureMessage"
exit $exitCode
