#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$Branch = "master",
    [string]$OutputRoot = ""
)

$ErrorActionPreference = "Stop"

function Resolve-RepoRoot {
    $root = (& git rev-parse --show-toplevel 2>$null).Trim()
    if ($LASTEXITCODE -eq 0 -and $root) { return $root }
    throw "Run this script from inside the bthwani-suite-next Git repository."
}

function New-DiagDir([string]$Prefix) {
    if ($OutputRoot) { $dir = $OutputRoot }
    else {
        $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
        $dir = Join-Path (Resolve-RepoRoot) ".diagnostics\$Prefix-$stamp"
    }
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    return (Resolve-Path $dir).Path
}

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host ("=" * 78)
    Write-Host $Title
    Write-Host ("=" * 78)
}

function Save-Json($Object, [string]$Path) {
    $Object | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding utf8
}

function Require-Command([string]$Name) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $cmd) { throw "Required command not found: $Name" }
    return $cmd.Source
}

function Test-GhAuth {
    & gh auth status *> $null
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI is not authenticated. Run: gh auth status" }
}

function Gh-ApiJson([string]$Endpoint) {
    $raw = & gh api $Endpoint 2>&1
    if ($LASTEXITCODE -ne 0) { throw "gh api failed for '$Endpoint': $($raw -join [Environment]::NewLine)" }
    return (($raw -join [Environment]::NewLine) | ConvertFrom-Json)
}

$RepoRoot = Resolve-RepoRoot
$DiagDir = New-DiagDir "sonarqube-repository"
$Summary = Join-Path $DiagDir "summary.txt"
Start-Transcript -Path (Join-Path $DiagDir "transcript.txt") -Force | Out-Null

