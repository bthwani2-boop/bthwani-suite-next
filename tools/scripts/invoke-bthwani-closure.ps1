[CmdletBinding()]
param(
    [string]$Repository,
    [ValidateSet("AUDIT_PREPARE", "EXECUTE_CLOSE")]
    [string]$Phase = "AUDIT_PREPARE",
    [int]$PR,
    [string]$Branch,
    [string]$Sha,
    [long]$RunId,
    [string]$Workflow,
    [string]$Objective,
    [string]$OutputDirectory,
    [switch]$SkipLogs,
    [switch]$Json,
    [switch]$SelfTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$rootBoundParameters = @{}
foreach ($key in $PSBoundParameters.Keys) {
    $rootBoundParameters[$key] = $PSBoundParameters[$key]
}

function Assert-FullSha {
    param([Parameter(Mandatory)][string]$Value)
    if ($Value -notmatch '^[0-9a-fA-F]{40}$') {
        throw "Expected an exact 40-character commit SHA, got '$Value'."
    }
}

function Get-TargetSelectors {
    param([Parameter(Mandatory)][System.Collections.IDictionary]$BoundParameters)

    $selectors = @()
    if ($BoundParameters.Contains('PR')) { $selectors += 'PR' }
    if ($BoundParameters.Contains('Branch')) { $selectors += 'Branch' }
    if ($BoundParameters.Contains('Sha')) { $selectors += 'Sha' }
    if ($BoundParameters.Contains('RunId')) { $selectors += 'RunId' }
    return $selectors
}

function Invoke-GhText {
    param([Parameter(Mandatory)][string[]]$GhArgs)

    $output = & gh @GhArgs 2>&1
    $exitCode = $LASTEXITCODE
    $text = [string]::Join([Environment]::NewLine, @($output))
    if ($exitCode -ne 0) {
        throw "gh $($GhArgs -join ' ') failed with exit code $exitCode.`n$text"
    }
    return $text
}

function Invoke-GhJson {
    param([Parameter(Mandatory)][string[]]$GhArgs)

    $text = Invoke-GhText -GhArgs $GhArgs
    if ([string]::IsNullOrWhiteSpace($text)) { return $null }
    return ($text | ConvertFrom-Json -Depth 100)
}

function Invoke-GhPagedArray {
    param([Parameter(Mandatory)][string]$Endpoint)

    $pages = Invoke-GhJson -GhArgs @('api', '--paginate', '--slurp', $Endpoint)
    $items = [System.Collections.Generic.List[object]]::new()
    foreach ($page in @($pages)) {
        foreach ($item in @($page)) {
            $items.Add($item)
        }
    }
    return @($items)
}

function ConvertTo-EncodedPath {
    param([Parameter(Mandatory)][string]$Path)
    return (($Path -split '/') | ForEach-Object { [uri]::EscapeDataString($_) }) -join '/'
}

function Get-RemoteFileContent {
    param(
        [Parameter(Mandatory)][string]$Repo,
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][string]$Ref
    )

    $encodedPath = ConvertTo-EncodedPath -Path $Path
    $item = Invoke-GhJson -GhArgs @(
        'api', '-X', 'GET',
        "repos/$Repo/contents/$encodedPath",
        '-f', "ref=$Ref"
    )

    if ($null -eq $item -or $item.type -ne 'file' -or $item.encoding -ne 'base64') {
        throw "Remote file '$Path' at '$Ref' is not a base64 file response."
    }

    $base64 = ([string]$item.content) -replace '\s', ''
    return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($base64))
}

function Write-JsonFile {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][AllowNull()][AllowEmptyCollection()]$Value
    )
    $Value | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Save-Text {
    param(
        [Parameter(Mandatory)][string]$Path,
        [AllowEmptyString()][string]$Text
    )
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $Text | Set-Content -LiteralPath $Path -Encoding utf8
}

