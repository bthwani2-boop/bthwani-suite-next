# Overrides native CLI wrappers so command output is displayed without becoming
# part of the PowerShell function return value. Without this isolation, assigning
# the result of Invoke-SentryCli/Invoke-EasCli produces Object[] containing both
# terminal text and the numeric exit code.

[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$global:OutputEncoding = [Text.UTF8Encoding]::new($false)

function Format-RedactedArguments {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $redacted = [System.Collections.Generic.List[string]]::new()
    $hideNext = $false

    foreach ($argument in $Arguments) {
        if ($hideNext) {
            $redacted.Add("<redacted>")
            $hideNext = $false
            continue
        }

        $redacted.Add($argument)
        if ($argument -in @("--value", "--auth-token", "--token")) {
            $hideNext = $true
        }
    }

    return ($redacted -join " ")
}

function Invoke-SentryCli {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$Capture,
        [switch]$AllowFailure
    )

    if ($Capture) {
        $output = & pnpm dlx $script:SentryCliPackage @Arguments
        $exitCode = [int]$LASTEXITCODE

        if ($exitCode -ne 0 -and -not $AllowFailure) {
            throw "Sentry CLI failed: sentry $(Format-RedactedArguments -Arguments $Arguments)"
        }

        return [pscustomobject]@{
            ExitCode = $exitCode
            Output = (($output | Out-String).Trim())
        }
    }

    # Out-Host keeps native output visible while preventing it from entering
    # this function's success-output pipeline. The caller therefore receives
    # exactly one Int32 exit code.
    & pnpm dlx $script:SentryCliPackage @Arguments | Out-Host
    $exitCode = [int]$LASTEXITCODE

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Sentry CLI failed: sentry $(Format-RedactedArguments -Arguments $Arguments)"
    }

    return $exitCode
}

function Invoke-EasCli {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        # Apply the same output isolation to EAS. This is required by
        # Ensure-EasAuthentication, which compares the returned exit code.
        & pnpm dlx $script:EasCliPackage @Arguments | Out-Host
        $exitCode = [int]$LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        $safeArguments = Format-RedactedArguments -Arguments $Arguments
        throw "EAS command failed in '$WorkingDirectory': eas $safeArguments"
    }

    return $exitCode
}
