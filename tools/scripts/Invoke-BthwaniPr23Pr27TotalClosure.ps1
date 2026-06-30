<#
.SYNOPSIS
  BThwani post-merge PR #23-#27 closure auditor/executor.

.DESCRIPTION
  This script is intentionally fail-closed. It verifies GitHub Remote truth, audits PR #23-#27,
  captures CI/CodeQL failure evidence, optionally runs local checks, and can prepare an issue/PR
  only when explicit write switches are provided.

  It does NOT merge pull requests.
  It does NOT disable CodeQL.
  It does NOT weaken CI gates.
  It does NOT edit branch protection/rulesets automatically.
  It never prints READY/CLOSED/100%.

.REQUIREMENTS
  - PowerShell 7+
  - git
  - gh CLI authenticated to GitHub
  - pnpm/go/docker only for -Mode Full

.EXAMPLES
  Audit only:
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\scripts\Invoke-BthwaniPr23Pr27TotalClosure.ps1 -Mode Audit -RepoRoot C:\path\to\repo

  Full local validation:
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\scripts\Invoke-BthwaniPr23Pr27TotalClosure.ps1 -Mode Full -RepoRoot C:\path\to\repo

  Prepare local branch and push it:
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\scripts\Invoke-BthwaniPr23Pr27TotalClosure.ps1 -Mode PrepareBranch -RepoRoot C:\path\to\repo -AllowGithubWrites -PushBranch

  Create governing issue after audit:
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\scripts\Invoke-BthwaniPr23Pr27TotalClosure.ps1 -Mode CreateIssue -RepoRoot C:\path\to\repo -AllowGithubWrites

  Rerun failed GitHub runs only after fixes:
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\tools\scripts\Invoke-BthwaniPr23Pr27TotalClosure.ps1 -Mode RerunFailedGithubRuns -AllowGithubRerun
#>

[CmdletBinding()]
param(
  [ValidateSet('Audit','Full','PrepareBranch','CreateIssue','CreatePullRequest','RerunFailedGithubRuns')]
  [string]$Mode = 'Audit',

  [string]$RepoRoot = (Get-Location).Path,
  [string]$RepoFullName = 'bthwani2-boop/bthwani-suite-next',
  [string]$BaseBranch = 'master',
  [string]$LegacyBranch = 'brach-validation',
  [string]$BranchName = 'fix/salvage-valid-progress-before-master-merge',

  [int[]]$PrNumbers = @(23,24,25,26,27),
  [int]$ExpectedHighestPr = 29,
  [string]$Pr23HeadSha = 'b4795a48c743d083e5e296b37dcea03384a2b3e5',
  [string]$Pr23MergeCommitSha = '1d1f3d78cb9eda55fff4003f4e0a3bb9882a10a4',
  [int64]$FailedCiRunId = 28398892283,
  [int64]$FailedCodeQlRunId = 28398892278,

  [switch]$AllowGithubWrites,
  [switch]$AllowGithubRerun,
  [switch]$PushBranch,
  [switch]$SkipDocker,
  [switch]$SkipGo,
  [switch]$SkipNode,
  [switch]$OpenReport
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RequiredChecks = @(
  'CI / Node / PNPM gates',
  'CI / DSH Go backend',
  'CI / DSH Go DB integration',
  'CI / WLT Go backend',
  'CI / WLT Go DB integration',
  'CI / Identity Go backend',
  'CI / Docker runtime smoke',
  'CodeQL / Analyze (go)',
  'CodeQL / Analyze (javascript-typescript)'
)

$NodeChecks = @(
  "pnpm install --frozen-lockfile",
  "pnpm run contracts:lint",
  "pnpm run guard:matrix:v3",
  "pnpm run guard:unified-fullstack-brain",
  "pnpm run guard:dsh-frontend-shared-ownership",
  "pnpm run guard:wlt-dsh-frontend-shared-ownership",
  "pnpm run guard:dsh-frontend-shared-boundary-imports",
  "pnpm run guard:no-financial-mutation-outside-wlt",
  "pnpm run guard:no-direct-financial-provider-access-outside-wlt",
  "pnpm run guard:no-direct-fetch-in-screen",
  "pnpm run guard:no-preview-demo-mock-runtime",
  "pnpm run guard:no-broken-imports",
  "pnpm run guard:canonical-host-ports",
  "pnpm run guard:no-hardcoded-local-repo-root",
  "pnpm run guard:canonical-currency-yemen",
  "pnpm run foundation:gate",
  "pnpm run slice:gate",
  "pnpm run typecheck",
  "pnpm run test",
  "pnpm run build"
)

$GoModules = @(
  'core/identity/backend',
  'services/dsh/backend',
  'services/wlt/backend'
)

function Write-Section([string]$Message) {
  Write-Host ""
  Write-Host "=== $Message ==="
}

function Write-Ok([string]$Message) { Write-Host "[PASS] $Message" }
function Write-WarnLine([string]$Message) { Write-Host "[WARN] $Message" -ForegroundColor Yellow }
function Write-FailLine([string]$Message) { Write-Host "[FAIL] $Message" -ForegroundColor Red }

function Fail([string]$Message) {
  Write-FailLine $Message
  throw $Message
}

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Fail "Required command not found in PATH: $Name"
  }
}