function Invoke-SelfTest {
    Assert-FullSha -Value '0123456789abcdef0123456789abcdef01234567'

    $testBound = @{ PR = 284 }
    $testSelectors = @(Get-TargetSelectors -BoundParameters $testBound)
    if ($testSelectors.Count -ne 1 -or $testSelectors[0] -ne 'PR') {
        throw "Self-test failed: target selector propagation is broken."
    }

    $encoded = ConvertTo-EncodedPath -Path 'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md'
    if ($encoded -ne 'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md') {
        throw "Self-test failed: canonical path encoding changed unexpectedly."
    }

    $slashBranch = [uri]::EscapeDataString('feature/example')
    if ([string]::IsNullOrWhiteSpace($slashBranch)) {
        throw "Self-test failed: branch encoding is empty."
    }

    $targetKindForFormat = 'PR'
    $targetInputForFormat = '284'
    $targetLine = "TARGET=${targetKindForFormat}:$targetInputForFormat"
    if ($targetLine -ne 'TARGET=PR:284') {
        throw "Self-test failed: target output formatting is broken."
    }

    Write-Host 'SELF_TEST=PASS'
}

if ($SelfTest) {
    Invoke-SelfTest
    exit 0
}

$selectors = @(Get-TargetSelectors -BoundParameters $rootBoundParameters)
if ($selectors.Count -ne 1) {
    throw "Specify exactly one target selector: -PR, -Branch, -Sha, or -RunId. Received: $($selectors -join ', ')."
}

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI 'gh' is required. This interface is remote-first and does not substitute local repository state for GitHub truth."
}

& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI authentication is not valid. Run 'gh auth status' and repair the canonical GitHub credential before continuing."
}

if ([string]::IsNullOrWhiteSpace($Repository)) {
    $repoView = Invoke-GhJson -GhArgs @('repo', 'view', '--json', 'nameWithOwner')
    $Repository = [string]$repoView.nameWithOwner
}
if ($Repository -notmatch '^[^/]+/[^/]+$') {
    throw "Repository must be in owner/name form. Actual='$Repository'."
}

$repoInfo = Invoke-GhJson -GhArgs @('api', "repos/$Repository")
$defaultBranch = [string]$repoInfo.default_branch

$targetKind = $selectors[0]
$targetInput = switch ($targetKind) {
    'PR' { [string]$PR }
    'Branch' { $Branch }
    'Sha' { $Sha }
    'RunId' { [string]$RunId }
}

$candidateSha = $null
$targetRef = $null
$baseRef = $null
$baseSha = $null
$prNumber = $null
$workflowRun = $null
$resolved = $null

switch ($targetKind) {
    'PR' {
        if ($PR -le 0) { throw "PR must be a positive integer." }
        $resolved = Invoke-GhJson -GhArgs @('api', "repos/$Repository/pulls/$PR")
        if ($resolved.head.repo.full_name -ne $Repository) {
            throw "Cross-repository PR heads are not accepted by this repository-local closure interface. Head repo='$($resolved.head.repo.full_name)'."
        }
        $candidateSha = [string]$resolved.head.sha
        $targetRef = [string]$resolved.head.ref
        $baseRef = [string]$resolved.base.ref
        $baseSha = [string]$resolved.base.sha
        $prNumber = [int]$resolved.number
    }
    'Branch' {
        if ([string]::IsNullOrWhiteSpace($Branch)) { throw "Branch cannot be empty." }
        $encodedBranch = [uri]::EscapeDataString($Branch)
        $resolved = Invoke-GhJson -GhArgs @('api', "repos/$Repository/branches/$encodedBranch")
        $candidateSha = [string]$resolved.commit.sha
        $targetRef = $Branch
        if ($Branch -ne $defaultBranch) {
            $baseRef = $defaultBranch
            $defaultInfo = Invoke-GhJson -GhArgs @('api', "repos/$Repository/branches/$([uri]::EscapeDataString($defaultBranch))")
            $baseSha = [string]$defaultInfo.commit.sha
        }
    }
    'Sha' {
        if ([string]::IsNullOrWhiteSpace($Sha)) { throw "Sha cannot be empty." }
        Assert-FullSha -Value $Sha
        $resolved = Invoke-GhJson -GhArgs @('api', "repos/$Repository/commits/$Sha")
        $candidateSha = [string]$resolved.sha
        $targetRef = $candidateSha
    }
    'RunId' {
        if ($RunId -le 0) { throw "RunId must be a positive integer." }
        $workflowRun = Invoke-GhJson -GhArgs @('api', "repos/$Repository/actions/runs/$RunId")
        $candidateSha = [string]$workflowRun.head_sha
        $targetRef = if ([string]::IsNullOrWhiteSpace([string]$workflowRun.head_branch)) { $candidateSha } else { [string]$workflowRun.head_branch }
    }
}

