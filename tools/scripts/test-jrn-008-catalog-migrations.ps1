<#
.SYNOPSIS
  Verifies the JRN-008 catalog-governance migrations on a scratch PostgreSQL database.

.DESCRIPTION
  Builds the complete DSH schema once, then replays only the JRN-008 migrations
  multiple times. This proves the journey-owned SQL is recovery-safe without
  turning the journey gate into a retrofit of every historical migration.
  The script also executes a real audited domain update and guarded rollback.
#>

param(
  [ValidateSet("docker", "native")]
  [string]$PsqlMode = "docker"
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "../../")).Path
Set-Location -LiteralPath $RepoRoot

$ComposeFile = "infra/docker/compose.runtime.yml"
$EnvFile = "infra/docker/env/runtime.env.example"
$MigrationDir = "services/dsh/database/migrations"
$AdminUser = "bthwani_runtime"
$AdminDb = "bthwani_runtime"
$TestDb = "dsh_jrn_008_migration_test"
$Jrn008Migrations = @(
  "dsh-930_jrn_008_catalog_slice_closure.sql",
  "dsh-931_jrn_008_assortment_pause_restore.sql",
  "dsh-932_jrn_008_audit_trigger_safety.sql"
)

function Invoke-TestPsql {
  param(
    [string]$Db,
    [string]$Sql = "",
    [string]$File = "",
    [switch]$Scalar
  )
  $flags = @("-v", "ON_ERROR_STOP=1")
  if ($Scalar) { $flags += "-tA" }
  if ($PsqlMode -eq "docker") {
    if ($File -ne "") {
      $out = Get-Content -LiteralPath $File -Raw |
        docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres psql -U $AdminUser -d $Db @flags
    } else {
      $out = $Sql |
        docker compose --env-file $EnvFile -f $ComposeFile exec -T postgres psql -U $AdminUser -d $Db @flags
    }
  } else {
    if (-not $env:PGHOST) { $env:PGHOST = "localhost" }
    if (-not $env:PGPORT) { $env:PGPORT = "5432" }
    if ($File -ne "") {
      $out = psql -U $AdminUser -d $Db @flags -f $File
    } else {
      $out = $Sql | psql -U $AdminUser -d $Db @flags
    }
  }
  if ($LASTEXITCODE -ne 0) {
    $context = if ($File -ne "") { $File } else { ($Sql -split "`n")[0] }
    throw "psql failed (exit $LASTEXITCODE) for: $context"
  }
  return ($out -join "`n").Trim()
}

function Assert-Equal([string]$Actual, [string]$Expected, [string]$Label) {
  if ($Actual -ne $Expected) {
    throw "ASSERT FAILED [$Label]: expected '$Expected' got '$Actual'"
  }
  Write-Host "  ok: $Label = $Expected"
}

Write-Host "=== JRN-008 database verification ==="
Invoke-TestPsql -Db $AdminDb -Sql "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" | Out-Null
Invoke-TestPsql -Db $AdminDb -Sql "CREATE DATABASE $TestDb;" | Out-Null

Write-Host "  applying complete DSH migration chain once"
$allMigrations = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
foreach ($migration in $allMigrations) {
  Write-Host "  migrate: $($migration.Name)"
  Invoke-TestPsql -Db $TestDb -File $migration.FullName | Out-Null
}

for ($pass = 1; $pass -le 2; $pass += 1) {
  Write-Host "  replay JRN-008 pass $pass"
  foreach ($name in $Jrn008Migrations) {
    $file = Join-Path $MigrationDir $name
    Invoke-TestPsql -Db $TestDb -File $file | Out-Null
  }
}

Assert-Equal (Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT (to_regclass('public.dsh_master_product_relationships') IS NOT NULL)::text;") "true" "relationship table"
Assert-Equal (Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT (to_regclass('public.dsh_catalog_entity_audit') IS NOT NULL)::text;") "true" "audit table"
Assert-Equal (Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dsh_store_assortments' AND column_name='paused_until')::text;") "true" "pause expiry column"
Assert-Equal (Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='dsh_store_assortments' AND column_name='available_before_pause')::text;") "true" "pause restore column"
Assert-Equal (Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT (to_regprocedure('dsh_catalog_rollback_audit(text,text,text,text,integer)') IS NOT NULL)::text;") "true" "rollback function"

Write-Host "  exercising audited update and guarded rollback"
Invoke-TestPsql -Db $TestDb -Sql @"
DELETE FROM dsh_catalog_entity_audit WHERE entity_id = 'jrn-008-audit-domain';
DELETE FROM dsh_catalog_domains WHERE id = 'jrn-008-audit-domain';

INSERT INTO dsh_catalog_domains (
  id, slug, name_ar, name_en, icon, sort_order, is_active,
  is_client_visible, requires_product_catalog, is_manual_request
) VALUES (
  'jrn-008-audit-domain', 'jrn-008-audit-domain', 'قبل التعديل',
  'Before update', 'catalog', 9999, TRUE, TRUE, TRUE, FALSE
);

SELECT set_config('bthwani.actor_id', 'operator-jrn-008', TRUE);
SELECT set_config('bthwani.actor_role', 'operator', TRUE);
SELECT set_config('bthwani.change_reason', 'verify audited update', TRUE);
SELECT set_config('bthwani.correlation_id', 'corr-jrn-008-db', TRUE);

UPDATE dsh_catalog_domains
SET name_ar = 'بعد التعديل', version = version + 1, updated_at = NOW()
WHERE id = 'jrn-008-audit-domain';
"@ | Out-Null

$auditId = Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT id FROM dsh_catalog_entity_audit WHERE entity_type='dsh_catalog_domains' AND entity_id='jrn-008-audit-domain' AND action='UPDATE' ORDER BY created_at DESC LIMIT 1;"
if ([string]::IsNullOrWhiteSpace($auditId)) {
  throw "ASSERT FAILED [audit capture]: update audit was not created"
}

Invoke-TestPsql -Db $TestDb -Sql "SELECT * FROM dsh_catalog_rollback_audit('$auditId','operator-jrn-008','operator','verify guarded rollback',2);" | Out-Null
Assert-Equal (Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT name_ar || '|' || version::text FROM dsh_catalog_domains WHERE id='jrn-008-audit-domain';") "قبل التعديل|3" "guarded rollback restored snapshot"
Assert-Equal (Invoke-TestPsql -Db $TestDb -Scalar -Sql "SELECT COUNT(*)::text FROM dsh_catalog_entity_audit WHERE entity_id='jrn-008-audit-domain' AND action='ROLLBACK';") "1" "rollback audit event"

Write-Host "JRN-008 database verification: PASS"
