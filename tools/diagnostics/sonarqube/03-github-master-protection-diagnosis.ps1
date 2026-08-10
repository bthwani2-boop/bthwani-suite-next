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
    if ($OutputRoot) { $dir = $OutputRoot } else { $dir = Join-Path (Resolve-RepoRoot) ".diagnostics\$Prefix-$(Get-Date -Format yyyyMMdd-HHmmss)" }
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    return (Resolve-Path $dir).Path
}
function Write-Section([string]$Title) { Write-Host ""; Write-Host ("=" * 78); Write-Host $Title; Write-Host ("=" * 78) }
function Save-Json($Object,[string]$Path) { $Object | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $Path -Encoding utf8 }
function Gh-ApiJson([string]$Endpoint) {
    $raw = & gh api $Endpoint 2>&1
    if ($LASTEXITCODE -ne 0) { throw "gh api failed for '$Endpoint': $($raw -join [Environment]::NewLine)" }
    return (($raw -join [Environment]::NewLine) | ConvertFrom-Json)
}

$RepoRoot = Resolve-RepoRoot
$DiagDir = New-DiagDir "github-master-protection"
Start-Transcript -Path (Join-Path $DiagDir "transcript.txt") -Force | Out-Null

try {
    Set-Location $RepoRoot
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh command not found" }
    & gh auth status *> $null
    if ($LASTEXITCODE -ne 0) { throw "GitHub CLI is not authenticated. Run: gh auth status" }

    Write-Section "1. Resolve target branch"
    $branchInfo = Gh-ApiJson "repos/$Repository/branches/$Branch"
    Save-Json $branchInfo (Join-Path $DiagDir "branch.json")
    $sha = $branchInfo.commit.sha
    "Branch=$Branch"
    "SHA=$sha"
    "LegacyProtected=$($branchInfo.protected)"

    Write-Section "2. Repository rulesets"
    $rulesets = Gh-ApiJson "repos/$Repository/rulesets"
    Save-Json $rulesets (Join-Path $DiagDir "rulesets-index.json")
    $rulesets | Select-Object id,name,target,enforcement,created_at,updated_at | Format-Table -AutoSize
    $allRulesets = @()
    foreach ($r in @($rulesets)) {
        try {
            $detail = Gh-ApiJson "repos/$Repository/rulesets/$($r.id)"
            $allRulesets += $detail
            Save-Json $detail (Join-Path $DiagDir "ruleset-$($r.id).json")
        } catch { Write-Warning "Could not read ruleset $($r.id): $($_.Exception.Message)" }
    }
    $targeting = @($allRulesets | Where-Object { @($_.conditions.ref_name.include) -contains "refs/heads/$Branch" })
    $targeting | Select-Object id,name,enforcement | Format-Table -AutoSize

    Write-Section "3. Legacy branch protection"
    try {
        $legacy = Gh-ApiJson "repos/$Repository/branches/$Branch/protection"
        Save-Json $legacy (Join-Path $DiagDir "legacy-branch-protection.json")
        "LegacyProtectionEndpoint=AVAILABLE"
    } catch {
        "LegacyProtectionEndpoint=NOT_ACTIVE_OR_NOT_ACCESSIBLE"
        $_.Exception.Message | Set-Content -LiteralPath (Join-Path $DiagDir "legacy-branch-protection-error.txt")
    }

    Write-Section "4. Actual check runs on target SHA"
    $checks = Gh-ApiJson "repos/$Repository/commits/$sha/check-runs?per_page=100"
    Save-Json $checks (Join-Path $DiagDir "check-runs.json")
    $actual = @($checks.check_runs | ForEach-Object {
        [pscustomobject]@{ Name=$_.name; Status=$_.status; Conclusion=$_.conclusion; App=$_.app.slug; Details=$_.details_url }
    })
    $actual | Sort-Object Name | Format-Table -AutoSize
    $actual | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $DiagDir "check-runs.csv")

    Write-Section "5. Required checks versus actual checks"
    $required = @()
    foreach ($r in $targeting) {
        foreach ($rule in @($r.rules)) {
            if ($rule.type -eq 'required_status_checks') {
                foreach ($c in @($rule.parameters.required_status_checks)) {
                    $required += [pscustomobject]@{ Ruleset=$r.name; Enforcement=$r.enforcement; Context=$c.context }
                }
            }
        }
    }
    $comparison = foreach ($req in $required) {
        $match = @($actual | Where-Object Name -eq $req.Context)
        [pscustomobject]@{
            Ruleset=$req.Ruleset
            Enforcement=$req.Enforcement
            RequiredContext=$req.Context
            PresentOnCurrentSHA=$match.Count -gt 0
            CurrentConclusion=if ($match.Count) { $match.Conclusion -join ',' } else { '' }
        }
    }
    $comparison | Format-Table -AutoSize
    $comparison | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $DiagDir "required-vs-actual.csv")

    Write-Section "6. Sonar merge-gate status"
    $sonarActual = @($actual | Where-Object { $_.Name -match 'Sonar' })
    $sonarRequired = @($required | Where-Object { $_.Context -match 'Sonar' })
    "SonarChecksPresent=$($sonarActual.Count)"
    "SonarRequiredContextsConfigured=$($sonarRequired.Count)"
    if ($sonarActual.Count) { $sonarActual | Format-Table -AutoSize }

    Write-Section "7. Findings"
    $findings = New-Object System.Collections.Generic.List[string]
    $activeTargetRulesets = @($targeting | Where-Object enforcement -eq 'active')
    if (-not $branchInfo.protected -and $activeTargetRulesets.Count -eq 0) { $findings.Add('CRITICAL: master has no active branch/ruleset protection.') }
    $disabledTargetRulesets = @($targeting | Where-Object enforcement -eq 'disabled')
    if ($disabledTargetRulesets.Count -gt 0) { $findings.Add('HIGH: a master protection ruleset exists but is disabled.') }
    if ($sonarActual.Count -gt 0 -and $sonarRequired.Count -eq 0) { $findings.Add('HIGH: Sonar runs but is not a required status check in the targeting ruleset.') }
    $staleRequired = @($comparison | Where-Object { -not $_.PresentOnCurrentSHA })
    if ($required.Count -gt 0 -and $staleRequired.Count -gt 0) { $findings.Add("HIGH: $($staleRequired.Count) configured required check context(s) do not match a check name on the current master SHA.") }
    $findings | Tee-Object -FilePath (Join-Path $DiagDir "summary.txt")
    if ($findings.Count -eq 0) { 'No branch protection mismatch detected.' | Tee-Object -FilePath (Join-Path $DiagDir "summary.txt") -Append }
    Write-Host "Output: $DiagDir"
}
finally { Stop-Transcript | Out-Null }
