$ErrorActionPreference = "Stop"

$ForwardedArgs = @($args)
$Target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\tools\scripts\invoke-runtime-phase.ps1')).Path
$DatabaseConvergenceScript = Join-Path $PSScriptRoot 'converge-local-runtime-database.ps1'
$WltLedgerRepairScript = Join-Path $PSScriptRoot 'repair-wlt-migration-ledger.ps1'

function Get-ForwardedArgumentValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [string]$Default = ""
  )

  for ($i = 0; $i -lt ($script:ForwardedArgs.Count - 1); $i++) {
    if ([string]$script:ForwardedArgs[$i] -ieq $Name) {
      return [string]$script:ForwardedArgs[$i + 1]
    }
  }

  return $Default
}

function Invoke-RuntimePhaseChild {
  $invokeArgs = @($script:ForwardedArgs)
  $global:LASTEXITCODE = 0
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $script:Target @invokeArgs
  $childExitCode = $LASTEXITCODE
  return [int]$childExitCode
}

function Get-RuntimeFailureLog {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    return Get-Content -LiteralPath $Path -Raw
  }
  return ""
}

function Invoke-LocalDatabaseConvergence {
  if (-not (Test-Path -LiteralPath $script:DatabaseConvergenceScript -PathType Leaf)) {
    throw "Canonical local database convergence script is missing: $script:DatabaseConvergenceScript"
  }

  $global:LASTEXITCODE = 0
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $script:DatabaseConvergenceScript 2>&1 | Out-Host
  $convergenceExitCode = [int]$LASTEXITCODE
  if ($convergenceExitCode -ne 0) {
    throw "Canonical local database convergence failed with exit code $convergenceExitCode."
  }
}

function Repair-WltRuntimeMigrationLedger {
  if (-not (Test-Path -LiteralPath $script:WltLedgerRepairScript -PathType Leaf)) {
    throw "WLT migration-ledger repair script is missing: $script:WltLedgerRepairScript"
  }

  $global:LASTEXITCODE = 0
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $script:WltLedgerRepairScript 2>&1 | Out-Host
  $repairExitCode = [int]$LASTEXITCODE
  if ($repairExitCode -eq 0) {
    return $true
  }
  if ($repairExitCode -eq 2) {
    return $false
  }
  throw "WLT migration-ledger repair failed with exit code $repairExitCode."
}

$action = Get-ForwardedArgumentValue -Name '-Action' -Default 'up'
$logRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$logPath = Join-Path $logRoot "bthwani-runtime-$action.log"

$databaseConvergenceAttempted = $false
$wltLedgerRepairAttempted = $false
$catalogRaceRetries = 0
$maxAttempts = 6
$lastExitCode = 1

for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
  $lastExitCode = Invoke-RuntimePhaseChild
  if ($lastExitCode -eq 0) {
    exit 0
  }

  $logText = Get-RuntimeFailureLog -Path $logPath
  $serviceOwnershipFailure =
    $logText -match '(Identity|Workforce|DSH|WLT) migration failed' -and
    $logText -match 'must be owner of (table|relation|sequence|schema|function|type)'
  if ($serviceOwnershipFailure -and -not $databaseConvergenceAttempted) {
    try {
      Invoke-LocalDatabaseConvergence
      $databaseConvergenceAttempted = $true
      Write-Host "Retrying runtime phase '$action' after canonical local database ownership convergence."
      continue
    } catch {
      Write-Error "Automatic local database ownership convergence failed: $($_.Exception.Message)"
      exit $lastExitCode
    }
  }

  $wltMigrationFailure = $logText -match 'WLT migration failed for '
  if ($wltMigrationFailure -and -not $wltLedgerRepairAttempted) {
    $wltLedgerRepairAttempted = $true
    try {
      if (Repair-WltRuntimeMigrationLedger) {
        Write-Host "Retrying runtime phase '$action' after verified WLT migration-ledger convergence."
        continue
      }
    } catch {
      Write-Error "Automatic WLT migration-ledger repair failed: $($_.Exception.Message)"
      exit $lastExitCode
    }
  }

  $postgresCatalogRace =
    $logText -match 'duplicate key value violates unique constraint "pg_class_relname_nsp_index"' -or
    ($logText -match 'pg_class_relname_nsp_index' -and $logText -match 'already exists')
  if ($postgresCatalogRace -and $catalogRaceRetries -lt 2) {
    $catalogRaceRetries++
    $delaySeconds = 2 * $catalogRaceRetries
    Write-Warning "Detected a transient PostgreSQL catalog race while creating an idempotent relation. Retrying in $delaySeconds second(s)."
    Start-Sleep -Seconds $delaySeconds
    continue
  }

  exit $lastExitCode
}

Write-Error "Runtime phase '$action' exhausted $maxAttempts guarded attempts."
exit $lastExitCode
