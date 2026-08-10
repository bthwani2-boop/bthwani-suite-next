Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-BthwaniRepoRoot {
    param([string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
    $resolved = (Resolve-Path -LiteralPath $RepoRoot).Path
    if (-not (Test-Path -LiteralPath (Join-Path $resolved '.git'))) {
        throw "Not a git repository: $resolved"
    }
    return $resolved
}

function Invoke-StrictNative {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter()][string[]]$ArgumentList = @(),
        [Parameter()][string]$WorkingDirectory = (Get-Location).Path,
        [Parameter()][hashtable]$Environment = @{},
        [Parameter()][string]$LogPath = ''
    )
    $savedEnvironment = @{}
    foreach ($key in $Environment.Keys) {
        $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
        Set-Item -Path "Env:$key" -Value ([string]$Environment[$key])
    }
    $display = "$FilePath $($ArgumentList -join ' ')".Trim()
    Write-Host "`n>>> $display" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        if ($LogPath) {
            & $FilePath @ArgumentList *>&1 | Tee-Object -FilePath $LogPath -Append
        } else {
            & $FilePath @ArgumentList
        }
        $code = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
        if ($code -ne 0) { throw "Command failed ($code): $display" }
    } finally {
        Pop-Location
        foreach ($key in $Environment.Keys) {
            $previous = $savedEnvironment[$key]
            if ($null -eq $previous) { Remove-Item -Path "Env:$key" -ErrorAction SilentlyContinue }
            else { Set-Item -Path "Env:$key" -Value $previous }
        }
    }
}

function Get-GitSha {
    param([string]$Ref = 'HEAD', [string]$RepoRoot = (Get-Location).Path)
    $value = (& git -C $RepoRoot rev-parse $Ref 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or $value -notmatch '^[0-9a-f]{40}$') { throw "Cannot resolve git ref '$Ref': $value" }
    return $value
}

function Assert-CleanWorktree {
    param([string]$RepoRoot)
    $dirty = (& git -C $RepoRoot status --porcelain=v1 2>&1 | Out-String).Trim()
    if ($LASTEXITCODE -ne 0) { throw 'git status failed.' }
    if ($dirty) { throw "Worktree is not clean. Root-fix verification requires a clean tree.`n$dirty" }
}

function Assert-BranchPinned {
    param([string]$RepoRoot, [string]$Branch = 'BB', [string]$PinnedSha)
    $branchNow = (& git -C $RepoRoot branch --show-current 2>&1 | Out-String).Trim()
    if ($branchNow -ne $Branch) { throw "Expected branch '$Branch', got '$branchNow'." }
    $headNow = Get-GitSha -RepoRoot $RepoRoot
    if ($PinnedSha -and $headNow -ne $PinnedSha) {
        throw "Candidate moved during verification. pinned=$PinnedSha current=$headNow. Reconcile concurrent delta, then rerun from preflight."
    }
}

function New-EvidenceDirectory {
    param([string]$RepoRoot, [string]$PinnedSha)
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $dir = Join-Path $RepoRoot ".diagnostics\final-root-closure\$stamp-$($PinnedSha.Substring(0,12))"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    return $dir
}

function Write-ClosureJson {
    param([string]$Path, [hashtable]$Data)
    $parent = Split-Path -Parent $Path
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    $Data | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $Path -Encoding utf8
}
