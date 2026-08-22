Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Write-Step {
    param([Parameter(Mandatory)][string] $Message)
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Assert-File {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "Required file is missing: $Path"
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][AllowEmptyCollection()][string[]] $Arguments,
        [string] $WorkingDirectory = $RepoRoot,
        [string[]] $SecretValues = @(),
        [switch] $Quiet
    )

    Push-Location -LiteralPath $WorkingDirectory
    try {
        $global:LASTEXITCODE = 0
        $output = & $Command @Arguments 2>&1
        $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
        $text = (($output | ForEach-Object { [string]$_ }) -join "`n").Trim()
        foreach ($secret in $SecretValues) {
            if (-not [string]::IsNullOrWhiteSpace($secret)) {
                $text = $text.Replace($secret, '<redacted>')
            }
        }
        if ($text -and (-not $Quiet -or $exitCode -ne 0)) { Write-Host $text }
        if ($exitCode -ne 0) {
            throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')"
        }
        return $text
    } finally {
        Pop-Location
    }
}

function Convert-EmbeddedJson {
    param([Parameter(Mandatory)][string] $Text)
    for ($start = 0; $start -lt $Text.Length; $start++) {
        if ($Text[$start] -notin @('{', '[')) { continue }
        $open = $Text[$start]
        $close = if ($open -eq '{') { '}' } else { ']' }
        $depth = 0
        $inString = $false
        $escaped = $false
        for ($index = $start; $index -lt $Text.Length; $index++) {
            $char = $Text[$index]
            if ($inString) {
                if ($escaped) { $escaped = $false; continue }
                if ($char -eq '\') { $escaped = $true; continue }
                if ($char -eq '"') { $inString = $false }
                continue
            }
            if ($char -eq '"') { $inString = $true; continue }
            if ($char -eq $open) { $depth++; continue }
            if ($char -eq $close) {
                $depth--
                if ($depth -eq 0) {
                    $candidate = $Text.Substring($start, $index - $start + 1)
                    try { return $candidate | ConvertFrom-Json -Depth 100 } catch { break }
                }
            }
        }
    }
    throw 'Command output did not contain valid JSON.'
}

function Assert-CleanTrackedTree {
    param([string] $Stage = 'Mobile EAS workflow')
    $status = Invoke-Checked -Command 'git' -Arguments @('status', '--porcelain=v1', '--untracked-files=no') -Quiet
    if (-not [string]::IsNullOrWhiteSpace($status)) {
        throw "$Stage requires a clean tracked Git tree. Modified files:`n$status"
    }
}

function Import-EnvFile {
    param([Parameter(Mandatory)][string] $Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return }
    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = $rawLine.Trim()
        if (-not $line -or $line.StartsWith('#') -or -not $line.Contains('=')) { continue }
        $parts = $line.Split('=', 2)
        $name = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        if ($name) { [Environment]::SetEnvironmentVariable($name, $value, 'Process') }
    }
}

function Get-AppSuffix { return $App.Replace('-', '_').ToUpperInvariant() }

function Resolve-ScopedValue {
    param([Parameter(Mandatory)][string] $BaseName)
    $scoped = [Environment]::GetEnvironmentVariable("${BaseName}_$(Get-AppSuffix)", 'Process')
    if (-not [string]::IsNullOrWhiteSpace($scoped)) { return $scoped.Trim() }
    $common = [Environment]::GetEnvironmentVariable($BaseName, 'Process')
    if (-not [string]::IsNullOrWhiteSpace($common)) { return $common.Trim() }
    return $null
}

function Resolve-AppPath {
    param([Parameter(Mandatory)][string] $Path)
    if ([System.IO.Path]::IsPathRooted($Path)) { return [System.IO.Path]::GetFullPath($Path) }
    return [System.IO.Path]::GetFullPath((Join-Path $AppDir $Path))
}

function Test-GoogleApiKey {
    param([AllowNull()][string] $Value)
    return -not [string]::IsNullOrWhiteSpace($Value) -and $Value -match '^AIza[0-9A-Za-z_-]{35}$'
}

function Get-StringSha256 {
    param([Parameter(Mandatory)][string] $Value)
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
    return [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData($bytes)).ToLowerInvariant()
}
