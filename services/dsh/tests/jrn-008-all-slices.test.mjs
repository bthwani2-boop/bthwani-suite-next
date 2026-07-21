import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readRepo = (path) => fs.readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

const routes = read("backend/internal/http/catalog_unified_routes.go");
const core = read("backend/internal/centralcatalog/centralcatalog.go");
const governance = read("backend/internal/centralcatalog/catalog_governance.go");
const handlers = read("backend/internal/http/catalog_governance_handlers.go");
const contract = read("contracts/dsh.catalog-governance.openapi.yaml");
const catalogContract = read("contracts/dsh.catalog.openapi.yaml");
const migration = read("database/migrations/dsh-930_jrn_008_catalog_slice_closure.sql");
const pauseMigration = read("database/migrations/dsh-931_jrn_008_assortment_pause_restore.sql");
const sharedApi = read("frontend/shared/catalog/catalog-governance.api.ts");
const sharedTypes = read("frontend/shared/catalog/catalog-governance.types.ts");
const operatorScreen = read("frontend/control-panel/catalogs/CatalogGovernanceScreen.tsx");
const partnerScreen = read("frontend/app-partner/catalog/ProductOverridesScreen.tsx");
const fieldScreen = read("frontend/app-field/components/DshFieldAssortmentPauseScreen.tsx");
const fieldRouter = read("frontend/app-field/components/DshFieldRouteRenderer.tsx");
const dashboard = read("frontend/control-panel/catalogs/CatalogDashboardScreen.tsx");