function New-Directory([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
  }
}

function ConvertTo-JsonFile($Object, [string]$Path) {
  $Object | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Invoke-External {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][string[]]$Command,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [string]$WorkingDirectory = $RepoRoot,
    [hashtable]$Env = @{},
    [switch]$AllowFailure,
    [switch]$RawOutput
  )

  $start = Get-Date
  $old = @{}
  foreach ($key in $Env.Keys) {
    $old[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, [string]$Env[$key], 'Process')
  }

  try {
    $display = ($Command -join ' ')
    if (-not $RawOutput) {
      "# $Name" | Set-Content -LiteralPath $OutFile -Encoding UTF8
      "Command: $display" | Add-Content -LiteralPath $OutFile -Encoding UTF8
      "Started: $($start.ToString('o'))" | Add-Content -LiteralPath $OutFile -Encoding UTF8
      "WorkingDirectory: $WorkingDirectory" | Add-Content -LiteralPath $OutFile -Encoding UTF8
      "" | Add-Content -LiteralPath $OutFile -Encoding UTF8
    } else {
      $null | Set-Content -LiteralPath $OutFile -Encoding UTF8
    }

    Push-Location -LiteralPath $WorkingDirectory
    try {
      $argsList = if ($Command.Length -gt 1) { $Command[1..($Command.Length - 1)] } else { @() }
      & $Command[0] @argsList *>&1 | Tee-Object -FilePath $OutFile -Append | Out-Null
      $exit = if ($LASTEXITCODE -eq $null) { 0 } else { $LASTEXITCODE }
    } finally {
      Pop-Location
    }

    $end = Get-Date
    if (-not $RawOutput) {
      "" | Add-Content -LiteralPath $OutFile -Encoding UTF8
      "ExitCode: $exit" | Add-Content -LiteralPath $OutFile -Encoding UTF8
      "Finished: $($end.ToString('o'))" | Add-Content -LiteralPath $OutFile -Encoding UTF8
      "DurationSeconds: $([math]::Round(($end-$start).TotalSeconds,2))" | Add-Content -LiteralPath $OutFile -Encoding UTF8
    }

    if ($exit -ne 0 -and -not $AllowFailure) {
      throw "Command failed ($exit): $display"
    }

    return [pscustomobject]@{
      name = $Name
      command = $display
      exitCode = $exit
      ok = ($exit -eq 0)
      log = $OutFile
      startedAt = $start.ToString('o')
      finishedAt = $end.ToString('o')
    }
  } finally {
    foreach ($key in $Env.Keys) {
      [Environment]::SetEnvironmentVariable($key, $old[$key], 'Process')
    }
  }
}

function Invoke-GhJson {
  param(
    [Parameter(Mandatory=$true)][string[]]$Args,
    [Parameter(Mandatory=$true)][string]$OutFile,
    [switch]$AllowFailure
  )

  $tmp = Join-Path (Split-Path -Parent $OutFile) ([IO.Path]::GetFileNameWithoutExtension($OutFile) + '.raw.txt')
  $result = Invoke-External -Name "gh $($Args -join ' ')" -Command (@('gh') + $Args) -OutFile $tmp -AllowFailure:$AllowFailure -RawOutput
  if (-not $result.ok) {
    if ($AllowFailure) { return $null }
    Fail "GitHub CLI command failed: gh $($Args -join ' ')"
  }

  $raw = Get-Content -LiteralPath $tmp -Raw
  if ([string]::IsNullOrWhiteSpace($raw)) { return $null }
  try {
    $json = $raw | ConvertFrom-Json -Depth 100
    ConvertTo-JsonFile $json $OutFile
    return $json
  } catch {
    if ($AllowFailure) {
      Copy-Item -LiteralPath $tmp -Destination $OutFile -Force
      return $null
    }
    throw
  }
}

