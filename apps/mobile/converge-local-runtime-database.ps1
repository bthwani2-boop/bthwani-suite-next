param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path
$ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
$EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"

foreach ($requiredPath in @($ComposeFile, $EnvFile)) {
  if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
    throw "Required local database convergence file not found: $requiredPath"
  }
}

if ($env:NODE_ENV -eq "production" -or $env:ENVIRONMENT -eq "production") {
  throw "Local runtime database convergence is forbidden in production."
}

$composeArgs = @("--env-file", $EnvFile, "-f", $ComposeFile)
$legacyOwner = "bthwani_runtime"

docker compose @composeArgs up -d postgres
if ($LASTEXITCODE -ne 0) {
  throw "Could not start the local PostgreSQL runtime."
}

$postgresReady = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  docker compose @composeArgs exec -T postgres pg_isready -U $legacyOwner -d $legacyOwner 2>$null | Out-Null
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
    psql -U $legacyOwner -d $Database -v ON_ERROR_STOP=1
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

DO `$ownership_repair`$
DECLARE
  object_record RECORD;
BEGIN
  FOR object_record IN
    SELECT c.relkind, n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND pg_get_userbyid(c.relowner) = '$legacyOwner'
  LOOP
    EXECUTE format(
      'ALTER %s %I.%I OWNER TO %I',
      CASE object_record.relkind
        WHEN 'v' THEN 'VIEW'
        WHEN 'm' THEN 'MATERIALIZED VIEW'
        WHEN 'S' THEN 'SEQUENCE'
        WHEN 'f' THEN 'FOREIGN TABLE'
        ELSE 'TABLE'
      END,
      object_record.nspname,
      object_record.relname,
      '$role'
    );
  END LOOP;

  FOR object_record IN
    SELECT p.oid, p.prokind
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_userbyid(p.proowner) = '$legacyOwner'
  LOOP
    EXECUTE format(
      'ALTER %s %s OWNER TO %I',
      CASE object_record.prokind
        WHEN 'p' THEN 'PROCEDURE'
        WHEN 'a' THEN 'AGGREGATE'
        ELSE 'FUNCTION'
      END,
      object_record.oid::regprocedure,
      '$role'
    );
  END LOOP;
END
`$ownership_repair`$;

GRANT ALL ON SCHEMA public TO $role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO $role;
"@
}

# Repair only the legacy physical state that can prevent the canonical DSH
# migration runner from replaying dsh-024. This script must never create or
# positively record migration-ledger entries; the governed migration runner is
# the sole owner of that truth.
Invoke-ServiceSql -Database "dsh_runtime" -Role "dsh_runtime" -Sql @"
DO `$migration_repair`$
DECLARE
  outbox_table REGCLASS := to_regclass('public.dsh_wlt_outbox_events');
  outbox_index REGCLASS := to_regclass('public.idx_dsh_wlt_outbox_events_pending');
  schema_complete BOOLEAN := FALSE;
  index_complete BOOLEAN := FALSE;
