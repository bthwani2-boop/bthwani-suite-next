import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const escapeRegexLiteral = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("runtime routes expose central catalog only", () => {
  const router = read("backend/internal/http/server.go");
  const unifiedRoutes = read("backend/internal/http/catalog_unified_routes.go");
  const runtimeRoutes = `${router}\n${unifiedRoutes}`;
  const contract = read("contracts/dsh.openapi.yaml");

  for (const removedPath of [
    "/dsh/partner/stores/{storeId}/catalog/categories",
    "/dsh/partner/stores/{storeId}/catalog/products",
    "/dsh/partner/stores/{storeId}/catalog/media",
    "/dsh/operator/catalog/submissions",
  ]) {
    assert.doesNotMatch(contract, new RegExp(escapeRegexLiteral(removedPath)));
  }

  assert.match(runtimeRoutes, /GET \/dsh\/partner\/catalog\/taxonomy/);
  assert.match(runtimeRoutes, /GET \/dsh\/partner\/catalog\/master-products/);
  assert.match(runtimeRoutes, /GET \/dsh\/field\/partners\/\{partnerId\}\/assortment/);
});

test("partner commercial truth has one canonical inventory and price resource", () => {
  const paths = read("contracts/paths/catalog.paths.yaml");
  const routes = read("backend/internal/http/catalog_unified_routes.go");
  const handlers = read("backend/internal/http/catalog_inventory_pricing_handlers.go");
  const client = read("frontend/catalog/central-catalog.api.ts");
  const partnerCatalog = read("frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx");

  for (const path of [
    "/dsh/partner/stores/{storeId}/assortment/{masterProductId}/inventory",
    "/dsh/partner/stores/{storeId}/assortment/{masterProductId}/prices",
  ]) assert.match(paths, new RegExp(escapeRegexLiteral(path)));
  assert.match(routes, /GET \/dsh\/partner\/stores\/\{storeId\}\/assortment\/\{masterProductId\}\/inventory/);
  assert.match(routes, /POST \/dsh\/partner\/stores\/\{storeId\}\/assortment\/\{masterProductId\}\/prices/);
  assert.match(handlers, /map\[string\]any\{"prices": prices\}/);
  assert.match(handlers, /map\[string\]any\{"price": price\}/);
  assert.match(client, /fetchPartnerStoreAssortmentInventory/);
  assert.match(client, /fetchPartnerStoreAssortmentPrices/);
  assert.match(client, /\/prices`/);
  assert.doesNotMatch(`${paths}\n${routes}\n${handlers}\n${client}\n${partnerCatalog}`, /prices\/schedule|upsertPartnerStoreAssortmentOCC|toggleAvailability/);
});

test("assortment contract is metadata-only and commercial fields are normalized", () => {
  const schemas = read("contracts/components/schemas/catalog.schemas.yaml");
  const paths = read("contracts/paths/catalog.paths.yaml");
  const assortmentSchema = schemas.match(
    /DshStoreAssortment:\n[\s\S]*?\n\nDshStoreAssortmentInventory:/,
  );
  const inputSchema = schemas.match(
    /DshStoreAssortmentInput:\n[\s\S]*?\n\nDshStoreAssortmentMetadataUpdateInput:/,
  );
  assert.ok(assortmentSchema, "metadata assortment schema is missing");
  assert.ok(inputSchema, "metadata assortment input schema is missing");
  assert.doesNotMatch(`${assortmentSchema[0]}\n${inputSchema[0]}`, /\b(unitPrice|currency|available|stockStatus)\b/);
  assert.match(paths, /DshStoreAssortmentInventoryInput/);
  assert.match(paths, /DshStoreAssortmentPriceInput/);
  assert.doesNotMatch(paths, /oneOf:\s*[\s\S]{0,180}DshStoreAssortmentMetadataUpdateInput/);
});

test("commercial catalog schema is normalized and legacy assortment columns are absent", () => {
  const migration = read("database/migrations/dsh-001_canonical_baseline.sql");
  const seeds = read("database/seeds/local/dsh-001_canonical_seed.local.sql");

  assert.match(migration, /CREATE TABLE public\.dsh_store_assortment_inventory/);
  assert.match(migration, /CREATE TABLE public\.dsh_store_assortment_prices/);
  assert.match(migration, /CREATE TABLE public\.dsh_master_products/);
  assert.match(migration, /CREATE TABLE public\.dsh_store_assortments/);
  assert.match(migration, /CREATE TABLE public\.dsh_catalog_legacy_archive/);

  for (const legacyTable of [
    "dsh_catalog_categories",
    "dsh_catalog_products",
    "dsh_catalog_media",
    "dsh_catalog_revisions",
    "dsh_catalog_audit",
    "dsh_categories",
  ]) {
    assert.doesNotMatch(migration, new RegExp(`CREATE TABLE public\\.${legacyTable}\\b`));
  }

  assert.doesNotMatch(seeds, /\b(unit_price|available|stock_status)\b/);
  assert.match(seeds, /INSERT INTO dsh_store_assortment_inventory/);
  assert.match(seeds, /INSERT INTO dsh_store_assortment_prices/);
});


test("central verification fails hard instead of only printing results", () => {
  const verify = read("database/tests/seed/002_verify-central-catalog-seed.test.sql");
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
  const handlers = [
    read("backend/internal/http/catalog_occ_write_handlers.go"),
    read("backend/internal/http/centralcatalog_catalog.go"),
  ].join("\n");

  assert.match(handlers, /masterProduct\.ApprovalStatus != "approved" \|\| !masterProduct\.IsActive/);
  assert.match(handlers, /input\.PublicationStatus = "submitted"/);
  assert.match(handlers, /approvalStatus = "approved"/);
  assert.match(handlers, /activeOnly = true/);
});

test("client home categories and fake products are central seed projections", () => {
  const repository = read("backend/internal/homediscovery/repository.go");
  const seed = read("database/seeds/local/dsh-001_canonical_seed.local.sql");
  const homeSeed = seed;

  assert.match(repository, /FROM dsh_catalog_domains/);
  assert.match(repository, /s\.catalog_domain_id/);
  assert.match(seed, /INSERT INTO dsh_master_products/);
  assert.match(seed, /INSERT INTO dsh_store_assortments/);
  assert.match(seed, /'client_visible'/);
  assert.doesNotMatch(homeSeed, /INSERT INTO dsh_categories/);
});