function Save-Markdown([string]$Path, [string[]]$Lines) {
  $Lines -join "`r`n" | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Get-ExistingLabels {
  $labelsPath = Join-Path $EvidenceDir 'github-labels.json'
  $labels = Invoke-GhJson -Args @('label','list','--repo',$RepoFullName,'--limit','200','--json','name') -OutFile $labelsPath -AllowFailure
  if ($null -eq $labels) { return @() }
  return @($labels | ForEach-Object { $_.name })
}

function Get-RunJobs([int64]$RunId, [string]$Prefix) {
  $jobsPath = Join-Path $EvidenceDir "$Prefix-jobs.json"
  return Invoke-GhJson -Args @('api',"repos/$RepoFullName/actions/runs/$RunId/jobs?per_page=100") -OutFile $jobsPath -AllowFailure
}

function Capture-RunLogs([int64]$RunId, [string]$Prefix) {
  $logPath = Join-Path $EvidenceDir "$Prefix-log-failed.txt"
  return Invoke-External -Name "$Prefix failed log" -Command @('gh','run','view',[string]$RunId,'--repo',$RepoFullName,'--log-failed') -OutFile $logPath -AllowFailure
}

function Get-CommitRuns([string]$Sha, [string]$Prefix) {
  $path = Join-Path $EvidenceDir "$Prefix-workflow-runs.json"
  return Invoke-GhJson -Args @('api',"repos/$RepoFullName/actions/runs?head_sha=$Sha&per_page=50") -OutFile $path -AllowFailure
}

function Get-RemoteTruth {
  Write-Section 'Remote truth audit'

  $repo = Invoke-GhJson -Args @('repo','view',$RepoFullName,'--json','nameWithOwner,defaultBranchRef,isPrivate,url') -OutFile (Join-Path $EvidenceDir 'repo.json')
  $masterRef = Invoke-GhJson -Args @('api',"repos/$RepoFullName/git/ref/heads/$BaseBranch") -OutFile (Join-Path $EvidenceDir 'ref-master.json')
  $legacyRef = Invoke-GhJson -Args @('api',"repos/$RepoFullName/git/ref/heads/$LegacyBranch") -OutFile (Join-Path $EvidenceDir 'ref-brach-validation.json') -AllowFailure
  $compare = Invoke-GhJson -Args @('api',"repos/$RepoFullName/compare/$BaseBranch...$LegacyBranch") -OutFile (Join-Path $EvidenceDir 'compare-master-to-brach-validation.json') -AllowFailure

  $prsList = Invoke-GhJson -Args @('pr','list','--repo',$RepoFullName,'--state','all','--limit','100','--json','number,title,state,isDraft,mergedAt,headRefName,baseRefName,headRefOid,baseRefOid,createdAt,updatedAt,url') -OutFile (Join-Path $EvidenceDir 'pull-requests-latest.json')
  $maxPr = ($prsList | Measure-Object -Property number -Maximum).Maximum
  if ($maxPr -gt $ExpectedHighestPr) {
    Save-Markdown (Join-Path $EvidenceDir 'final-verdict.md') @(
      '# Final verdict',
      '',
      'FIX_REQUIRED',
      '',
      "Reason: discovered PR #$maxPr, which is higher than expected PR #$ExpectedHighestPr. Scope must be expanded before continuing."
    )
    Fail "Detected PR #$maxPr > expected #$ExpectedHighestPr. Expand scope before continuing."
  }

  $prDetails = @()
  foreach ($n in $PrNumbers) {
    Write-Host "Fetching PR #$n"
    $jsonPath = Join-Path $EvidenceDir "pr-$n.json"
    $pr = Invoke-GhJson -Args @('pr','view',[string]$n,'--repo',$RepoFullName,'--json','number,title,state,isDraft,mergedAt,headRefName,baseRefName,headRefOid,baseRefOid,mergeCommit,changedFiles,additions,deletions,author,reviewDecision,reviews,comments,files,commits,url') -OutFile $jsonPath

    $headSha = $pr.headRefOid
    $runs = $null
    if ($headSha) {
      $runs = Get-CommitRuns -Sha $headSha -Prefix "pr-$n-head"
    }

    $checksPath = Join-Path $EvidenceDir "pr-$n-checks.txt"
    $checks = Invoke-External -Name "PR #$n checks" -Command @('gh','pr','checks',[string]$n,'--repo',$RepoFullName) -OutFile $checksPath -AllowFailure

    $reviewsCount = if ($pr.reviews) { @($pr.reviews).Count } else { 0 }
    $commentsCount = if ($pr.comments) { @($pr.comments).Count } else { 0 }
    $runsCount = if ($runs -and $runs.workflow_runs) { @($runs.workflow_runs).Count } else { 0 }
    $runConclusions = if ($runs -and $runs.workflow_runs) { (@($runs.workflow_runs) | ForEach-Object { "$($_.name):$($_.conclusion)" }) -join '; ' } else { '' }

    $decision = 'FIX_REQUIRED'
    if ($n -eq 23 -and $pr.mergedAt) { $decision = 'MERGED_BUT_NOT_VERIFIED' }
    if ($n -ge 24 -and -not $pr.mergedAt) { $decision = 'KEEP_OPEN_BLOCKED' }

    $prDetails += [pscustomobject]@{
      number = $pr.number
      title = $pr.title
      state = $pr.state
      merged = [bool]$pr.mergedAt
      draft = [bool]$pr.isDraft
      base = $pr.baseRefName
      base_sha = $pr.baseRefOid
      head = $pr.headRefName
      head_sha = $pr.headRefOid
      merge_commit_sha = if ($pr.mergeCommit) { $pr.mergeCommit.oid } else { $null }
      changed_files = $pr.changedFiles
      additions = $pr.additions
      deletions = $pr.deletions
      reviews_count = $reviewsCount
      comments_count = $commentsCount
      workflow_runs_count = $runsCount
      workflow_run_conclusions = $runConclusions
      initial_decision = $decision
      url = $pr.url
    }

    $md = @(
      "# PR #$n",
      '',
      "- Title: $($pr.title)",
      "- State: $($pr.state)",
      "- Merged: $([bool]$pr.mergedAt)",
      "- Draft: $([bool]$pr.isDraft)",
      "- Base: $($pr.baseRefName) @ $($pr.baseRefOid)",
      "- Head: $($pr.headRefName) @ $($pr.headRefOid)",
      "- Merge commit: $(if ($pr.mergeCommit) { $pr.mergeCommit.oid } else { 'none' })",
      "- Changed files: $($pr.changedFiles)",
      "- Additions: $($pr.additions)",
      "- Deletions: $($pr.deletions)",
      "- Reviews count: $reviewsCount",
      "- Comments count: $commentsCount",
      "- Workflow runs count: $runsCount",
      "- Workflow conclusions: $runConclusions",
      "- Initial decision: $decision",
      "- URL: $($pr.url)",
      '',
      '## Required decision',
      '',
      $(if ($n -eq 23) { 'MERGED_BUT_NOT_VERIFIED until CI and CodeQL are green on a new exact SHA.' } else { 'MERGE_AFTER_GREEN / CLOSE_SUPERSEDED / KEEP_OPEN_BLOCKED only after master gates are fixed.' })
    )
    Save-Markdown (Join-Path $EvidenceDir "pr-$n.md") $md
  }

  ConvertTo-JsonFile $prDetails (Join-Path $EvidenceDir 'remote-truth.json')

  $failedCiJobs = Get-RunJobs -RunId $FailedCiRunId -Prefix 'failed-ci-run-28398892283'
  $failedCodeQlJobs = Get-RunJobs -RunId $FailedCodeQlRunId -Prefix 'failed-codeql-run-28398892278'
  Capture-RunLogs -RunId $FailedCiRunId -Prefix 'failed-ci-run-28398892283' | Out-Null
  Capture-RunLogs -RunId $FailedCodeQlRunId -Prefix 'failed-codeql-run-28398892278' | Out-Null

  $remoteLines = @(
    '# Remote Truth',
    '',
    "Repository: $RepoFullName",
    "Default branch: $($repo.defaultBranchRef.name)",
    "Base branch: $BaseBranch",
    "Expected highest PR: #$ExpectedHighestPr",
    "Actual highest PR: #$maxPr",
    "PR #23 head SHA: $Pr23HeadSha",
    "PR #23 merge commit SHA: $Pr23MergeCommitSha",
    "Failed CI run id: $FailedCiRunId",
    "Failed CodeQL run id: $FailedCodeQlRunId",
    '',
    '| PR | State | Merged | Base | Head | Head SHA | Decision |',
    '|---:|---|---|---|---|---|---|'
  )
  foreach ($row in $prDetails) {
    $remoteLines += "| #$($row.number) | $($row.state) | $($row.merged) | $($row.base) | $($row.head) | $($row.head_sha) | $($row.initial_decision) |"
  }
  Save-Markdown (Join-Path $EvidenceDir 'remote-truth.md') $remoteLines

  $failedLines = @(
    '# Failed Runs',
    '',
    "## CI run $FailedCiRunId",
    '',
    'Expected known failures:',
    '- Node / PNPM gates → Foundation gate failed; Slice gate/typecheck/test/build skipped.',
    '- Docker runtime smoke → Full runtime reset and smoke failed; WireMock/WLT provider smoke skipped.',
    '',
    "## CodeQL run $FailedCodeQlRunId",
    '',
    'Expected known failures:',
    '- Analyze (go) → Perform CodeQL Analysis failed.',
    '- Analyze (javascript-typescript) → Perform CodeQL Analysis failed.',
    '',
    'Detailed logs captured in:',
    "- failed-ci-run-28398892283-log-failed.txt",
    "- failed-codeql-run-28398892278-log-failed.txt"
  )
  Save-Markdown (Join-Path $EvidenceDir 'failed-runs.md') $failedLines

  return [pscustomobject]@{
    repo = $repo
    masterRef = $masterRef
    legacyRef = $legacyRef
    compare = $compare
    prs = $prDetails
    maxPr = $maxPr
    failedCiJobs = $failedCiJobs
    failedCodeQlJobs = $failedCodeQlJobs
  }
}

function Invoke-LocalChecks {
  Write-Section 'Local checks'
  $results = @()
  $checksDir = Join-Path $EvidenceDir 'local-checks'
  New-Directory $checksDir

  if (-not $SkipNode) {
    Require-Command 'pnpm'
    foreach ($cmdStr in $NodeChecks) {
      $cmd = $cmdStr.Split(' ')
      $name = $cmdStr
      $safe = ($name -replace '[^A-Za-z0-9_.-]+','_').Trim('_')
      $out = Join-Path $checksDir "$safe.txt"
      $results += Invoke-External -Name $name -Command $cmd -OutFile $out -AllowFailure
    }
  } else {
    Write-WarnLine 'Skipping Node/PNPM checks by user request.'
  }

  if (-not $SkipGo) {
    Require-Command 'go'
    foreach ($module in $GoModules) {
      $modulePath = Join-Path $RepoRoot $module
      if (-not (Test-Path -LiteralPath $modulePath)) {
        $results += [pscustomobject]@{ name = "missing $module"; command = 'n/a'; exitCode = 1; ok = $false; log = ''; startedAt=''; finishedAt='' }
        continue
      }
      $safe = ($module -replace '[^A-Za-z0-9_.-]+','_').Trim('_')
      $results += Invoke-External -Name "$module go test" -Command @('go','test','./...') -WorkingDirectory $modulePath -OutFile (Join-Path $checksDir "$safe-go-test.txt") -AllowFailure
      $results += Invoke-External -Name "$module go build" -Command @('go','build','./...') -WorkingDirectory $modulePath -OutFile (Join-Path $checksDir "$safe-go-build.txt") -AllowFailure
    }

    $dshPath = Join-Path $RepoRoot 'services/dsh/backend'
    if (Test-Path -LiteralPath $dshPath) {
      $results += Invoke-External -Name 'DSH DB integration tests' -Command @('go','test','-v','./...') -WorkingDirectory $dshPath -OutFile (Join-Path $checksDir 'dsh-db-integration.txt') -Env @{
        DSH_REQUIRE_DB_TESTS = 'true'
        DATABASE_URL = 'postgres://dsh_runtime:dsh_runtime_password@localhost:55432/dsh_runtime?sslmode=disable'
      } -AllowFailure
    }
    $wltPath = Join-Path $RepoRoot 'services/wlt/backend'
    if (Test-Path -LiteralPath $wltPath) {
      $results += Invoke-External -Name 'WLT DB integration tests' -Command @('go','test','-v','./...') -WorkingDirectory $wltPath -OutFile (Join-Path $checksDir 'wlt-db-integration.txt') -Env @{
        WLT_REQUIRE_DB_TESTS = 'true'
        DATABASE_URL = 'postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable'
      } -AllowFailure
    }
  } else {
    Write-WarnLine 'Skipping Go checks by user request.'
  }

  if (-not $SkipDocker) {
    Require-Command 'docker'
    $runtimeScript = Join-Path $RepoRoot 'infra/docker/scripts/runtime.ps1'
    if (Test-Path -LiteralPath $runtimeScript) {
      $results += Invoke-External -Name 'Docker runtime smoke' -Command @('pwsh','-NoProfile','-ExecutionPolicy','Bypass','-File',$runtimeScript,'-Action','reset','-Profiles','identity,dsh,wlt,financial-simulators,mail') -OutFile (Join-Path $checksDir 'docker-runtime-smoke.txt') -AllowFailure
    } else {
      $results += [pscustomobject]@{ name = 'Docker runtime smoke'; command = $runtimeScript; exitCode = 1; ok = $false; log = ''; startedAt=''; finishedAt='' }
    }
  } else {
    Write-WarnLine 'Skipping Docker runtime smoke by user request.'
  }

  ConvertTo-JsonFile $results (Join-Path $EvidenceDir 'local-checks.json')

  $lines = @(
    '# Local checks',
    '',
    '| Check | Result | Exit | Log |',
    '|---|---|---:|---|'
  )
  foreach ($r in $results) {
    $status = if ($r.ok) { 'PASS' } else { 'FAIL' }
    $logName = if ($r.log) { [IO.Path]::GetFileName($r.log) } else { '' }
    $lines += "| $($r.name) | $status | $($r.exitCode) | $logName |"
  }
  Save-Markdown (Join-Path $EvidenceDir 'local-checks.md') $lines
  return $results
}

function Get-CurrentRemoteChecksStatus {
  Write-Section 'Current HEAD remote checks'
  $sha = (& git -C $RepoRoot rev-parse HEAD).Trim()
  $branch = (& git -C $RepoRoot branch --show-current).Trim()
  $runs = Get-CommitRuns -Sha $sha -Prefix 'current-head'

  $allRequiredPresentAndGreen = $false
  $summary = @()
  if ($runs -and $runs.workflow_runs) {
    foreach ($run in @($runs.workflow_runs)) {
      $summary += [pscustomobject]@{
        id = $run.id
        name = $run.name
        status = $run.status
        conclusion = $run.conclusion
        head_sha = $sha
      }
    }
    $hasFailed = @($summary | Where-Object { $_.conclusion -and $_.conclusion -ne 'success' }).Count -gt 0
    $hasSuccess = @($summary | Where-Object { $_.conclusion -eq 'success' }).Count -gt 0
    $allRequiredPresentAndGreen = ($hasSuccess -and -not $hasFailed)
  }

  ConvertTo-JsonFile ([pscustomobject]@{ branch=$branch; sha=$sha; runs=$summary; allRunsGreen=$allRequiredPresentAndGreen }) (Join-Path $EvidenceDir 'current-head-remote-checks.json')
  return [pscustomobject]@{ branch=$branch; sha=$sha; runs=$summary; allRunsGreen=$allRequiredPresentAndGreen }
}

function Prepare-Branch {
  if (-not $AllowGithubWrites) { Fail 'PrepareBranch requires -AllowGithubWrites.' }
  Require-Command 'git'
  Write-Section "Prepare branch $BranchName"
  Invoke-External -Name 'git fetch master' -Command @('git','fetch','origin',$BaseBranch) -OutFile (Join-Path $EvidenceDir 'git-fetch-master.txt') | Out-Null
  $branches = & git -C $RepoRoot branch --list $BranchName
  if ($null -ne $branches) { $branches = $branches.Trim() }
  if ($branches) {
    Invoke-External -Name 'git checkout existing branch' -Command @('git','checkout',$BranchName) -OutFile (Join-Path $EvidenceDir 'git-checkout-branch.txt') | Out-Null
    Invoke-External -Name 'git rebase origin/master' -Command @('git','rebase',"origin/$BaseBranch") -OutFile (Join-Path $EvidenceDir 'git-rebase-master.txt') -AllowFailure | Out-Null
  } else {
    Invoke-External -Name 'git checkout new branch' -Command @('git','checkout','-b',$BranchName,"origin/$BaseBranch") -OutFile (Join-Path $EvidenceDir 'git-create-branch.txt') | Out-Null
  }

  if ($PushBranch) {
    Invoke-External -Name 'git push branch' -Command @('git','push','-u','origin',$BranchName) -OutFile (Join-Path $EvidenceDir 'git-push-branch.txt') | Out-Null
  }
}

function New-GoverningIssue {
  if (-not $AllowGithubWrites) { Fail 'CreateIssue requires -AllowGithubWrites.' }
  Write-Section 'Create governing issue'
  $wantedLabels = @('P0','fix-required','gate:ci-required','gate:runtime-smoke','type:security','area:ci','area:runtime','area:github-governance')
  $existing = Get-ExistingLabels
  $labels = @($wantedLabels | Where-Object { $existing -contains $_ })
  $missing = @($wantedLabels | Where-Object { $existing -notcontains $_ })
  $bodyPath = Join-Path $EvidenceDir 'governing-issue-body.md'
  $body = @(
    '# P0: Close post-merge CI CodeQL runtime and PR 23-27 gates',
    '',
    'Current verdict: FIX_REQUIRED',
    '',
    '## Numeric evidence',
    '',
    "- PR #23 merged but not verified.",
    "- PR #23 head SHA: $Pr23HeadSha",
    "- PR #23 merge commit: $Pr23MergeCommitSha",
    "- Failed CI run: $FailedCiRunId",
    "- Failed CodeQL run: $FailedCodeQlRunId",
    "- Open PRs requiring decision: #24, #25, #26, #27",
    '',
    '## Required closure',
    '',
    '- Foundation gate',
    '- Docker runtime smoke',
    '- CodeQL Analyze (go)',
    '- CodeQL Analyze (javascript-typescript)',
    '- PR #24 decision',
    '- PR #25 decision',
    '- PR #26 decision',
    '- PR #27 decision',
    '- branch protection/ruleset evidence',
    '',
    '## Acceptance criteria',
    '',
    '- exact SHA green',
    '- no skipped typecheck/test/build',
    '- no disabled gates',
    '- no disabled CodeQL',
    '- no Dependabot merge before master green',
    '- no READY/CLOSED/100% claim',
    '',
    '## Missing labels during issue creation',
    '',
    $(if ($missing.Count) { ($missing | ForEach-Object { "- $_" }) -join "`r`n" } else { '- none' })
  )
  Save-Markdown $bodyPath $body

  $args = @('issue','create','--repo',$RepoFullName,'--title','P0: Close post-merge CI CodeQL runtime and PR 23-27 gates','--body-file',$bodyPath)
  foreach ($label in $labels) { $args += @('--label',$label) }
  Invoke-External -Name 'create governing issue' -Command (@('gh') + $args) -OutFile (Join-Path $EvidenceDir 'create-issue.txt') | Out-Null
}

function New-ClosurePullRequest {
  if (-not $AllowGithubWrites) { Fail 'CreatePullRequest requires -AllowGithubWrites.' }
  Write-Section 'Create closure pull request'
  $bodyPath = Join-Path $EvidenceDir 'closure-pr-body.md'
  $body = @(
    '# fix: close PR 23-27 CI CodeQL runtime and governance gates',
    '',
    'Current verdict: FIX_REQUIRED',
    '',
    '## Scope',
    '',
    '- PR #23 merged but unverified',
    '- PR #24 open',
    '- PR #25 open',
    '- PR #26 open',
    '- PR #27 open',
    '- CI failure',
    '- CodeQL failure',
    '- Docker runtime smoke failure',
    '- GitHub governance enforcement',
    '',
    '## Numeric evidence',
    '',
    "- PR #23 head SHA: $Pr23HeadSha",
    "- PR #23 merge commit SHA: $Pr23MergeCommitSha",
    "- failed CI run id: $FailedCiRunId",
    "- failed CodeQL run id: $FailedCodeQlRunId",
    '- new CI run id after fix: TODO',
    '- new CodeQL run id after fix: TODO',
    '- exact PR SHA: TODO',
    '',
    '## Root cause table',
    '',
    '| failure | root cause | path | fix | verification |',
    '|---|---|---|---|---|',
    '| Foundation gate | TODO | TODO | TODO | TODO |',
    '| Docker runtime smoke | TODO | TODO | TODO | TODO |',
    '| CodeQL go | TODO | TODO | TODO | TODO |',
    '| CodeQL javascript-typescript | TODO | TODO | TODO | TODO |',
    '',
    '## PR #24-#27 decision table',
    '',
    '| PR | dependency | risk | action | decision | evidence |',
    '|---:|---|---|---|---|---|',
    '| #24 | github/codeql-action 3→4 | CodeQL workflow | TODO | KEEP_OPEN_BLOCKED | TODO |',
    '| #25 | actions/checkout 4→7 | workflow checkout behavior | TODO | KEEP_OPEN_BLOCKED | TODO |',
    '| #26 | next 16.2.2→16.2.6 | DSH web/runtime/security | TODO | KEEP_OPEN_BLOCKED | TODO |',
    '| #27 | @expo/vector-icons 14.1.0→15.1.1 | Expo/mobile icon rendering | TODO | KEEP_OPEN_BLOCKED | TODO |',
    '',
    '## Checks table',
    '',
    '| check | required | result | run id | evidence |',
    '|---|---|---|---|---|',
    ($RequiredChecks | ForEach-Object { "| $_ | yes | TODO | TODO | TODO |" }) -join "`r`n",
    '',
    '## Governance table',
    '',
    '| setting | required | actual | action | status |',
    '|---|---|---|---|---|',
    '| require PR before merging | yes | TODO | TODO | TODO |',
    '| require approvals | yes | TODO | TODO | TODO |',
    '| require CODEOWNERS review | yes | TODO | TODO | TODO |',
    '| require status checks | yes | TODO | TODO | TODO |',
    '| block direct push to master | yes | TODO | TODO | TODO |',
    '',
    '## Final statement',
    '',
    'FIX_REQUIRED',
    '',
    'READY_CANDIDATE_FOR_REVIEW may be written only after all required checks are green on exact SHA.'
  )
  Save-Markdown $bodyPath $body

  Invoke-External -Name 'create pull request' -Command @('gh','pr','create','--repo',$RepoFullName,'--base',$BaseBranch,'--head',$BranchName,'--title','fix: close PR 23-27 CI CodeQL runtime and governance gates','--body-file',$bodyPath,'--draft') -OutFile (Join-Path $EvidenceDir 'create-pr.txt') | Out-Null
}

function Rerun-FailedGithubRuns {
  if (-not $AllowGithubRerun) { Fail 'RerunFailedGithubRuns requires -AllowGithubRerun.' }
  Write-Section 'Rerun failed GitHub runs'
  Invoke-External -Name 'rerun failed CI run' -Command @('gh','run','rerun',[string]$FailedCiRunId,'--repo',$RepoFullName,'--failed') -OutFile (Join-Path $EvidenceDir 'rerun-ci.txt') -AllowFailure | Out-Null
  Invoke-External -Name 'rerun failed CodeQL run' -Command @('gh','run','rerun',[string]$FailedCodeQlRunId,'--repo',$RepoFullName,'--failed') -OutFile (Join-Path $EvidenceDir 'rerun-codeql.txt') -AllowFailure | Out-Null
}

function Write-FinalVerdict {
  param(
    $RemoteTruth,
    $LocalResults,
    $RemoteChecks
  )

  $localOk = $true
  if ($LocalResults) {
    $localOk = (@($LocalResults | Where-Object { -not $_.ok }).Count -eq 0)
  } elseif ($Mode -eq 'Full') {
    $localOk = $false
  }

  $remoteGreen = $false
  if ($RemoteChecks) { $remoteGreen = [bool]$RemoteChecks.allRunsGreen }

  $verdict = 'FIX_REQUIRED'
  $reason = @()
  if (-not $localOk) { $reason += 'Local required checks are not all green or were not run.' }
  if (-not $remoteGreen) { $reason += 'GitHub Actions/CodeQL are not proven green on current exact SHA.' }
  if ($Mode -eq 'Audit') { $reason += 'Audit mode does not execute fixes or prove final readiness.' }
  if ($Mode -in @('CreateIssue','CreatePullRequest','PrepareBranch','RerunFailedGithubRuns')) { $reason += "Mode $Mode is operational only and does not prove readiness." }

  if ($localOk -and $remoteGreen -and $Mode -eq 'Full') {
    $verdict = 'READY_CANDIDATE_FOR_REVIEW'
    $reason = @('All local checks passed and current exact SHA has green GitHub workflow runs. Human review is still required before merge.')
  }

  $lines = @(
    '# Final verdict',
    '',
    $verdict,
    '',
    '## Reasons',
    ''
  )
  foreach ($r in $reason) { $lines += "- $r" }
  $lines += @(
    '',
    '## Forbidden claims',
    '',
    '- READY',
    '- CLOSED',
    '- 100%',
    '- RUNTIME_VERIFIED',
    '- MERGED_SAFE'
  )
  Save-Markdown (Join-Path $EvidenceDir 'final-verdict.md') $lines

  if ($verdict -eq 'READY_CANDIDATE_FOR_REVIEW') {
    Write-Ok 'READY_CANDIDATE_FOR_REVIEW'
  } else {
    Write-WarnLine 'FIX_REQUIRED'
  }
}

# Main
$StartedAt = Get-Date
$RepoRoot = [IO.Path]::GetFullPath($RepoRoot)
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$EvidenceDir = Join-Path $RepoRoot ".diagnostics/pr23-pr27-post-merge-closure/$Timestamp"
New-Directory $EvidenceDir

try {
  Write-Section 'Preflight'
  Require-Command 'git'
  Require-Command 'gh'
  Invoke-External -Name 'gh auth status' -Command @('gh','auth','status') -OutFile (Join-Path $EvidenceDir 'gh-auth-status.txt') | Out-Null

  if (-not (Test-Path -LiteralPath $RepoRoot)) { Fail "RepoRoot does not exist: $RepoRoot" }
  $actualTop = (& git -C $RepoRoot rev-parse --show-toplevel).Trim()
  if (-not $actualTop) { Fail "Not a git repository: $RepoRoot" }
  $actualTop = [IO.Path]::GetFullPath($actualTop)
  if ($actualTop -ne $RepoRoot) {
    Write-WarnLine "RepoRoot normalized to git top-level: $actualTop"
    $RepoRoot = $actualTop
    $EvidenceDir = Join-Path $RepoRoot ".diagnostics/pr23-pr27-post-merge-closure/$Timestamp"
    New-Directory $EvidenceDir
  }

  $remote = (& git -C $RepoRoot remote get-url origin).Trim()
  if ($remote -notmatch 'bthwani-suite-next') {
    Fail "origin remote does not look like bthwani-suite-next: $remote"
  }

  Save-Markdown (Join-Path $EvidenceDir 'run-context.md') @(
    '# Run context',
    '',
    "- Started: $($StartedAt.ToString('o'))",
    "- Mode: $Mode",
    "- RepoRoot: $RepoRoot",
    "- RepoFullName: $RepoFullName",
    "- BaseBranch: $BaseBranch",
    "- LegacyBranch: $LegacyBranch",
    "- BranchName: $BranchName",
    "- ExpectedHighestPr: $ExpectedHighestPr",
    "- FailedCiRunId: $FailedCiRunId",
    "- FailedCodeQlRunId: $FailedCodeQlRunId"
  )

  $remoteTruth = Get-RemoteTruth
  $localResults = $null
  $remoteChecks = $null

  switch ($Mode) {
    'Audit' {
      $remoteChecks = Get-CurrentRemoteChecksStatus
    }
    'Full' {
      $localResults = Invoke-LocalChecks
      $remoteChecks = Get-CurrentRemoteChecksStatus
    }
    'PrepareBranch' {
      Prepare-Branch
      $remoteChecks = Get-CurrentRemoteChecksStatus
    }
    'CreateIssue' {
      New-GoverningIssue
      $remoteChecks = Get-CurrentRemoteChecksStatus
    }
    'CreatePullRequest' {
      New-ClosurePullRequest
      $remoteChecks = Get-CurrentRemoteChecksStatus
    }
    'RerunFailedGithubRuns' {
      Rerun-FailedGithubRuns
      $remoteChecks = Get-CurrentRemoteChecksStatus
    }
  }

  Write-FinalVerdict -RemoteTruth $remoteTruth -LocalResults $localResults -RemoteChecks $remoteChecks

  $EndedAt = Get-Date
  Add-Content -LiteralPath (Join-Path $EvidenceDir 'run-context.md') -Encoding UTF8 -Value "- Finished: $($EndedAt.ToString('o'))"
  Add-Content -LiteralPath (Join-Path $EvidenceDir 'run-context.md') -Encoding UTF8 -Value "- DurationSeconds: $([math]::Round(($EndedAt-$StartedAt).TotalSeconds,2))"

  Write-Section 'Evidence output'
  Write-Host $EvidenceDir
  if ($OpenReport) {
    Invoke-Item -LiteralPath (Join-Path $EvidenceDir 'remote-truth.md')
  }

  exit 0
} catch {
  $err = $_ | Out-String
  $err | Set-Content -LiteralPath (Join-Path $EvidenceDir 'error.txt') -Encoding UTF8
  Save-Markdown (Join-Path $EvidenceDir 'final-verdict.md') @(
    '# Final verdict',
    '',
    'FIX_REQUIRED',
    '',
    '## Error',
    '',
    '```text',
    $err,
    '```'
  )
  Write-FailLine 'FIX_REQUIRED'
  Write-FailLine $err
  Write-Host "Evidence output: $EvidenceDir"
  exit 1
}
