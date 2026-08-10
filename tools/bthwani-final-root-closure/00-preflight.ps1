[CmdletBinding()]
param(
    [string]$RepoRoot = 'C:\bthwani-suite-next',
    [string]$Branch = 'BB',
    [string]$BaseBranch = 'master'
)
. "$PSScriptRoot\Closure.Common.ps1"
$RepoRoot = Resolve-BthwaniRepoRoot $RepoRoot
Set-Location $RepoRoot

Invoke-StrictNative git @('-C',$RepoRoot,'fetch','origin','--prune') $RepoRoot
$branchNow = (& git -C $RepoRoot branch --show-current).Trim()
if ($branchNow -ne $Branch) { throw "Switch manually to '$Branch' first. Current='$branchNow'." }
Assert-CleanWorktree $RepoRoot

$head = Get-GitSha 'HEAD' $RepoRoot
$remoteHead = Get-GitSha "origin/$Branch" $RepoRoot
$base = Get-GitSha "origin/$BaseBranch" $RepoRoot
if ($head -ne $remoteHead) {
    throw "Local '$Branch' is not exactly origin/$Branch. local=$head remote=$remoteHead. Use: git pull --ff-only origin $Branch"
}

$node = (& node --version).Trim()
$pnpm = (& pnpm --version).Trim()
if ($node -ne 'v24.17.0') { throw "Node must be v24.17.0. Current=$node" }
if ($pnpm -ne '10.34.0') { throw "pnpm must be 10.34.0. Current=$pnpm" }

$evidenceDir = New-EvidenceDirectory $RepoRoot $head
$state = [ordered]@{
    schemaVersion = 1
    repository = 'bthwani2-boop/bthwani-suite-next'
    branch = $Branch
    baseBranch = $BaseBranch
    candidateSha = $head
    baseSha = $base
    startedAt = (Get-Date).ToUniversalTime().ToString('o')
    iosStatus = 'DEFERRED_BY_PHASE'
    policy = [ordered]@{
        forcePush = 'FORBIDDEN'
        blindGitAdd = 'FORBIDDEN'
        qualityGateWeakening = 'FORBIDDEN'
        coverageExclusionAsFix = 'FORBIDDEN'
        rerunWithoutRootCause = 'FORBIDDEN'
    }
}
Write-ClosureJson (Join-Path $evidenceDir 'state.json') $state
Set-Content -LiteralPath (Join-Path $RepoRoot '.diagnostics\final-root-closure\CURRENT.txt') -Value $evidenceDir -Encoding utf8
Write-Host "PINNED_SHA=$head" -ForegroundColor Green
Write-Host "BASE_SHA=$base"
Write-Host "EVIDENCE_DIR=$evidenceDir"