Assert-FullSha -Value $candidateSha
$initialCandidateSha = $candidateSha

# Correlate non-PR targets with an open PR only when the relation is unambiguous.
if ($null -eq $prNumber) {
    try {
        $associated = @(Invoke-GhPagedArray -Endpoint "repos/$Repository/commits/$candidateSha/pulls?per_page=100") |
            Where-Object { $_.state -eq 'open' -and $_.head.repo.full_name -eq $Repository -and $_.head.sha -eq $candidateSha }
        if ($associated.Count -eq 1) {
            $prNumber = [int]$associated[0].number
            $baseRef = [string]$associated[0].base.ref
            $baseSha = [string]$associated[0].base.sha
            if ($targetKind -ne 'Branch') { $targetRef = [string]$associated[0].head.ref }
        }
    }
    catch {
        # Association is useful context, never authority for exact target resolution.
    }
}

if ([string]::IsNullOrWhiteSpace($Objective)) {
    $Objective = "Root-cause closure for $targetKind target '$targetInput' at exact candidate $candidateSha"
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $tempRoot = [IO.Path]::GetTempPath()
    $OutputDirectory = Join-Path $tempRoot "bthwani-closure-$stamp"
}
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$rawDirectory = Join-Path $OutputDirectory 'raw'
$logsDirectory = Join-Path $OutputDirectory 'logs'
$orchestratorDirectory = Join-Path $OutputDirectory 'orchestrator'
New-Item -ItemType Directory -Force -Path $OutputDirectory, $rawDirectory, $logsDirectory, $orchestratorDirectory | Out-Null

$requiredOrchestratorFiles = @(
    'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md',
    'tools/prompting/bthwani-orchestrator/01-SCOPE-AUTHORITY-RULES.md',
    'tools/prompting/bthwani-orchestrator/02-DIAGNOSE-ROOT-CAUSE.md',
    'tools/prompting/bthwani-orchestrator/03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md',
    'tools/prompting/bthwani-orchestrator/04-VERIFY-REDIAGNOSE-CLOSE.md',
    'tools/prompting/bthwani-orchestrator/focus/code-architecture-organization.md',
    'tools/prompting/bthwani-orchestrator/focus/governance-product-design.md',
    'tools/prompting/bthwani-orchestrator/focus/data-contracts-runtime-security-quality.md',
    'tools/prompting/bthwani-orchestrator/99-SOURCE-MAP.md'
)

$missingOrchestratorFiles = [System.Collections.Generic.List[string]]::new()
$entryContent = $null
foreach ($path in $requiredOrchestratorFiles) {
    try {
        $content = Get-RemoteFileContent -Repo $Repository -Path $path -Ref $candidateSha
        $relative = $path.Substring('tools/prompting/bthwani-orchestrator/'.Length)
        $destination = Join-Path $orchestratorDirectory ($relative -replace '/', [IO.Path]::DirectorySeparatorChar)
        Save-Text -Path $destination -Text $content
        if ($path.EndsWith('/00-ORCHESTRATOR.md')) { $entryContent = $content }
    }
    catch {
        $missingOrchestratorFiles.Add($path)
    }
}

$packageRevision = $null
if ($entryContent -match '(?m)^PACKAGE_REVISION:\s*(.+?)\s*$') {
    $packageRevision = $Matches[1].Trim()
}

$invocationRef = if ([string]::IsNullOrWhiteSpace($targetRef)) { $candidateSha } else { $targetRef }
$planDir = if ($Phase -eq 'AUDIT_PREPARE') { 'AUTO' } else { 'NONE' }
$canonicalInvocation = @"
REPOSITORY: $Repository
BRANCH: $invocationRef
OBJECTIVE: $Objective
PHASE: $Phase
PLAN_DIR: $planDir
PRIMARY_FOCUS: AUTO
SCOPE: AUTO
RESEARCH: AUTO
EXECUTION_LOCATION: DIRECT_ON_TARGET
EXACT_CANDIDATE_SHA: $candidateSha
"@
Save-Text -Path (Join-Path $OutputDirectory 'canonical-invocation.txt') -Text $canonicalInvocation

