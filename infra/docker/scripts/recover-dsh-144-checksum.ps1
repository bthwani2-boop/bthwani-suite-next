[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-f0-9]{40}$')]
  [string]$SourceCommitSha,
  [string]$ComposeFile = "",
  [string]$EnvFile = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "../../../")).Path
if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
  $ComposeFile = Join-Path $RepoRoot "infra/docker/compose.runtime.yml"
}
if ([string]::IsNullOrWhiteSpace($EnvFile)) {
  $EnvFile = Join-Path $RepoRoot "infra/docker/env/runtime.env.example"
}
if (-not (Test-Path -LiteralPath $ComposeFile -PathType Leaf)) {
  throw "Compose file not found: $ComposeFile"
}
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
  throw "Runtime env file not found: $EnvFile"
}

function ConvertTo-RecoverySqlLiteral {
  param([Parameter(Mandatory = $true)][AllowEmptyString()][string]$Value)
  return "'" + $Value.Replace("'", "''") + "'"
}

$sourceCommitLiteral = ConvertTo-RecoverySqlLiteral $SourceCommitSha
$sql = @'
\set ON_ERROR_STOP on
BEGIN;

CREATE TABLE IF NOT EXISTS public.schema_migration_recoveries (
  service_name               TEXT        NOT NULL,
  migration_id               TEXT        NOT NULL,
  previous_checksum_sha256    TEXT        NOT NULL,
  canonical_checksum_sha256   TEXT        NOT NULL,
  recovery_source_commit_sha  TEXT        NOT NULL,
  recovery_reason             TEXT        NOT NULL,
  recovered_at                TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (service_name, migration_id, previous_checksum_sha256, canonical_checksum_sha256)
);

DO $bthwani$
DECLARE
  current_checksum TEXT;
  current_success  BOOLEAN;
  current_dirty    BOOLEAN;
BEGIN
  IF to_regclass('public.schema_migrations') IS NULL THEN
    RETURN;
  END IF;

  SELECT checksum_sha256, success, dirty
    INTO current_checksum, current_success, current_dirty
  FROM public.schema_migrations
  WHERE service_name = 'dsh'
    AND migration_id = 'dsh-144_order_returns_saga.sql'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF current_checksum = '13947a2eb899a58c72b6875ab8425c6271249127018aa73834e2930d0e26961b' THEN
    RETURN;
  END IF;

  IF current_checksum <> '382d928f0ac14beae4309786ee9a92b6b947e1e4e1ad4d61d5a02489a7021ed7' THEN
    RAISE EXCEPTION
      'DSH_144_CHECKSUM_RECOVERY_REFUSED: unexpected checksum %',
      current_checksum;
  END IF;

  IF NOT current_success OR current_dirty THEN
    RAISE EXCEPTION
      'DSH_144_CHECKSUM_RECOVERY_REFUSED: migration is not clean success=% dirty=%',
      current_success, current_dirty;
  END IF;

  IF to_regclass('public.dsh_order_returns') IS NULL
     OR to_regclass('public.dsh_order_return_items') IS NULL
     OR to_regclass('public.dsh_order_return_actions') IS NULL THEN
    RAISE EXCEPTION
      'DSH_144_CHECKSUM_RECOVERY_REFUSED: required return saga tables are missing';
  END IF;

  IF EXISTS (
    WITH expected(table_name, column_name, data_type) AS (
      VALUES
        ('dsh_order_returns', 'id', 'text'),
        ('dsh_order_returns', 'order_id', 'text'),
        ('dsh_order_returns', 'status', 'text'),
        ('dsh_order_returns', 'actor_id', 'text'),
        ('dsh_order_returns', 'actor_role', 'text'),
        ('dsh_order_returns', 'reason_code', 'text'),
        ('dsh_order_returns', 'correlation_id', 'text'),
        ('dsh_order_returns', 'version', 'bigint'),
        ('dsh_order_return_items', 'return_id', 'text'),
        ('dsh_order_return_items', 'order_item_id', 'text'),
        ('dsh_order_return_items', 'quantity', 'bigint'),
        ('dsh_order_return_actions', 'id', 'text'),
        ('dsh_order_return_actions', 'return_id', 'text'),
        ('dsh_order_return_actions', 'actor_id', 'text'),
        ('dsh_order_return_actions', 'action_type', 'text'),
        ('dsh_order_return_actions', 'payload', 'jsonb'),
        ('dsh_order_return_actions', 'idempotency_key', 'text'),
        ('dsh_order_return_actions', 'correlation_id', 'text'),
        ('dsh_order_return_actions', 'status', 'text')
    )
    SELECT 1
    FROM expected
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema = 'public'
     AND actual.table_name = expected.table_name
     AND actual.column_name = expected.column_name
    WHERE actual.column_name IS NULL
       OR actual.data_type <> expected.data_type
  ) THEN
    RAISE EXCEPTION
      'DSH_144_CHECKSUM_RECOVERY_REFUSED: required return saga columns or types do not match';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dsh_order_returns_status_check'
      AND conrelid = 'public.dsh_order_returns'::regclass
      AND contype = 'c'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dsh_order_return_actions_status_check'
      AND conrelid = 'public.dsh_order_return_actions'::regclass
      AND contype = 'c'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'dsh_order_return_actions_action_check'
      AND conrelid = 'public.dsh_order_return_actions'::regclass
      AND contype = 'c'
  ) THEN
    RAISE EXCEPTION
      'DSH_144_CHECKSUM_RECOVERY_REFUSED: required return saga constraints are missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_dsh_order_returns_order_id'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_dsh_order_return_actions_active'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND indexdef ILIKE '%WHERE%'
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_dsh_order_return_actions_idempotency'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
  ) THEN
    RAISE EXCEPTION
      'DSH_144_CHECKSUM_RECOVERY_REFUSED: required return saga indexes are missing';
  END IF;

  INSERT INTO public.schema_migration_recoveries (
    service_name,
    migration_id,
    previous_checksum_sha256,
    canonical_checksum_sha256,
    recovery_source_commit_sha,
    recovery_reason
  ) VALUES (
    'dsh',
    'dsh-144_order_returns_saga.sql',
    current_checksum,
    '13947a2eb899a58c72b6875ab8425c6271249127018aa73834e2930d0e26961b',
    __SOURCE_COMMIT_LITERAL__,
    'Verified pre-release local working-tree checksum drift; reconciled to the governed canonical LF checksum without replaying schema mutations.'
  )
  ON CONFLICT DO NOTHING;

  UPDATE public.schema_migrations
  SET checksum_sha256 = '13947a2eb899a58c72b6875ab8425c6271249127018aa73834e2930d0e26961b'
  WHERE service_name = 'dsh'
    AND migration_id = 'dsh-144_order_returns_saga.sql'
    AND checksum_sha256 = current_checksum
    AND success
    AND NOT dirty;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'DSH_144_CHECKSUM_RECOVERY_REFUSED: ledger row changed during governed recovery';
  END IF;
END
$bthwani$;

COMMIT;
'@
$sql = $sql.Replace('__SOURCE_COMMIT_LITERAL__', $sourceCommitLiteral)

$arguments = @(
  "compose", "--env-file", $EnvFile, "-f", $ComposeFile,
  "exec", "-T", "postgres", "psql",
  "-U", "dsh_runtime", "-d", "dsh_runtime",
  "-X", "-v", "ON_ERROR_STOP=1"
)
$sql | & docker @arguments
if ($LASTEXITCODE -ne 0) {
  throw "Governed DSH-144 checksum recovery failed with exit code $LASTEXITCODE."
}

Write-Host "Governed DSH-144 checksum recovery: PASS"
