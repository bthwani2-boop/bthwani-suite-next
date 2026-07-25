# Parse every governed Google Cloud PowerShell script without executing it.

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = @(Get-ChildItem -LiteralPath $ScriptRoot -Filter '*.ps1' -File | Sort-Object FullName)

if ($files.Count -eq 0) {
    throw "No PowerShell scripts were found under: $ScriptRoot"
}

$failures = [System.Collections.Generic.List[string]]::new()

foreach ($file in $files) {
    $tokens = $null
    $errors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile(
        $file.FullName,
        [ref]$tokens,
        [ref]$errors
    )

    if (@($errors).Count -eq 0) {
        Write-Host "PASS: $($file.Name)" -ForegroundColor Green
        continue
    }

    foreach ($parseError in @($errors)) {
        $failures.Add(
            "$($file.Name):$($parseError.Extent.StartLineNumber):$($parseError.Extent.StartColumnNumber) $($parseError.Message)"
        )
    }
}

if ($failures.Count -gt 0) {
    throw "Google Cloud PowerShell parse validation failed:`n$($failures -join "`n")"
}

Write-Host "`nPASS: all $($files.Count) Google Cloud PowerShell scripts parsed successfully." -ForegroundColor Green
