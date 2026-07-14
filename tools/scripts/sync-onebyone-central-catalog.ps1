[CmdletBinding()]
param(
    [string]$RepoRoot = $(Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
    [string]$Branch = "onebyone",
    [switch]$SkipRuntime,
    [switch]$SkipSmoke
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Invoke-Checked {
    param(
        [string]$Command,
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $Command $($Arguments -join ' ')"
    }
}

Write-Step "PRE-FLIGHT"

if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    throw "Repository directory does not exist: $RepoRoot"
}

Set-Location -LiteralPath $RepoRoot

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot ".git"))) {
    throw "Not a Git repository: $RepoRoot"
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or is not available in PATH."
}

$Pending = @(git status --porcelain)
if ($LASTEXITCODE -ne 0) {
    throw "Could not inspect the local Git worktree."
}
if ($Pending.Count -gt 0) {
    Write-Host ($Pending -join [Environment]::NewLine) -ForegroundColor Yellow
    throw "Local changes exist. Commit or stash them first; this script will not overwrite local work."
}

Write-Step "FETCH REMOTE BRANCH"
Invoke-Checked "git" @("fetch", "origin", $Branch, "--prune")

$LocalBranchExists = $false
& git show-ref --verify --quiet "refs/heads/$Branch"
if ($LASTEXITCODE -eq 0) {
    $LocalBranchExists = $true
}

Write-Step "CHECKOUT $Branch"
if ($LocalBranchExists) {
    Invoke-Checked "git" @("checkout", $Branch)
}
else {
    Invoke-Checked "git" @("checkout", "--track", "-b", $Branch, "origin/$Branch")
}

Write-Step "FAST-FORWARD FROM origin/$Branch"
Invoke-Checked "git" @("merge", "--ff-only", "origin/$Branch")

$LocalSha = (git rev-parse HEAD).Trim()
$RemoteLine = (git ls-remote origin "refs/heads/$Branch").Trim()
if (-not $RemoteLine) {
    throw "Remote branch origin/$Branch was not found."
}
$RemoteSha = ($RemoteLine -split "\s+")[0]
if ($LocalSha -ne $RemoteSha) {
    throw "Local SHA ($LocalSha) does not match remote SHA ($RemoteSha)."
}

$ClosureMigration = Join-Path $RepoRoot "services\dsh\database\migrations\dsh-036_central_catalog_runtime_closure.sql"
if (-not (Test-Path -LiteralPath $ClosureMigration -PathType Leaf)) {
    throw "Central catalog closure migration is missing after sync: $ClosureMigration"
}

if (-not $SkipRuntime) {
    Write-Step "APPLY DSH RUNTIME MIGRATIONS AND CENTRAL SEEDS"

    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        throw "pnpm is not available in PATH. Install/enable the repository package manager first."
    }
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "Docker is not available in PATH. Start Docker Desktop and run this script again."
    }

    Invoke-Checked "pnpm" @("run", "runtime:up")
    Invoke-Checked "pnpm" @("run", "runtime:migrate")
    Invoke-Checked "pnpm" @("run", "runtime:seed")

    if (-not $SkipSmoke) {
        Invoke-Checked "pnpm" @("run", "runtime:smoke")
    }
}

Write-Step "RESULT"
Write-Host "PASS: local repository is synchronized with origin/$Branch." -ForegroundColor Green
Write-Host "Commit: $LocalSha"
Write-Host "Central catalog migration: present"
if ($SkipRuntime) {
    Write-Host "Runtime migration/seed: skipped by request" -ForegroundColor Yellow
}
else {
    Write-Host "Runtime migration/seed: applied"
    if ($SkipSmoke) {
        Write-Host "Runtime smoke: skipped by request" -ForegroundColor Yellow
    }
    else {
        Write-Host "Runtime smoke: passed"
    }
}

Write-Host ""
Write-Host "Start the required surfaces in separate terminals:"
Write-Host "  pnpm run client"
Write-Host "  pnpm run field"
Write-Host "  pnpm run partner"
Write-Host "  pnpm run control"
