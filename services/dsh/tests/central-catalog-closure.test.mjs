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
