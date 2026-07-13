import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("runtime routes expose central catalog only", () => {
  const router = read("backend/internal/http/server.go");
  const contract = read("contracts/dsh.openapi.yaml");

  for (const removedPath of [
    "/dsh/partner/stores/{storeId}/catalog/categories",
    "/dsh/partner/stores/{storeId}/catalog/products",
    "/dsh/partner/stores/{storeId}/catalog/media",
    "/dsh/operator/catalog/submissions",
  ]) {
    assert.doesNotMatch(contract, new RegExp(removedPath.replace(/[{}]/g, "\\$&")));
  }

  assert.match(router, /GET \/dsh\/partner\/catalog\/taxonomy/);
  assert.match(router, /GET \/dsh\/partner\/catalog\/master-products/);
  assert.match(router, /GET \/dsh\/field\/partners\/\{partnerId\}\/assortment/);
});

test("closure migration preserves legacy data before dropping local catalog tables", () => {
  const migration = read("database/migrations/dsh-036_central_catalog_runtime_closure.sql");
  const migrateProductsAt = migration.indexOf("INSERT INTO dsh_master_products");
  const migrateAssortmentsAt = migration.indexOf("INSERT INTO dsh_store_assortments");
  const dropProductsAt = migration.indexOf("DROP TABLE IF EXISTS dsh_catalog_products");

  assert.ok(migrateProductsAt >= 0 && migrateProductsAt < dropProductsAt);
  assert.ok(migrateAssortmentsAt >= 0 && migrateAssortmentsAt < dropProductsAt);
  for (const table of [
    "dsh_catalog_categories",
    "dsh_catalog_products",
    "dsh_catalog_media",
    "dsh_catalog_revisions",
    "dsh_catalog_audit",
    "dsh_categories",
  ]) {
    assert.match(migration, new RegExp(`DROP TABLE IF EXISTS ${table}`));
  }
  assert.match(migration, /ALTER TABLE dsh_stores DROP COLUMN IF EXISTS category;/);
});

test("closure migration is atomic, gated, and archives legacy records", () => {
  const migration = read("database/migrations/dsh-036_central_catalog_runtime_closure.sql");

  // One atomic transaction: a failed gate rolls back every drop.
  assert.match(migration, /^BEGIN;$/m);
  assert.match(migration, /^COMMIT;$/m);
  assert.ok(migration.indexOf("BEGIN;") < migration.indexOf("CREATE TABLE IF NOT EXISTS dsh_catalog_legacy_archive"));

  // Every legacy table is archived as JSONB before any drop.
  const dropAt = migration.indexOf("DROP TABLE IF EXISTS dsh_catalog_audit");
  for (const source of [
    "dsh_catalog_audit",
    "dsh_catalog_revisions",
    "dsh_catalog_categories",
    "dsh_catalog_products",
    "dsh_catalog_media",
    "dsh_categories",
  ]) {
    const archiveAt = migration.indexOf(`'${source}:' || t.id`);
    assert.ok(archiveAt >= 0 && archiveAt < dropAt, `${source} must be archived before drops`);
  }

  // Product-less media stays in DAM without an invalid NULL entity link.
  assert.match(migration, /AND product_id IS NOT NULL/);
  assert.match(migration, /WHERE product_id IS NOT NULL/);

  // Verification gates abort the transaction before the drops.
  const firstGateAt = migration.indexOf("RAISE EXCEPTION 'dsh-036 gate");
  assert.ok(firstGateAt >= 0 && firstGateAt < dropAt);
});

test("migrate runner keeps a checksum ledger so applied migrations never re-run", () => {
  const runner = fs.readFileSync(
    new URL("../../../infra/docker/scripts/runtime.ps1", import.meta.url),
    "utf8",
  );
  assert.match(runner, /CREATE TABLE IF NOT EXISTS runtime_schema_migrations/);
  assert.match(runner, /Skipping \(already applied\)/);
  assert.match(runner, /checksum mismatch/);
});

test("central verification fails hard instead of only printing results", () => {
  const verify = read("database/seeds/local/verify-central-catalog-seed.sql");
  for (const check of [
    "legacy_archive_table_exists",
    "legacy_audit_archived",
    "legacy_revisions_archived",
    "legacy_media_assets_preserved",
    "legacy_media_links_valid",
    "cart_items_fully_mapped",
    "no_orphan_assortments",
    "no_orphan_asset_links",
    "local_catalog_tables_removed",
    "local_store_category_columns_removed",
  ]) {
    assert.match(verify, new RegExp(check));
  }
  assert.match(verify, /RAISE EXCEPTION 'central catalog verification FAILED/);
});

test("partner and field catalog writes cannot bypass central approval", () => {
  const handlers = read("backend/internal/http/centralcatalog.go");

  assert.match(handlers, /mp\.ApprovalStatus != "approved" \|\| !mp\.IsActive/);
  assert.match(handlers, /input\.PublicationStatus = "submitted"/);
  assert.match(handlers, /approvalStatus = "approved"/);
  assert.match(handlers, /activeOnly = true/);
});

test("client home categories and fake products are central seed projections", () => {
  const repository = read("backend/internal/homediscovery/repository.go");
  const seed = read("database/seeds/local/dsh-032_central_catalog_seed.local.sql");
  const homeSeed = read("database/seeds/local/dsh-002_home_discovery.local.sql");

  assert.match(repository, /FROM dsh_catalog_domains/);
  assert.match(repository, /s\.catalog_domain_id/);
  assert.match(seed, /INSERT INTO dsh_master_products/);
  assert.match(seed, /INSERT INTO dsh_store_assortments/);
  assert.match(seed, /'client_visible'/);
  assert.doesNotMatch(homeSeed, /INSERT INTO dsh_categories/);
});
