#requires -Version 7.0

function Get-BThwaniQualityGateRegistry {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepoRoot)

    $workflowPath = Join-Path $RepoRoot 'governance/github/workflow-registry.json'
    $rulesetPath = Join-Path $RepoRoot 'governance/github/master-protection.ruleset.json'
    foreach ($path in @($workflowPath, $rulesetPath)) {
        if (-not (Test-Path -LiteralPath $path)) { throw "Required GitHub governance contract is missing: $path" }
    }

    try {
        $workflowRegistry = Get-Content -LiteralPath $workflowPath -Raw | ConvertFrom-Json
        $ruleset = Get-Content -LiteralPath $rulesetPath -Raw | ConvertFrom-Json
    } catch {
        throw "GitHub governance contract is invalid JSON: $($_.Exception.Message)"
    }

    if ([int]$workflowRegistry.schemaVersion -ne 1) {
        throw "Unsupported workflow registry schemaVersion '$($workflowRegistry.schemaVersion)'."
    }

    $items = @($workflowRegistry.requiredChecks)
    if ($items.Count -eq 0) { throw 'Workflow registry requiredChecks is empty.' }

    $names = @($items | ForEach-Object { [string]$_.context })
    $empty = @($names | Where-Object { -not $_ })
    $duplicates = @($names | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
    if ($empty.Count -gt 0 -or $duplicates.Count -gt 0) {
        throw "Invalid workflow-registry requiredChecks. empty=$($empty.Count) duplicates=[$($duplicates -join ', ')]"
    }

    $producerMissing = @($items | Where-Object { -not [string]$_.producer })
    if ($producerMissing.Count -gt 0) {
        throw "$($producerMissing.Count) required check entries are missing producer identity."
    }

    $includes = @($ruleset.conditions.ref_name.include)
    if ($includes.Count -ne 1 -or [string]$includes[0] -notmatch '^refs/heads/(.+)$') {
        throw "Desired master ruleset must target exactly one refs/heads/<branch> include."
    }
    $baseBranch = $Matches[1]
    if (-not [string]$ruleset.name) { throw 'Desired master ruleset name is missing.' }

    return [pscustomobject]@{
        schemaVersion = 1
        baseBranch = $baseBranch
        rulesetName = [string]$ruleset.name
        requiredChecks = $items
    }
}

function Get-BThwaniRequiredQualityCheckNames {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepoRoot)
    $registry = Get-BThwaniQualityGateRegistry -RepoRoot $RepoRoot
    return @($registry.requiredChecks | ForEach-Object { [string]$_.context })
}
