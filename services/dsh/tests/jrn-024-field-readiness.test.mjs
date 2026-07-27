import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

const governedDomain = read("services/dsh/backend/internal/fieldreadiness/journey024_governance.go");
const idempotentDomain = read("services/dsh/backend/internal/fieldreadiness/journey024_idempotent_mutations.go");
const mutationReceipts = read("services/dsh/backend/internal/fieldreadiness/mutation_idempotency.go");
const governedHandlers = read("services/dsh/backend/internal/http/field_readiness_governed_handlers.go");
const mutationMigration = read("services/dsh/database/migrations/dsh-960_field_readiness_mutation_idempotency.sql");
const receiptMigration = read("services/dsh/database/migrations/dsh-961_field_readiness_operation_receipts.sql");
const routes = read("services/dsh/backend/internal/http/field_readiness_routes.go");
const sharedTypes = read("services/dsh/frontend/shared/field-readiness/field-readiness.types.ts");
const sharedMedia = read("services/dsh/frontend/shared/media/field-document-media.ts");
const visitScreen = read("services/dsh/frontend/app-field/escalation/DshFieldVisitScreen.tsx");
const queueScreen = read("services/dsh/frontend/app-field/escalation/DshFieldWorkQueueScreen.tsx");
const checklistScreen = read("services/dsh/frontend/app-field/escalation/DshFieldReadinessChecklistScreen.tsx");
const escalationScreen = read("services/dsh/frontend/app-field/escalation/DshFieldEscalationScreen.tsx");
const escalationSubmission = read("services/dsh/frontend/shared/field-readiness/use-field-escalation-submission-controller.ts");
const operatorScreen = read("services/dsh/frontend/control-panel/partners/field-readiness/FieldReadinessQueueScreen.tsx");
const fieldSchemas = read("services/dsh/contracts/components/schemas/field.schemas.yaml");
const fieldPaths = read("services/dsh/contracts/paths/field.paths.yaml");
const generatedBundle = read("services/dsh/contracts/generated/dsh.bundle.openapi.yaml");
const generatedClient = read("services/dsh/clients/generated/dsh-api.ts");
const identityGate = read("services/dsh/frontend/shared/session/IdentitySessionGate.tsx");
const identityStore = read("core/identity/clients/identity-session-store.ts");
const appRuntime = read("apps/app-field/runtime/src/App.tsx");
const appIndex = read("apps/app-field/runtime/src/index.ts");
const offlineQueue = read("services/dsh/frontend/shared/field-readiness/field-offline-queue.ts");
const onboardingTypes = read("services/dsh/frontend/shared/field-onboarding/field-onboarding.types.ts");
const fieldDraftsController = read("services/dsh/frontend/shared/field-onboarding/use-field-partner-drafts-controller.tsx");

test("JRN-024 routes every write through the governed backend boundary", () => {
  assert.match(routes, /handleCreateGovernedFieldVisit/);
  assert.match(routes, /handleCompleteGovernedFieldVisit/);
  assert.match(routes, /handleUpsertGovernedReadinessCheck/);
  assert.match(routes, /handleCreateGovernedReadinessEscalation/);
  assert.match(routes, /handleUpdateGovernedEscalation/);
  assert.match(routes, /handleGovernedPartnerOnboardingStatus/);
  assert.doesNotMatch(routes, /stores\/\{storeId\}\/media\/uploads/);
  assert.doesNotMatch(governedHandlers, /handleFieldReadinessMediaUpload/);
});

test("JRN-024 consumes governed idempotency headers for every replayable write", () => {
  assert.match(governedHandlers, /r\.Header\.Get\("Idempotency-Key"\)/);
  assert.match(governedHandlers, /r\.Header\.Get\("X-Correlation-ID"\)/);
  assert.match(governedHandlers, /CreateGovernedVisitIdempotent/);
  assert.match(governedHandlers, /CompleteGovernedVisitIdempotent/);
  assert.match(governedHandlers, /UpsertGovernedReadinessCheckIdempotent/);
  assert.match(governedHandlers, /CreateGovernedEscalationIdempotent/);
  assert.match(governedHandlers, /IDEMPOTENCY_REQUIRED/);
  assert.match(governedHandlers, /IDEMPOTENCY_CONFLICT/);
});

