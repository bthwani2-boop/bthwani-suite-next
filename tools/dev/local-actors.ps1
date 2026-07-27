# Single source of truth accessor for local development identity actors.
# Dot-source this file, then use Get-LocalPassword / Get-LocalUsername /
# Get-LocalActor instead of re-declaring a password or username fallback:
#
#   . (Join-Path $PSScriptRoot "../dev/local-actors.ps1")
#
# Strict mode is deliberately not set here so dot-sourcing never changes the
# calling script's own strictness.

$script:LocalActorsRegistryPath = Join-Path $PSScriptRoot "local-actors.json"
$script:LocalActorsRegistry = Get-Content -Path $script:LocalActorsRegistryPath -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-LocalActorsRegistry {
  return $script:LocalActorsRegistry
}

# Local bootstrap password: an environment override wins, the registry is the default.
function Get-LocalPassword {
  $override = [Environment]::GetEnvironmentVariable($script:LocalActorsRegistry.passwordEnvVar)
  if (-not [string]::IsNullOrWhiteSpace($override)) { return [string]$override }
  return [string]$script:LocalActorsRegistry.password
}

# Registry default password, ignoring any environment override.
function Get-LocalPasswordDefault {
  return [string]$script:LocalActorsRegistry.password
}

function Get-LocalActor {
  param([Parameter(Mandatory = $true)][string]$Key)

  $property = $script:LocalActorsRegistry.actors.PSObject.Properties[$Key]
  if ($null -eq $property) {
    $property = $script:LocalActorsRegistry.platformActors.PSObject.Properties[$Key]
  }
  if ($null -eq $property) { throw "unknown local development actor: $Key" }
  return $property.Value
}

function Get-LocalUsername {
  param([Parameter(Mandatory = $true)][string]$Key)

  return [string](Get-LocalActor -Key $Key).username
}
