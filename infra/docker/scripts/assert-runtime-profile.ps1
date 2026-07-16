param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("identity", "dsh", "wlt")]
  [string] $Profile
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Set-Location -LiteralPath $Root

$ProfilePath = ".\infra\docker\runtime-profiles\$Profile.runtime-profile.json"

if (-not (Test-Path -LiteralPath $ProfilePath)) {
  throw "Runtime profile not found: $ProfilePath"
}

$profileJson = Get-Content -LiteralPath $ProfilePath -Raw | ConvertFrom-Json

if ($profileJson.state -ne "RESERVED_NOT_ACTIVE") {
  Write-Host "$Profile runtime profile state: $($profileJson.state)"
  exit 0
}

throw "$Profile runtime profile is RESERVED_NOT_ACTIVE. Do not activate before its journey gate."