test("JRN-024 stores atomic platform-workforce actor scoped replay receipts", () => {
  assert.doesNotMatch(mutationReceipts, /bthwani\.tenant_id|tenantID/);
  assert.match(mutationReceipts, /pg_advisory_xact_lock/);
  assert.match(mutationReceipts, /dsh_field_readiness_operation_receipts/);
  assert.match(mutationReceipts, /actorID, string\(operation\), mutation\.IdempotencyKey/);
  assert.match(idempotentDomain, /storeMutationReceiptTx/);
  assert.match(idempotentDomain, /fieldcommissionoutbox\.Enqueue/);
  assert.match(mutationMigration, /create_idempotency_key/);
  assert.match(mutationMigration, /completion_idempotency_key/);
  assert.doesNotMatch(receiptMigration, /tenant_id/);
  assert.match(receiptMigration, /UNIQUE INDEX[\s\S]*actor_id, operation, idempotency_key/);
});

test("JRN-024 uses server-owned store coordinates and governed GPS evidence", () => {
  assert.match(governedDomain, /SELECT latitude, longitude\s+FROM dsh_stores/);
  assert.match(governedDomain, /input\.StoreLatitude = &latitude/);
  assert.match(governedDomain, /ValidateGovernedLocation/);
  assert.match(governedDomain, /GPS capture time is in the future/);
  assert.doesNotMatch(governedHandlers, /StoreLatitude/);
  assert.doesNotMatch(governedHandlers, /StoreLongitude/);
  const createInput = sharedTypes.slice(
    sharedTypes.indexOf("export type DshCreateVisitInput"),
    sharedTypes.indexOf("export type DshCompleteVisitInput"),
  );
  assert.doesNotMatch(createInput, /storeLatitude|storeLongitude/);
  assert.match(createInput, /startLocation/);
});

test("JRN-024 binds readiness evidence to the exact store and owner", () => {
  assert.match(governedDomain, /refs\.store_id = checks\.store_id/);
  assert.match(governedDomain, /purpose = 'field_readiness_evidence'/);
  assert.match(governedDomain, /owner_actor_id = \$4/);
  assert.match(sharedMedia, /form\.append\("storeId", owner\.storeId\)/);
  assert.match(sharedMedia, /\/dsh\/field\/media\/uploads/);
});

test("JRN-024 keeps escalated-further cases blocking and operable", () => {
  assert.match(governedDomain, /status IN \('open','acknowledged','escalated_further'\)/);
  assert.match(governedDomain, /EscalationEscalatedFurther/);
  assert.match(operatorScreen, /value: "escalated_further"/);
  assert.match(operatorScreen, />تصعيد أعلى<\/CpButton>/);
  assert.match(operatorScreen, />حل التصعيد<\/CpButton>/);
});

test("JRN-024 source and generated contracts require both GPS captures", () => {
  assert.match(fieldSchemas, /DshCreateFieldVisitRequest:[\s\S]*required: \[startLocation\]/);
  assert.match(fieldSchemas, /startLocation:[\s\S]*accuracyMeters:[\s\S]*capturedAt:[\s\S]*provider:/);
  assert.match(fieldSchemas, /geofenceRadiusMeters:[\s\S]*completionGeofenceStatus:[\s\S]*storeLongitude:/);

  const completePath = fieldPaths.slice(
    fieldPaths.indexOf("/dsh/field/visits/{visitId}/complete:"),
    fieldPaths.indexOf("/dsh/field/visits/{visitId}/checks:"),
  );
  assert.match(completePath, /requestBody:[\s\S]*required: \[completionLocation\]/);
  assert.match(completePath, /completionLocation:[\s\S]*accuracyMeters:[\s\S]*capturedAt:[\s\S]*provider:/);

  assert.match(generatedBundle, /DshCreateFieldVisitRequest:[\s\S]*required: \[startLocation\]/);
  assert.match(generatedBundle, /completionLocation:/);
  assert.match(generatedClient, /startLocation:/);
  assert.match(generatedClient, /completionLocation:/);
});