$prFiles = @()
$prIssueComments = @()
$prReviews = @()
$prReviewComments = @()
if ($null -ne $prNumber) {
    $prFiles = @(Invoke-GhPagedArray -Endpoint "repos/$Repository/pulls/$prNumber/files?per_page=100")
    $prIssueComments = @(Invoke-GhPagedArray -Endpoint "repos/$Repository/issues/$prNumber/comments?per_page=100")
    $prReviews = @(Invoke-GhPagedArray -Endpoint "repos/$Repository/pulls/$prNumber/reviews?per_page=100")
    $prReviewComments = @(Invoke-GhPagedArray -Endpoint "repos/$Repository/pulls/$prNumber/comments?per_page=100")
    Write-JsonFile -Path (Join-Path $rawDirectory 'pr-files.json') -Value $prFiles
    Write-JsonFile -Path (Join-Path $rawDirectory 'pr-issue-comments.json') -Value $prIssueComments
    Write-JsonFile -Path (Join-Path $rawDirectory 'pr-reviews.json') -Value $prReviews
    Write-JsonFile -Path (Join-Path $rawDirectory 'pr-review-comments.json') -Value $prReviewComments
}

$runsDocument = Invoke-GhJson -GhArgs @(
    'api', '-X', 'GET',
    "repos/$Repository/actions/runs",
    '-f', "head_sha=$candidateSha",
    '-f', 'per_page=100'
)
$runs = @($runsDocument.workflow_runs)
$workflowFilterMatched = $true
if (-not [string]::IsNullOrWhiteSpace($Workflow)) {
    $runs = @($runs | Where-Object {
        $_.name -eq $Workflow -or $_.path -eq $Workflow -or ([string]$_.workflow_id) -eq $Workflow
    })
    $workflowFilterMatched = $runs.Count -gt 0
}
Write-JsonFile -Path (Join-Path $rawDirectory 'workflow-runs.json') -Value $runs

$failedJobs = [System.Collections.Generic.List[object]]::new()
$allJobs = [System.Collections.Generic.List[object]]::new()
foreach ($run in $runs) {
    $jobsDocument = Invoke-GhJson -GhArgs @('api', '-X', 'GET', "repos/$Repository/actions/runs/$($run.id)/jobs", '-f', 'per_page=100')
    foreach ($job in @($jobsDocument.jobs)) {
        $allJobs.Add($job)
        if ($job.conclusion -eq 'failure') {
            $failedSteps = @($job.steps | Where-Object { $_.conclusion -eq 'failure' } | ForEach-Object {
                [pscustomobject]@{ name = $_.name; number = $_.number; conclusion = $_.conclusion }
            })
            $failedJobs.Add([pscustomobject]@{
                workflow = $run.name
                workflow_run_id = $run.id
                job = $job.name
                job_id = $job.id
                failed_steps = $failedSteps
            })

            if (-not $SkipLogs) {
                try {
                    $logText = Invoke-GhText -GhArgs @('api', "repos/$Repository/actions/jobs/$($job.id)/logs")
                    $logPath = Join-Path $logsDirectory "$($run.id)-$($job.id).log"
                    Save-Text -Path $logPath -Text $logText
                    $signals = @($logText -split "`r?`n" | Where-Object {
                        $_ -match '(?i)(error|fatal|failed|failure|panic|exception|forbidden|violation|quality gate|coverage|graph|runtime|authentication|unauthorized)'
                    } | Select-Object -First 200)
                    Save-Text -Path (Join-Path $logsDirectory "$($run.id)-$($job.id)-signals.txt") -Text ($signals -join [Environment]::NewLine)
                }
                catch {
                    Save-Text -Path (Join-Path $logsDirectory "$($run.id)-$($job.id)-log-error.txt") -Text $_.Exception.Message
                }
            }
        }
    }
}
Write-JsonFile -Path (Join-Path $rawDirectory 'workflow-jobs.json') -Value @($allJobs)
Write-JsonFile -Path (Join-Path $rawDirectory 'failed-jobs.json') -Value @($failedJobs)

