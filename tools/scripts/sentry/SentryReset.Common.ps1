Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:SentryCliPackage = "sentry@0.38.0"
$script:EasCliPackage = "eas-cli@latest"
$script:SentryUrl = "https://sentry.io"
$script:SentryApiBase = "$script:SentryUrl/api/0"
$script:SentryToken = $null

function Write-Stage {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host ""
    Write-Host "================================================================"
    Write-Host " $Message"
    Write-Host "================================================================"
}

function Assert-Command {
    param([Parameter(Mandatory)][string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command was not found in PATH: $Name"
    }
}

function Get-PropertyValue {
    param(
        [AllowNull()][object]$InputObject,
        [Parameter(Mandatory)][string]$Name
    )

    if ($null -eq $InputObject) { return $null }
    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function ConvertTo-FlatItems {
    param([AllowNull()][object]$InputObject)

    $items = [System.Collections.Generic.List[object]]::new()
    $stack = [System.Collections.Generic.Stack[object]]::new()
    $stack.Push($InputObject)

    while ($stack.Count -gt 0) {
        $current = $stack.Pop()
        if ($null -eq $current) { continue }

        if ($current -is [System.Array] -or $current -is [System.Collections.IList]) {
            for ($index = $current.Count - 1; $index -ge 0; $index--) {
                $stack.Push($current[$index])
            }
            continue
        }

        $expanded = $false
        foreach ($wrapper in @("results", "projects", "keys", "data")) {
            $wrapped = Get-PropertyValue -InputObject $current -Name $wrapper
            if ($null -ne $wrapped) {
                $stack.Push($wrapped)
                $expanded = $true
                break
            }
        }

        if (-not $expanded) {
            $items.Add($current)
        }
    }

    return $items.ToArray()
}

function Invoke-SentryCli {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$Capture,
        [switch]$AllowFailure
    )

    if ($Capture) {
        $output = & pnpm dlx $script:SentryCliPackage @Arguments
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0 -and -not $AllowFailure) {
            throw "Sentry CLI failed: sentry $($Arguments -join ' ')"
        }
        return [pscustomobject]@{
            ExitCode = $exitCode
            Output = (($output | Out-String).Trim())
        }
    }

    & pnpm dlx $script:SentryCliPackage @Arguments
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "Sentry CLI failed: sentry $($Arguments -join ' ')"
    }
    return $exitCode
}

function Invoke-SentryApi {
    param(
        [Parameter(Mandatory)][ValidateSet("GET", "POST", "PUT", "DELETE")][string]$Method,
        [Parameter(Mandatory)][string]$Path,
        [AllowNull()][object]$Body
    )

    if ([string]::IsNullOrWhiteSpace($script:SentryToken)) {
        throw "Sentry OAuth token is unavailable."
    }

    $uri = "$script:SentryApiBase/$($Path.TrimStart('/'))"
    $headers = @{
        Authorization = "Bearer $script:SentryToken"
        Accept = "application/json"
    }

    try {
        if ($PSBoundParameters.ContainsKey("Body")) {
            $payload = $Body | ConvertTo-Json -Depth 20 -Compress
            return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $payload
        }
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }
    catch {
        $detail = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($detail)) { $detail = $_.Exception.Message }
        throw "Sentry API request failed: $Method $uri`n$detail"
    }
}

function Get-SentryProjects {
    param([Parameter(Mandatory)][string]$Organization)

    $response = Invoke-SentryApi -Method GET -Path "organizations/$([Uri]::EscapeDataString($Organization))/projects/?per_page=100"
    $items = @(ConvertTo-FlatItems -InputObject $response)
    return @($items | Where-Object {
        -not [string]::IsNullOrWhiteSpace([string](Get-PropertyValue -InputObject $_ -Name "slug"))
    })
}