test("JRN-024 publishes idempotency and correlation headers in source and generated contracts", () => {
  for (const operation of [
    "createDshFieldVisit",
    "completeDshFieldVisit",
    "upsertDshReadinessCheck",
    "createDshReadinessEscalation",
  ]) {
    const start = fieldPaths.indexOf(`operationId: ${operation}`);
    assert.notEqual(start, -1, `missing operation ${operation}`);
    const requestBody = fieldPaths.indexOf("requestBody:", start);
    const block = fieldPaths.slice(start, requestBody);
    assert.match(block, /components\/parameters\/IdempotencyKey/);
    assert.match(block, /components\/parameters\/CorrelationId/);
  }
  assert.match(generatedBundle, /name: Idempotency-Key/);
  assert.match(generatedBundle, /name: X-Correlation-ID/);
  assert.match(generatedClient, /"Idempotency-Key"/);
  assert.match(generatedClient, /"X-Correlation-ID"/);
});

test("JRN-024 removes production developer access and governs field activation", () => {
  assert.doesNotMatch(identityGate, /دخول سريع|123456|handleDevQuickLogin/);
  assert.match(identityGate, /requiredRole !== "field"/);
  assert.match(identityGate, /لا يمكن إصدار رمز ميداني ذاتيًا من التطبيق/);
});

test("JRN-024 uses a persistent per-install device fingerprint", () => {
  assert.doesNotMatch(identityStore, /DEVICE_FINGERPRINT\s*=\s*"bthwani-runtime-session"/);
  assert.match(identityStore, /configureIdentityDeviceFingerprintProvider/);
  assert.match(appRuntime, /Crypto\.randomUUID\(\)/);
  assert.match(appRuntime, /SecureStore\.setItemAsync\(FIELD_DEVICE_FINGERPRINT_KEY/);
});

test("JRN-024 accepts only governed app-field links and notification actions", () => {
  assert.match(appRuntime, /scheme !== FIELD_APP_SCHEME/);
  assert.doesNotMatch(appRuntime, /parseNotificationData|data\.route/);
});

test("JRN-024 isolates and clears encrypted offline work per workforce actor and installation", () => {
  assert.doesNotMatch(offlineQueue, /tenantId/);
  assert.match(offlineQueue, /readonly actorId: string/);
  assert.match(offlineQueue, /readonly installationId: string/);
  assert.match(offlineQueue, /configureFieldOfflineQueueStorage/);
  assert.match(offlineQueue, /scope\.actorId/);
  assert.match(offlineQueue, /scope\.installationId/);
  assert.doesNotMatch(offlineQueue, /submit_payout_request|upload_media_evidence/);
  assert.match(appRuntime, /installationId=\{installationState\.installationId\}/);
  assert.match(appIndex, /SecureStore\.setItemAsync/);
  assert.match(appIndex, /clearFieldOfflineQueue\(\)/);
});

test("JRN-024 blocks partner submission until required documents exist", () => {
  assert.match(onboardingTypes, /REQUIRED_DOCUMENT_TYPES\.filter/);
  assert.match(onboardingTypes, /DOCUMENT_TYPE_LABELS\[documentType\]/);
  assert.doesNotMatch(onboardingTypes, /Documents and photos are optional/);
});

test("JRN-024 keeps field escalation submission separate from operator queues", () => {
  assert.match(escalationScreen, /useFieldEscalationSubmissionController/);
  assert.doesNotMatch(escalationScreen, /useFieldEscalationController/);
  assert.doesNotMatch(escalationSubmission, /fetchOperatorEscalations/);
});

test("JRN-024 loads the full governed partner list instead of only the first page", () => {
  assert.match(fieldDraftsController, /loadAllFieldPartners/);
  assert.match(fieldDraftsController, /partners\.length < total/);
  assert.doesNotMatch(fieldDraftsController, /limit:\s*50/);
});

test("JRN-024 affected React Native screens contain no inline style objects", () => {
  for (const [name, source] of [
    ["visit", visitScreen],
    ["queue", queueScreen],
    ["checklist", checklistScreen],
  ]) {
    assert.doesNotMatch(source, /style=\{\{/u, `${name} screen contains an inline style object`);
  }
});
