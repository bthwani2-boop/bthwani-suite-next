[CmdletBinding()]
param([string]$RepoRoot = 'C:\bthwani-suite-next')
. "$PSScriptRoot\Closure.Common.ps1"
$RepoRoot = Resolve-BthwaniRepoRoot $RepoRoot
Set-Location $RepoRoot
$currentFile = Join-Path $RepoRoot '.diagnostics\final-root-closure\CURRENT.txt'
if (-not (Test-Path $currentFile)) { throw 'Run 00-preflight.ps1 first.' }
$evidenceDir = (Get-Content $currentFile -Raw).Trim()
$state = Get-Content (Join-Path $evidenceDir 'state.json') -Raw | ConvertFrom-Json
$sha = [string]$state.candidateSha
Assert-BranchPinned $RepoRoot 'BB' $sha
Assert-CleanWorktree $RepoRoot
$log = Join-Path $evidenceDir '30-coverage-control-gateway.log'

# Coverage ownership is authoritative and must not be bypassed with exclusions.
$manifestPath = Join-Path $RepoRoot 'tools/verification/ownership.manifest.json'
if (-not (Test-Path $manifestPath)) { throw 'Coverage ownership authority is missing.' }
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$unresolved = @()
foreach ($property in $manifest.projects.PSObject.Properties) {
    if ([string]$property.Value.coverage.strategy -eq 'required') {
        $unresolved += [pscustomobject]@{ project=$property.Name; reason=[string]$property.Value.coverage.reason }
    }
}
if ($unresolved.Count -gt 0) {
    $text = ($unresolved | Format-Table -AutoSize | Out-String)
    $text | Tee-Object -FilePath $log -Append | Write-Host
    throw 'ROOT BLOCKER: executable coverage ownership is still unresolved. Add real executable tests/LCOV owners; do not weaken Sonar or add exclusions.'
}

# Control Panel must have browser E2E, not only node contract tests.
$controlPackage = Get-Content (Join-Path $RepoRoot 'apps/control-panel/runtime/package.json') -Raw | ConvertFrom-Json
$deps = @($controlPackage.dependencies.PSObject.Properties.Name) + @($controlPackage.devDependencies.PSObject.Properties.Name)
$browserRunner = @('playwright','@playwright/test','cypress') | Where-Object { $deps -contains $_ }
$browserSpecs = @(Get-ChildItem -Path (Join-Path $RepoRoot 'apps/control-panel') -Recurse -File -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '(e2e|playwright|cypress)' })
if ($browserRunner.Count -eq 0 -or $browserSpecs.Count -eq 0) {
    throw 'ROOT BLOCKER: Control Panel has no proven browser E2E authority. Add canonical browser E2E for login/RBAC/partner/captain/field/finance/orders + loading/empty/error; do not relabel node --test contracts as E2E.'
}

# Gateway trust boundary: verify only gateway port is LAN-visible and private services remain loopback.
Invoke-StrictNative pwsh @('-NoProfile','-ExecutionPolicy','Bypass','-File','tools/scripts/verify-mobile-lan-runtime.ps1') $RepoRoot @{} $log
$gatewayFile = Join-Path $RepoRoot 'apps/mobile/mobile-lan.ps1'
if (-not (Test-Path $gatewayFile)) { throw 'Canonical mobile LAN gateway helper missing.' }
$gatewayText = Get-Content $gatewayFile -Raw
if ($gatewayText -notmatch '58110') { throw 'Gateway canonical port 58110 is not asserted in mobile LAN authority.' }

Assert-BranchPinned $RepoRoot 'BB' $sha
Write-Host 'COVERAGE_CONTROL_GATEWAY=PASS' -ForegroundColor Green
