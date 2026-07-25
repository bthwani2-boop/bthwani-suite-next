function Update-GoogleInput {
    param([Parameter(Mandatory)][string] $Sha1)
    if (-not (Test-Path -LiteralPath $GoogleInputLocalPath -PathType Leaf)) {
        Assert-File -Path $GoogleInputExamplePath
        Copy-Item -LiteralPath $GoogleInputExamplePath -Destination $GoogleInputLocalPath
    }
    $input = Get-Content -LiteralPath $GoogleInputLocalPath -Raw | ConvertFrom-Json -Depth 100
    $entry = $input.apps.$App
    if ($null -eq $entry) { throw "$GoogleInputLocalPath does not define $App." }
    $entry.packageName = [string]$appConfig.androidPackage
    $entry.sha1Fingerprint = $Sha1
    $input | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $GoogleInputLocalPath -Encoding UTF8
}

function Resolve-FirebaseSource {
    if (Test-Path -LiteralPath $SecretsMapPath -PathType Leaf) {
        $map = Get-Content -LiteralPath $SecretsMapPath -Raw | ConvertFrom-Json -Depth 20
        $property = $map.PSObject.Properties[$App]
        if ($null -ne $property -and (Test-Path -LiteralPath ([string]$property.Value) -PathType Leaf)) {
            return (Resolve-Path -LiteralPath ([string]$property.Value)).Path
        }
    }
    if (Test-Path -LiteralPath $SecureFirebasePath -PathType Leaf) {
        return (Resolve-Path -LiteralPath $SecureFirebasePath).Path
    }
    return $null
}

function Assert-ArchivePolicy {
    Assert-File -Path $RuntimeEasIgnorePath
    $rules = @(Get-Content -LiteralPath $RuntimeEasIgnorePath)
    foreach ($required in @('credentials.json', '*.jks', '*.keystore', '.env*', 'google-services.json')) {
        if ($rules -notcontains $required) { throw "$RuntimeEasIgnorePath must contain '$required'." }
    }
    foreach ($forbidden in @('!google-services.json', '!.env.local')) {
        if ($rules -contains $forbidden) { throw "$RuntimeEasIgnorePath must not contain '$forbidden'." }
    }
}

