function Resolve-Keytool {
    $command = Get-Command keytool -ErrorAction SilentlyContinue
    if ($command -and $command.Source) { return $command.Source }

    $candidates = [System.Collections.Generic.List[string]]::new()
    $java = Get-Command java -ErrorAction SilentlyContinue
    if ($java -and $java.Source) { [void] $candidates.Add((Join-Path (Split-Path -Parent $java.Source) 'keytool.exe')) }
    foreach ($javaHome in @($env:JAVA_HOME, $env:JDK_HOME)) {
        if (-not [string]::IsNullOrWhiteSpace($javaHome)) { [void] $candidates.Add((Join-Path $javaHome 'bin\keytool.exe')) }
    }
    if ($env:ProgramFiles) {
        [void] $candidates.Add((Join-Path $env:ProgramFiles 'Android\Android Studio\jbr\bin\keytool.exe'))
        foreach ($vendor in @('Java', 'Eclipse Adoptium', 'Microsoft')) {
            $root = Join-Path $env:ProgramFiles $vendor
            if (Test-Path -LiteralPath $root -PathType Container) {
                foreach ($item in Get-ChildItem -LiteralPath $root -Filter keytool.exe -File -Recurse -ErrorAction SilentlyContinue) {
                    [void] $candidates.Add($item.FullName)
                }
            }
        }
    }
    if (${env:ProgramFiles(x86)}) {
        [void] $candidates.Add((Join-Path ${env:ProgramFiles(x86)} 'Android\Android Studio\jbr\bin\keytool.exe'))
    }
    if ($env:LOCALAPPDATA) {
        [void] $candidates.Add((Join-Path $env:LOCALAPPDATA 'Programs\Android Studio\jbr\bin\keytool.exe'))
    }
    if ($env:USERPROFILE) {
        foreach ($root in @((Join-Path $env:USERPROFILE '.jdks'), (Join-Path $env:USERPROFILE '.gradle\jdks'))) {
            if (Test-Path -LiteralPath $root -PathType Container) {
                foreach ($item in Get-ChildItem -LiteralPath $root -Filter keytool.exe -File -Recurse -ErrorAction SilentlyContinue) {
                    [void] $candidates.Add($item.FullName)
                }
            }
        }
    }

    $match = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if (-not $match) { throw 'keytool was not found. Install a JDK or Android Studio JBR, or set JAVA_HOME.' }
    return [System.IO.Path]::GetFullPath([string]$match)
}

function New-RandomSecret {
    $bytes = [byte[]]::new(64)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return ([Convert]::ToBase64String($bytes).Replace('+', 'A').Replace('/', 'B').Replace('=', '')).Substring(0, 40)
}

function Read-SigningSha1 {
    param([Parameter(Mandatory)][string] $Keytool)
    Assert-File -Path $CredentialsPath
    Assert-File -Path $SecureKeystorePath
    $credentials = Get-Content -LiteralPath $CredentialsPath -Raw | ConvertFrom-Json -Depth 20
    $keystore = $credentials.android.keystore
    if ($null -eq $keystore) { throw "$CredentialsPath does not contain android.keystore." }
    $actualPath = Resolve-AppPath -Path ([string]$keystore.keystorePath)
    if (-not [string]::Equals($actualPath, [System.IO.Path]::GetFullPath($SecureKeystorePath), [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$CredentialsPath points to an unexpected keystore."
    }
    $output = Invoke-Checked -Command $Keytool -Arguments @(
        '-J-Duser.language=en', '-list', '-v',
        '-keystore', $SecureKeystorePath,
        '-storepass', ([string]$keystore.keystorePassword),
        '-alias', ([string]$keystore.keyAlias)
    ) -Quiet -SecretValues @([string]$keystore.keystorePassword)
    $match = [regex]::Match($output, '(?im)^\s*SHA1:\s*((?:[A-F0-9]{2}:){19}[A-F0-9]{2})\s*$')
    if (-not $match.Success) { throw "Could not read SHA-1 from $SecureKeystorePath" }
    return $match.Groups[1].Value.ToUpperInvariant()
}

function Ensure-Signing {
    $credentialsExists = Test-Path -LiteralPath $CredentialsPath -PathType Leaf
    $keystoreExists = Test-Path -LiteralPath $SecureKeystorePath -PathType Leaf
    if ($credentialsExists -xor $keystoreExists) {
        throw "Incomplete signing state for $App. Both credentials.json and development.jks must exist or both must be absent."
    }

    $keytool = Resolve-Keytool
    if (-not $credentialsExists) {
        New-Item -ItemType Directory -Path $SecureSigningDirectory -Force | Out-Null
        $storePassword = New-RandomSecret
        $keyPassword = New-RandomSecret
        $alias = "bthwani-$App-development"
        $dname = "CN=$($appConfig.androidPackage), OU=BThwani Development, O=BThwani, L=Sanaa, ST=Sanaa, C=YE"
        Invoke-Checked -Command $keytool -Arguments @(
            '-J-Duser.language=en', '-genkeypair', '-noprompt',
            '-storetype', 'JKS', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
            '-keystore', $SecureKeystorePath,
            '-storepass', $storePassword,
            '-keypass', $keyPassword,
            '-alias', $alias,
            '-dname', $dname
        ) -SecretValues @($storePassword, $keyPassword) | Out-Null
        [ordered]@{
            android = [ordered]@{
                keystore = [ordered]@{
                    keystorePath = $SecureKeystorePath
                    keystorePassword = $storePassword
                    keyAlias = $alias
                    keyPassword = $keyPassword
                }
            }
        } | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $CredentialsPath -Encoding UTF8
    }
    return Read-SigningSha1 -Keytool $keytool
}
