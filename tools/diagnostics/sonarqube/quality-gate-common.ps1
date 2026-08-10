#requires -Version 7.0

function Get-BThwaniQualityGateRegistry {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepoRoot)

    $rulesetPath = Join-Path $RepoRoot 'governance/github/master-protection.ruleset.json'
    if (-not (Test-Path -LiteralPath $rulesetPath)) {
        throw "Desired master protection contract is missing: $rulesetPath"
    }

    try {
        $ruleset = Get-Content -LiteralPath $rulesetPath -Raw | ConvertFrom-Json
    } catch {
        throw "Desired master protection contract is invalid JSON: $($_.Exception.Message)"
    }

    if ([string]$ruleset.target -ne 'branch') { throw "Desired master protection target must be 'branch'." }
    if ([string]$ruleset.enforcement -ne 'active') { throw "Desired master protection enforcement must be 'active'." }
    if (-not [string]$ruleset.name) { throw 'Desired master ruleset name is missing.' }

    $includes = @($ruleset.conditions.ref_name.include)
    if ($includes.Count -ne 1 -or [string]$includes[0] -notmatch '^refs/heads/(.+)$') {
        throw "Desired master ruleset must target exactly one refs/heads/<branch> include."
    }
    $baseBranch = $Matches[1]

    $statusRules = @($ruleset.rules | Where-Object type -eq 'required_status_checks')
    if ($statusRules.Count -ne 1) { throw 'Desired master ruleset must contain exactly one required_status_checks rule.' }
    if (-not $statusRules[0].parameters.strict_required_status_checks_policy) {
        throw 'Desired master ruleset must use strict required status checks.'
    }

    $items = @($statusRules[0].parameters.required_status_checks)
    if ($items.Count -eq 0) { throw 'Desired master ruleset required_status_checks is empty.' }

    $names = @($items | ForEach-Object { [string]$_.context })
    $empty = @($names | Where-Object { -not $_ })
    $duplicates = @($names | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
    $unbound = @($items | Where-Object { -not $_.integration_id -or [int64]$_.integration_id -le 0 })
    if ($empty.Count -gt 0 -or $duplicates.Count -gt 0 -or $unbound.Count -gt 0) {
        throw "Invalid desired required-check inventory. empty=$($empty.Count) duplicates=[$($duplicates -join ', ')] unbound=$($unbound.Count)"
    }

    return [pscustomobject]@{
        schemaVersion = 1
        baseBranch = $baseBranch
        rulesetName = [string]$ruleset.name
        requiredChecks = @(
            $items | ForEach-Object {
                [pscustomobject]@{
                    context = [string]$_.context
                    integrationId = [int64]$_.integration_id
                }
            }
        )
    }
}

function Get-BThwaniRequiredQualityCheckNames {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepoRoot)
    $registry = Get-BThwaniQualityGateRegistry -RepoRoot $RepoRoot
    return @($registry.requiredChecks | ForEach-Object { [string]$_.context })
}
