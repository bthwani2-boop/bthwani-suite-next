# tools/scripts/verify-mobile-firebase-bootstrap.ps1
# Local verification for the remote Firebase bootstrap remediation.
# This script does not create Firebase apps, upload EAS variables, or submit builds.

[CmdletBinding()]
param(
    [switch] $IncludeFirebaseDryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ReportRoot = Join-Path $RepoRoot ".tmp\verify-mobile-firebase-bootstrap\$Timestamp"
$LogsRoot = Join-Path $ReportRoot "logs"
$SummaryPath = Join-Path $ReportRoot "summary.json"
New-Item -ItemType Directory -Force -Path $LogsRoot | Out-Null
Set-Location $RepoRoot

$results = [System.Collections.Generic.List[object]]::new()
$commandCounter = 0
$finalStatus = "FAIL"

function Add-Result {
    param(
        [Parameter(Mandatory)][ValidateSet("PASS", "FAIL", "INFO")][string] $Status,
        [Parameter(Mandatory)][string] $Check,
        [Parameter(Mandatory)][string] $Detail
    )

    $results.Add([pscustomobject]@{
        Status = $Status
        Check = $Check
        Detail = $Detail
    })

    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        default { "Cyan" }
    }
    Write-Host "[$Status] $Check - $Detail" -ForegroundColor $color
}

function Invoke-LoggedCommand {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments,
        [string] $WorkingDirectory = $RepoRoot,
        [Parameter(Mandatory)][string] $Name
    )

    $script:commandCounter++
    $logPath = Join-Path $LogsRoot ("{0:D2}-{1}.log" -f $script:commandCounter, ($Name -replace '[^A-Za-z0-9._-]', '_'))

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $output = & $FilePath @Arguments 2>&1
        $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
        $text = ($output | Out-String).TrimEnd()
    } catch {
        $exitCode = -1
        $text = ($_ | Out-String).TrimEnd()
    } finally {
        Pop-Location
    }

    @(
        "COMMAND: $FilePath $($Arguments -join ' ')"
        "WORKDIR: $WorkingDirectory"
        "EXIT: $exitCode"
        ""
        $text
    ) | Set-Content -LiteralPath $logPath -Encoding UTF8

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output = $text
        LogPath = $logPath
    }
}

function Assert-CommandPasses {
    param(
        [Parameter(Mandatory)][string] $FilePath,
        [Parameter(Mandatory)][string[]] $Arguments,
        [string] $WorkingDirectory = $RepoRoot,
        [Parameter(Mandatory)][string] $Name
    )

    $result = Invoke-LoggedCommand `
        -FilePath $FilePath `
        -Arguments $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -Name $Name

    if ($result.ExitCode -ne 0) {
        Add-Result "FAIL" $Name "exit=$($result.ExitCode); log=$($result.LogPath)"
        throw "$Name failed. Review $($result.LogPath)"
    }

    Add-Result "PASS" $Name "log=$($result.LogPath)"
}

function Assert-PowerShellSyntax {
    param([Parameter(Mandatory)][string] $Path)

    $tokens = $null
    $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile(
        $Path,
        [ref]$tokens,
        [ref]$errors
    )

    if (@($errors).Count -gt 0) {
        $details = @($errors | ForEach-Object { $_.Message }) -join "; "
        Add-Result "FAIL" "PowerShell syntax" "${Path}: $details"
        throw "PowerShell syntax failure: $Path"
    }

    Add-Result "PASS" "PowerShell syntax" $Path
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " VERIFY MOBILE FIREBASE BOOTSTRAP" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Repository: $RepoRoot"
Write-Host "Report: $ReportRoot`n"

try {
    $branch = (& git branch --show-current).Trim()
    $head = (& git rev-parse HEAD).Trim()
    $status = (& git status --short | Out-String).Trim()

    Add-Result "INFO" "Git branch" $branch
    Add-Result "INFO" "Git HEAD" $head

    if ($branch -ne "fix/mobile-firebase-bootstrap") {
        throw "Current branch is '$branch'; expected 'fix/mobile-firebase-bootstrap'."
    }
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw "Working tree is not clean before verification."
    }
    Add-Result "PASS" "Git baseline" "correct branch and clean working tree"

    foreach ($file in @(
        "tools/mobile/google-services-config.mjs",
        "tools/scripts/guard-mobile-apps.mjs",
        "tools/scripts/eas-build-mobile.mjs",
        "tools/scripts/guard-mobile-apps.test.mjs",
        "apps/app-client/runtime/tests/mobile-development-provider-contract.test.mjs"
    )) {
        Assert-CommandPasses `
            -FilePath "node" `
            -Arguments @("--check", $file) `
            -Name "node-check-$($file -replace '[\\/]', '-')"
    }

    foreach ($file in @(
        "tools/scripts/bootstrap-mobile-firebase-development.ps1",
        "tools/scripts/setup-mobile-firebase-development.ps1",
        "tools/scripts/verify-mobile-firebase-bootstrap.ps1"
    )) {
        Assert-PowerShellSyntax -Path (Join-Path $RepoRoot $file)
    }

    Assert-CommandPasses `
        -FilePath "node" `
        -Arguments @(
            "--test",
            "tools/scripts/guard-mobile-apps.test.mjs",
            "apps/app-client/runtime/tests/mobile-development-provider-contract.test.mjs"
        ) `
        -Name "mobile-firebase-contract-tests"

    Assert-CommandPasses `
        -FilePath "pnpm" `
        -Arguments @("mobile:apps:check") `
        -Name "mobile-apps-check"

    Assert-CommandPasses `
        -FilePath "pnpm" `
        -Arguments @("mobile:expo:verify") `
        -Name "mobile-expo-verify"

    if ($IncludeFirebaseDryRun) {
        Assert-CommandPasses `
            -FilePath "pwsh" `
            -Arguments @(
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-File", "tools/scripts/bootstrap-mobile-firebase-development.ps1"
            ) `
            -Name "firebase-bootstrap-dry-run"
    } else {
        Add-Result "INFO" "Firebase dry run" "skipped; pass -IncludeFirebaseDryRun to include it"
    }

    $finalStatus = "PASS"
} catch {
    $finalStatus = "FAIL"
    Add-Result "FAIL" "Fatal" $_.Exception.Message
} finally {
    [pscustomobject]@{
        Timestamp = (Get-Date).ToString("o")
        Status = $finalStatus
        Repository = $RepoRoot
        IncludeFirebaseDryRun = [bool]$IncludeFirebaseDryRun
        Results = @($results)
    } |
        ConvertTo-Json -Depth 20 |
        Set-Content -LiteralPath $SummaryPath -Encoding UTF8
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " FINAL RESULT: $finalStatus" -ForegroundColor $(if ($finalStatus -eq "PASS") { "Green" } else { "Red" })
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Summary: $SummaryPath"
Write-Host "Logs: $LogsRoot"
Write-Host "No Firebase app, EAS variable, credential, workflow, or build was changed." -ForegroundColor Yellow

if ($finalStatus -ne "PASS") {
    exit 1
}
