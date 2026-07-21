import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("JRN-004 returns operational store context from DSH truth", () => {
  const model = read("backend/internal/store/model.go");
  const api = read("frontend/shared/store/store-discovery.api.ts");
  const viewModel = read("frontend/shared/store/store-discovery.view-model.ts");
  const clientScreen = read("frontend/app-client/store/StoreDetailScreen.tsx");
  const infoCard = read("frontend/app-client/store/StoreDetailInfoCard.tsx");

  for (const field of ["AddressLine", "CoverageSummary", "OperatingHours", "DeliveryReadiness"]) {
    assert.match(model, new RegExp(`${field}:\\s+row\\.${field}`));
  }
  assert.match(api, /governed store operational context is incomplete/);
  assert.match(viewModel, /operatingHours: dto\.operatingHours\.trim\(\)/);
  assert.match(clientScreen, /openingHours=\{store\.operatingHours\}/);
  assert.match(clientScreen, /coverageSummary=\{store\.coverageSummary\}/);
  assert.match(clientScreen, /addressLine=\{store\.addressLine\}/);
  assert.match(clientScreen, /deliveryReadiness=\{store\.deliveryReadiness\}/);
  assert.doesNotMatch(infoCard, /08:00\s*-\s*23:00/);
  assert.doesNotMatch(infoCard, /1,200/);
});

test("JRN-004 keeps partner settings and profiles actor-scoped and read back", () => {
  const scopeModel = read("frontend/shared/partner/store-scope.model.ts");
  const profile = read("frontend/shared/partner/partner-store-profile.ts");
  const profileScreen = read("frontend/app-partner/store/StoreProfileScreen.tsx");
  const partnerHub = read("frontend/app-partner/account/PartnerHubScreen.tsx");

  assert.match(scopeModel, /fetchStoreRoleContext\(storeId\)/);
  assert.match(profile, /store\.operatingHours/);
  assert.match(profile, /store\.coverageSummary/);
  assert.match(profileScreen, /fetchPartnerStoreSettings\(canonicalStoreId\)/);
  assert.match(profileScreen, /updatePartnerStoreSettings\(canonicalStoreId/);
  assert.match(profileScreen, /readback\.version <= loadState\.settings\.version/);
  assert.match(profileScreen, /temporarily_closed/);
  assert.doesNotMatch(profileScreen, /011 555 0123/);
  assert.doesNotMatch(profileScreen, /التعديلات تحفظ محليًا/);
  assert.doesNotMatch(profileScreen, /identityDocuments/);
  assert.match(partnerHub, /coverageZones\.some\(\(zone\) => zone\.status === "active"\)/);
  assert.doesNotMatch(partnerHub, /serviceabilityVerified\s*=\s*false/);
});

test("JRN-004 uses one governed publication diagnostic across backend and control panel", () => {
  const router = read("backend/internal/http/server.go");
  const diagnostics = read("backend/internal/store/publication_diagnostics.go");
  const handler = read("backend/internal/http/store_publication_diagnostics.go");
  const repository = read("backend/internal/store/repository.go");
  const model = read("backend/internal/store/model.go");
  const adminApi = read("frontend/shared/store/store-admin.api.ts");
  const adminController = read("frontend/shared/store/use-store-admin-controller.tsx");
  const adminPanel = read("frontend/control-panel/partners/stores/StoreDetailAdminPanel.tsx");

  assert.match(router, /GET \/dsh\/operator\/diagnostics\/stores\/\{storeId\}.*handleGovernedOperatorStoreDiagnostics/);
  assert.doesNotMatch(router, /handleOperatorStoreDiagnostics/);
  assert.match(handler, /store\.DiagnoseStorePublication\(\*row\)/);
  assert.match(model, /return DiagnoseStorePublication\(row\)\.IsReady/);
  assert.match(repository, /const publicStorePredicate/);
  assert.match(repository, /cardinality\(delivery_modes\) > 0/);
  assert.match(repository, /delivery_readiness = 'ready'/);
  assert.match(repository, /btrim\(COALESCE\(hero_image_url,''\)\) <> ''/);
  assert.match(repository, /btrim\(COALESCE\(logo_url,''\)\) <> ''/);
  assert.match(repository, /func GetStoreByID[\s\S]*publicStorePredicate/);
  for (const code of [
    "STORE_NOT_ACTIVE",
    "STORE_HIDDEN",
    "STORE_NOT_SERVICEABLE",
    "PARTNER_NOT_READY",
    "CATALOG_NOT_APPROVED",
    "MARKETING_HIDDEN",
    "DELIVERY_MODES_MISSING",
    "ADDRESS_MISSING",
    "COVERAGE_MISSING",
    "OPERATING_HOURS_MISSING",
    "DELIVERY_NOT_READY",
    "STORE_LOGO_MISSING",
    "STORE_COVER_MISSING",
  ]) {
    assert.match(diagnostics, new RegExp(code));
  }
  assert.match(adminApi, /\/dsh\/operator\/diagnostics\/stores\/\$\{encodeURIComponent\(storeId\)\}/);
  assert.match(adminController, /loadDiagnostics\(storeId\)/);
  assert.match(adminPanel, /موانع النشر/);
  assert.match(adminPanel, /state\.detail\.operatingHours/);
  assert.match(adminPanel, /state\.detail\.coverageSummary/);
});

test("JRN-004 gives captain and field the same operational context", () => {
  const roleViewModel = read("frontend/shared/store/store-role-context.view-model.ts");

  assert.match(roleViewModel, /id: "operational-context"/);
  assert.match(roleViewModel, /store\.operatingHours/);
  assert.match(roleViewModel, /store\.addressLine/);
  assert.match(roleViewModel, /store\.coverageSummary/);
  assert.match(roleViewModel, /store\.deliveryReadiness/);
  assert.match(roleViewModel, /pickupChecks\.every\(\(check\) => check\.ready\)/);
  assert.match(roleViewModel, /لا تبدأ الاستلام/);
});
