#requires -Version 7.0

function Get-BThwaniQualityGateRegistry {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepoRoot)

    $path = Join-Path $RepoRoot 'governance/github/required-quality-checks.json'
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required quality-check registry is missing: $path"
    }

    try {
        $registry = Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
    } catch {
        throw "Required quality-check registry is invalid JSON: $($_.Exception.Message)"
    }

    if ([int]$registry.schemaVersion -ne 1) {
        throw "Unsupported required quality-check registry schemaVersion '$($registry.schemaVersion)'."
    }

    $items = @($registry.requiredChecks)
    if ($items.Count -eq 0) { throw 'Required quality-check registry is empty.' }

    $names = @($items | ForEach-Object { [string]$_.context })
    $empty = @($names | Where-Object { -not $_ })
    $duplicates = @($names | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name)
    if ($empty.Count -gt 0 -or $duplicates.Count -gt 0) {
        throw "Invalid required quality-check registry. empty=$($empty.Count) duplicates=[$($duplicates -join ', ')]"
    }

    $producerMissing = @($items | Where-Object { -not [string]$_.producer })
    if ($producerMissing.Count -gt 0) {
        throw "$($producerMissing.Count) required quality-check registry entries are missing producer identity."
    }

    return $registry
}

function Get-BThwaniRequiredQualityCheckNames {
    [CmdletBinding()]
    param([Parameter(Mandatory=$true)][string]$RepoRoot)
    $registry = Get-BThwaniQualityGateRegistry -RepoRoot $RepoRoot
    return @($registry.requiredChecks | ForEach-Object { [string]$_.context })
}