function Remove-LocalSentryState {
    param([Parameter(Mandatory)][string]$RepoRoot)

    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_URL -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue
    Remove-Item "$HOME\.sentryclirc" -Force -ErrorAction SilentlyContinue
    Remove-Item "$HOME\.sentry\cli.db" -Force -ErrorAction SilentlyContinue

    $mobileEnv = Join-Path $RepoRoot "infra\local\mobile.env"
    if (-not (Test-Path -LiteralPath $mobileEnv -PathType Leaf)) { return }

    $backupDirectory = Join-Path $RepoRoot "infra\local\sentry-reset-backups"
    New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
    $backupPath = Join-Path $backupDirectory "mobile.env.$(Get-Date -Format 'yyyyMMddHHmmss').bak"
    Copy-Item -LiteralPath $mobileEnv -Destination $backupPath -Force
    Write-Host "Backed up mobile.env to: $backupPath"

    $retained = Get-Content -LiteralPath $mobileEnv | Where-Object {
        $_ -notmatch '^\s*(SENTRY_|BTHWANI_SENTRY_|EXPO_PUBLIC_SENTRY_)' -and
        $_ -notmatch '^\s*EXPO_PUBLIC_APP_ENV\s*='
    }
    [IO.File]::WriteAllLines($mobileEnv, [string[]]$retained, [Text.UTF8Encoding]::new($false))
    Write-Host "Removed old local Sentry values from: $mobileEnv"
}

function Connect-SentryOAuth {
    $arguments = [System.Collections.Generic.List[string]]::new()
    foreach ($value in @("auth", "login", "--force", "--url", $script:SentryUrl)) {
        $arguments.Add($value)
    }
    foreach ($scope in @(
        "org:admin", "org:write", "org:read",
        "project:admin", "project:write", "project:read", "org:ci"
    )) {
        $arguments.Add("--scope")
        $arguments.Add($scope)
    }

    $connected = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        Write-Host "Sentry OAuth attempt $attempt of 3..."
        $exitCode = Invoke-SentryCli -Arguments $arguments.ToArray() -AllowFailure
        if ($exitCode -eq 0) {
            $connected = $true
            break
        }
        Start-Sleep -Seconds 5
    }

    if (-not $connected) {
        throw "Sentry OAuth authorization failed after three attempts."
    }

    Invoke-SentryCli -Arguments @("auth", "status", "--fresh") | Out-Null
    $tokenResult = Invoke-SentryCli -Arguments @("auth", "token") -Capture
    if ($tokenResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($tokenResult.Output)) {
        throw "Sentry CLI did not return the OAuth access token."
    }
    $script:SentryToken = $tokenResult.Output.Trim()
}

function Remove-AllSentryProjects {
    param([Parameter(Mandatory)][string]$Organization)

    $projects = @(Get-SentryProjects -Organization $Organization)
    Write-Host "Existing Sentry projects: $($projects.Count)"

    foreach ($project in $projects) {
        $slug = [string](Get-PropertyValue -InputObject $project -Name "slug")
        Write-Host "Deleting Sentry project: $slug"
        Invoke-SentryApi -Method DELETE -Path "projects/$([Uri]::EscapeDataString($Organization))/$([Uri]::EscapeDataString($slug))/" | Out-Null
    }

    $deadline = (Get-Date).AddMinutes(3)
    do {
        $remaining = @(Get-SentryProjects -Organization $Organization)
        if ($remaining.Count -eq 0) { return }
        Write-Host "Waiting for asynchronous deletion: $($remaining.Count) project(s) remain..."
        Start-Sleep -Seconds 5
    } while ((Get-Date) -lt $deadline)

    $slugs = @(Get-SentryProjects -Organization $Organization | ForEach-Object {
        Get-PropertyValue -InputObject $_ -Name "slug"
    })
    throw "Sentry did not finish deleting projects within three minutes: $($slugs -join ', ')"
}

