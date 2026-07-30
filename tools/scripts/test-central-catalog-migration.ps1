<#
.SYNOPSIS
  Proves the dsh-036 central-catalog closure migration on a scratch database.

.DESCRIPTION
  Scenario A — fresh empty database:
    * applies every DSH migration in order, then applies the whole chain a
      second time (double-run) to prove SQL-level re-runnability,
    * applies the local seeds and the hard-failing central verification.

  Scenario B — database with legacy local-catalog data:
    * applies migrations up to dsh-035, injects legacy fixtures (categories,
      products with numeric/textual/invalid prices, media with and without a
      product plus a deleted one, a legacy cart item, audit and revision
      rows),
    * runs dsh-036 twice and asserts projection counts, price mapping, media
      preservation, link validity, cart mapping and archive equality are
      identical across both runs,
    * applies the local seeds and the hard-failing central verification.

.PARAMETER PsqlMode
  docker  — run psql inside the compose postgres container (local default).
  native  — run the host psql binary (CI service container; uses PGHOST etc.).
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
$SeedDir = "services/dsh/database/seeds/local"
$VerifyFile = Join-Path $SeedDir "verify-central-catalog-seed.sql"
$AdminUser = "bthwani_runtime"
$AdminDb = "bthwani_runtime"
$TestDb = "dsh_catalog_migration_test"

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

function Get-Scalar([string]$Sql) {
  return Invoke-TestPsql -Db $TestDb -Sql $Sql -Scalar
}

function Assert-Equal([string]$Actual, [string]$Expected, [string]$Label) {
  if ($Actual -ne $Expected) {
    throw "ASSERT FAILED [$Label]: expected '$Expected' got '$Actual'"
  }
  Write-Host "  ok: $Label = $Expected"
}

function Reset-TestDb {
  Invoke-TestPsql -Db $AdminDb -Sql "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" | Out-Null
  Invoke-TestPsql -Db $AdminDb -Sql "CREATE DATABASE $TestDb;" | Out-Null
}

function Apply-Migrations {
  param([string]$UpTo = "")
  $files = Get-ChildItem -LiteralPath $MigrationDir -Filter "*.sql" | Sort-Object Name
  foreach ($f in $files) {
    if ($UpTo -ne "" -and $f.Name -ge $UpTo) { continue }
    Write-Host "  migrate: $($f.Name)"
    Invoke-TestPsql -Db $TestDb -File $f.FullName | Out-Null
  }
}

function Apply-Seeds {
  $files = Get-ChildItem -LiteralPath $SeedDir -Filter "*.local.sql" | Sort-Object Name
  foreach ($f in $files) {
    Write-Host "  seed: $($f.Name)"
    Invoke-TestPsql -Db $TestDb -File $f.FullName | Out-Null
  }
}

function Get-ClosureCounts {
  $sql = @"
SELECT
  (SELECT COUNT(*) FROM dsh_master_products) || '|' ||
  (SELECT COUNT(*) FROM dsh_store_assortments) || '|' ||
  (SELECT COUNT(*) FROM dsh_catalog_assets) || '|' ||
  (SELECT COUNT(*) FROM dsh_catalog_asset_links) || '|' ||
  (SELECT COUNT(*) FROM dsh_catalog_legacy_archive) || '|' ||
  (SELECT COUNT(*) FROM dsh_cart_items WHERE store_assortment_id IS NOT NULL);
"@
  return Get-Scalar $sql
}

$Migration036 = Join-Path $MigrationDir "dsh-036_central_catalog_runtime_closure.sql"

