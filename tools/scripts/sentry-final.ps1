[CmdletBinding()]
param(
    [string]$RepoRoot = "C:\bthwani-suite-next",
    [string]$Organization = "bthwani",
    [string[]]$EasEnvironments = @("development", "preview", "production"),
    [switch]$RebuildSentryProjects,
    [switch]$RefreshTokenOnly,
    [switch]$SkipEas,
    [switch]$SkipScheduledRefresh
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$global:OutputEncoding = [Text.UTF8Encoding]::new($false)

$script:SentryCliPackage = "sentry@0.38.0"
$script:EasCliPackage = "eas-cli@latest"
$script:SentryUrl = "https://sentry.io"
$script:SentryApiBase = "$script:SentryUrl/api/0"
$script:SentryToken = $null
$script:PnpmPath = $null

function Write-Stage {
    param([Parameter(Mandatory)][string]$Message)
    Write-Host ""
    Write-Host "================================================================"
    Write-Host " $Message"
    Write-Host "================================================================"
}

function Get-SafeArguments {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $safe = [System.Collections.Generic.List[string]]::new()
    $hideNext = $false
    foreach ($argument in $Arguments) {
        if ($hideNext) {
            $safe.Add("<redacted>")
            $hideNext = $false
            continue
        }

        $safe.Add($argument)
        if ($argument -in @("--value", "--token", "--auth-token")) {
            $hideNext = $true
        }
    }
    return ($safe -join " ")
}

function Invoke-PnpmDlx {
    param(
        [Parameter(Mandatory)][string]$Package,
        [Parameter(Mandatory)][string[]]$Arguments,
        [string]$WorkingDirectory = $RepoRoot,
        [switch]$Interactive,
        [switch]$AllowFailure,
        [switch]$Quiet
    )

    $allArguments = @("dlx", $Package) + $Arguments
    $safeCommand = "pnpm $(Get-SafeArguments -Arguments $allArguments)"

    if ($Interactive) {
        Push-Location -LiteralPath $WorkingDirectory
        try {
            & $script:PnpmPath @allArguments | Out-Host
            $exitCode = [int]$LASTEXITCODE
        }
        finally {
            Pop-Location
        }

        if ($exitCode -ne 0 -and -not $AllowFailure) {
            throw "Command failed with exit code $exitCode: $safeCommand"
        }

        return [pscustomobject]@{
            ExitCode = $exitCode
            Output = ""
            Error = ""
        }
    }

    $temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) "bthwani-sentry-final"
    New-Item -ItemType Directory -Path $temporaryRoot -Force | Out-Null
    $identifier = [Guid]::NewGuid().ToString("N")
    $stdoutPath = Join-Path $temporaryRoot "$identifier.stdout.log"
    $stderrPath = Join-Path $temporaryRoot "$identifier.stderr.log"

    try {
        Push-Location -LiteralPath $WorkingDirectory
        try {
            & $script:PnpmPath @allArguments 1> $stdoutPath 2> $stderrPath
            $exitCode = [int]$LASTEXITCODE
        }
        finally {
            Pop-Location
        }

        $stdout = if (Test-Path -LiteralPath $stdoutPath) {
            Get-Content -LiteralPath $stdoutPath -Raw -ErrorAction SilentlyContinue
        }
        else { "" }

        $stderr = if (Test-Path -LiteralPath $stderrPath) {
            Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue
        }
        else { "" }

        if (-not $Quiet) {
            if (-not [string]::IsNullOrWhiteSpace($stdout)) { Write-Host $stdout.TrimEnd() }
            if (-not [string]::IsNullOrWhiteSpace($stderr)) { Write-Host $stderr.TrimEnd() }
        }

        if ($exitCode -ne 0 -and -not $AllowFailure) {
            $detail = if (-not [string]::IsNullOrWhiteSpace($stderr)) { $stderr.Trim() } else { $stdout.Trim() }
            throw "Command failed with exit code $exitCode: $safeCommand`n$detail"
        }

        return [pscustomobject]@{
            ExitCode = $exitCode
            Output = [string]$stdout
            Error = [string]$stderr
        }
    }
    finally {
        Remove-Item -LiteralPath $stdoutPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-SentryCli {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$Interactive,
        [switch]$AllowFailure,
        [switch]$Quiet
    )

    return Invoke-PnpmDlx `
        -Package $script:SentryCliPackage `
        -Arguments $Arguments `
        -WorkingDirectory $RepoRoot `
        -Interactive:$Interactive `
        -AllowFailure:$AllowFailure `
        -Quiet:$Quiet
}

function Invoke-EasCli {
    param(
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$Interactive,
        [switch]$AllowFailure,
        [switch]$Quiet
    )

    return Invoke-PnpmDlx `
        -Package $script:EasCliPackage `
        -Arguments $Arguments `
        -WorkingDirectory $WorkingDirectory `
        -Interactive:$Interactive `
        -AllowFailure:$AllowFailure `
        -Quiet:$Quiet
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
        foreach ($wrapperName in @("results", "projects", "keys", "data")) {
            $wrapped = Get-PropertyValue -InputObject $current -Name $wrapperName
            if ($null -ne $wrapped) {
                $stack.Push($wrapped)
                $expanded = $true
                break
            }
        }

        if (-not $expanded) { $items.Add($current) }
    }

    return $items.ToArray()
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
            return Invoke-RestMethod `
                -Method $Method `
                -Uri $uri `
                -Headers $headers `
                -ContentType "application/json" `
                -Body $payload
        }

        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
    }
    catch {
        $detail = $_.ErrorDetails.Message
        if ([string]::IsNullOrWhiteSpace($detail)) { $detail = $_.Exception.Message }
        throw "Sentry API request failed: $Method $uri`n$detail"
    }
}