function Get-ProjectDefinitions {
    return @(
        [pscustomobject]@{ Key="APP_CLIENT"; AppKey="app-client"; Name="BThwani App Client"; Slug="bthwani-app-client"; Platform="react-native"; Runtime="apps\app-client\runtime" },
        [pscustomobject]@{ Key="APP_PARTNER"; AppKey="app-partner"; Name="BThwani App Partner"; Slug="bthwani-app-partner"; Platform="react-native"; Runtime="apps\app-partner\runtime" },
        [pscustomobject]@{ Key="APP_CAPTAIN"; AppKey="app-captain"; Name="BThwani App Captain"; Slug="bthwani-app-captain"; Platform="react-native"; Runtime="apps\app-captain\runtime" },
        [pscustomobject]@{ Key="APP_FIELD"; AppKey="app-field"; Name="BThwani App Field"; Slug="bthwani-app-field"; Platform="react-native"; Runtime="apps\app-field\runtime" },
        [pscustomobject]@{ Key="CONTROL_PANEL"; AppKey=$null; Name="BThwani Control Panel"; Slug="bthwani-control-panel"; Platform="javascript-nextjs"; Runtime=$null },
        [pscustomobject]@{ Key="IDENTITY_API"; AppKey=$null; Name="BThwani Identity API"; Slug="bthwani-identity-api"; Platform="go"; Runtime=$null },
        [pscustomobject]@{ Key="WORKFORCE_API"; AppKey=$null; Name="BThwani Workforce API"; Slug="bthwani-workforce-api"; Platform="go"; Runtime=$null },
        [pscustomobject]@{ Key="PLATFORM_CONTROL_API"; AppKey=$null; Name="BThwani Platform Control API"; Slug="bthwani-platform-control-api"; Platform="go"; Runtime=$null },
        [pscustomobject]@{ Key="PROVIDERS_API"; AppKey=$null; Name="BThwani Providers API"; Slug="bthwani-providers-api"; Platform="go"; Runtime=$null },
        [pscustomobject]@{ Key="DSH_API"; AppKey=$null; Name="BThwani DSH API"; Slug="bthwani-dsh-api"; Platform="go"; Runtime=$null },
        [pscustomobject]@{ Key="WLT_API"; AppKey=$null; Name="BThwani WLT API"; Slug="bthwani-wlt-api"; Platform="go"; Runtime=$null }
    )
}

function New-SentryProjectWithDsn {
    param(
        [Parameter(Mandatory)][string]$Organization,
        [Parameter(Mandatory)][pscustomobject]$Definition
    )

    $project = $null
    for ($attempt = 1; $attempt -le 12; $attempt++) {
        try {
            $project = Invoke-SentryApi -Method POST -Path "organizations/$([Uri]::EscapeDataString($Organization))/projects/" -Body @{
                name = $Definition.Name
                slug = $Definition.Slug
                platform = $Definition.Platform
                default_rules = $true
            }
            break
        }
        catch {
            if ($_.Exception.Message -notmatch '409|already exists|conflict') { throw }
            Write-Host "Slug remains reserved; retrying $($Definition.Slug) in 5 seconds..."
            Start-Sleep -Seconds 5
        }
    }

    if ($null -eq $project) { throw "Could not recreate Sentry project: $($Definition.Slug)" }
    $actualSlug = [string](Get-PropertyValue -InputObject $project -Name "slug")
    if ([string]::IsNullOrWhiteSpace($actualSlug)) { $actualSlug = $Definition.Slug }

    $keyResponse = Invoke-SentryApi -Method GET -Path "projects/$([Uri]::EscapeDataString($Organization))/$([Uri]::EscapeDataString($actualSlug))/keys/"
    $keys = @(ConvertTo-FlatItems -InputObject $keyResponse)
    $clientKey = $keys | Where-Object {
        $dsn = Get-PropertyValue -InputObject $_ -Name "dsn"
        -not [string]::IsNullOrWhiteSpace([string](Get-PropertyValue -InputObject $dsn -Name "public"))
    } | Select-Object -First 1

    if ($null -eq $clientKey) {
        $clientKey = Invoke-SentryApi -Method POST -Path "projects/$([Uri]::EscapeDataString($Organization))/$([Uri]::EscapeDataString($actualSlug))/keys/" -Body @{ name = "BThwani default SDK key" }
    }

    $dsnObject = Get-PropertyValue -InputObject $clientKey -Name "dsn"
    $publicDsn = [string](Get-PropertyValue -InputObject $dsnObject -Name "public")
    if ([string]::IsNullOrWhiteSpace($publicDsn)) {
        throw "Sentry did not return a public DSN for: $actualSlug"
    }

    return [pscustomobject]@{
        Key = $Definition.Key
        AppKey = $Definition.AppKey
        Runtime = $Definition.Runtime
        Slug = $actualSlug
        PublicDsn = $publicDsn
    }
}

function Set-DotEnvValues {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][System.Collections.IDictionary]$Values
    )

    New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
    $lines = [System.Collections.Generic.List[string]]::new()
    if (Test-Path -LiteralPath $Path -PathType Leaf) {
        foreach ($line in Get-Content -LiteralPath $Path) { $lines.Add($line) }
    }

    foreach ($entry in $Values.GetEnumerator()) {
        $pattern = "^\s*$([regex]::Escape([string]$entry.Key))\s*="
        $updated = $false
        for ($index = 0; $index -lt $lines.Count; $index++) {
            if ($lines[$index] -match $pattern) {
                $lines[$index] = "$($entry.Key)=$($entry.Value)"
                $updated = $true
                break
            }
        }
        if (-not $updated) { $lines.Add("$($entry.Key)=$($entry.Value)") }
    }

    [IO.File]::WriteAllLines($Path, $lines, [Text.UTF8Encoding]::new($false))
}