BEGIN
  IF outbox_table IS NOT NULL THEN
    WITH expected_columns(column_name, data_type, is_not_null) AS (
      VALUES
        ('id', 'uuid', TRUE),
        ('event_type', 'text', TRUE),
        ('order_id', 'uuid', TRUE),
        ('captain_id', 'text', TRUE),
        ('partner_id', 'text', TRUE),
        ('checkout_intent_id', 'uuid', TRUE),
        ('status', 'text', TRUE),
        ('attempt_count', 'integer', TRUE),
        ('last_error', 'text', FALSE),
        ('next_retry_at', 'timestamp with time zone', TRUE),
        ('created_at', 'timestamp with time zone', TRUE),
        ('updated_at', 'timestamp with time zone', TRUE)
    )
    SELECT
      NOT EXISTS (
        SELECT 1
        FROM expected_columns expected
        LEFT JOIN pg_attribute attribute
          ON attribute.attrelid = outbox_table
         AND attribute.attname = expected.column_name
         AND attribute.attnum > 0
         AND NOT attribute.attisdropped
        WHERE attribute.attname IS NULL
           OR format_type(attribute.atttypid, attribute.atttypmod) <> expected.data_type
           OR attribute.attnotnull IS DISTINCT FROM expected.is_not_null
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = outbox_table
          AND constraint_record.contype = 'p'
          AND constraint_record.conkey = ARRAY[(
            SELECT attnum::SMALLINT FROM pg_attribute
            WHERE attrelid = outbox_table AND attname = 'id' AND NOT attisdropped
          )]::SMALLINT[]
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = outbox_table
          AND constraint_record.contype = 'u'
          AND constraint_record.conkey = ARRAY[
            (SELECT attnum::SMALLINT FROM pg_attribute WHERE attrelid = outbox_table AND attname = 'order_id' AND NOT attisdropped),
            (SELECT attnum::SMALLINT FROM pg_attribute WHERE attrelid = outbox_table AND attname = 'event_type' AND NOT attisdropped)
          ]::SMALLINT[]
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = outbox_table
          AND constraint_record.contype = 'f'
          AND constraint_record.confrelid = to_regclass('public.dsh_orders')
          AND constraint_record.confdeltype = 'c'
          AND constraint_record.conkey = ARRAY[(
            SELECT attnum::SMALLINT FROM pg_attribute
            WHERE attrelid = outbox_table AND attname = 'order_id' AND NOT attisdropped
          )]::SMALLINT[]
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = outbox_table
          AND constraint_record.contype = 'f'
          AND constraint_record.confrelid = to_regclass('public.dsh_checkout_intents')
          AND constraint_record.conkey = ARRAY[(
            SELECT attnum::SMALLINT FROM pg_attribute
            WHERE attrelid = outbox_table AND attname = 'checkout_intent_id' AND NOT attisdropped
          )]::SMALLINT[]
      )
      AND EXISTS (
        SELECT 1
        FROM pg_constraint constraint_record
        WHERE constraint_record.conrelid = outbox_table
          AND constraint_record.contype = 'c'
          AND position('status' IN lower(pg_get_constraintdef(constraint_record.oid))) > 0
          AND position('pending' IN lower(pg_get_constraintdef(constraint_record.oid))) > 0
          AND position('sent' IN lower(pg_get_constraintdef(constraint_record.oid))) > 0
          AND position('failed' IN lower(pg_get_constraintdef(constraint_record.oid))) > 0
      )
    INTO schema_complete;

    IF NOT schema_complete THEN
      RAISE EXCEPTION 'DSH-024 outbox schema is incomplete or drifted; refusing to repair its migration ledger';
    END IF;
  END IF;

  IF outbox_index IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_index index_record
      WHERE index_record.indexrelid = outbox_index
        AND index_record.indrelid = outbox_table
        AND index_record.indisvalid
        AND index_record.indisready
        AND position('(next_retry_at)' IN lower(pg_get_indexdef(index_record.indexrelid))) > 0
        AND position('status' IN lower(COALESCE(pg_get_expr(index_record.indpred, index_record.indrelid), ''))) > 0
        AND position('pending' IN lower(COALESCE(pg_get_expr(index_record.indpred, index_record.indrelid), ''))) > 0
    ) INTO index_complete;

    IF NOT index_complete THEN
      EXECUTE 'DROP INDEX public.idx_dsh_wlt_outbox_events_pending';
      outbox_index := NULL;
    END IF;
  END IF;

  IF to_regclass('public.runtime_schema_migrations') IS NOT NULL
     AND (outbox_table IS NULL OR NOT index_complete) THEN
    DELETE FROM runtime_schema_migrations
    WHERE migration_name = 'dsh-024_wlt_delivery_outbox.sql';
  END IF;
END
`$migration_repair`$;
"@

Write-Host "Local runtime database ownership and migration precondition convergence: PASS"
