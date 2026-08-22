<#
.SYNOPSIS
  Converges and verifies the canonical local runtime used by all four mobile apps.

.DESCRIPTION
  This command deliberately contains no direct business-data SQL, no migration
  ledger edits, no fake actors, and no bypasses. It delegates every mutation to
  the repository's governed authorities:

    - migration manifest guard
    - Identity local bootstrap
    - Workforce governed provisioning
    - DSH/WLT governed migration and seed runners
    - mobile-dev-data convergence
    - catalog/runtime/database verification

  The runtime is restarted without deleting volumes so the canonical Identity
  bootstrap executes against the actual persisted local state. If convergence
  fails, the script stops at the real failing authority and preserves a log.
#>

[CmdletBinding()]
param(
  [switch]$DiagnoseOnly,
  [switch]$SkipDeepTests
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$RuntimePhase = Join-Path $RepoRoot "tools/scripts/invoke-runtime-phase.ps1"
$VerifyScript = Join-Path $RepoRoot "tools/scripts/verify-mobile-dev-runtime.ps1"
$MigrationGuard = Join-Path $RepoRoot "tools/guards/migration-manifest-drift-gate.mjs"
$Profiles = "identity,workforce,dsh,wlt,media-storage"
$ArtifactRoot = Join-Path $RepoRoot ".artifacts/diagnostics"
$LogPath = Join-Path $ArtifactRoot ("mobile-runtime-root-repair-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

foreach ($required in @($RuntimeScript, $RuntimePhase, $VerifyScript, $MigrationGuard)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "Required canonical authority not found: $required"
  }
}

if (([string]$env:NODE_ENV).Trim().ToLowerInvariant() -eq "production" -or
    ([string]$env:ENVIRONMENT).Trim().ToLowerInvariant() -eq "production" -or
    ([string]$env:BTHWANI_PRODUCTION_DEPLOYMENT_AUTHORIZED).Trim().ToLowerInvariant() -eq "true") {
  throw "Local runtime repair is forbidden for production-authorized environments."
}

foreach ($command in @("git", "docker", "node", "pnpm", "go", "pwsh")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Required command '$command' was not found in PATH."
  }
}

function Invoke-NativeChecked {
  param(
    [Parameter(Mandatory)][string]$Description,
    [Parameter(Mandatory)][string]$FilePath,
    [Parameter(Mandatory)][string[]]$Arguments,
    [string]$WorkingDirectory = $RepoRoot
  )

  Write-Host "`n=== $Description ==="
  Push-Location -LiteralPath $WorkingDirectory
  try {
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Description failed with exit code $LASTEXITCODE."
    }
  } finally {
    Pop-Location
  }
}

New-Item -ItemType Directory -Path $ArtifactRoot -Force | Out-Null
$transcriptStarted = $false

Push-Location -LiteralPath $RepoRoot
try {
  Start-Transcript -Path $LogPath -Force | Out-Null
  $transcriptStarted = $true

  $branch = (& git branch --show-current).Trim()
  $commit = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($commit)) {
    throw "Unable to resolve current repository commit."
  }

  Write-Host "=== BThwani canonical mobile runtime root repair ==="
  Write-Host "branch: $branch"
  Write-Host "commit: $commit"
  Write-Host "profiles: $Profiles"
  Write-Host "database volumes: preserved"
  Write-Host "direct SQL repair: forbidden"

  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop is not reachable."
  }

  # Structural correctness comes first. A broken migration authority must never
  # be worked around by mutating schema_migrations or application data.
  Invoke-NativeChecked `
    -Description "migration manifest authority" `
    -FilePath "node" `
    -Arguments @($MigrationGuard)

  # Validate the Identity source that owns credential/bootstrap convergence
  # before using it to mutate the persisted local development state.
  Invoke-NativeChecked `
    -Description "Identity unit and contract tests" `
    -FilePath "go" `
    -Arguments @("test", "./...", "-count=1") `
    -WorkingDirectory (Join-Path $RepoRoot "core/identity/backend")

  if ($DiagnoseOnly) {
    Invoke-NativeChecked `
      -Description "read-only mobile runtime verification" `
      -FilePath "pwsh" `
      -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $VerifyScript, "-SkipRuntimeSmoke")
    Write-Host "`nDiagnosis: PASS"
    Write-Host "log: $LogPath"
    return
  }

  # Explicit restart is non-destructive and is required for the current persisted
  # Identity state to pass through the newly corrected startup convergence path.
  # Volumes are preserved; this is not runtime:reset.
  Invoke-NativeChecked `
    -Description "stop selected canonical runtime services" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimeScript,
      "-Action", "down", "-Profiles", $Profiles
    )

  # bootstrap-dev is the sole mutation authority. It applies governed migrations,
  # starts/rebuilds services, provisions Workforce actors through Identity,
  # applies governed DSH/WLT local seeds, and executes mobile data convergence.
  Invoke-NativeChecked `
    -Description "canonical full mobile bootstrap" `
    -FilePath "pwsh" `
    -Arguments @(
      "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $RuntimePhase,
      "-Action", "bootstrap-dev", "-Profiles", $Profiles, "-Force"
    )

  Invoke-NativeChecked `
    -Description "cross-surface mobile runtime verification" `
    -FilePath "pwsh" `
    -Arguments @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $VerifyScript)

  if (-not $SkipDeepTests) {
    Invoke-NativeChecked `
      -Description "DSH governed database tests" `
      -FilePath "pnpm" `
      -Arguments @("run", "database:dsh:test")

    Invoke-NativeChecked `
      -Description "WLT service tests" `
      -FilePath "pnpm" `
      -Arguments @("--dir", "services/wlt", "test")
  }

  Write-Host "`nCanonical mobile runtime root repair: PASS"
  Write-Host "All client/partner/field/captain readiness checks completed through governed paths."
  Write-Host "log: $LogPath"
} catch {
  Write-Host "`nCanonical mobile runtime root repair: FAIL"
  Write-Host $_.Exception.Message
  Write-Host "log: $LogPath"
  throw
} finally {
  if ($transcriptStarted) {
    try { Stop-Transcript | Out-Null } catch { }
  }
  Pop-Location
}