try {
    Write-Section "1. Local repository identity"
    Set-Location $RepoRoot
    Require-Command git | Out-Null
    Require-Command gh | Out-Null
    Test-GhAuth

    $localHead = (& git rev-parse HEAD).Trim()
    $localBranch = (& git branch --show-current).Trim()
    $origin = (& git remote get-url origin).Trim()
    "RepoRoot=$RepoRoot"
    "LocalBranch=$localBranch"
    "LocalHEAD=$localHead"
    "Origin=$origin"

    Write-Section "2. Resolve remote branch immutably"
    $branchInfo = Gh-ApiJson "repos/$Repository/branches/$Branch"
    Save-Json $branchInfo (Join-Path $DiagDir "github-branch.json")
    $remoteSha = $branchInfo.commit.sha
    "RemoteBranch=$Branch"
    "RemoteSHA=$remoteSha"
    "LegacyProtected=$($branchInfo.protected)"

    Write-Section "3. Sonar repository configuration"
    $propsPath = Join-Path $RepoRoot "sonar-project.properties"
    $workflowPath = Join-Path $RepoRoot ".github\workflows\sonarqube.yml"
    if (-not (Test-Path $propsPath)) { throw "Missing sonar-project.properties" }
    if (-not (Test-Path $workflowPath)) { throw "Missing .github/workflows/sonarqube.yml" }

    $props = Get-Content $propsPath -Raw
    $workflow = Get-Content $workflowPath -Raw
    $signals = [ordered]@{
        project_key_pinned = $props -match '(?m)^sonar\.projectKey=bthwani2-boop_bthwani-suite-next\s*$'
        organization_pinned = $props -match '(?m)^sonar\.organization=bthwani2-boop\s*$'
        token_reference_present = $workflow -match 'secrets\.SONAR_TOKEN'
        pr_master_trigger = $workflow -match '(?s)pull_request:.*?branches:\s*\[master\]'
        push_master_trigger = $workflow -match '(?s)push:.*?branches:\s*\[master\]'
        full_history_checkout = $workflow -match 'fetch-depth:\s*0'
        scan_action_pinned = $workflow -match 'SonarSource/sonarqube-scan-action@[0-9a-f]{40}'
        coverage_globally_excluded = $props -match '(?m)^sonar\.coverage\.exclusions=\*\*/\*\s*$'
        cpd_globally_excluded = $props -match '(?m)^sonar\.cpd\.exclusions=\*\*/\*\s*$'
        go_coverage_report_configured = $props -match '(?m)^sonar\.go\.coverage\.reportPaths='
    }
    $signals | Format-List
    Save-Json $signals (Join-Path $DiagDir "repository-signals.json")

    Write-Section "4. Existing repository Sonar config diagnostic"
    if (Get-Command pnpm -ErrorAction SilentlyContinue) {
        & pnpm run diagnostics:sonarqube:config
        "ExitCode=$LASTEXITCODE"
    } else { Write-Warning "pnpm not found; repository Sonar config diagnostic skipped." }

    Write-Section "5. GitHub secret name presence"
    try {
        $secrets = Gh-ApiJson "repos/$Repository/actions/secrets?per_page=100"
        Save-Json $secrets (Join-Path $DiagDir "github-actions-secrets-metadata.json")
        $hasSonarToken = @($secrets.secrets.name) -contains "SONAR_TOKEN"
        "SONAR_TOKEN_name_present=$hasSonarToken"
    } catch {
        $hasSonarToken = $null
        Write-Warning "Could not list repository secret names: $($_.Exception.Message)"
    }

    Write-Section "6. SonarQube workflow runs"
    $runs = Gh-ApiJson "repos/$Repository/actions/workflows/sonarqube.yml/runs?branch=$Branch&per_page=10"
    Save-Json $runs (Join-Path $DiagDir "sonarqube-workflow-runs.json")
    $runs.workflow_runs | Select-Object -First 10 id,event,status,conclusion,head_sha,created_at,updated_at | Format-Table -AutoSize

    Write-Section "7. Check runs on current branch SHA"
    $checks = Gh-ApiJson "repos/$Repository/commits/$remoteSha/check-runs?per_page=100"
    Save-Json $checks (Join-Path $DiagDir "master-check-runs.json")
    $checks.check_runs | Sort-Object name | Select-Object name,status,conclusion,details_url | Format-Table -AutoSize
    $sonarChecks = @($checks.check_runs | Where-Object { $_.name -match 'Sonar|sonar' })
    Save-Json $sonarChecks (Join-Path $DiagDir "master-sonar-check-runs.json")

    Write-Section "8. SonarQube Cloud API evidence"
    $projectKey = "bthwani2-boop_bthwani-suite-next"
    $sonarBase = "https://sonarcloud.io/api"
    $sonarEvidence = [ordered]@{}
    try {
        $qg = Invoke-RestMethod -Uri "$sonarBase/qualitygates/project_status?projectKey=$projectKey&branch=$Branch" -Method Get -TimeoutSec 30
        $sonarEvidence.quality_gate = $qg
        "QualityGateStatus=$($qg.projectStatus.status)"
    } catch { $sonarEvidence.quality_gate_error = $_.Exception.Message; Write-Warning $_.Exception.Message }
    try {
        $metricKeys = "coverage,new_coverage,duplicated_lines_density,new_duplicated_lines_density,bugs,vulnerabilities,code_smells,security_hotspots"
        $measures = Invoke-RestMethod -Uri "$sonarBase/measures/component?component=$projectKey&branch=$Branch&metricKeys=$metricKeys" -Method Get -TimeoutSec 30
        $sonarEvidence.measures = $measures
        $measures.component.measures | Select-Object metric,value,bestValue | Format-Table -AutoSize
    } catch { $sonarEvidence.measures_error = $_.Exception.Message; Write-Warning $_.Exception.Message }
    try {
        $issues = Invoke-RestMethod -Uri "$sonarBase/issues/search?componentKeys=$projectKey&branch=$Branch&resolved=false&ps=1&facets=types,severities" -Method Get -TimeoutSec 30
        $sonarEvidence.issues = $issues
        "OpenIssuesTotal=$($issues.total)"
    } catch { $sonarEvidence.issues_error = $_.Exception.Message; Write-Warning $_.Exception.Message }
    Save-Json $sonarEvidence (Join-Path $DiagDir "sonarcloud-public-api.json")

    Write-Section "9. Final repository/Sonar risk summary"
    $risk = New-Object System.Collections.Generic.List[string]
    if (-not $branchInfo.protected) { $risk.Add("CRITICAL: master is not protected by legacy branch protection.") }
    if ($signals.coverage_globally_excluded) { $risk.Add("HIGH: sonar.coverage.exclusions=**/* disables coverage as a gate.") }
    if ($signals.cpd_globally_excluded) { $risk.Add("HIGH: sonar.cpd.exclusions=**/* disables duplication detection as a gate.") }
    if (-not $signals.pr_master_trigger) { $risk.Add("HIGH: Sonar PR trigger for master was not detected.") }
    if (-not $signals.push_master_trigger) { $risk.Add("HIGH: Sonar push trigger for master was not detected.") }
    if ($hasSonarToken -eq $false) { $risk.Add("CRITICAL: SONAR_TOKEN secret name is not present.") }
    if ($sonarChecks.Count -eq 0) { $risk.Add("HIGH: no Sonar-related check run found on current master SHA.") }
    $risk | Tee-Object -FilePath $Summary
    if ($risk.Count -eq 0) { "No repository-side Sonar wiring risks detected." | Tee-Object -FilePath $Summary -Append }
    Write-Host "Output: $DiagDir"
}
finally { Stop-Transcript | Out-Null }
