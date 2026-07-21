import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const productTruthPath = "governance/product/contracts/jrn-001-partner-onboarding-store-publication.product-truth.json";
const registryPath = "services/dsh/contracts/jrn-001-surface-registry.json";
const productTruth = json(productTruthPath);
const registry = json(registryPath);

assert.equal(registry.journeyId, "JRN-001");
assert.equal(registry.sliceId, "FS-10");
assert.equal(registry.authority, productTruthPath);

const requiredUiSurfaceIds = productTruth.surfaces
  .filter((surface) => surface.required && ["app-client", "app-field", "app-partner", "control-panel"].includes(surface.id))
  .map((surface) => surface.id)
  .sort();
const registeredSurfaceIds = registry.requiredSurfaces.map((surface) => surface.surfaceId).sort();
assert.deepEqual(registeredSurfaceIds, requiredUiSurfaceIds);
assert.deepEqual(registry.excludedSurfaces.map((surface) => surface.surfaceId), ["app-captain"]);

for (const surface of registry.requiredSurfaces) {
  const paths = [
    surface.routeRegistry,
    surface.routeRenderer,
    surface.bindingRegistry,
    surface.screenFile,
    ...(surface.screens ?? []),
    ...((surface.routes ?? []).flatMap((route) => typeof route === "string" ? [] : [route.routeFile, route.screenFile])),
  ].filter(Boolean);
  for (const path of paths) {
    assert.equal(fs.existsSync(path), true, `${surface.surfaceId} binding file missing: ${path}`);
  }
}

// app-client: discovery must deep-link to store detail; detail must fail closed on publication gates.
const clientDiscoveryRoute = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryRoute.tsx");
const clientDiscoveryScreen = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryScreen.tsx");
const clientStoreRoute = read("services/dsh/frontend/app-client/store/StoreDetailRoute.tsx");
const clientStoreScreen = read("services/dsh/frontend/app-client/store/StoreDetailScreen.tsx");
const clientCartScreen = read("services/dsh/frontend/app-client/cart/CartScreen.tsx");
assert.match(clientDiscoveryRoute, /onStorePress=\{onStorePress\}/);
assert.match(clientDiscoveryScreen, /onStorePress=\{onStorePress\}/);
assert.match(clientDiscoveryScreen, /const serviceAreaCode = addressController\.selectedAddress\?\.serviceAreaCode/);
assert.match(clientDiscoveryScreen, /\.\.\.\(serviceAreaCode !== undefined \? \{ serviceAreaCode \} : \{\}\)/);
assert.doesNotMatch(clientDiscoveryScreen, /serviceAreaCode:\s*addressController\.selectedAddress\?\.serviceAreaCode/);
assert.match(clientStoreRoute, /storeId=\{storeId\}/);
assert.match(clientStoreRoute, /onBack=\{onBack\}/);
assert.match(clientStoreScreen, /!store\.isClientEligible/);
assert.match(clientStoreScreen, /لم يجتز المتجر بوابة النشر للعميل/);
assert.match(clientStoreScreen, /onAddToCart=\{handleAddToCart\}/);
assert.match(clientStoreScreen, /onGoToCart=\{onGoToCart\}/);
assert.match(clientCartScreen, /controller\.removeItem\(item\.cartId, item\.id\)/);
assert.doesNotMatch(clientCartScreen, /controller\.state\.cart\.id/);

