import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const productTruthPath = "governance/product/contracts/jrn-001-partner-onboarding-store-publication.product-truth.json";
const registryPath = "services/dsh/contracts/jrn-001-visible-state-registry.json";
const productTruth = json(productTruthPath);
const registry = json(registryPath);
const runtime = read("services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts");
const visible = read("services/dsh/frontend/shared/partner/partner-onboarding.visible-state.ts");
const barrel = read("services/dsh/frontend/shared/partner/index.ts");

assert.equal(registry.journeyId, "JRN-001");
assert.equal(registry.sliceId, "FS-11");
assert.equal(registry.authority, productTruthPath);
assert.equal(productTruth.capabilityId, "JRN_001_PARTNER_ONBOARDING_STORE_PUBLICATION");
for (const state of ["loading", "empty", "offline", "forbidden", "conflict", "readiness_blocked", "wlt_unavailable", "partial", "error", "ready"]) {
  assert.ok(registry.states[state], `visible state registry missing: ${state}`);
  assert.match(visible, new RegExp(`\\b${state}:\\s*\\{`), `visible copy missing: ${state}`);
}
for (const state of ["offline", "forbidden", "conflict", "readiness_blocked", "wlt_unavailable", "error"]) {
  assert.match(runtime, new RegExp(`["']${state}["']`), `runtime failure state missing: ${state}`);
}
assert.equal(registry.states.conflict.recovery, "reload-committed-state");
assert.equal(registry.states.wlt_unavailable.recovery, "retry-same-idempotency-key");
assert.match(visible, /action: "retry"/);
assert.match(visible, /action: "reload"/);
assert.match(visible, /action: "complete_requirements"/);
assert.match(visible, /action: "sign_in"/);
assert.match(visible, /blocksMutation:\s*true/);
assert.match(barrel, /partner-onboarding\.visible-state/);
assert.deepEqual(
  registry.surfaceRequirements.map((surface) => surface.surfaceId).sort(),
  ["app-client", "app-field", "app-partner", "control-panel"],
);

// app-client: service unavailability is an explicit offline presentation with authoritative retry.
const discoveryStates = read("services/dsh/frontend/shared/home-discovery/home-discovery.states.ts");
const discoveryShell = read("services/dsh/frontend/app-client/home-discovery/HomeDiscoveryShell.tsx");
const storeDetail = read("services/dsh/frontend/app-client/store/StoreDetailScreen.tsx");
assert.match(discoveryStates, /kind: "service_unavailable"/);
assert.match(discoveryShell, /state\.kind === "service_unavailable"/);
assert.match(discoveryShell, /<OfflineState/);
assert.match(discoveryShell, /onRetry=\{onRetry\}/);
assert.match(storeDetail, /storeCtrl\.state\.kind === "service_unavailable"/);
assert.match(storeDetail, /actionLabel="إعادة المحاولة"/);
assert.match(storeDetail, /onActionPress=\{handleRetry\}/);

// app-field: typed failures survive the controller and drive real recovery UI.
const fieldTypes = read("services/dsh/frontend/shared/field-onboarding/field-onboarding.types.ts");
const fieldController = read("services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx");
const fieldScreen = read("services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx");
assert.match(fieldTypes, /failure: PartnerOnboardingFailure \| null/);
assert.match(fieldTypes, /failure: null/);
assert.match(fieldController, /loadError: failure\.message/);
assert.match(fieldController, /submitError: failure\.message,\s*failure/);
assert.match(fieldController, /state: "readiness_blocked"/);
assert.match(fieldController, /isSaving: true,[\s\S]*failure: null/);
assert.match(fieldController, /isSubmitting: true,[\s\S]*failure: null/);
assert.doesNotMatch(fieldController, /setState\(\(s\) => \(\{ \.\.\.s, submitError: failure\.message \}\)\)/);
assert.match(fieldScreen, /resolvePartnerOnboardingFailureState/);
assert.match(fieldScreen, /const visibleFailure = state\.failure/);
assert.match(fieldScreen, /recoverVisibleFailure/);
assert.match(fieldScreen, /visibleFailure\.action === 'reload'/);
assert.match(fieldScreen, /visibleFailure\.action === 'retry'/);
assert.match(fieldScreen, /visibleFailure\.action === 'complete_requirements'/);
assert.match(fieldScreen, /visibleFailure\.action === 'sign_in'/);
assert.match(fieldScreen, /title="متطلبات التأهيل غير مكتملة"/);
assert.match(fieldScreen, /actionLabel="فتح أول قسم ناقص"/);
assert.match(fieldScreen, /title="جارٍ حفظ المسودة"/);
assert.match(fieldScreen, /title="جارٍ إرسال الملف للمراجعة"/);
assert.doesNotMatch(fieldScreen, /\{state\.submitError \? \(/);

// app-partner: self identity boundaries and partial readiness are explicit and recoverable.
const partnerHub = read("services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx");
const partnerStatus = read("services/dsh/frontend/app-partner/account/PartnerOnboardingStatusView.tsx");
assert.match(partnerHub, /selfStatusState\.kind === "not_found"/);
assert.match(partnerHub, /title="ملف الشريك غير موجود"/);
assert.match(partnerHub, /selfStatusState\.kind === "forbidden"/);
assert.match(partnerHub, /title="غير مصرح بعرض ملف الشريك"/);
assert.match(partnerHub, /onActionPress=\{reloadSelfStatus\}/);
assert.match(partnerStatus, /selfReadinessState\.kind === "error"/);
assert.match(partnerStatus, /title="الحالة التشغيلية متاحة جزئيًا"/);
assert.match(partnerStatus, /description=\{selfReadinessState\.message\}/);
assert.match(partnerStatus, /onActionPress=\{reloadSelfStatus\}/);

// control-panel: offline, optimistic concurrency, readiness blocking, and retry are first-class states.
const adminController = read("services/dsh/frontend/shared/partner/use-partner-admin-controller.tsx");
const reviewQueue = read("services/dsh/frontend/control-panel/partners/PartnersReviewQueueScreen.tsx");
const detailScreen = read("services/dsh/frontend/control-panel/partners/PartnerDetailOperationalScreen.tsx");
assert.match(adminController, /kind: "offline"/);
assert.match(adminController, /kind: "version_conflict"/);
assert.match(adminController, /kind: "invalid_transition"/);
assert.match(adminController, /e\?\.status === 403\) setDetailState\(\{ kind: "forbidden" \}\)/);
assert.match(reviewQueue, /adminController\.listState\.kind === "offline"/);
assert.match(reviewQueue, /stateId="offline"/);
assert.match(reviewQueue, /onActionPress=\{adminController\.retry\}/);
assert.match(detailScreen, /detail\.mutationState\.kind === "version_conflict"/);
assert.match(detailScreen, /title="تعارض نسخة الشريك"/);
assert.match(detailScreen, /onClick=\{\(\) => void reloadAfterConflict\(\)\}/);
assert.match(detailScreen, /detail\.mutationState\.kind === "invalid_transition"/);
assert.match(detailScreen, /title="القرار محجوب ببوابات الجاهزية"/);
assert.match(detailScreen, /onClick=\{\(\) => setTab\("readiness"\)\}/);

console.log("JRN-001 FS-11 canonical visible states and recovery actions verified");
