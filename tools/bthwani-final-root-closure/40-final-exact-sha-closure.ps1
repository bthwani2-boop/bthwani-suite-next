[CmdletBinding()]
param([string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)))
. "$PSScriptRoot\Closure.Common.ps1"
$RepoRoot = Resolve-BthwaniRepoRoot $RepoRoot
Set-Location $RepoRoot
$currentFile = Join-Path $RepoRoot '.diagnostics\final-root-closure\CURRENT.txt'
if (-not (Test-Path $currentFile)) { throw 'Run 00-preflight.ps1 first.' }
$evidenceDir = (Get-Content $currentFile -Raw).Trim()
$state = Get-Content (Join-Path $evidenceDir 'state.json') -Raw | ConvertFrom-Json
$sha = [string]$state.candidateSha
Assert-BranchPinned $RepoRoot 'BB' $sha
Assert-CleanWorktree $RepoRoot
Invoke-StrictNative git @('-C',$RepoRoot,'fetch','origin','--prune') $RepoRoot
$remoteSha = Get-GitSha 'origin/BB' $RepoRoot
if ($remoteSha -ne $sha) { throw "Remote BB moved: pinned=$sha remote=$remoteSha. Reconcile and rerun all final evidence on the new SHA." }

# Final closure must use the repository's canonical phase-aware authority.
$manifest = Get-Content (Join-Path $RepoRoot 'tools/mobile/mobile-apps.manifest.json') -Raw | ConvertFrom-Json
$activeProfile = [string]$manifest.verification.activeClosureProfile
$profiles = $manifest.verification.closureProfiles
if ($activeProfile -ne 'development' -or -not $profiles -or -not $profiles.development -or -not $profiles.release) {
    throw @'
ROOT BLOCKER: canonical mobile evidence authority is not phase-aware yet.
Do NOT bypass it from a wrapper. Refactor tools/mobile/mobile-apps.manifest.json and its consumers to one source of truth:
- activeClosureProfile = development
- closureProfiles.development requires shared + Android native + Android physical launch + Android physical integration
- closureProfiles.development defers all iOS tiers as DEFERRED_BY_PHASE
- closureProfiles.release requires Android + iOS full release evidence
Then update verify-mobile-evidence-receipts.mjs/tests and verify-mobile-final-closure.ps1 to select the profile explicitly.
'@
}
$devRequired = @($profiles.development.requiredTiers)
$must = @('mobile:shared:integration','mobile:android:native-build','mobile:android:physical-launch','mobile:android:physical-integration')
foreach ($tier in $must) { if ($devRequired -notcontains $tier) { throw "Development closure profile is missing required tier: $tier" } }
if (@($devRequired | Where-Object { $_ -like 'mobile:ios:*' }).Count -gt 0) { throw 'Development closure profile must not require iOS in the current phase.' }
$releaseRequired = @($profiles.release.requiredTiers)
if ($releaseRequired -notcontains 'mobile:ios:physical-integration') { throw 'Release closure must preserve iOS physical integration.' }

$verifierText = Get-Content (Join-Path $RepoRoot 'tools/scripts/verify-mobile-evidence-receipts.mjs') -Raw
$finalText = Get-Content (Join-Path $RepoRoot 'tools/scripts/verify-mobile-final-closure.ps1') -Raw
if ($verifierText -notmatch 'profile' -or $finalText -notmatch 'ClosureProfile') {
    throw 'ROOT BLOCKER: phase-aware manifest exists but evidence consumers are not profile-aware. Update consumers; do not duplicate closure rules in this wrapper.'
}

$requiredFiles = @('10-root-authority-verification.log','20-runtime-android-closure.log','30-coverage-control-gateway.log','android-physical-launch.json')
foreach ($name in $requiredFiles) { if (-not (Test-Path (Join-Path $evidenceDir $name))) { throw "Missing final evidence: $name" } }
$integrationReceipt = Join-Path $evidenceDir 'android-physical-integration.json'
if (-not (Test-Path $integrationReceipt)) { throw 'ROOT BLOCKER: Android physical integration receipt missing. L0 launch is not integration.' }

$receiptArgs = @()
foreach ($receipt in Get-ChildItem -LiteralPath $evidenceDir -Filter '*.json' -File) {
    if ($receipt.Name -in @('state.json','FINAL-CLOSURE.json')) { continue }
    $receiptArgs += @('-EvidenceReceipt',$receipt.FullName)
}
Invoke-StrictNative pwsh (@('-NoProfile','-ExecutionPolicy','Bypass','-File','tools/scripts/verify-mobile-final-closure.ps1','-ExpectedBranch','BB','-ClosureProfile','development','-SkipFetch') + $receiptArgs) $RepoRoot

Assert-BranchPinned $RepoRoot 'BB' $sha
$final = [ordered]@{
    schemaVersion = 1
    repository = 'bthwani2-boop/bthwani-suite-next'
    branch = 'BB'
    candidateSha = $sha
    closureProfile = 'development'
    ios = 'DEFERRED_BY_PHASE'
    decision = 'READY_FOR_GITHUB_EXACT_SHA_CHECKS'
    completedAt = (Get-Date).ToUniversalTime().ToString('o')
}
Write-ClosureJson (Join-Path $evidenceDir 'FINAL-CLOSURE.json') $final
Write-Host "FINAL_LOCAL_CLOSURE=PASS SHA=$sha PROFILE=development" -ForegroundColor Green