function Invoke-EasCli {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        & pnpm dlx $script:EasCliPackage @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        Pop-Location
    }

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "EAS command failed in '$WorkingDirectory': eas $($Arguments -join ' ')"
    }
    return $exitCode
}

function Ensure-EasAuthentication {
    param([Parameter(Mandatory)][string]$WorkingDirectory)
    $status = Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @("whoami") -AllowFailure
    if ($status -ne 0) {
        Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @("login") | Out-Null
    }
    Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @("whoami") | Out-Null
}

function Reset-EasSentryVariables {
    param(
        [Parameter(Mandatory)][string]$RepoRoot,
        [Parameter(Mandatory)][string]$Organization,
        [Parameter(Mandatory)][object[]]$MobileProjects,
        [Parameter(Mandatory)][string[]]$Environments
    )

    $variableNames = @(
        "SENTRY_ORG", "SENTRY_URL", "SENTRY_PROJECT", "SENTRY_AUTH_TOKEN",
        "EXPO_PUBLIC_SENTRY_DSN", "EXPO_PUBLIC_APP_ENV",
        "EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE", "EXPO_PUBLIC_SENTRY_DEBUG",
        "EXPO_PUBLIC_SENTRY_STARTUP_PROBE"
    )

    foreach ($project in $MobileProjects) {
        $runtime = Join-Path $RepoRoot $project.Runtime
        if (-not (Test-Path -LiteralPath $runtime -PathType Container)) {
            throw "Application runtime was not found: $runtime"
        }

        foreach ($environment in $Environments) {
            Write-Host "Resetting EAS Sentry variables: $($project.AppKey) / $environment"
            foreach ($name in $variableNames) {
                Invoke-EasCli -WorkingDirectory $runtime -Arguments @(
                    "env:delete", $environment,
                    "--variable-name", $name,
                    "--scope", "project",
                    "--non-interactive"
                ) -AllowFailure | Out-Null
            }

            $publicValues = [ordered]@{
                SENTRY_ORG = $Organization
                SENTRY_URL = "$script:SentryUrl/"
                SENTRY_PROJECT = $project.Slug
                EXPO_PUBLIC_SENTRY_DSN = $project.PublicDsn
                EXPO_PUBLIC_APP_ENV = $environment
                EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "0.05"
                EXPO_PUBLIC_SENTRY_DEBUG = "false"
                EXPO_PUBLIC_SENTRY_STARTUP_PROBE = "false"
            }

            foreach ($entry in $publicValues.GetEnumerator()) {
                Invoke-EasCli -WorkingDirectory $runtime -Arguments @(
                    "env:create", $environment,
                    "--name", [string]$entry.Key,
                    "--value", [string]$entry.Value,
                    "--visibility", "plaintext",
                    "--scope", "project",
                    "--force",
                    "--non-interactive"
                ) | Out-Null
            }

            Invoke-EasCli -WorkingDirectory $runtime -Arguments @(
                "env:create", $environment,
                "--name", "SENTRY_AUTH_TOKEN",
                "--value", $script:SentryToken,
                "--visibility", "sensitive",
                "--scope", "project",
                "--force",
                "--non-interactive"
            ) | Out-Null
        }
    }
}

function Install-RefreshTask {
    param([Parameter(Mandatory)][string]$RepoRoot)

    $refreshScript = Join-Path $PSScriptRoot "refresh-eas-token.ps1"
    if (-not (Test-Path -LiteralPath $refreshScript -PathType Leaf)) {
        Write-Warning "Refresh script was not found; scheduled refresh was skipped."
        return
    }

    try {
        $taskName = "BThwani-Sentry-EAS-OAuth-Refresh"
        $pwsh = (Get-Command pwsh).Source
        $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$refreshScript`" -RepoRoot `"$RepoRoot`""
        $action = New-ScheduledTaskAction -Execute $pwsh -Argument $arguments
        $trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM -DaysInterval 14
        $settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Refresh Sentry OAuth and synchronize it to all BThwani EAS projects." -Force | Out-Null
        Write-Host "Installed scheduled task: $taskName"
    }
    catch {
        Write-Warning "Scheduled refresh task could not be installed: $($_.Exception.Message)"
    }
}
