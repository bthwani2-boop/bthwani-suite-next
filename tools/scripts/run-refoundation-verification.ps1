[CmdletBinding()]
param(
  [ValidateSet("Doctor", "Static", "Full", "Runtime")]
  [string]$Mode = "Static"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $RepoRoot

function Assert-Command {
  param([Parameter(Mandatory)][string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command is unavailable: $Name"
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory)][string]$Name,
    [Parameter(Mandatory)][string]$Command,
    [Parameter(Mandatory)][AllowEmptyCollection()][string[]]$Arguments
  )

  Write-Host "`n== $Name ==" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  & $Command @Arguments
  $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
  if ($exitCode -ne 0) {
    throw "$Name failed with exit code $exitCode: $Command $($Arguments -join ' ')"
  }
}

function Invoke-BestEffortRuntimeDown {
  Write-Host "`n== Stop full Docker runtime without deleting volumes ==" -ForegroundColor Cyan
  $global:LASTEXITCODE = 0
  & pnpm runtime:full:down
  $exitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { [int]$global:LASTEXITCODE }
  if ($exitCode -ne 0) {
    Write-Warning "Runtime cleanup returned exit code $exitCode. No reset or volume deletion was attempted."
  }
}

function Get-TrackedStatus {
  $global:LASTEXITCODE = 0
  $status = (& git status --porcelain=v1 --untracked-files=no 2>&1 | ForEach-Object { [string]$_ }) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw "Unable to read tracked Git status." }
  return $status.Trim()
}

function Invoke-StaticVerification {
  Invoke-Checked -Name "Foundation gate" -Command "pnpm" -Arguments @("foundation:gate")
}

function Invoke-FullVerification {
  $beforeStatus = Get-TrackedStatus

  Invoke-Checked -Name "Full foundation gate" -Command "pnpm" -Arguments @("foundation:gate", "--", "-Full")
  Invoke-Checked -Name "Mobile manifest synchronization check" -Command "pnpm" -Arguments @("mobile:apps:check")
  Invoke-Checked -Name "Expo configuration verification" -Command "pnpm" -Arguments @("mobile:expo:verify")
  Invoke-Checked -Name "OpenAPI contract lint" -Command "pnpm" -Arguments @("contracts:lint")
  Invoke-Checked -Name "DSH OpenAPI non-mutating verification" -Command "pnpm" -Arguments @("openapi:verify:dsh")
  Invoke-Checked -Name "API binding verification" -Command "pnpm" -Arguments @("guard:api-binding")
  Invoke-Checked -Name "Backend API binding verification" -Command "pnpm" -Arguments @("guard:backend-api-binding")
  Invoke-Checked -Name "Workflow syntax verification" -Command "pnpm" -Arguments @("guard:workflow-lint")
  Invoke-Checked -Name "Workflow security verification" -Command "pnpm" -Arguments @("guard:workflow-security")
  Invoke-Checked -Name "Immutable Actions pin verification" -Command "pnpm" -Arguments @("guard:actions-pin")
  Invoke-Checked -Name "Secret scanning" -Command "pnpm" -Arguments @("guard:secrets")
  Invoke-Checked -Name "Final diff whitespace verification" -Command "git" -Arguments @("--no-pager", "diff", "--check")

  $afterStatus = Get-TrackedStatus
  if ($afterStatus -ne $beforeStatus) {
    throw "Verification changed tracked source. Before:`n$beforeStatus`nAfter:`n$afterStatus"
  }
}

function Invoke-Doctor {
  foreach ($commandName in @("git", "node", "pnpm", "pwsh", "docker")) {
    Assert-Command -Name $commandName
  }

  Invoke-Checked -Name "Git version" -Command "git" -Arguments @("--version")
  Invoke-Checked -Name "Node version" -Command "node" -Arguments @("--version")
  Invoke-Checked -Name "pnpm version" -Command "pnpm" -Arguments @("--version")
  Invoke-Checked -Name "PowerShell version" -Command "pwsh" -Arguments @("-NoProfile", "-Command", '$PSVersionTable.PSVersion.ToString()')
  Invoke-Checked -Name "Docker client version" -Command "docker" -Arguments @("version", "--format", "{{.Client.Version}}")
  Invoke-Checked -Name "Refoundation control plane" -Command "node" -Arguments @("tools/scripts/check-refoundation-control-plane.mjs")
  Invoke-Checked -Name "Protected foundation" -Command "node" -Arguments @("tools/scripts/check-refoundation-foundation.mjs")
  Invoke-Checked -Name "Mobile manifest" -Command "pnpm" -Arguments @("mobile:apps:check")
  Invoke-Checked -Name "Expo configuration" -Command "pnpm" -Arguments @("mobile:expo:verify")
  Invoke-Checked -Name "Docker context status" -Command "pnpm" -Arguments @("runtime:context:status")
}

foreach ($commandName in @("git", "node", "pnpm", "pwsh")) {
  Assert-Command -Name $commandName
}

switch ($Mode) {
  "Doctor" {
    Invoke-Doctor
  }
  "Static" {
    Invoke-StaticVerification
  }
  "Full" {
    Invoke-FullVerification
  }
  "Runtime" {
    Assert-Command -Name "docker"
    Invoke-FullVerification
    $runtimeAttempted = $false
    try {
      $runtimeAttempted = $true
      Invoke-Checked -Name "Start full Docker runtime" -Command "pnpm" -Arguments @("runtime:full:up")
      Invoke-Checked -Name "Full Docker runtime smoke" -Command "pnpm" -Arguments @("runtime:full:smoke")
    }
    finally {
      if ($runtimeAttempted) {
        Invoke-BestEffortRuntimeDown
      }
    }
  }
}

Write-Host "`nRESULT: PASS scope=refoundation mode=$Mode" -ForegroundColor Green
Write-Host "This result is scoped evidence only and does not authorize product journeys or final closure." -ForegroundColor Yellow
