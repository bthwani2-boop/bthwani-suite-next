param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-DockerEndpoint {
  param([Parameter(Mandatory = $true)][string]$Context)

  $value = & docker context inspect $Context --format '{{.Endpoints.docker.Host}}' 2>$null
  if ($LASTEXITCODE -ne 0) { return $null }

  $endpoint = (($value | Out-String).Trim())
  if ([string]::IsNullOrWhiteSpace($endpoint)) { return $null }
  return $endpoint
}

function Test-LocalDockerEndpoint {
  param([string]$Endpoint)

  if ([string]::IsNullOrWhiteSpace($Endpoint)) { return $false }
  return $Endpoint -match '^(npipe|unix)://'
}

& docker --version | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker CLI is unavailable."
}

$current = ((& docker context show) | Out-String).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($current)) {
  throw "Unable to resolve the active Docker context."
}

$currentEndpoint = Get-DockerEndpoint -Context $current
$selected = $null

if (Test-LocalDockerEndpoint -Endpoint $currentEndpoint) {
  $selected = $current
} else {
  $available = @(& docker context ls --format '{{.Name}}')
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to list Docker contexts."
  }

  foreach ($candidate in @("desktop-linux", "default")) {
    if ($available -notcontains $candidate) { continue }

    $candidateEndpoint = Get-DockerEndpoint -Context $candidate
    if (Test-LocalDockerEndpoint -Endpoint $candidateEndpoint) {
      $selected = $candidate
      break
    }
  }
}

if ([string]::IsNullOrWhiteSpace($selected)) {
  throw "No safe local Docker context was found. Refusing remote Docker contexts."
}

if ($selected -ne $current) {
  & docker context use $selected | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to switch Docker context to '$selected'."
  }
}

$verifiedEndpoint = Get-DockerEndpoint -Context $selected
if (-not (Test-LocalDockerEndpoint -Endpoint $verifiedEndpoint)) {
  throw "Selected Docker context is not local: $verifiedEndpoint"
}

$server = ((& docker info --format 'ServerVersion={{.ServerVersion}} OperatingSystem={{.OperatingSystem}}') | Out-String).Trim()
if ($LASTEXITCODE -ne 0) {
  throw "Docker Engine is unavailable on local context '$selected'."
}

Write-Host "Docker local context: $selected"
Write-Host "Endpoint: $verifiedEndpoint"
Write-Host $server