$checkRunsDocument = Invoke-GhJson -GhArgs @(
    'api', '-H', 'Accept: application/vnd.github+json',
    "repos/$Repository/commits/$candidateSha/check-runs?per_page=100"
)
$checkRuns = @($checkRunsDocument.check_runs)
$statusDocument = Invoke-GhJson -GhArgs @('api', "repos/$Repository/commits/$candidateSha/status")
Write-JsonFile -Path (Join-Path $rawDirectory 'check-runs.json') -Value $checkRuns
Write-JsonFile -Path (Join-Path $rawDirectory 'combined-status.json') -Value $statusDocument

$finalSha = $candidateSha
switch ($targetKind) {
    'PR' {
        $finalTarget = Invoke-GhJson -GhArgs @('api', "repos/$Repository/pulls/$PR")
        $finalSha = [string]$finalTarget.head.sha
    }
    'Branch' {
        $finalTarget = Invoke-GhJson -GhArgs @('api', "repos/$Repository/branches/$([uri]::EscapeDataString($Branch))")
        $finalSha = [string]$finalTarget.commit.sha
    }
    'Sha' {
        $finalTarget = Invoke-GhJson -GhArgs @('api', "repos/$Repository/commits/$candidateSha")
        $finalSha = [string]$finalTarget.sha
    }
    'RunId' {
        $finalTarget = Invoke-GhJson -GhArgs @('api', "repos/$Repository/actions/runs/$RunId")
        $finalSha = [string]$finalTarget.head_sha
    }
}
$targetStable = $finalSha -eq $initialCandidateSha

$failedRuns = @($runs | Where-Object { $_.conclusion -in @('failure', 'cancelled', 'timed_out', 'action_required', 'stale') })
$pendingRuns = @($runs | Where-Object { $_.status -ne 'completed' -or [string]::IsNullOrWhiteSpace([string]$_.conclusion) })
$failedChecks = @($checkRuns | Where-Object { $_.conclusion -in @('failure', 'cancelled', 'timed_out', 'action_required', 'stale') })
$pendingChecks = @($checkRuns | Where-Object { $_.status -ne 'completed' -or [string]::IsNullOrWhiteSpace([string]$_.conclusion) })
$statusFailure = @($statusDocument.statuses | Where-Object { $_.state -in @('failure', 'error') })

$automationState = if (-not $targetStable) {
    'TARGET_MOVED_REAUDIT_REQUIRED'
}
elseif ($missingOrchestratorFiles.Count -gt 0) {
    'ORCHESTRATOR_EVIDENCE_INCOMPLETE'
}
elseif (-not $workflowFilterMatched) {
    'WORKFLOW_EVIDENCE_GAP'
}
elseif ($runs.Count -eq 0 -and $checkRuns.Count -eq 0) {
    'REMOTE_EVIDENCE_GAP'
}
elseif ($failedRuns.Count -gt 0 -or $failedChecks.Count -gt 0 -or $statusFailure.Count -gt 0) {
    'REMOTE_GATES_NOT_GREEN'
}
elseif ($pendingRuns.Count -gt 0 -or $pendingChecks.Count -gt 0) {
    'REMOTE_EVIDENCE_PENDING'
}
else {
    'REMOTE_EVIDENCE_GREEN__SEMANTIC_CLOSURE_NOT_SELF_CERTIFIED'
}