function Connect-Sentry {
    $status = Invoke-SentryCli -Arguments @("auth", "status", "--fresh") -AllowFailure -Quiet

    if ($status.ExitCode -ne 0) {
        Write-Host "Opening Sentry authorization. Approve access once in the browser."
        $loginArguments = [System.Collections.Generic.List[string]]::new()
        foreach ($argument in @("auth", "login", "--force", "--url", $script:SentryUrl)) {
            $loginArguments.Add($argument)
        }
        foreach ($scope in @(
            "org:admin", "org:write", "org:read",
            "project:admin", "project:write", "project:read", "org:ci"
        )) {
            $loginArguments.Add("--scope")
            $loginArguments.Add($scope)
        }

        Invoke-SentryCli -Arguments $loginArguments.ToArray() -Interactive | Out-Null
    }
    else {
        Write-Host "Using the existing Sentry OAuth session."
        $refresh = Invoke-SentryCli -Arguments @("auth", "refresh", "--force") -AllowFailure -Quiet
        if ($refresh.ExitCode -eq 0) {
            Write-Host "Rotated the Sentry OAuth token before synchronization."
        }
        else {
            Write-Warning "OAuth refresh failed; the current valid session will be used."
        }
    }

    $verified = Invoke-SentryCli -Arguments @("auth", "status", "--fresh") -AllowFailure
    if ($verified.ExitCode -ne 0) {
        throw "Sentry OAuth verification failed."
    }

    $tokenResult = Invoke-SentryCli -Arguments @("auth", "token") -Quiet
    $tokenLines = @($tokenResult.Output -split "`r?`n" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    if ($tokenLines.Count -eq 0) { throw "Sentry CLI returned an empty OAuth token." }

    $script:SentryToken = $tokenLines[-1].Trim()
    if ($script:SentryToken.Length -lt 32) {
        throw "Sentry CLI returned an invalid OAuth token."
    }
}

function Ensure-EasAuthentication {
    param([Parameter(Mandatory)][string]$WorkingDirectory)

    $whoami = Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @("whoami") -AllowFailure -Quiet
    if ($whoami.ExitCode -ne 0) {
        Write-Host "Expo/EAS authentication is required."
        Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @("login") -Interactive | Out-Null
    }

    $verified = Invoke-EasCli -WorkingDirectory $WorkingDirectory -Arguments @("whoami") -AllowFailure
    if ($verified.ExitCode -ne 0) { throw "Expo/EAS authentication failed." }
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

function Get-SentryProjects {
    $response = Invoke-SentryApi `
        -Method GET `
        -Path "organizations/$([Uri]::EscapeDataString($Organization))/projects/?per_page=100"

    return @(ConvertTo-FlatItems -InputObject $response | Where-Object {
        -not [string]::IsNullOrWhiteSpace([string](Get-PropertyValue -InputObject $_ -Name "slug"))
    })
}

function Remove-BThwaniSentryProjects {
    $projects = @(Get-SentryProjects | Where-Object {
        ([string](Get-PropertyValue -InputObject $_ -Name "slug")).StartsWith("bthwani-")
    })

    foreach ($project in $projects) {
        $slug = [string](Get-PropertyValue -InputObject $project -Name "slug")
        Write-Host "Deleting Sentry project: $slug"
        Invoke-SentryApi `
            -Method DELETE `
            -Path "projects/$([Uri]::EscapeDataString($Organization))/$([Uri]::EscapeDataString($slug))/" | Out-Null
    }

    $deadline = (Get-Date).AddMinutes(3)
    do {
        $remaining = @(Get-SentryProjects | Where-Object {
            ([string](Get-PropertyValue -InputObject $_ -Name "slug")).StartsWith("bthwani-")
        })
        if ($remaining.Count -eq 0) { return }
        Write-Host "Waiting for Sentry deletion: $($remaining.Count) project(s) remain..."
        Start-Sleep -Seconds 4
    } while ((Get-Date) -lt $deadline)

    throw "Sentry did not finish project deletion within three minutes."
}

function Get-OrCreateProjectWithDsn {
    param(
        [Parameter(Mandatory)][pscustomobject]$Definition,
        [Parameter(Mandatory)][object[]]$ExistingProjects
    )

    $project = $ExistingProjects | Where-Object {
        [string](Get-PropertyValue -InputObject $_ -Name "slug") -eq $Definition.Slug
    } | Select-Object -First 1

    if ($null -eq $project) {
        Write-Host "Creating Sentry project: $($Definition.Slug)"
        $project = Invoke-SentryApi `
            -Method POST `
            -Path "organizations/$([Uri]::EscapeDataString($Organization))/projects/" `
            -Body @{
                name = $Definition.Name
                slug = $Definition.Slug
                platform = $Definition.Platform
                default_rules = $true
            }
    }
    else {
        Write-Host "Using Sentry project: $($Definition.Slug)"
    }

    $actualSlug = [string](Get-PropertyValue -InputObject $project -Name "slug")
    if ([string]::IsNullOrWhiteSpace($actualSlug)) { $actualSlug = $Definition.Slug }

    $keyResponse = Invoke-SentryApi `
        -Method GET `
        -Path "projects/$([Uri]::EscapeDataString($Organization))/$([Uri]::EscapeDataString($actualSlug))/keys/"
    $keys = @(ConvertTo-FlatItems -InputObject $keyResponse)
    $clientKey = $keys | Where-Object {
        $dsn = Get-PropertyValue -InputObject $_ -Name "dsn"
        -not [string]::IsNullOrWhiteSpace([string](Get-PropertyValue -InputObject $dsn -Name "public"))
    } | Select-Object -First 1

    if ($null -eq $clientKey) {
        $clientKey = Invoke-SentryApi `
            -Method POST `
            -Path "projects/$([Uri]::EscapeDataString($Organization))/$([Uri]::EscapeDataString($actualSlug))/keys/" `
            -Body @{ name = "BThwani default SDK key" }
    }

    $dsnObject = Get-PropertyValue -InputObject $clientKey -Name "dsn"
    $publicDsn = [string](Get-PropertyValue -InputObject $dsnObject -Name "public")
    if ([string]::IsNullOrWhiteSpace($publicDsn)) {
        throw "Sentry did not return a public DSN for: $actualSlug"
    }

    return [pscustomobject]@{
        Key = $Definition.Key
        AppKey = $Definition.AppKey
        Name = $Definition.Name
        Slug = $actualSlug
        Runtime = $Definition.Runtime
        PublicDsn = $publicDsn
    }
}

function Set-EnvFileValues {
    param(
        [Parameter(Mandatory)][string]$Path,
        [Parameter(Mandatory)][System.Collections.IDictionary]$Values,
        [Parameter(Mandatory)][string]$ManagedPattern
    )

    New-Item -ItemType Directory -Path (Split-Path -Parent $Path) -Force | Out-Null
    $original = if (Test-Path -LiteralPath $Path -PathType Leaf) {
        Get-Content -LiteralPath $Path -Raw
    }
    else { "" }

    $retained = @()
    if (-not [string]::IsNullOrWhiteSpace($original)) {
        $retained = @($original -split "`r?`n" | Where-Object {
            $_ -notmatch $ManagedPattern -and -not [string]::IsNullOrWhiteSpace($_)
        })
    }

    $newLines = [System.Collections.Generic.List[string]]::new()
    foreach ($line in $retained) { $newLines.Add($line) }
    if ($newLines.Count -gt 0) { $newLines.Add("") }
    foreach ($entry in $Values.GetEnumerator()) {
        $newLines.Add("$($entry.Key)=$($entry.Value)")
    }

    $newContent = ($newLines -join [Environment]::NewLine) + [Environment]::NewLine
    if ($newContent -eq $original) {
        Write-Host "Local configuration is already current: $Path"
        return
    }

    if (-not [string]::IsNullOrWhiteSpace($original)) {
        $backupDirectory = Join-Path (Split-Path -Parent $Path) "sentry-backups"
        New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
        $backup = Join-Path $backupDirectory "$(Split-Path -Leaf $Path).$(Get-Date -Format 'yyyyMMddHHmmss').bak"
        Copy-Item -LiteralPath $Path -Destination $backup -Force
    }

    [IO.File]::WriteAllText($Path, $newContent, [Text.UTF8Encoding]::new($false))
    Write-Host "Updated local configuration: $Path"
}

function Write-LocalConfiguration {
    param([Parameter(Mandatory)][object[]]$Projects)

    $mobileValues = [ordered]@{
        SENTRY_ORG = $Organization
        SENTRY_URL = "$script:SentryUrl/"
        SENTRY_AUTH_TOKEN = ""
        EXPO_PUBLIC_APP_ENV = "development"
        EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE = "0.05"
        EXPO_PUBLIC_SENTRY_DEBUG = "false"
        EXPO_PUBLIC_SENTRY_STARTUP_PROBE = "false"
    }

    foreach ($project in $Projects | Where-Object { $null -ne $_.AppKey }) {
        $mobileValues["SENTRY_PROJECT_$($project.Key)"] = $project.Slug
        $mobileValues["EXPO_PUBLIC_SENTRY_DSN_$($project.Key)"] = $project.PublicDsn
    }

    Set-EnvFileValues `
        -Path (Join-Path $RepoRoot "infra\local\mobile.env") `
        -Values $mobileValues `
        -ManagedPattern '^\s*(SENTRY_|EXPO_PUBLIC_SENTRY_|EXPO_PUBLIC_APP_ENV\s*=)'

    $platformValues = [ordered]@{
        SENTRY_ORG = $Organization
        SENTRY_URL = "$script:SentryUrl/"
        SENTRY_AUTH_TOKEN = ""
    }
    foreach ($project in $Projects) {
        $platformValues["SENTRY_PROJECT_$($project.Key)"] = $project.Slug
        $platformValues["SENTRY_DSN_$($project.Key)"] = $project.PublicDsn
    }

    Set-EnvFileValues `
        -Path (Join-Path $RepoRoot "infra\local\sentry.env") `
        -Values $platformValues `
        -ManagedPattern '^\s*SENTRY_'
}

function Push-EasPublicVariables {
    param(
        [Parameter(Mandatory)][pscustomobject]$Project,
        [Parameter(Mandatory)][string]$Environment
    )

    $runtime = Join-Path $RepoRoot $Project.Runtime
    $temporaryFile = Join-Path ([IO.Path]::GetTempPath()) "bthwani-$($Project.AppKey)-$Environment.env"
    $lines = @(
        "SENTRY_ORG=$Organization",
        "SENTRY_URL=$script:SentryUrl/",
        "SENTRY_PROJECT=$($Project.Slug)",
        "EXPO_PUBLIC_SENTRY_DSN=$($Project.PublicDsn)",
        "EXPO_PUBLIC_APP_ENV=$Environment",
        "EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.05",
        "EXPO_PUBLIC_SENTRY_DEBUG=false",
        "EXPO_PUBLIC_SENTRY_STARTUP_PROBE=false"
    )

    try {
        [IO.File]::WriteAllLines($temporaryFile, [string[]]$lines, [Text.UTF8Encoding]::new($false))
        Write-Host "EAS public sync: $($Project.AppKey) / $Environment"
        Invoke-EasCli `
            -WorkingDirectory $runtime `
            -Arguments @("env:push", $Environment, "--path", $temporaryFile, "--force") | Out-Null
    }
    finally {
        Remove-Item -LiteralPath $temporaryFile -Force -ErrorAction SilentlyContinue
    }
}

function Set-EasSensitiveToken {
    param([Parameter(Mandatory)][pscustomobject]$Project)

    $runtime = Join-Path $RepoRoot $Project.Runtime
    $existingEnvironment = $null
    foreach ($environment in $EasEnvironments) {
        $check = Invoke-EasCli `
            -WorkingDirectory $runtime `
            -Arguments @(
                "env:get", $environment,
                "--variable-name", "SENTRY_AUTH_TOKEN",
                "--scope", "project",
                "--format", "short",
                "--non-interactive"
            ) `
            -AllowFailure `
            -Quiet

        if ($check.ExitCode -eq 0) {
            $existingEnvironment = $environment
            break
        }
    }

    if ($null -ne $existingEnvironment) {
        $arguments = [System.Collections.Generic.List[string]]::new()
        foreach ($argument in @(
            "env:update", $existingEnvironment,
            "--variable-name", "SENTRY_AUTH_TOKEN",
            "--value", $script:SentryToken,
            "--visibility", "sensitive",
            "--scope", "project",
            "--non-interactive"
        )) { $arguments.Add($argument) }
        foreach ($environment in $EasEnvironments) {
            $arguments.Add("--environment")
            $arguments.Add($environment)
        }

        Write-Host "EAS sensitive token update: $($Project.AppKey) / $($EasEnvironments -join ', ')"
        Invoke-EasCli -WorkingDirectory $runtime -Arguments $arguments.ToArray() | Out-Null
        return
    }

    $createArguments = [System.Collections.Generic.List[string]]::new()
    foreach ($argument in @(
        "env:create",
        "--name", "SENTRY_AUTH_TOKEN",
        "--value", $script:SentryToken,
        "--visibility", "sensitive",
        "--scope", "project",
        "--non-interactive"
    )) { $createArguments.Add($argument) }
    foreach ($environment in $EasEnvironments) {
        $createArguments.Add("--environment")
        $createArguments.Add($environment)
    }

    Write-Host "EAS sensitive token create: $($Project.AppKey) / $($EasEnvironments -join ', ')"
    Invoke-EasCli -WorkingDirectory $runtime -Arguments $createArguments.ToArray() | Out-Null
}

function Sync-Eas {
    param(
        [Parameter(Mandatory)][object[]]$MobileProjects,
        [switch]$TokenOnly
    )

    $firstRuntime = Join-Path $RepoRoot "apps\app-client\runtime"
    Ensure-EasAuthentication -WorkingDirectory $firstRuntime

    foreach ($project in $MobileProjects) {
        $runtime = Join-Path $RepoRoot $project.Runtime
        if (-not (Test-Path -LiteralPath $runtime -PathType Container)) {
            throw "Application runtime was not found: $runtime"
        }

        if (-not $TokenOnly) {
            foreach ($environment in $EasEnvironments) {
                Push-EasPublicVariables -Project $project -Environment $environment
            }
        }

        Set-EasSensitiveToken -Project $project
    }
}

function Verify-Eas {
    param([Parameter(Mandatory)][object[]]$MobileProjects)

    foreach ($project in $MobileProjects) {
        $runtime = Join-Path $RepoRoot $project.Runtime
        $arguments = [System.Collections.Generic.List[string]]::new()
        foreach ($argument in @("env:list", "--format", "long", "--scope", "project")) {
            $arguments.Add($argument)
        }
        foreach ($environment in $EasEnvironments) {
            $arguments.Add("--environment")
            $arguments.Add($environment)
        }

        $result = Invoke-EasCli -WorkingDirectory $runtime -Arguments $arguments.ToArray() -Quiet
        $combined = "$($result.Output)`n$($result.Error)"
        foreach ($required in @(
            "SENTRY_ORG",
            "SENTRY_URL",
            "SENTRY_PROJECT",
            "SENTRY_AUTH_TOKEN",
            "EXPO_PUBLIC_SENTRY_DSN",
            "EXPO_PUBLIC_APP_ENV",
            "EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE",
            "EXPO_PUBLIC_SENTRY_DEBUG",
            "EXPO_PUBLIC_SENTRY_STARTUP_PROBE"
        )) {
            if ($combined -notmatch [regex]::Escape($required)) {
                throw "Final EAS verification failed: $($project.AppKey) is missing $required"
            }
        }

        if ($combined -notmatch [regex]::Escape($project.Slug)) {
            throw "Final EAS verification failed: $($project.AppKey) does not reference $($project.Slug)"
        }

        Write-Host "[OK] EAS $($project.AppKey)"
    }
}

function Install-RefreshTask {
    $taskName = "BThwani-Sentry-Final-Refresh"
    $scriptPath = $PSCommandPath
    if ([string]::IsNullOrWhiteSpace($scriptPath)) { return }

    try {
        $pwsh = (Get-Command pwsh -ErrorAction Stop).Source
        $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -RepoRoot `"$RepoRoot`" -Organization `"$Organization`" -RefreshTokenOnly -SkipScheduledRefresh"
        $action = New-ScheduledTaskAction -Execute $pwsh -Argument $arguments
        $trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM -DaysInterval 14
        $settings = New-ScheduledTaskSettingsSet `
            -StartWhenAvailable `
            -RunOnlyIfNetworkAvailable `
            -AllowStartIfOnBatteries `
            -DontStopIfGoingOnBatteries

        Register-ScheduledTask `
            -TaskName $taskName `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Description "Refresh Sentry OAuth and synchronize SENTRY_AUTH_TOKEN to all BThwani EAS projects." `
            -Force | Out-Null

        Write-Host "[OK] Scheduled OAuth refresh: $taskName"
    }
    catch {
        Write-Warning "The scheduled refresh task could not be installed: $($_.Exception.Message)"
    }
}

try {
    Write-Stage "BTHWANI SENTRY FINAL CLOSURE"

    if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
        throw "Repository root was not found: $RepoRoot"
    }

    $pnpmCommand = Get-Command pnpm -ErrorAction Stop
    $script:PnpmPath = $pnpmCommand.Source

    $manifestPath = Join-Path $RepoRoot "tools\mobile\mobile-apps.manifest.json"
    if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Mobile application manifest was not found: $manifestPath"
    }

    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    foreach ($appKey in @("app-client", "app-partner", "app-captain", "app-field")) {
        $manifestApp = $manifest.apps.$appKey
        if ($null -eq $manifestApp -or [string]::IsNullOrWhiteSpace([string]$manifestApp.projectId)) {
            throw "Missing EAS project ID in the mobile manifest: $appKey"
        }
    }

    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue

    Write-Stage "SENTRY AUTHORIZATION"
    Connect-Sentry

    if ($RefreshTokenOnly) {
        Write-Stage "REFRESH EAS SENTRY TOKEN"
        $mobileDefinitions = @(Get-ProjectDefinitions | Where-Object { $null -ne $_.AppKey })
        Sync-Eas -MobileProjects $mobileDefinitions -TokenOnly
        Write-Host "Sentry token refresh completed successfully."
        return
    }

    $organizationResponse = Invoke-SentryApi `
        -Method GET `
        -Path "organizations/$([Uri]::EscapeDataString($Organization))/"
    $organizationItems = @(ConvertTo-FlatItems -InputObject $organizationResponse)
    $organizationObject = $organizationItems | Select-Object -First 1
    $organizationSlug = [string](Get-PropertyValue -InputObject $organizationObject -Name "slug")
    if ([string]::IsNullOrWhiteSpace($organizationSlug)) { $organizationSlug = $Organization }
    Write-Host "Connected organization: $organizationSlug"

    if ($RebuildSentryProjects) {
        Write-Stage "REBUILD BTHWANI SENTRY PROJECTS"
        Remove-BThwaniSentryProjects
    }

    Write-Stage "ENSURE SENTRY PROJECTS AND DSNS"
    $existingProjects = @(Get-SentryProjects)
    $configuredProjects = [System.Collections.Generic.List[object]]::new()
    foreach ($definition in Get-ProjectDefinitions) {
        $configuredProjects.Add((Get-OrCreateProjectWithDsn -Definition $definition -ExistingProjects $existingProjects))
    }

    Write-Stage "WRITE LOCAL CONFIGURATION"
    Write-LocalConfiguration -Projects $configuredProjects.ToArray()

    $mobileProjects = @($configuredProjects | Where-Object { $null -ne $_.AppKey })
    if (-not $SkipEas) {
        Write-Stage "SYNCHRONIZE EAS"
        Sync-Eas -MobileProjects $mobileProjects
    }

    Write-Stage "FINAL VERIFICATION"
    $remoteProjects = @(Get-SentryProjects)
    foreach ($project in $configuredProjects) {
        $match = $remoteProjects | Where-Object {
            [string](Get-PropertyValue -InputObject $_ -Name "slug") -eq $project.Slug
        } | Select-Object -First 1
        if ($null -eq $match) {
            throw "Final Sentry verification failed: $($project.Slug)"
        }
        Write-Host "[OK] Sentry $($project.Slug)"
    }

    if (-not $SkipEas) {
        Verify-Eas -MobileProjects $mobileProjects
    }

    if (-not $SkipScheduledRefresh -and -not $SkipEas) {
        Install-RefreshTask
    }

    Write-Host ""
    Write-Host "Sentry closure completed successfully."
    Write-Host "Sentry projects: $($configuredProjects.Count)"
    Write-Host "Mobile EAS projects: $($mobileProjects.Count)"
    Write-Host "EAS environments: $($EasEnvironments -join ', ')"
}
finally {
    $script:SentryToken = $null
    Remove-Item Env:SENTRY_AUTH_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_TOKEN -ErrorAction SilentlyContinue
    Remove-Item Env:SENTRY_FORCE_ENV_TOKEN -ErrorAction SilentlyContinue
}
