$ErrorActionPreference = "Stop"

$ForwardedArgs = @($args)
$Target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\tools\scripts\invoke-runtime-phase.ps1')).Path
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ComposeFile = Join-Path $RepoRoot 'infra\docker\compose.runtime.yml'
$EnvFile = Join-Path $RepoRoot 'infra\docker\env\runtime.env.example'
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

function Repair-IdentityRuntimeOwnership {
  foreach ($requiredPath in @($script:ComposeFile, $script:EnvFile)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
      throw "Identity ownership repair prerequisite is missing: $requiredPath"
    }
  }

  $composeArgs = @('--env-file', $script:EnvFile, '-f', $script:ComposeFile)

  $roleExists = docker compose @composeArgs exec -T postgres `
    psql -U bthwani_runtime -d bthwani_runtime -tAc `
    "SELECT 1 FROM pg_roles WHERE rolname = 'identity_runtime';" 2>$null
  if ($LASTEXITCODE -ne 0 -or (($roleExists -join '').Trim()) -ne '1') {
    throw "Identity ownership repair cannot continue because role identity_runtime is unavailable."
  }

  $databaseExists = docker compose @composeArgs exec -T postgres `
    psql -U bthwani_runtime -d bthwani_runtime -tAc `
    "SELECT 1 FROM pg_database WHERE datname = 'identity_runtime';" 2>$null
  if ($LASTEXITCODE -ne 0 -or (($databaseExists -join '').Trim()) -ne '1') {
    throw "Identity ownership repair cannot continue because database identity_runtime is unavailable."
  }

  Write-Warning "Repairing persisted Identity schema ownership without deleting the PostgreSQL volume."

  @"
ALTER DATABASE identity_runtime OWNER TO identity_runtime;
REASSIGN OWNED BY bthwani_runtime TO identity_runtime;
ALTER SCHEMA public OWNER TO identity_runtime;
GRANT ALL ON SCHEMA public TO identity_runtime;
"@ | docker compose @composeArgs exec -T postgres `
    psql -U bthwani_runtime -d identity_runtime -v ON_ERROR_STOP=1

  if ($LASTEXITCODE -ne 0) {
    throw "Identity ownership repair SQL failed with exit code $LASTEXITCODE."
  }

  $remaining = docker compose @composeArgs exec -T postgres `
    psql -U bthwani_runtime -d identity_runtime -tAc `
    "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_roles r ON r.oid = c.relowner WHERE n.nspname = 'public' AND c.relkind IN ('r','p','S','v','m','f') AND r.rolname <> 'identity_runtime';"
  if ($LASTEXITCODE -ne 0) {
    throw "Identity ownership verification query failed with exit code $LASTEXITCODE."
  }
  if (($remaining -join '').Trim() -ne '0') {
    throw "Identity ownership repair left non-identity-owned public relations: $(($remaining -join '').Trim())."
  }

  Write-Host "Identity persisted schema ownership repair: PASS"
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

$identityOwnershipRepaired = $false
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
  $identityOwnershipFailure =
    $logText -match 'Identity migration failed' -and
    $logText -match 'must be owner of (table|relation|sequence|schema|function|type)'
  if ($identityOwnershipFailure -and -not $identityOwnershipRepaired) {
    try {
      Repair-IdentityRuntimeOwnership
      $identityOwnershipRepaired = $true
      Write-Host "Retrying runtime phase '$action' after Identity ownership repair."
      continue
    } catch {
      Write-Error "Automatic Identity ownership repair failed: $($_.Exception.Message)"
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