function requireMarkers(source, markers, label) {
  for (const marker of markers) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${label}: ${marker}`);
  }
}

test("JRN-008 slice 01 owns domains, trees and category nodes", () => {
  requireMarkers(routes, [
    "GET /dsh/operator/catalog/domains",
    "POST /dsh/operator/catalog/domains",
    "PATCH /dsh/operator/catalog/domains/{domainId}",
    "GET /dsh/operator/catalog/nodes",
    "POST /dsh/operator/catalog/nodes",
    "PATCH /dsh/operator/catalog/nodes/{nodeId}",
  ], "taxonomy routes");
  requireMarkers(dashboard, ["taxonomy", "شجرة التصنيفات", "controller.createDomain", "controller.createNode"], "taxonomy operator UI");
});

test("JRN-008 slice 02 closes master products, units, attributes and alternatives", () => {
  requireMarkers(routes, [
    "GET /dsh/operator/catalog/master-products",
    "POST /dsh/operator/catalog/master-products",
    "GET /dsh/operator/catalog/attributes",
    "PUT /dsh/operator/catalog/master-products/{productId}/attribute-values/{attributeId}",
    "PUT /dsh/operator/catalog/master-products/{productId}/relationships",
  ], "PIM routes");
  requireMarkers(governance, [
    "CatalogAttribute",
    "CatalogAttributeOption",
    "CatalogNodeAttributeRule",
    "MasterProductAttributeValue",
    "MasterProductRelationship",
    "validateAttributeJSON",
  ], "PIM backend");
  requireMarkers(migration, ["dsh_master_product_relationships", "substitute", "alternative", "complement"], "relationship schema");
  requireMarkers(operatorScreen, ["خصائص المنتجات المركزية", "قيم المنتج والبدائل", "createOperatorCatalogAttribute"], "PIM operator UI");
});

test("JRN-008 slice 03 closes partner and field product proposals with readback", () => {
  requireMarkers(routes, [
    "POST /dsh/partner/catalog/product-proposals",
    "GET /dsh/partner/catalog/product-proposals",
    "POST /dsh/field/partners/{partnerId}/catalog/product-proposals",
    "GET /dsh/field/partners/{partnerId}/catalog/product-proposals",
  ], "proposal routes");
  requireMarkers(read("frontend/shared/partner/use-field-catalog-controller.tsx"), [
    "fetchFieldProductProposals",
    "setProposals(proposalPage.items)",
  ], "field proposal readback");
  requireMarkers(read("frontend/app-partner/catalog/PartnerCatalogManagementScreen.tsx"), [
    "fetchPartnerProductProposals",
    "اقتراحات المنتجات وحالة المراجعة",
  ], "partner proposal readback");
});

test("JRN-008 slice 04 closes proposal review, rejection and transitions", () => {
  requireMarkers(routes, [
    "POST /dsh/operator/catalog/product-proposals/{proposalId}/decision",
    "POST /dsh/operator/catalog/product-proposals/{proposalId}/transition",
  ], "proposal governance routes");
  requireMarkers(core, ["DecideProposal", "TransitionProductProposal"], "proposal state machine");
  requireMarkers(dashboard, ["handleProposalDecision", "handleProposalTransition", "needs-fix", "rejected"], "proposal review UI");
});

test("JRN-008 slice 05 closes assortment, inventory, availability and temporary pause", () => {
  requireMarkers(routes, [
    "GET /dsh/operator/stores/{storeId}/assortment",
    "PUT /dsh/operator/stores/{storeId}/assortment/{masterProductId}",
    "POST /dsh/operator/stores/{storeId}/assortment/{masterProductId}/pause",
    "POST /dsh/partner/stores/{storeId}/assortment/{masterProductId}/pause",
    "POST /dsh/field/partners/{partnerId}/assortment/{masterProductId}/pause",
  ], "assortment routes");
  requireMarkers(migration, ["pause_reason", "paused_until", "paused_at", "paused_by"], "pause schema");
  requireMarkers(pauseMigration, ["available_before_pause", "available_before_pause = available"], "deterministic resume schema");
  requireMarkers(partnerScreen, ["pausePartnerStoreAssortment", "resumePartnerStoreAssortment", "الإيقاف المؤقت التشغيلي"], "partner pause UI");
  requireMarkers(fieldScreen, ["pauseFieldStoreAssortment", "resumeFieldStoreAssortment", "إيقاف تشكيلة الشريك"], "field pause UI");
  requireMarkers(fieldRouter, ["DshFieldCatalogOperationsScreen"], "field route binding");
});

test("JRN-008 slice 06 closes domain, category and product media links", () => {
  requireMarkers(routes, [
    "PUT /dsh/operator/catalog/domains/{domainId}/images/{role}",
    "PUT /dsh/operator/catalog/nodes/{nodeId}/images/{role}",
    "PUT /dsh/operator/catalog/master-products/{productId}/images/{role}",
    "PUT /dsh/operator/catalog/product-proposals/{proposalId}/images/{role}",
  ], "media entity routes");
  requireMarkers(read("database/migrations/dsh-032_catalog_pim_dam_attributes_bulk_closure.sql"), [
    "dsh_catalog_assets",
    "dsh_catalog_asset_links",
  ], "DAM schema");
});

test("JRN-008 slice 07 closes upload, complete, review, link, unlink and delete", () => {
  requireMarkers(routes, [
    "POST /dsh/operator/catalog/assets/upload-intents",
    "POST /dsh/operator/catalog/assets/{assetId}/complete",
    "POST /dsh/operator/catalog/assets/{assetId}/review",
    "POST /dsh/operator/catalog/assets/{assetId}/link",
    "DELETE /dsh/operator/catalog/assets/{assetId}/links/{linkId}",
    "DELETE /dsh/operator/catalog/assets/{assetId}",
  ], "DAM lifecycle routes");
  requireMarkers(dashboard, ["handleAssetReview", "أرشفة", "موافقة", "رفض"], "DAM review UI");
});

test("JRN-008 slice 08 closes reels submission, review and public projection", () => {
  requireMarkers(routes, [
    "POST /dsh/partner/reels",
    "GET /dsh/operator/reels",
    "POST /dsh/operator/reels/{reelId}/review",
  ], "reels protected routes");
  requireMarkers(catalogContract, ["listPublicReels", "/dsh/public/reels"], "public reels contract");
  requireMarkers(read("frontend/control-panel/catalogs/ReelsReviewPanel.tsx"), ["reviewReel", "approved", "rejected"], "reels review UI");
});

test("JRN-008 slice 09 closes approvals, policies, seed diagnostics, audit and rollback", () => {
  requireMarkers(routes, [
    "GET /dsh/operator/catalog/platform-policies",
    "GET /dsh/operator/catalog/seed-status",
    "GET /dsh/operator/catalog/audit",
    "POST /dsh/operator/catalog/audit/{auditId}/rollback",
  ], "governance routes");
  requireMarkers(migration, [
    "dsh_catalog_entity_audit",
    "dsh_catalog_capture_entity_audit",
    "dsh_catalog_rollback_audit",
    "ROLLBACK_VERSION_CONFLICT",
  ], "audit rollback schema");
  requireMarkers(operatorScreen, ["سجل التدقيق والتراجع المحكوم", "rollbackOperatorCatalogAudit"], "audit operator UI");
});

test("JRN-008 slice 10 publishes one client catalog and forbids parallel local catalogs", () => {
  requireMarkers(catalogContract, ["getPublishedDshCatalog", "/dsh/client/stores/{storeId}/catalog"], "published client catalog");
  requireMarkers(read("database/migrations/dsh-036_central_catalog_runtime_closure.sql"), [
    "DROP TABLE IF EXISTS dsh_catalog_products",
    "DROP TABLE IF EXISTS dsh_catalog_categories",
    "INSERT INTO dsh_master_products",
    "INSERT INTO dsh_store_assortments",
  ], "local catalog retirement");
  assert.doesNotMatch(routes, /partner\/stores\/\{storeId\}\/catalog\/products/);
});

test("JRN-008 FS-01..FS-18 are bound to code, contracts, data, surfaces and verification", () => {
  const registry = readRepo("governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md");
  const capability = read("capability-map.extensions.ts");
  const contractRegistry = read("contracts/contract-registry.ts");
  const index = read("frontend/shared/catalog/index.ts");
  const controlPage = readRepo("apps/control-panel/runtime/src/app/dsh/catalogs/governance/page.tsx");

  for (let slice = 1; slice <= 18; slice += 1) {
    assert.match(registry, new RegExp(`FS-${String(slice).padStart(2, "0")}`), `FS-${slice} must remain declared`);
  }
  requireMarkers(contractRegistry, ["dsh-catalog-governance", "dsh.catalog-governance.openapi.yaml"], "FS contract registry");
  requireMarkers(capability, ["product-attributes", "product-alternatives", "assortment-pauses", "catalog-audit", "guarded-rollback"], "FS capability ownership");
  requireMarkers(index, ["catalog-governance.types", "catalog-governance.api"], "FS shared brain");
  requireMarkers(controlPage, ["CatalogGovernanceScreen"], "FS control-panel route");
  requireMarkers(sharedApi, ["fetchPartnerAssortmentPauses", "fetchFieldAssortmentPauses", "fetchOperatorCatalogAudit"], "FS multi-surface API");
  requireMarkers(sharedTypes, ["CatalogAttribute", "MasterProductRelationship", "AssortmentPauseState", "CatalogAuditEntry"], "FS typed model");
  requireMarkers(contract, ["MANUAL_TYPED_ADAPTER", "rollbackOperatorCatalogAudit"], "FS executable contract");
  requireMarkers(handlers, ["requireCatalogPermission", "partnerStore", "fieldPartnerStore"], "FS authorization boundaries");
});
