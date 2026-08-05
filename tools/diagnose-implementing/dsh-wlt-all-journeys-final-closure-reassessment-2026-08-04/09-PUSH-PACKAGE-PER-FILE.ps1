[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path,

    [Parameter(Mandatory = $false)]
    [string]$Branch = "smsm",

    [Parameter(Mandatory = $false)]
    [switch]$ReplaceExisting
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$PackageSlug = "dsh-wlt-all-journeys-final-closure-reassessment-2026-08-04"
$PinnedSha = "f97dcbc3ecfbc19a130c4dbafef6cb7def9c3eb8"
$SourcePackage = $PSScriptRoot
$RepoRoot = [System.IO.Path]::GetFullPath($RepoRoot)
$TargetPackage = Join-Path $RepoRoot "tools\diagnose-implementing\$PackageSlug"

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $output = & git -C $RepoRoot @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "git $($Arguments -join ' ') failed:`n$output"
    }
    return @($output)
}

if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot ".git"))) {
    throw "Repository not found at $RepoRoot"
}

$currentBranch = (Invoke-Git branch --show-current | Select-Object -First 1).Trim()
if ($currentBranch -ne $Branch) {
    throw "Expected branch '$Branch' but current branch is '$currentBranch'."
}

$localSha = (Invoke-Git rev-parse HEAD | Select-Object -First 1).Trim()
$remoteLine = (& git -C $RepoRoot ls-remote origin "refs/heads/$Branch" 2>&1 | Select-Object -First 1)
if ($LASTEXITCODE -ne 0 -or -not $remoteLine) {
    throw "Unable to resolve origin/$Branch."
}
$remoteSha = ($remoteLine -split "`t")[0].Trim()
if ($localSha -ne $remoteSha) {
    throw "Local HEAD $localSha is not equal to origin/$Branch $remoteSha. Synchronize first."
}
if ($remoteSha -ne $PinnedSha) {
    throw "Package is pinned to $PinnedSha but origin/$Branch is $remoteSha. Reassess the package before pushing."
}

$statusBefore = Invoke-Git status --porcelain=v1
$outsideBefore = @($statusBefore | Where-Object {
    $_ -and ($_ -notmatch [regex]::Escape("tools/diagnose-implementing/$PackageSlug/"))
})
if ($outsideBefore.Count -gt 0) {
    throw "Changes outside the package are present:`n$($outsideBefore -join "`n")"
}

$sourceFull = [System.IO.Path]::GetFullPath($SourcePackage).TrimEnd('\')
$targetFull = [System.IO.Path]::GetFullPath($TargetPackage).TrimEnd('\')

if ($sourceFull -ne $targetFull) {
    if (Test-Path -LiteralPath $TargetPackage) {
        if (-not $ReplaceExisting) {
            throw "Target package exists. Re-run with -ReplaceExisting after confirming it is the incomplete diagnosis package."
        }
        Remove-Item -LiteralPath $TargetPackage -Recurse -Force
    }

    New-Item -ItemType Directory -Path (Split-Path $TargetPackage -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $SourcePackage -Destination $TargetPackage -Recurse -Force
}

$validator = Join-Path $RepoRoot "tools\diagnose-implementing\validate-package.mjs"
& node $validator $TargetPackage --strict
if ($LASTEXITCODE -ne 0) {
    throw "Strict package validation failed after copying."
}

$packageFiles = Get-ChildItem -LiteralPath $TargetPackage -Recurse -File |
    ForEach-Object { $_.FullName.Substring($RepoRoot.Length + 1).Replace('\', '/') } |
    Sort-Object

foreach ($relativePath in $packageFiles) {
    $state = @(Invoke-Git status --porcelain=v1 -- $relativePath)
    if ($state.Count -eq 0 -or -not ($state -join '').Trim()) {
        continue
    }

    $localSha = (Invoke-Git rev-parse HEAD | Select-Object -First 1).Trim()
    $remoteLine = (& git -C $RepoRoot ls-remote origin "refs/heads/$Branch" 2>&1 | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or -not $remoteLine) {
        throw "Unable to re-pin origin/$Branch before $relativePath."
    }
    $remoteSha = ($remoteLine -split "`t")[0].Trim()
    if ($localSha -ne $remoteSha) {
        throw "Remote moved before $relativePath. Local=$localSha Remote=$remoteSha. Stop and reconcile."
    }

    Invoke-Git add -- $relativePath | Out-Null
    $leaf = Split-Path $relativePath -Leaf
    Invoke-Git commit -m "docs(diagnosis): complete $leaf" -- $relativePath | Out-Null
    Invoke-Git push origin "HEAD:refs/heads/$Branch" | Out-Null
    Write-Host "Pushed $relativePath"
}

& node $validator $TargetPackage --strict
if ($LASTEXITCODE -ne 0) {
    throw "Final strict validation failed."
}

$finalSha = (Invoke-Git rev-parse HEAD | Select-Object -First 1).Trim()
Write-Host "Package pushed file-by-file. Final local SHA: $finalSha"
