$ErrorActionPreference = "Stop"

$ForwardedArgs = @($args)
$Target = (Resolve-Path (Join-Path $PSScriptRoot '..\..\tools\scripts\invoke-runtime-phase.ps1')).Path
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ComposeFile = Join-Path $RepoRoot 'infra\docker\compose.runtime.yml'
$EnvFile = Join-Path $RepoRoot 'infra\docker\env\runtime.env.example'

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
  & pwsh -NoProfile -ExecutionPolicy Bypass -File $script:Target @script:ForwardedArgs
  return [int]$LASTEXITCODE
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

$exitCode = Invoke-RuntimePhaseChild
if ($exitCode -eq 0) {
  exit 0
}

$action = Get-ForwardedArgumentValue -Name '-Action' -Default 'up'
$logRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
$logPath = Join-Path $logRoot "bthwani-runtime-$action.log"
$logText = if (Test-Path -LiteralPath $logPath -PathType Leaf) {
  Get-Content -LiteralPath $logPath -Raw
} else {
  ""
}

$identityOwnershipFailure =
  $logText -match 'Identity migration failed' -and
  $logText -match 'must be owner of (table|relation|sequence|schema|function|type)'

if (-not $identityOwnershipFailure) {
  exit $exitCode
}

try {
  Repair-IdentityRuntimeOwnership
} catch {
  Write-Error "Automatic Identity ownership repair failed: $($_.Exception.Message)"
  exit $exitCode
}

Write-Host "Retrying runtime phase '$action' once after Identity ownership repair."
exit (Invoke-RuntimePhaseChild)