# ── Scenario A: fresh empty database, full chain applied twice ────────────────
Write-Host "`n=== Scenario A: fresh database + double migration run ==="
Reset-TestDb
Apply-Migrations
Write-Host "  --- second full migration pass (re-run proof) ---"
Apply-Migrations
Assert-Equal (Get-Scalar "SELECT (to_regclass('public.dsh_catalog_products') IS NULL AND to_regclass('public.dsh_catalog_categories') IS NULL AND to_regclass('public.dsh_catalog_media') IS NULL AND to_regclass('public.dsh_catalog_audit') IS NULL AND to_regclass('public.dsh_catalog_revisions') IS NULL AND to_regclass('public.dsh_categories') IS NULL)::text") "true" "fresh: local catalog tables removed"
Assert-Equal (Get-Scalar "SELECT (to_regclass('public.dsh_catalog_legacy_archive') IS NOT NULL)::text") "true" "fresh: legacy archive table exists"
Apply-Seeds
Write-Host "  verify: verify-central-catalog-seed.sql"
Invoke-TestPsql -Db $TestDb -File $VerifyFile | Out-Null
Write-Host "Scenario A: PASS"

# ── Scenario B: legacy local-catalog data survives the closure ────────────────
Write-Host "`n=== Scenario B: legacy data projection + double dsh-036 run ==="
Reset-TestDb
Apply-Migrations -UpTo "dsh-036"

Write-Host "  injecting legacy fixtures"
Invoke-TestPsql -Db $TestDb -Sql @"
INSERT INTO dsh_stores (id, slug, display_name, status, city_code, service_area_code,
  serviceability_status, is_visible, category, partner_readiness,
  catalog_approval_status, marketing_visibility)
VALUES ('store-legacy-9001', 'store-legacy-9001', 'Legacy Fixture Store', 'active',
  'SAN', 'SAN-01', 'serviceable', true, 'grocery', 'ready', 'approved', 'visible');

INSERT INTO dsh_catalog_categories (id, store_id, name)
VALUES ('cat-legacy-1', 'store-legacy-9001', 'legacy-category');

INSERT INTO dsh_catalog_products
  (id, store_id, category_id, name, description, sku, price_reference, unit_price, is_active)
VALUES
  ('prod-legacy-1', 'store-legacy-9001', 'cat-legacy-1', 'legacy product numeric', 'note-1', 'SKU-1', '', 250.50, true),
  ('prod-legacy-2', 'store-legacy-9001', 'cat-legacy-1', 'legacy product textual price', 'note-2', 'SKU-2', ' 1500 ', 0, true),
  ('prod-legacy-3', 'store-legacy-9001', NULL, 'legacy product broken price', 'note-3', 'SKU-3', 'legacy-label', 0, true);

INSERT INTO dsh_catalog_media (id, store_id, product_id, object_key, content_type, state, public_url)
VALUES
  ('media-legacy-1', 'store-legacy-9001', 'prod-legacy-1', 'legacy/one.jpg', 'image/jpeg', 'complete', 'http://minio/legacy/one.jpg'),
  ('media-legacy-2', 'store-legacy-9001', 'prod-legacy-2', 'legacy/two.jpg', 'image/jpeg', 'pending', NULL),
  ('media-legacy-3', 'store-legacy-9001', NULL, 'legacy/orphan.jpg', 'image/jpeg', 'complete', 'http://minio/legacy/orphan.jpg'),
  ('media-legacy-4', 'store-legacy-9001', 'prod-legacy-1', 'legacy/deleted.jpg', 'image/jpeg', 'deleted', NULL);

INSERT INTO dsh_carts (id, client_id, store_id)
VALUES ('11111111-1111-4111-8111-111111111111', 'client-legacy-1', 'store-legacy-9001');

INSERT INTO dsh_cart_items (cart_id, product_id, product_name, price_reference, quantity)
VALUES ('11111111-1111-4111-8111-111111111111', 'prod-legacy-1', 'legacy product numeric', '250.50', 2);

INSERT INTO dsh_catalog_audit
  (id, store_id, actor_id, actor_role, action, entity_type, entity_id, reason, correlation_id)
VALUES
  ('audit-legacy-1', 'store-legacy-9001', 'partner-1', 'partner', 'create', 'product', 'prod-legacy-1', 'fixture', 'corr-1'),
  ('audit-legacy-2', 'store-legacy-9001', 'operator-1', 'operator', 'approve', 'product', 'prod-legacy-2', 'fixture', 'corr-2');

INSERT INTO dsh_catalog_revisions
  (id, store_id, revision, status, submitted_by, correlation_id)
