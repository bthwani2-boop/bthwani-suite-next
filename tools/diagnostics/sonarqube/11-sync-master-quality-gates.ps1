#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$RulesetName = "master-protection",
    [switch]$Apply
)

$ErrorActionPreference = "Stop"
$ApiVersion = "2026-03-10"

$common = Join-Path $PSScriptRoot 'quality-gate-common.ps1'
if (-not (Test-Path -LiteralPath $common)) { throw "Missing shared quality-gate helper: $common" }
. $common

function Invoke-Native {
    param([scriptblock]$Command,[string]$Failure)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw $Failure }
}

function Get-NativeText {
    param([scriptblock]$Command,[string]$Failure)
    $lines = @(& $Command)
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) { throw $Failure }
    $text = ($lines -join "`n").Trim()
    if (-not $text) { throw $Failure }
    return $text
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$registry = Get-BThwaniQualityGateRegistry -RepoRoot $repoRoot
if ([string]$registry.baseBranch -ne $BaseBranch) {
    throw "Registry baseBranch '$($registry.baseBranch)' does not match requested '$BaseBranch'."
}
if ([string]$registry.rulesetName -ne $RulesetName) {
    throw "Registry rulesetName '$($registry.rulesetName)' does not match requested '$RulesetName'."
}
$requiredEntries = @($registry.requiredChecks)
$requiredNames = @($requiredEntries | ForEach-Object { [string]$_.context })
$expectedProducer = @{}
foreach ($entry in $requiredEntries) { $expectedProducer[[string]$entry.context] = [string]$entry.producer }

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."

$masterSha = Get-NativeText -Command {
    gh api -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/commits/$BaseBranch" --jq .sha
} -Failure "Unable to resolve $BaseBranch SHA."
Write-Host "Protected branch SHA: $masterSha"

$checksJson = gh api -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/commits/$masterSha/check-runs?per_page=100"
if ($LASTEXITCODE -ne 0) { throw "Unable to read checks for $masterSha." }
$checks = @(($checksJson | ConvertFrom-Json).check_runs)
$rows = foreach ($name in $requiredNames) {
    $run = @($checks | Where-Object name -eq $name | Sort-Object started_at -Descending | Select-Object -First 1)
    if ($run.Count -eq 0) {
        [pscustomobject]@{Name=$name;Status='missing';Conclusion='';App='';IntegrationId=$null;ProducerMatch=$false}
    } else {
        $app = [string]$run[0].app.slug
        [pscustomobject]@{
            Name=$name
            Status=[string]$run[0].status
            Conclusion=[string]$run[0].conclusion
            App=$app
            IntegrationId=$run[0].app.id
            ProducerMatch=($app -eq $expectedProducer[$name])
        }
    }
}
$rows | Format-Table -AutoSize | Out-Host
$bad = @($rows | Where-Object {
    $_.Status -ne 'completed' -or $_.Conclusion -ne 'success' -or -not $_.ProducerMatch -or -not $_.IntegrationId -or [int64]$_.IntegrationId -le 0
})
if ($bad.Count -gt 0) {
    throw "Refusing ruleset sync: $($bad.Count) registry-defined checks are missing, failing, or produced by the wrong GitHub App on $BaseBranch."
}

$rulesetsJson = gh api -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/rulesets"
if ($LASTEXITCODE -ne 0) { throw "Unable to list repository rulesets." }
$matches = @(($rulesetsJson | ConvertFrom-Json) | Where-Object name -eq $RulesetName)
if ($matches.Count -ne 1) { throw "Expected exactly one ruleset named '$RulesetName'; found $($matches.Count)." }
$rulesetId = [int64]$matches[0].id
$rulesetJson = gh api -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/rulesets/$rulesetId"
if ($LASTEXITCODE -ne 0) { throw "Unable to read ruleset $rulesetId." }
$ruleset = $rulesetJson | ConvertFrom-Json
if ($ruleset.enforcement -ne 'active') { throw "Ruleset '$RulesetName' must already be active before synchronization." }
if ($ruleset.conditions.ref_name.include -notcontains "refs/heads/$BaseBranch") { throw "Ruleset does not target refs/heads/$BaseBranch." }

