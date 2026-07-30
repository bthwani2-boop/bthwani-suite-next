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
    $ast = [System.Management.Automation.Language.Parser]::ParseFile(
        $file.FullName,
        [ref]$tokens,
        [ref]$errors
    )

    if (@($errors).Count -gt 0) {
        foreach ($parseError in @($errors)) {
            $failures.Add(
                "$($file.Name):$($parseError.Extent.StartLineNumber):$($parseError.Extent.StartColumnNumber) $($parseError.Message)"
            )
        }
        continue
    }

    if ($file.Name -eq 'prepare-google-platform-all-surfaces.ps1') {
        $childFunction = $ast.Find(
            {
                param($node)
                $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
                $node.Name -eq 'Invoke-ChildPowerShell'
            },
            $true
        )

        if ($null -eq $childFunction -or $null -eq $childFunction.Body.ParamBlock) {
            $failures.Add("$($file.Name): Invoke-ChildPowerShell parameter contract was not found.")
        } else {
            $argumentsParameter = @(
                $childFunction.Body.ParamBlock.Parameters | Where-Object {
                    $_.Name.VariablePath.UserPath -eq 'Arguments'
                }
            ) | Select-Object -First 1

            $allowsEmptyCollection = $null -ne $argumentsParameter -and @(
                $argumentsParameter.Attributes | Where-Object {
                    $_ -is [System.Management.Automation.Language.AttributeAst] -and
                    $_.TypeName.Name -eq 'AllowEmptyCollection'
                }
            ).Count -gt 0

            if (-not $allowsEmptyCollection) {
                $failures.Add("$($file.Name): Invoke-ChildPowerShell Arguments must allow an empty collection for dry-run phases.")
            } else {
                Write-Host 'PASS: all-surface orchestrator accepts empty child argument lists.' -ForegroundColor Green
            }
        }
    }

    Write-Host "PASS: $($file.Name)" -ForegroundColor Green
}

if ($failures.Count -gt 0) {
    throw "Google Cloud PowerShell validation failed:`n$($failures -join "`n")"
}

Write-Host "`nPASS: all $($files.Count) Google Cloud PowerShell scripts parsed successfully." -ForegroundColor Green