VALUES
  ('rev-legacy-1', 'store-legacy-9001', 1, 'submitted', 'partner-1', 'corr-3'),
  ('rev-legacy-2', 'store-legacy-9001', 2, 'approved', 'partner-1', 'corr-4');

INSERT INTO dsh_categories (id, label)
VALUES ('cat-home-legacy-1', 'legacy-home-category');
"@ | Out-Null

Write-Host "  applying dsh-036 (first run)"
Invoke-TestPsql -Db $TestDb -File $Migration036 | Out-Null
$firstRun = Get-ClosureCounts

Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_master_products WHERE id IN ('prod-legacy-1','prod-legacy-2','prod-legacy-3')") "3" "legacy products migrated"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_store_assortments WHERE store_id = 'store-legacy-9001'") "3" "legacy assortments created"
Assert-Equal (Get-Scalar "SELECT unit_price::text FROM dsh_store_assortments WHERE master_product_id = 'prod-legacy-1'") "250.50" "numeric price preserved"
Assert-Equal (Get-Scalar "SELECT unit_price::text || '/' || available::text FROM dsh_store_assortments WHERE master_product_id = 'prod-legacy-2'") "1500.00/true" "textual price parsed"
Assert-Equal (Get-Scalar "SELECT unit_price::text || '/' || available::text || '/' || publication_status FROM dsh_store_assortments WHERE master_product_id = 'prod-legacy-3'") "0.00/false/draft" "broken price fenced as draft"
Assert-Equal (Get-Scalar "SELECT publication_status FROM dsh_store_assortments WHERE master_product_id = 'prod-legacy-1'") "client_visible" "eligible legacy product is client visible"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_assets WHERE id LIKE 'asset-media-legacy-%'") "3" "non-deleted media preserved as assets (incl. product-less)"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_assets WHERE id = 'asset-media-legacy-4'") "0" "deleted media not resurrected"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_asset_links WHERE id LIKE 'asset-link-media-legacy-%'") "2" "links only for product-bound media"
Assert-Equal (Get-Scalar "SELECT role || '/' || is_primary::text || '/' || status FROM dsh_catalog_asset_links WHERE id = 'asset-link-media-legacy-1'") "canonical_product_image/true/approved" "complete media becomes canonical primary"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_asset_links WHERE asset_id = 'asset-media-legacy-3'") "0" "product-less media has no entity link"
Assert-Equal (Get-Scalar "SELECT (store_assortment_id IS NOT NULL)::text || '/' || master_product_id FROM dsh_cart_items WHERE product_id = 'prod-legacy-1'") "true/prod-legacy-1" "legacy cart item mapped"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_legacy_archive WHERE source_table = 'dsh_catalog_audit'") "2" "audit rows archived"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_legacy_archive WHERE source_table = 'dsh_catalog_revisions'") "2" "revision rows archived"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_legacy_archive WHERE source_table = 'dsh_catalog_media'") "4" "all media rows archived (incl. deleted)"
Assert-Equal (Get-Scalar "SELECT COUNT(*)::text FROM dsh_catalog_legacy_archive WHERE source_table = 'dsh_catalog_products'") "3" "product rows archived"
Assert-Equal (Get-Scalar "SELECT payload_json->>'action' FROM dsh_catalog_legacy_archive WHERE source_id = 'audit-legacy-1'") "create" "archive payload is a faithful JSONB snapshot"
Assert-Equal (Get-Scalar "SELECT (to_regclass('public.dsh_catalog_products') IS NULL)::text") "true" "legacy tables dropped after gates"

Write-Host "  applying dsh-036 (second run - idempotency)"
Invoke-TestPsql -Db $TestDb -File $Migration036 | Out-Null
$secondRun = Get-ClosureCounts
Assert-Equal $secondRun $firstRun "second dsh-036 run changes nothing"

Apply-Seeds
Write-Host "  verify: verify-central-catalog-seed.sql"
Invoke-TestPsql -Db $TestDb -File $VerifyFile | Out-Null
Write-Host "Scenario B: PASS"

Invoke-TestPsql -Db $AdminDb -Sql "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" | Out-Null
Write-Host "`ntest-central-catalog-migration: PASS"