// app-field: complete route registry, deep navigation, five governed groups, back/save icons, and real actions.
const fieldRoutes = read("services/dsh/frontend/app-field/dsh-field.routes.ts");
const fieldRenderer = read("services/dsh/frontend/app-field/components/DshFieldRouteRenderer.tsx");
const fieldScreen = read("services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx");
for (const route of registry.requiredSurfaces.find((surface) => surface.surfaceId === "app-field").routes) {
  assert.match(fieldRoutes, new RegExp(`["']${route}["']`), `app-field route missing: ${route}`);
}
assert.match(fieldRenderer, /case ['"]onboarding['"]|route\.kind === ['"]onboarding['"]/);
assert.match(fieldRenderer, /onBack=\{actions\.popRoute\}/);
assert.match(fieldRenderer, /kind: ['"]products-upload['"]/);
assert.match(fieldRenderer, /kind: ['"]partner-progress['"]/);
for (const tab of ["basics_profile", "location_media", "evidence", "bank_account", "agreement_review"]) {
  assert.match(fieldScreen, new RegExp(`["']${tab}["']`), `app-field onboarding tab missing: ${tab}`);
}
assert.match(fieldScreen, /name="arrow-back"/);
assert.match(fieldScreen, /accessibilityLabel="رجوع"/);
assert.match(fieldScreen, /onPress=\{onBack\}/);
assert.match(fieldScreen, /name="save-outline"/);
assert.match(fieldScreen, /controller\.save\(\)/);
assert.match(fieldScreen, /submitDraft\(\)/);
assert.match(fieldScreen, /uploadFieldMedia/);
assert.match(fieldScreen, /onOpenProducts/);

// app-partner: entry status, readiness refresh, and team actions must be real bindings.
const partnerBindings = read("services/dsh/frontend/app-partner/dsh-partner-binding.contracts.ts");
const partnerRenderer = read("services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx");
const partnerHub = read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");
const partnerStatus = read("services/dsh/frontend/app-partner/account/PartnerOnboardingStatusView.tsx");
const partnerTeam = read("services/dsh/frontend/app-partner/team/PartnerTeamManagementScreen.tsx");
for (const route of ["home", "entry", "team"]) {
  assert.match(partnerBindings, new RegExp(`(?:^|\\s|["'])${route}(?:["']|:)`, "m"), `app-partner binding missing: ${route}`);
}
assert.match(partnerRenderer, /function hasRouteBindingContract/);
assert.match(partnerRenderer, /DSH_PARTNER_BINDING_CONTRACTS\.some/);
assert.match(partnerRenderer, /PartnerTeamManagementScreen/);
assert.match(partnerHub, /PartnerOnboardingStatusView/);
assert.match(partnerStatus, /reloadSelfStatus/);
assert.match(partnerStatus, /label="تحديث الحالة"/);
assert.match(partnerStatus, /name=\{item\.satisfied \? "checkmark-circle" : "ellipse-outline"\}/);
assert.match(partnerTeam, /onInviteMember/);
assert.match(partnerTeam, /onMemberAction/);
assert.match(partnerTeam, /label=.*إرسال الدعوة/);
assert.match(partnerTeam, /submitAction/);

// control-panel: runtime deep links, six tabs, governed reviews/transitions, store link, and audit.
const partnersPage = read("apps/control-panel/runtime/src/app/dsh/partners/page.tsx");
const partnerDetailPage = read("apps/control-panel/runtime/src/app/dsh/partners/[partnerId]/page.tsx");
const reviewQueue = read("services/dsh/frontend/control-panel/partners/PartnersReviewQueueScreen.tsx");
const detailScreen = read("services/dsh/frontend/control-panel/partners/PartnerDetailOperationalScreen.tsx");
assert.match(partnersPage, /router\.push\(`\/dsh\/partners\/\$\{partnerId\}`\)/);
assert.match(partnerDetailPage, /router\.push\("\/dsh\/partners"\)/);
assert.match(reviewQueue, /onOpenPartner\(row\.id\)/);
for (const tab of ["overview", "documents", "visits", "stores", "readiness", "audit"]) {
  assert.match(detailScreen, new RegExp(`["']${tab}["']`), `control-panel tab missing: ${tab}`);
}
assert.match(detailScreen, /role="tablist"/);
assert.match(detailScreen, /decision: "approved"/);
assert.match(detailScreen, /decision: "rejected"/);
assert.match(detailScreen, /decision: "needs_resubmit"/);
assert.match(detailScreen, /allowedNextStatuses/);
assert.match(detailScreen, /detail\.transition/);
assert.match(detailScreen, /stores\.linkStore/);
assert.match(detailScreen, /ربط المتجر بالشريك/);
assert.match(detailScreen, /audit\.state\.events/);
assert.doesNotMatch(detailScreen, /onClick=\{\(\) => \{\}\}/);

console.log("JRN-001 FS-10 required routes, screens, tabs, actions, icons, and deep navigation verified");