$summary = [ordered]@{
    repository = $Repository
    default_branch = $defaultBranch
    target = [ordered]@{
        kind = $targetKind
        input = $targetInput
        ref = $targetRef
        candidate_sha = $candidateSha
        final_recheck_sha = $finalSha
        stable = $targetStable
        associated_pr = $prNumber
        base_ref = $baseRef
        base_sha = $baseSha
    }
    phase = $Phase
    objective = $Objective
    orchestrator = [ordered]@{
        entrypoint = 'tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md'
        package_revision = $packageRevision
        required_files = $requiredOrchestratorFiles
        missing_files = @($missingOrchestratorFiles)
        snapshot_directory = $orchestratorDirectory
    }
    evidence = [ordered]@{
        workflow_filter = $Workflow
        workflow_filter_matched = $workflowFilterMatched
        exact_sha_workflow_runs = $runs.Count
        failed_workflow_runs = $failedRuns.Count
        pending_workflow_runs = $pendingRuns.Count
        check_runs = $checkRuns.Count
        failed_check_runs = $failedChecks.Count
        pending_check_runs = $pendingChecks.Count
        failed_status_contexts = $statusFailure.Count
        failed_jobs = $failedJobs.Count
        changed_files = $prFiles.Count
        issue_comments = $prIssueComments.Count
        reviews = $prReviews.Count
        inline_review_comments = $prReviewComments.Count
    }
    automation_state = $automationState
    closure_claim = 'NOT_SELF_CERTIFIED_BY_SCRIPT'
    invariants = @(
        'NO_BRANCH_CREATE',
        'NO_BRANCH_SWITCH',
        'NO_MERGE',
        'NO_PR_MUTATION',
        'NO_TARGET_SYSTEM_MUTATION',
        'NO_GATE_BYPASS',
        'NO_PATCH_OR_FALLBACK_AUTHORITY',
        'EXACT_CANDIDATE_PROVENANCE',
        'ORCHESTRATOR_FILES_READ_ONLY'
    )
    output_directory = $OutputDirectory
}
Write-JsonFile -Path (Join-Path $OutputDirectory 'summary.json') -Value $summary

$report = @()
$report += '# BThwani Canonical Closure Target Evidence'
$report += ''
$report += "- Repository: ``$Repository``"
$report += "- Target: ``$targetKind=$targetInput``"
$report += "- Exact candidate SHA: ``$candidateSha``"
$report += "- Final recheck SHA: ``$finalSha``"
$report += "- Target stable: ``$targetStable``"
$report += "- Phase envelope: ``$Phase``"
$report += "- Associated PR: ``$prNumber``"
$report += "- Base: ``$baseRef`` / ``$baseSha``"
$report += "- Orchestrator revision: ``$packageRevision``"
$report += "- Automation state: **$automationState**"
$report += "- Closure claim: **NOT SELF-CERTIFIED BY SCRIPT**"
$report += ''
$report += '## Exact-SHA remote evidence'
$report += ''
$report += "- Workflow runs: $($runs.Count)"
$report += "- Failed workflow runs: $($failedRuns.Count)"
$report += "- Pending workflow runs: $($pendingRuns.Count)"
$report += "- Check runs: $($checkRuns.Count)"
$report += "- Failed check runs: $($failedChecks.Count)"
$report += "- Failed jobs: $($failedJobs.Count)"
$report += "- PR changed files: $($prFiles.Count)"
$report += ''
$report += '## Canonical boundary'
$report += ''
$report += 'This interface resolves the target, snapshots the canonical orchestrator package from the exact candidate, and collects remote evidence. It intentionally does not parse, execute, police, approve, or self-certify the textual orchestrator package. Root-correct Target System treatment remains the responsibility of the human/agent executing `00 -> 04`.'
$report += ''
$report += 'A green automation state is evidence, not a `CLOSED` declaration. `CLOSED` remains valid only after semantic root closure, complete cutover/cleanup, negative-space recheck, and exact-final-candidate verification under the orchestrator.'
Save-Text -Path (Join-Path $OutputDirectory 'REPORT.md') -Text ($report -join [Environment]::NewLine)

if ($Json) {
    $summary | ConvertTo-Json -Depth 100
}
else {
    Write-Host "REPOSITORY=$Repository"
    Write-Host "TARGET=${targetKind}:$targetInput"
    Write-Host "EXACT_CANDIDATE_SHA=$candidateSha"
    Write-Host "FINAL_RECHECK_SHA=$finalSha"
    Write-Host "TARGET_STABLE=$targetStable"
    Write-Host "AUTOMATION_STATE=$automationState"
    Write-Host "CLOSURE_CLAIM=NOT_SELF_CERTIFIED_BY_SCRIPT"
    Write-Host "OUTPUT_DIRECTORY=$OutputDirectory"
    Write-Host "CANONICAL_INVOCATION=$(Join-Path $OutputDirectory 'canonical-invocation.txt')"
    Write-Host "REPORT=$(Join-Path $OutputDirectory 'REPORT.md')"
}

if ($automationState -eq 'REMOTE_EVIDENCE_GREEN__SEMANTIC_CLOSURE_NOT_SELF_CERTIFIED') {
    exit 0
}
exit 2