$statusRules = @($ruleset.rules | Where-Object type -eq 'required_status_checks')
if ($statusRules.Count -ne 1) { throw "Expected exactly one required_status_checks rule." }
$statusRules[0].parameters.strict_required_status_checks_policy = $true
$statusRules[0].parameters.do_not_enforce_on_create = $false

function New-RequiredContexts([bool]$BindApps) {
    return @(
        foreach ($row in $rows) {
            if ($BindApps) {
                [ordered]@{context=[string]$row.Name;integration_id=[int64]$row.IntegrationId}
            } else {
                [ordered]@{context=[string]$row.Name}
            }
        }
    )
}

function New-Body([object[]]$RequiredContexts) {
    $statusRules[0].parameters.required_status_checks = $RequiredContexts
    return [ordered]@{
        name=[string]$ruleset.name
        target=[string]$ruleset.target
        enforcement=[string]$ruleset.enforcement
        bypass_actors=@($ruleset.bypass_actors)
        conditions=$ruleset.conditions
        rules=@($ruleset.rules)
    }
}

function Put-Body([object]$Body,[string]$Failure) {
    $tmp = Join-Path ([IO.Path]::GetTempPath()) "bthwani-quality-gates-$PID-$([guid]::NewGuid().ToString('N')).json"
    try {
        $Body | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $tmp -Encoding utf8
        Invoke-Native {
            gh api --method PUT -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/rulesets/$rulesetId" --input $tmp
        } $Failure
    } finally {
        Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
    }
}

$boundContexts = New-RequiredContexts -BindApps $true
Write-Host "Desired required-check inventory:"
$boundContexts | ConvertTo-Json -Depth 5 | Write-Host
if (-not $Apply) {
    Write-Host "DRY RUN: no ruleset mutation performed. Re-run with -Apply after reviewing the live check inventory above."
    exit 0
}

# Stage the exact contexts without app binding while keeping all existing rules
# active, then bind each context to the GitHub App that actually produced the
# successful check. This avoids replacing or dropping unrelated rules such as
# future code-scanning requirements.
Write-Host "Staging registry-defined required contexts while preserving all existing rules..."
Put-Body -Body (New-Body -RequiredContexts (New-RequiredContexts -BindApps $false)) -Failure "Required-context staging failed."

Write-Host "Binding required contexts to their proven GitHub App integrations..."
Put-Body -Body (New-Body -RequiredContexts $boundContexts) -Failure "App-bound required-context synchronization failed."

$verifyJson = gh api -H "X-GitHub-Api-Version: $ApiVersion" "repos/$Repository/rulesets/$rulesetId"
if ($LASTEXITCODE -ne 0) { throw "Unable to verify synchronized ruleset." }
$verify = $verifyJson | ConvertFrom-Json
$verifyStatus = @($verify.rules | Where-Object type -eq 'required_status_checks')
if ($verifyStatus.Count -ne 1) { throw "Synchronized ruleset lost its required_status_checks rule." }
$configured = @($verifyStatus[0].parameters.required_status_checks)
$configuredNames = @($configured | ForEach-Object context)
$missing = @($requiredNames | Where-Object { $_ -notin $configuredNames })
$unexpected = @($configuredNames | Where-Object { $_ -notin $requiredNames })
$unbound = @($configured | Where-Object { -not $_.integration_id -or [int64]$_.integration_id -le 0 })
if ($missing.Count -gt 0 -or $unexpected.Count -gt 0 -or $unbound.Count -gt 0) {
    throw "Ruleset sync verification failed. missing=[$($missing -join ', ')] unexpected=[$($unexpected -join ', ')] unbound=$($unbound.Count)"
}
if (-not $verifyStatus[0].parameters.strict_required_status_checks_policy) { throw "Ruleset strict required-status policy is disabled after sync." }

Write-Host "MASTER REQUIRED QUALITY CHECKS: SYNCHRONIZED"
Write-Host "Ruleset $RulesetName remains active and all registry-defined contexts are strict and integration-bound."
