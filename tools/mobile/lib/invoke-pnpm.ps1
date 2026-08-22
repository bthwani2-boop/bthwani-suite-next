[CmdletBinding(PositionalBinding = $false)]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidatePattern('^[A-Za-z0-9+/]*={0,2}$')]
    [string] $EncodedArguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($EncodedArguments))
$decoded = ConvertFrom-Json -InputObject $json -NoEnumerate
if ($decoded -isnot [System.Array]) {
    throw 'Encoded package-manager arguments must decode to a JSON array.'
}

$packageManagerArgs = [System.Collections.Generic.List[string]]::new()
foreach ($item in $decoded) {
    if ($item -isnot [string]) {
        throw 'Encoded package-manager arguments must contain strings only.'
    }
    [void]$packageManagerArgs.Add([string]$item)
}

# The executable is intentionally fixed and arguments stay as argv tokens.
$argv = $packageManagerArgs.ToArray()
& pnpm @argv
if ($null -eq $LASTEXITCODE) {
    exit 0
}
exit [int]$LASTEXITCODE
