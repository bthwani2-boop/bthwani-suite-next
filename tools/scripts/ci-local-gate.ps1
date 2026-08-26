#requires -Version 7.2
[CmdletBinding()]
param(
  [string]$Remote = "origin",
  [string]$DefaultBranch = "master",
  [switch]$SkipRuntime
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Stage([string]$Message) {
  Write-Host ""
  Write-Host "==> LOCAL CI: $Message" -ForegroundColor Cyan
}

function Run {
  $File = $args[0]
  $rest = @(if ($args.Count -gt 1) { $args[1..($args.Count - 1)] } else { @() })
  & $File @rest
  if ($LASTEXITCODE -ne 0) { throw "FAILED: $File $($rest -join ' ')" }
}

function Text {
  $v = & $args[0] @($args | Select-Object -Skip 1)
  if ($LASTEXITCODE -ne 0) { throw "FAILED: $($args -join ' ')" }
  (($v | Out-String).Trim())
}

$root = Text git rev-parse --show-toplevel
Set-Location $root

$status = Text git status --porcelain
if ($status) {
  throw "ci:local is a coherent-candidate pre-push gate and requires a clean committed worktree.`n$status"
}

Stage "Resolve exact local candidate"
Run git fetch $Remote $DefaultBranch --no-tags
$baseSha = Text git rev-parse "$Remote/$DefaultBranch"
$headSha = Text git rev-parse HEAD
if ($baseSha -eq $headSha) { throw "HEAD equals $Remote/$DefaultBranch; there is no candidate delta." }

Write-Host "Base: $baseSha"
Write-Host "Head: $headSha"

Stage "Repository/router self-tests"
Run git diff --check $baseSha $headSha
Run node --test tools/scripts/detect-ci-context.test.mjs
Run node --test tools/scripts/ci-routing.test.mjs
Run node --test tools/scripts/ci-runtime-bootstrap-policy.test.mjs
Run node --test tools/scripts/run-affected-verification.test.mjs

$old = @{
  CI_BASE_SHA = $env:CI_BASE_SHA
  CI_HEAD_SHA = $env:CI_HEAD_SHA
  CI_MODE = $env:CI_MODE
  CI_EXECUTION_PHASE = $env:CI_EXECUTION_PHASE
  NX_BASE = $env:NX_BASE
  NX_HEAD = $env:NX_HEAD
}
try {
  $env:CI_BASE_SHA = $baseSha
  $env:CI_HEAD_SHA = $headSha
  $env:CI_MODE = "affected"
  $env:CI_EXECUTION_PHASE = "pr"
  $env:NX_BASE = $baseSha
  $env:NX_HEAD = $headSha

  Stage "Resolve affected local scope"
  $json = (node tools/scripts/detect-ci-context.mjs | Out-String)
  if ($LASTEXITCODE -ne 0) { throw "detect-ci-context.mjs failed" }
  $scope = $json | ConvertFrom-Json
  $scope | ConvertTo-Json -Depth 8

  if ($scope.diagnostics_required -eq $true) {
    Stage "Contract diagnostics"
    Run pnpm exec nx run contracts:materialize
    Run pnpm run contracts:lint

    $guardTests = @(Get-ChildItem -LiteralPath "tools\guards" -Filter "*.test.mjs" -File)
    foreach ($test in $guardTests) {
      Run node --test $test.FullName
    }

    Run node tools/scripts/run-guard-suite.mjs --concurrency 2 `
      tools/guards/no-broken-imports.mjs `
      tools/guards/api-binding-gate.mjs `
      tools/guards/backend-api-binding-gate.mjs `
      tools/guards/generated-client-provenance-gate.mjs `
      tools/guards/contract-scope-binding-gate.mjs `
      tools/guards/runtime-real-bindings-gate.mjs
  }

  if ($scope.verification_required -eq $true) {
    Stage "Affected Node verification"
    $targets = @("typecheck", "lint", "test")
    # Build stays local during development and returns remotely in exact full closure.
    if ($scope.verification_tier -ne "fast") { $targets += "build" }
    & node tools/scripts/run-affected-verification.mjs @targets
    if ($LASTEXITCODE -ne 0) { throw "Affected Node verification failed" }

    if ($scope.frontend -eq $true -and $scope.verification_tier -eq "deep") {
      Stage "Expo configuration"
      Run pnpm run mobile:expo:verify
    }
  }

  $goTargets = [ordered]@{
    dsh       = "services/dsh/backend"
    wlt       = "services/wlt/backend"
    identity  = "core/identity/backend"
    workforce = "core/workforce/backend"
    platform  = "core/platform-control/backend"
    providers = "core/providers/backend"
  }
  foreach ($entry in $goTargets.GetEnumerator()) {
    if ($scope.($entry.Key) -eq $true) {
      Stage "Affected Go verification: $($entry.Key)"
      Push-Location $entry.Value
      try {
        Run go test ./...
        Run go build ./...
      } finally {
        Pop-Location
      }
    }
  }

  if (-not $SkipRuntime -and $scope.runtime_profile -and $scope.runtime_profile -ne "none") {
    Stage "Routed local Runtime proof: $($scope.runtime_profile)"
    $profile = [string]$scope.runtime_profile
    $profiles = switch ($profile) {
      "identity-security" { "identity,workforce,dsh,wlt,media-storage" }
      "dsh"               { "dsh,media-storage" }
      "workforce"         { "identity,workforce" }
      "wlt-finance"       { "identity,workforce,dsh,wlt,financial-simulators" }
      "provider"           { "wlt,financial-simulators" }
      "full"               { "identity,workforce,dsh,wlt,providers,platform,financial-simulators,mail,media-storage" }
      "mobile-config"      { "" }
      "mobile-native"      { "" }
      default              { throw "Unsupported runtime profile: $profile" }
    }

    try {
      if ($profile -eq "mobile-config") {
        Run pnpm run mobile:apps:check
        Run pnpm run mobile:expo:verify
      }
      elseif ($profile -eq "mobile-native") {
        Run pnpm run mobile:apps:check
        Run pnpm run mobile:expo:verify
        Run node tools/mobile/verify-mobile-native.mjs --platform android
      }
      else {
        $parts = @($profiles.Split(",") | ForEach-Object { $_.Trim() })
        if ($parts -contains "dsh") {
          Run pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/invoke-runtime-phase.ps1 `
            -Action bootstrap-dev -Profiles $profiles -Force
        } else {
          Run pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/invoke-runtime-phase.ps1 `
            -Action up -Profiles $profiles
        }

        Run pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/invoke-runtime-phase.ps1 `
          -Action catalog-readback -Profiles $profiles

        # Local gate uses the routed smoke profile. The expensive project-wide
        # integration battery is authoritative in exact Final Closure.
        Run pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/invoke-runtime-phase.ps1 `
          -Action smoke -Profiles $profiles

        if ($profile -in @("wlt-finance", "full")) {
          Run pwsh -NoProfile -ExecutionPolicy Bypass -File `
            tools/scripts/finance/smoke-dsh-wlt-representative-readback.ps1
        }
      }
    }
    finally {
      if ($profiles) {
        & pwsh -NoProfile -ExecutionPolicy Bypass -File infra/docker/scripts/runtime.ps1 `
          -Action down -Profiles $profiles
        if ($LASTEXITCODE -ne 0) {
          Write-Warning "Runtime cleanup returned exit code $LASTEXITCODE"
        }
      }
    }
  }
  elseif ($SkipRuntime -and $scope.runtime_profile -ne "none") {
    Write-Warning "Runtime profile '$($scope.runtime_profile)' was intentionally skipped locally. Final Closure remains authoritative."
  }

  Stage "Local candidate PASS"
  Write-Host "LOCAL_CANDIDATE_PASS head=$headSha base=$baseSha tier=$($scope.verification_tier) runtime=$($scope.runtime_profile)" -ForegroundColor Green
}
finally {
  foreach ($key in $old.Keys) {
    Set-Item -Path "Env:$key" -Value $old[$key]
  }
}
