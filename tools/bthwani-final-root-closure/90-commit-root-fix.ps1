[CmdletBinding()]
param(
    [Parameter(Mandatory)][string[]]$Paths,
    [Parameter(Mandatory)][string]$Message,
    [string]$RepoRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)
. "$PSScriptRoot\Closure.Common.ps1"
$RepoRoot = Resolve-BthwaniRepoRoot $RepoRoot
Set-Location $RepoRoot
Invoke-StrictNative git @('-C',$RepoRoot,'fetch','origin','--prune') $RepoRoot
$remoteBefore = Get-GitSha 'origin/BB' $RepoRoot
$localBefore = Get-GitSha 'HEAD' $RepoRoot
if ($remoteBefore -ne $localBefore) { throw "BB moved before commit. local=$localBefore remote=$remoteBefore. Reconcile first." }

# Explicit staging only. No git add . / -A.
Invoke-StrictNative git (@('-C',$RepoRoot,'add','--') + $Paths) $RepoRoot
$stagedText = (& git -C $RepoRoot diff --cached --name-only 2>&1 | Out-String).Trim()
$staged = @($stagedText -split '\r?\n' | Where-Object { $_ })
$unexpected = @($staged | Where-Object { $Paths -notcontains $_ })
if ($unexpected.Count -gt 0) { throw "Unexpected staged paths: $($unexpected -join ', ')" }
if ($staged.Count -eq 0) { throw 'Nothing staged.' }
Invoke-StrictNative git @('-C',$RepoRoot,'diff','--cached','--check') $RepoRoot
Invoke-StrictNative git @('-C',$RepoRoot,'commit','-m',$Message) $RepoRoot
Invoke-StrictNative git @('-C',$RepoRoot,'fetch','origin','--prune') $RepoRoot
$remoteAfter = Get-GitSha 'origin/BB' $RepoRoot
if ($remoteAfter -ne $remoteBefore) { throw "BB moved concurrently after local commit. DO NOT PUSH. remoteBefore=$remoteBefore remoteNow=$remoteAfter. Reconcile/reverify." }
Write-Host 'Commit created. Re-run relevant verification, then push with: git push origin HEAD:BB' -ForegroundColor Yellow
