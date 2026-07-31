param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
$DshOutboxMigration = Join-Path $RepoRoot "services/dsh/database/migrations/dsh-024_wlt_delivery_outbox.sql"

foreach ($requiredPath in @($ComposeFile, $EnvFile, $DshOutboxMigration)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required local database convergence file not found: $requiredPath"
  }
}

if ($env:NODE_ENV -eq "production" -or $env:ENVIRONMENT -eq "production") {
  throw "Local runtime database convergence is forbidden in production."
}

$composeArgs = @("--env-file", $EnvFile, "-f", $ComposeFile)

docker compose @composeArgs up -d postgres
if ($LASTEXITCODE -ne 0) {
  throw "Could not start the local PostgreSQL runtime."
}

$postgresReady = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  docker compose @composeArgs exec -T postgres pg_isready -U bthwani_runtime -d bthwani_runtime 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $postgresReady = $true
    break
  }
  Start-Sleep -Seconds 2
}
if (-not $postgresReady) {
  throw "Local PostgreSQL runtime did not become ready for database convergence."
}

function Invoke-AdminSql {
  param(
    [Parameter(Mandatory)][string]$Database,
    [Parameter(Mandatory)][string]$Sql
  )

  $Sql | docker compose @composeArgs exec -T postgres `
    psql -U bthwani_runtime -d $Database -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "Local database ownership convergence failed for $Database."
  }
}

function Invoke-ServiceSql {
  param(
    [Parameter(Mandatory)][string]$Database,
    [Parameter(Mandatory)][string]$Role,
    [Parameter(Mandatory)][string]$Sql
  )

  $Sql | docker compose @composeArgs exec -T postgres `
    psql -U $Role -d $Database -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) {
    throw "Local database state convergence failed for $Database as $Role."
  }
}

$databaseOwners = [ordered]@{
  identity_runtime  = "identity_runtime"
  workforce_runtime = "workforce_runtime"
  dsh_runtime       = "dsh_runtime"
  wlt_runtime       = "wlt_runtime"
}

foreach ($entry in $databaseOwners.GetEnumerator()) {
  $database = $entry.Key
  $role = $entry.Value
  Invoke-AdminSql -Database $database -Sql @"
ALTER DATABASE $database OWNER TO $role;
ALTER SCHEMA public OWNER TO $role;
REASSIGN OWNED BY bthwani_runtime TO $role;
GRANT ALL ON SCHEMA public TO $role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO $role;
"@
}

$dshOutboxChecksum = (Get-FileHash -LiteralPath $DshOutboxMigration -Algorithm SHA256).Hash.ToLowerInvariant()
Invoke-ServiceSql -Database "dsh_runtime" -Role "dsh_runtime" -Sql @"
CREATE TABLE IF NOT EXISTS runtime_schema_migrations (
  migration_name TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO `$migration_repair`$
BEGIN
  IF to_regclass('public.idx_dsh_wlt_outbox_events_pending') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_index
       WHERE indexrelid = to_regclass('public.idx_dsh_wlt_outbox_events_pending')
         AND indrelid = to_regclass('public.dsh_wlt_outbox_events')
         AND indisvalid
         AND indisready
     ) THEN
    EXECUTE 'DROP INDEX public.idx_dsh_wlt_outbox_events_pending';
  END IF;

  IF to_regclass('public.dsh_wlt_outbox_events') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM pg_index
       WHERE indexrelid = to_regclass('public.idx_dsh_wlt_outbox_events_pending')
         AND indrelid = to_regclass('public.dsh_wlt_outbox_events')
         AND indisvalid
         AND indisready
     ) THEN
    INSERT INTO runtime_schema_migrations (migration_name, checksum)
    VALUES ('dsh-024_wlt_delivery_outbox.sql', '$dshOutboxChecksum')
    ON CONFLICT (migration_name) DO NOTHING;
  END IF;
END
`$migration_repair`$;
"@

Write-Host "Local runtime database ownership and migration ledger convergence: PASS"
