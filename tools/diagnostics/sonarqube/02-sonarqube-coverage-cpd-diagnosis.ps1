#requires -Version 7.0
[CmdletBinding()]
param(
    [string]$Repository = "bthwani2-boop/bthwani-suite-next",
    [string]$Branch = "master",
    [string]$OutputRoot = "",
    [switch]$RunCoverage,
    [ValidateRange(1,60)]
    [int]$GoTestTimeoutMinutes = 8
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

$RepoRoot = Resolve-RepoRoot
$DiagDir = New-DiagDir "sonarqube-coverage-cpd"
Start-Transcript -Path (Join-Path $DiagDir "transcript.txt") -Force | Out-Null

try {
    Set-Location $RepoRoot
    $propsPath = Join-Path $RepoRoot "sonar-project.properties"
    $workflowPath = Join-Path $RepoRoot ".github\workflows\sonarqube.yml"
    if (-not (Test-Path $propsPath)) { throw "Missing sonar-project.properties" }
    if (-not (Test-Path $workflowPath)) { throw "Missing .github/workflows/sonarqube.yml" }

    $props = Get-Content $propsPath -Raw
    $workflow = Get-Content $workflowPath -Raw

    Write-Section "1. Coverage and duplication configuration"
    $coverageExclusion = [regex]::Match($props, '(?m)^sonar\.coverage\.exclusions=(.*)$').Groups[1].Value.Trim()
    $cpdExclusion = [regex]::Match($props, '(?m)^sonar\.cpd\.exclusions=(.*)$').Groups[1].Value.Trim()
    $goReportPaths = [regex]::Match($props, '(?m)^sonar\.go\.coverage\.reportPaths=(.*)$').Groups[1].Value.Trim()
    "sonar.coverage.exclusions=$coverageExclusion"
    "sonar.cpd.exclusions=$cpdExclusion"
    "sonar.go.coverage.reportPaths=$goReportPaths"

    Write-Section "2. Discover Go modules"
    $goMods = Get-ChildItem -Path $RepoRoot -Filter go.mod -File -Recurse |
        Where-Object { $_.FullName -notmatch '\\(vendor|node_modules|\.git|\.diagnostics)\\' } |
        ForEach-Object {
            [pscustomobject]@{
                ModulePath = [IO.Path]::GetRelativePath($RepoRoot, $_.Directory.FullName).Replace('\','/')
                GoMod = [IO.Path]::GetRelativePath($RepoRoot, $_.FullName).Replace('\','/')
            }
        } | Sort-Object ModulePath
    $goMods | Format-Table -AutoSize
    $goMods | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $DiagDir "go-modules.csv")

    Write-Section "3. Modules explicitly covered by Sonar workflow"
    $workflowModules = @(
        [regex]::Matches($workflow, '(?m)^\s{12}([A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+)\s*$') |
        ForEach-Object { $_.Groups[1].Value } |
        Select-Object -Unique
    )
    $coverageMap = foreach ($m in $goMods) {
        [pscustomobject]@{ ModulePath = $m.ModulePath; InSonarWorkflow = $workflowModules -contains $m.ModulePath }
    }
    $coverageMap | Format-Table -AutoSize
    $coverageMap | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $DiagDir "go-module-workflow-coverage-map.csv")

    Write-Section "4. Discover JS/TS test and coverage capability"
    $packageFiles = Get-ChildItem -Path $RepoRoot -Filter package.json -File -Recurse |
        Where-Object { $_.FullName -notmatch '\\(node_modules|\.next|dist|build|\.git|\.diagnostics)\\' }
    $nodeCoverage = foreach ($pkgFile in $packageFiles) {
        try {
            $pkg = Get-Content $pkgFile.FullName -Raw | ConvertFrom-Json
            $scriptNames = if ($pkg.scripts) { @($pkg.scripts.PSObject.Properties.Name) } else { @() }
            $depsText = @(
                if ($pkg.dependencies) { $pkg.dependencies.PSObject.Properties.Name }
                if ($pkg.devDependencies) { $pkg.devDependencies.PSObject.Properties.Name }
            ) -join ','
            [pscustomobject]@{
                Package = $pkg.name
                Path = [IO.Path]::GetRelativePath($RepoRoot, $pkgFile.Directory.FullName).Replace('\','/')
                HasTestScript = $scriptNames -contains 'test'
                HasCoverageScript = @($scriptNames | Where-Object { $_ -match 'coverage' }).Count -gt 0
                CoverageToolDetected = $depsText -match '(^|,)(c8|nyc|jest|vitest)(,|$)'
            }
        } catch {}
    }
    $nodeCoverage | Where-Object { $_.HasTestScript -or $_.HasCoverageScript -or $_.CoverageToolDetected } | Format-Table -AutoSize
    $nodeCoverage | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $DiagDir "node-coverage-capability.csv")

    $coverageResults = @()
    Write-Section "5. Execute Go coverage"
    if ($RunCoverage) {
        if (-not (Get-Command go -ErrorAction SilentlyContinue)) { throw "go command not found" }
        $moduleIndex = 0
        foreach ($m in $goMods) {
            $moduleIndex++
            $moduleDir = Join-Path $RepoRoot ($m.ModulePath -replace '/', [IO.Path]::DirectorySeparatorChar)
            $safe = $m.ModulePath -replace '[^A-Za-z0-9_.-]', '_'
            $cover = Join-Path $DiagDir "$safe.coverage.out"
            $log = Join-Path $DiagDir "$safe.go-test.txt"
            $timeoutArg = "${GoTestTimeoutMinutes}m"
            $started = Get-Date

            Write-Host ""
            Write-Host "[$moduleIndex/$($goMods.Count)] START $($m.ModulePath)"
            Write-Host "Command: go test -count=1 -timeout $timeoutArg ./... -coverprofile=$cover"
            Write-Host "Log: $log"

            Push-Location $moduleDir
            try {
                & go test -count=1 -timeout $timeoutArg ./... -coverprofile="$cover" 2>&1 |
                    Tee-Object -FilePath $log
                $testExit = $LASTEXITCODE
            } finally {
                Pop-Location
            }

            $total = $null
            $coverToolExit = $null
            if ($testExit -eq 0 -and (Test-Path $cover)) {
                Push-Location $moduleDir
                try {
                    $coverText = & go tool cover -func="$cover" 2>&1
                    $coverToolExit = $LASTEXITCODE
                } finally {
                    Pop-Location
                }
                $coverText | Add-Content -LiteralPath $log -Encoding utf8
                if ($coverToolExit -eq 0) {
                    $line = $coverText | Select-String '^total:\s+\(statements\)\s+([0-9.]+)%' | Select-Object -Last 1
                    if ($line) { $total = [double]$line.Matches[0].Groups[1].Value }
                } else {
                    Write-Warning "go tool cover failed for $($m.ModulePath); see $log"
                }
            }

            $elapsed = (Get-Date) - $started
            $coverageResults += [pscustomobject]@{
                ModulePath = $m.ModulePath
                ExitCode = $testExit
                CoverToolExitCode = $coverToolExit
                CoveragePercent = $total
                DurationSeconds = [math]::Round($elapsed.TotalSeconds, 1)
                InSonarWorkflow = $workflowModules -contains $m.ModulePath
                Log = $log
            }

            Write-Host "[$moduleIndex/$($goMods.Count)] END $($m.ModulePath) testExit=$testExit coverToolExit=$coverToolExit duration=$([math]::Round($elapsed.TotalSeconds,1))s coverage=$total%"
        }
        $coverageResults | Format-Table -AutoSize
        $coverageResults | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $DiagDir "go-coverage-results.csv")
    } else { Write-Host "Skipped. Use -RunCoverage for actual Go coverage execution." }

    Write-Section "6. Findings"
    $findings = New-Object System.Collections.Generic.List[string]
    if ($coverageExclusion -eq '**/*') { $findings.Add('HIGH: sonar.coverage.exclusions=**/* excludes every source file from Sonar coverage calculation.') }
    if ($cpdExclusion -eq '**/*') { $findings.Add('HIGH: sonar.cpd.exclusions=**/* disables Sonar duplication detection globally.') }
    $missingGo = @($coverageMap | Where-Object { -not $_.InSonarWorkflow })
    if ($missingGo.Count -gt 0) { $findings.Add("MEDIUM: $($missingGo.Count) Go module(s) are not explicitly in the Sonar workflow coverage loop.") }
    $nodeNoCoverage = @($nodeCoverage | Where-Object { $_.HasTestScript -and -not $_.HasCoverageScript })
    if ($nodeNoCoverage.Count -gt 0) { $findings.Add("MEDIUM: $($nodeNoCoverage.Count) JS/TS package(s) have tests but no explicit coverage script detected.") }
    if ($RunCoverage) {
        $failed = @($coverageResults | Where-Object ExitCode -ne 0)
        if ($failed.Count -gt 0) { $findings.Add("HIGH: $($failed.Count) Go module test suite(s) failed during coverage generation.") }
        $coverToolFailed = @($coverageResults | Where-Object { $_.ExitCode -eq 0 -and $_.CoverToolExitCode -ne 0 })
        if ($coverToolFailed.Count -gt 0) { $findings.Add("MEDIUM: $($coverToolFailed.Count) Go module(s) generated coverage but go tool cover could not calculate the aggregate percentage.") }
    }
    $findings | Tee-Object -FilePath (Join-Path $DiagDir "summary.txt")
    if ($findings.Count -eq 0) { 'No coverage/CPD gaps detected.' | Tee-Object -FilePath (Join-Path $DiagDir "summary.txt") -Append }
    Write-Host "Output: $DiagDir"
}
finally { Stop-Transcript | Out-Null }
