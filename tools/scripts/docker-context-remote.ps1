param(
  [Parameter(Mandatory = $true)][string]$ContextName,
  [Parameter(Mandatory = $true)][string]$SshHost
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($ContextName)) {
  throw "ContextName is required"
}

if ([string]::IsNullOrWhiteSpace($SshHost)) {
  throw "SshHost is required"
}

if ($SshHost -match "^\s*tcp://") {
  throw "Public TCP Docker endpoints are forbidden. Use ssh:// only."
}

$hostValue = if ($SshHost -match "^\s*ssh://") { $SshHost.Trim() } else { "ssh://$($SshHost.Trim())" }

Write-Host "Creating Docker context '$ContextName' with host '$hostValue'"
docker context create $ContextName --docker "host=$hostValue"
if ($LASTEXITCODE -ne 0) { throw "docker context create failed" }

docker context use $ContextName
if ($LASTEXITCODE -ne 0) { throw "docker context use failed" }

Write-Host "Remote Docker context active. Mounted paths must exist on the remote Docker host."
