[CmdletBinding(PositionalBinding = $false)]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('pnpm', 'npx')]
    [string] $Command,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$global:LASTEXITCODE = 0

# Fixed argv bridge for Windows package-manager shims. Never evaluate a joined
# command string and never invoke an intermediate command shell.
& $Command @Arguments
if ($null -eq $LASTEXITCODE) { exit 0 }
exit [int]$LASTEXITCODE
