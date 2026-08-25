param(
  [switch]$Full
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$RuntimeScript = Join-Path $RepoRoot "infra/docker/scripts/runtime.ps1"
$DataScript = Join-Path $RepoRoot "tools/mobile/mobile-dev-data.mjs"
$ArtifactRoot = Join-Path $RepoRoot ".artifacts/local-runtime-repair"

foreach ($requiredPath in @($RuntimeScript, $DataScript)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required governed runtime file not found: $requiredPath"
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory)][string]$Description,
    [Parameter(Mandatory)][scriptblock]$Command
  )

  Write-Host "`n=== $Description ===" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE."
  }
}

function Test-ServiceHealth {
  param(
    [Parameter(Mandatory)][string]$Uri,
    [string[]]$HealthyValues = @("healthy", "HEALTHY", "ready")
  )

  try {
    $response = Invoke-RestMethod -Uri $Uri -TimeoutSec 4 -ErrorAction Stop
    return $HealthyValues -contains [string]$response.status
  } catch {
    return $false
  }
}

function Write-FailureDiagnostics {
  param([Parameter(Mandatory)][string]$Reason)

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $outputDirectory = Join-Path $ArtifactRoot $timestamp
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
  $summaryPath = Join-Path $outputDirectory "summary.txt"

  @(
    "reason=$Reason"
    "timestamp=$([DateTimeOffset]::Now.ToString('O'))"
    "git_sha=$((& git -C $RepoRoot rev-parse HEAD 2>$null) -join '')"
  ) | Set-Content -LiteralPath $summaryPath -Encoding utf8

  docker ps --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}" 2>&1 |
    Set-Content -LiteralPath (Join-Path $outputDirectory "docker-ps.txt") -Encoding utf8

  foreach ($containerName in @(
    "bthwani-identity-api-runtime",
    "bthwani-workforce-api-runtime",
    "bthwani-dsh-api-runtime",
    "bthwani-wlt-api-runtime",
    "bthwani-postgres-runtime"
  )) {
    docker logs --tail 250 $containerName 2>&1 |
      Set-Content -LiteralPath (Join-Path $outputDirectory "$containerName.log") -Encoding utf8
  }

  Write-Warning "Runtime diagnostics written to $outputDirectory"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker was not found. Start Docker Desktop and retry."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js was not found."
}
if (-not (Get-Command pwsh -ErrorAction SilentlyContinue)) {
  throw "PowerShell 7 (pwsh) was not found."
}

Push-Location -LiteralPath $RepoRoot
try {
  try {
    if ($Full) {
      Invoke-Checked -Description "full governed development bootstrap" -Command {
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimeScript `
          -Action bootstrap-dev -Profiles "identity,workforce,dsh,wlt,media-storage" -Force
      }
    } else {
      Invoke-Checked -Description "rebuild current Identity and Workforce services" -Command {
        & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimeScript `
          -Action up -Profiles "identity,workforce"
      }

      $dshHealthy = Test-ServiceHealth -Uri "http://127.0.0.1:18080/dsh/health"
      $wltHealthy = Test-ServiceHealth -Uri "http://127.0.0.1:18083/wlt/health"
      if (-not $dshHealthy -or -not $wltHealthy) {
        Invoke-Checked -Description "restore unhealthy DSH/WLT dependencies" -Command {
          & pwsh -NoProfile -ExecutionPolicy Bypass -File $RuntimeScript `
            -Action up -Profiles "identity,dsh,wlt,media-storage"
        }
      }

      Invoke-Checked -Description "repair governed mobile development data" -Command {
        & node $DataScript --repair
      }
    }

    Invoke-Checked -Description "verify all mobile development surfaces" -Command {
      & node $DataScript --check
    }

    $healthChecks = @(
  @{ Name = "Identity"; Uri = "http://127.0.0.1:18082/identity/health" },
      @{ Name = "Workforce"; Uri = "http://127.0.0.1:18086/workforce/health" },
      @{ Name = "DSH"; Uri = "http://127.0.0.1:18080/dsh/health" },
      @{ Name = "WLT"; Uri = "http://127.0.0.1:18083/wlt/health" }
    )
    foreach ($check in $healthChecks) {
      if (-not (Test-ServiceHealth -Uri $check.Uri)) {
        throw "$($check.Name) health check failed: $($check.Uri)"
      }
    }

    Write-Host "`nLocal mobile full-stack repair: PASS" -ForegroundColor Green
  } catch {
    Write-FailureDiagnostics -Reason $_.Exception.Message
    throw
  }
} finally {
  Pop-Location
}
