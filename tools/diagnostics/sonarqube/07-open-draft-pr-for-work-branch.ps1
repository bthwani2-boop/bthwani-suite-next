#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$BaseBranch = "master",
    [string]$Title = "",
    [string]$Body = "Early Draft PR for continuous SonarQube Cloud, CodeQL and BThwani CI feedback."
)

$ErrorActionPreference = "Stop"

function Invoke-Native {
    param([scriptblock]$Command,[string]$Failure)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw $Failure }
}

$root = (& git rev-parse --show-toplevel 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or -not $root) { throw "Run from inside the repository." }
Set-Location $root

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw "gh CLI is required." }
Invoke-Native { gh auth status } "GitHub CLI authentication is not ready."

$branch = (& git branch --show-current).Trim()
if (-not $branch) { throw "Detached HEAD is not supported." }
if ($branch -eq $BaseBranch) { throw "Create or switch to a work branch first; master cannot PR to itself." }

$existing = gh pr list --repo $Repository --state open --head $branch --json number,url,isDraft,baseRefName | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect existing pull requests." }
if ($existing -and @($existing).Count -gt 0) {
    $pr = @($existing)[0]
    if ($pr.baseRefName -ne $BaseBranch) { throw "Existing PR targets '$($pr.baseRefName)', not '$BaseBranch'." }
    Write-Host "Existing PR already provides continuous analysis: $($pr.url)"
    exit 0
}

$remote = (& git ls-remote --heads origin $branch).Trim()
if (-not $remote) {
    Invoke-Native { git push -u origin $branch } "Unable to publish work branch '$branch'."
} else {
    Invoke-Native { git push } "Unable to push the current work branch."
}

if (-not $Title) { $Title = "WIP: $branch" }
Invoke-Native { gh pr create --repo $Repository --draft --base $BaseBranch --head $branch --title $Title --body $Body } "Unable to create Draft PR."

$pr = gh pr view --repo $Repository $branch --json number,url,isDraft,headRefOid,baseRefName | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw "Draft PR was created but could not be re-read." }
Write-Host "Draft PR ready: $($pr.url)"
Write-Host "Every later push to '$branch' will trigger PR analysis workflows targeting '$BaseBranch'."
Write-Host "Head SHA: $($pr.headRefOid)"