function Stage-ProviderInputs {
    Assert-ArchivePolicy
    $firebaseSource = Resolve-FirebaseSource
    if ([string]::IsNullOrWhiteSpace($firebaseSource)) { throw "Firebase config is missing for $App. Run Initialize first." }
    Copy-Item -LiteralPath $firebaseSource -Destination $RuntimeFirebasePath -Force

    $validationText = Invoke-Checked -Command 'node' -Arguments @(
        $FirebaseValidatorPath, '--file', $RuntimeFirebasePath,
        '--package', ([string]$appConfig.androidPackage), '--json'
    ) -Quiet
    $validation = Convert-EmbeddedJson -Text $validationText
    if ($validation.ok -ne $true -or [string]$validation.projectId -ne 'bthwani-platform') {
        throw "$App Firebase config failed package or project validation."
    }

    $firebaseConfig = Get-Content -LiteralPath $RuntimeFirebasePath -Raw | ConvertFrom-Json -Depth 100
    $client = @($firebaseConfig.client | Where-Object {
        $_.client_info.android_client_info.package_name -eq [string]$appConfig.androidPackage
    }) | Select-Object -First 1
    $firebaseKey = [string]$client.api_key[0].current_key
    if (-not (Test-GoogleApiKey -Value $firebaseKey)) { throw "$App Firebase API key is missing or invalid." }

    Import-EnvFile -Path $MobileEnvPath
    $mapsKey = Resolve-ScopedValue -BaseName 'GOOGLE_MAPS_ANDROID_API_KEY'
    if (-not (Test-GoogleApiKey -Value $mapsKey)) { throw "Maps key is missing or invalid for $App. Run Initialize first." }
    if ([string]::Equals($firebaseKey, $mapsKey, [System.StringComparison]::Ordinal)) {
        throw "$App Firebase and Maps keys must be separate."
    }

    $suffix = Get-AppSuffix
    @(
        '# Generated locally by apps/mobile/eas/workflow.ps1.',
        'GOOGLE_SERVICES_JSON=./google-services.json',
        "GOOGLE_SERVICES_JSON_$suffix=./google-services.json",
        "GOOGLE_MAPS_ANDROID_API_KEY=$mapsKey",
        "GOOGLE_MAPS_ANDROID_API_KEY_$suffix=$mapsKey"
    ) | Set-Content -LiteralPath $RuntimeEnvPath -Encoding UTF8

    [Environment]::SetEnvironmentVariable('GOOGLE_SERVICES_JSON', $RuntimeFirebasePath, 'Process')
    [Environment]::SetEnvironmentVariable("GOOGLE_SERVICES_JSON_$suffix", $RuntimeFirebasePath, 'Process')
    [Environment]::SetEnvironmentVariable('GOOGLE_MAPS_ANDROID_API_KEY', $mapsKey, 'Process')
    [Environment]::SetEnvironmentVariable("GOOGLE_MAPS_ANDROID_API_KEY_$suffix", $mapsKey, 'Process')

    $configText = Invoke-Checked -Command 'pnpm' -Arguments @('exec', 'expo', 'config', '--json') -WorkingDirectory $AppDir -Quiet -SecretValues @($mapsKey, $firebaseKey)
    $config = Convert-EmbeddedJson -Text $configText
    if ([string]$config.owner -ne [string]$manifest.global.owner) { throw "$App Expo owner mismatch." }
    if ([string]$config.slug -ne [string]$appConfig.slug) { throw "$App Expo slug mismatch." }
    if ([string]$config.extra.eas.projectId -ne [string]$appConfig.projectId) { throw "$App EAS project ID mismatch." }
    if ($config.extra.notifications.androidNativeConfigured -ne $true) { throw "$App Firebase Android configuration is missing." }
    if ($config.extra.maps.androidNativeConfigured -ne $true) { throw "$App Android Maps configuration is missing." }
    $resolvedFirebase = Resolve-AppPath -Path ([string]$config.android.googleServicesFile)
    if (-not [string]::Equals($resolvedFirebase, [System.IO.Path]::GetFullPath($RuntimeFirebasePath), [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$App Expo config does not resolve the staged Firebase file."
    }

    return [pscustomobject]@{ MapsKey = $mapsKey; FirebaseKey = $firebaseKey }
}

function Remove-AnsiEscapeSequences {
    param([AllowNull()][string] $Text)

    if ([string]::IsNullOrEmpty($Text)) { return $Text }
    $csiPattern = [string]([char]27) + '\[[0-?]*[ -/]*[@-~]'
    return [regex]::Replace($Text, $csiPattern, '')
}

function Invoke-EasEnvironmentCommand {
    param(
        [Parameter(Mandatory)][string[]] $Arguments,
        [string[]] $SecretValues = @(),
        [switch] $Quiet
    )

    Push-Location -LiteralPath $AppDir
    $previousNoColor = $env:NO_COLOR
    $previousForceColor = $env:FORCE_COLOR
    try {
        $env:NO_COLOR = '1'
        $env:FORCE_COLOR = '0'
        $global:LASTEXITCODE = 0
        $output = & pnpm @Arguments 2>&1
        $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
        $rawText = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
        $text = Remove-AnsiEscapeSequences -Text $rawText
        $commandText = "pnpm $($Arguments -join ' ')"
        foreach ($secret in $SecretValues) {
            if (-not [string]::IsNullOrWhiteSpace($secret)) {
                $text = $text.Replace($secret, '<redacted>')
                $commandText = $commandText.Replace($secret, '<redacted>')
            }
        }
        if ($text -and (-not $Quiet -or $exitCode -ne 0)) { Write-Host $text }
        if ($exitCode -ne 0) {
            throw "EAS environment command failed with exit code ${exitCode}: $commandText"
        }
        return [pscustomobject]@{ ExitCode = $exitCode; Text = $text }
    } finally {
        if ($null -eq $previousNoColor) {
            Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue
        } else {
            $env:NO_COLOR = $previousNoColor
        }
        if ($null -eq $previousForceColor) {
            Remove-Item Env:FORCE_COLOR -ErrorAction SilentlyContinue
        } else {
            $env:FORCE_COLOR = $previousForceColor
        }
        Pop-Location
    }
}

function Set-EasVariable {
    param(
        [Parameter(Mandatory)][string] $Name,
        [Parameter(Mandatory)][string] $Value,
        [Parameter(Mandatory)][ValidateSet('string', 'file')][string] $Type,
        [Parameter(Mandatory)][ValidateSet('plaintext', 'sensitive', 'secret')][string] $Visibility,
        [string[]] $SecretValues = @()
    )

    Invoke-EasEnvironmentCommand -Arguments @(
        'dlx', 'eas-cli@latest', 'env:set', 'development',
        '--name', $Name, '--value', $Value, '--type', $Type,
        '--visibility', $Visibility, '--scope', 'project', '--non-interactive'
    ) -SecretValues $SecretValues | Out-Null
}

function Sync-EasDevelopmentEnvironment {
    param([Parameter(Mandatory)][string] $MapsKey)
    Write-Step 'Synchronize EAS development provider inputs'
    Set-EasVariable -Name 'GOOGLE_SERVICES_JSON' -Value $SecureFirebasePath -Type 'file' -Visibility 'secret'
    Set-EasVariable -Name 'GOOGLE_MAPS_ANDROID_API_KEY' -Value $MapsKey -Type 'string' -Visibility 'sensitive' -SecretValues @($MapsKey)
    Write-Host 'PASS: EAS development provider inputs were created or updated.' -ForegroundColor Green
}