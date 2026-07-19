[CmdletBinding()]
param(
  [string]$Profiles = "identity,workforce,dsh,wlt,media",
  [string]$ArtifactDirectory = "artifacts/partner-journey-closure"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
Set-Location -LiteralPath $RepoRoot
New-Item -ItemType Directory -Path $ArtifactDirectory -Force | Out-Null

$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$MatrixScript = Join-Path $RepoRoot "tools/scripts/test-dsh-multisurface-runtime-matrix.ps1"

function Invoke-LoggedScript {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][scriptblock]$Action
  )

  $logPath = Join-Path $ArtifactDirectory ("runtime-{0}.log" -f $Name)
  try {
    & $Action *>&1 | Tee-Object -FilePath $logPath
  } catch {
    ($_ | Format-List * -Force | Out-String) | Tee-Object -FilePath $logPath -Append
    throw "Partner runtime stage '$Name' failed. See $logPath. $($_.Exception.Message)"
  }
}

function Assert-HttpReady {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][string]$ExpectedStatus
  )

  $response = Invoke-RestMethod -Uri $Uri -TimeoutSec 10 -ErrorAction Stop
  if ([string]$response.status -ne $ExpectedStatus) {
    throw "$Name returned status '$($response.status)', expected '$ExpectedStatus'."
  }
}

Invoke-LoggedScript -Name "down" -Action {
  & $RuntimeScript -Action down -Profiles $Profiles
}

Invoke-LoggedScript -Name "up" -Action {
  & $RuntimeScript -Action up -Profiles $Profiles
}

Invoke-LoggedScript -Name "seed" -Action {
  & $RuntimeScript -Action seed -Profiles $Profiles
}

Invoke-LoggedScript -Name "bootstrap" -Action {
  & $RuntimeScript -Action bootstrap-dev -Profiles "dsh,media" -Force
}

Invoke-LoggedScript -Name "readiness" -Action {
  Assert-HttpReady -Name "Identity API" -Uri "http://127.0.0.1:58082/identity/health" -ExpectedStatus "healthy"
  Assert-HttpReady -Name "Workforce API" -Uri "http://127.0.0.1:58086/workforce/health" -ExpectedStatus "healthy"
  Assert-HttpReady -Name "DSH API" -Uri "http://127.0.0.1:58080/dsh/health" -ExpectedStatus "healthy"
  Assert-HttpReady -Name "WLT API" -Uri "http://127.0.0.1:58083/wlt/health" -ExpectedStatus "healthy"
  Write-Host "Partner runtime dependencies: PASS"
}

Invoke-LoggedScript -Name "multisurface" -Action {
  & $MatrixScript
}

Write-Host "Partner multi-surface live runtime closure: PASS"
