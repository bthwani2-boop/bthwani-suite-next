param()

$ErrorActionPreference = "Stop"

function Invoke-RequiredCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Write-Host "`n--- $Name ---"
  & $Name @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Name $($Arguments -join ' ') failed with exit code $LASTEXITCODE"
  }
}

Write-Host "OS: $([System.Runtime.InteropServices.RuntimeInformation]::OSDescription)"
Invoke-RequiredCommand -Name "node" -Arguments @("--version")
Invoke-RequiredCommand -Name "pnpm" -Arguments @("--version")
Invoke-RequiredCommand -Name "go" -Arguments @("version")
Invoke-RequiredCommand -Name "docker" -Arguments @("--version")
Invoke-RequiredCommand -Name "docker" -Arguments @("compose", "version")

$pnpmVersion = (& pnpm --version).Trim()
if ($pnpmVersion -ne "10.34.2") {
  throw "pnpm version must be 10.34.2, got $pnpmVersion"
}

docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker is not available"
}

Write-Host "`nruntime:codespaces:check: PASS"
