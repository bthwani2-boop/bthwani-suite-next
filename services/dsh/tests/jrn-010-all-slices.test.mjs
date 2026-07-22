import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const readJson = (path) => JSON.parse(read(path));

const sliceRegistryPath = "services/dsh/contracts/jrn-010-slice-verification-registry.json";
const productTruthPath = "governance/product/contracts/jrn-010-checkout-wlt-handoff.product-truth.json";

test("JRN-010 registers exactly FS-01 through FS-18", () => {
  const registry = readJson(sliceRegistryPath);
  assert.equal(registry.journeyId, "JRN-010");
  assert.equal(registry.slices.length, 18);
  assert.deepEqual(
    registry.slices.map((slice) => slice.id),
    Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`),
  );
  for (const slice of registry.slices) {
    assert.ok(slice.evidence.length > 0, `${slice.id} must have code evidence`);
    assert.match(slice.status, /^IMPLEMENTED(?:_PENDING_CI)?$/);
  }
});

test("FS-01..04 product truth fixes actors, boundaries, transitions and invariants", () => {
  const truth = readJson(productTruthPath);
  assert.equal(truth.journeyId, "JRN-010");
  assert.deepEqual(truth.requiredSurfaces, [
    "app-client",
    "control-panel",
    "dsh-backend",
    "dsh-postgresql",
    "wlt-boundary",
  ]);
  assert.equal(truth.truthOwners.paymentSessionAuthorizationCaptureRefundLedger, "WLT");
  assert.equal(truth.truthOwners.checkoutIntentAndOperationalState, "DSH");
  assert.ok(truth.transitions.some((transition) => transition.to === "wlt_outcome_unknown"));
  assert.ok(truth.transitions.some((transition) => transition.to === "payment_confirmed"));
  assert.ok(truth.negativeInvariants.some((rule) => rule.includes("cannot commit partially")));
  assert.ok(truth.acceptanceCriteria.some((rule) => rule.includes("same commit")));
});

test("FS-05 database owns durable tenant and session-scoped WLT event receipts", () => {
  const migration = read("services/dsh/database/migrations/dsh-910_jrn_010_wlt_event_receipts.sql");
  const dbTest = read("services/dsh/database/tests/dsh-910_jrn_010_wlt_event_receipts.sql");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS dsh_checkout_wlt_event_receipts/);
  assert.match(migration, /PRIMARY KEY/);
  assert.match(migration, /trg_dsh_guard_checkout_wlt_event_receipt/);
  assert.match(migration, /intent_tenant <> NEW\.tenant_id/);
  assert.match(migration, /intent_session <> NEW\.payment_session_id/);
  assert.match(migration, /idx_dsh_checkout_reconciliation_queue/);
  assert.match(dbTest, /tenant mismatch was not rejected/);
  assert.match(dbTest, /payment-session mismatch was not rejected/);
  assert.match(dbTest, /duplicate event key was not rejected/);
});

test("FS-06 contract shard is authoritative and registered", () => {
  const contract = read("services/dsh/contracts/dsh.jrn-010-checkout.openapi.yaml");
  const master = read("contracts/master.openapi.yaml");
  assert.match(contract, /x-bthwani-journey-id: JRN-010/);
  assert.match(contract, /operationId: createDshClientCheckoutIntent/);
  assert.match(contract, /operationId: reconcileDshOperatorCheckoutIntent/);
  assert.match(contract, /operationId: applyDshWltPaymentSessionEvent/);
  assert.match(contract, /eventId: \{type: string, minLength: 8, maxLength: 200\}/);
  assert.match(master, /dshCheckoutWltHandoff: \.\.\/services\/dsh\/contracts\/dsh\.jrn-010-checkout\.openapi\.yaml/);
});

test("FS-07..08 apply checkout, coupon and event receipt atomically", () => {
  const handler = read("services/dsh/backend/internal/http/wlt_events.go");
  const checkoutAtomic = read("services/dsh/backend/internal/checkout/wlt_event_atomic.go");
  const couponAtomic = read("services/dsh/backend/internal/coupons/payment_lifecycle_tx.go");
  assert.match(handler, /BeginTx\(r\.Context\(\), nil\)/);
  assert.match(handler, /checkout\.ApplyWltPaymentEventTx/);
  assert.match(handler, /checkout\.BeginWltPaymentEventTx/);
  assert.match(handler, /coupons\.ApplyPaymentOutcomeTx/);
  assert.match(handler, /checkout\.MarkWltPaymentEventAppliedTx/);
  assert.match(handler, /tx\.Commit\(\)/);
  assert.match(checkoutAtomic, /ErrWltEventReplayConflict/);
  assert.match(checkoutAtomic, /ON CONFLICT \(event_key\) DO NOTHING/);
  assert.match(checkoutAtomic, /existingPayloadHash != payloadHash/);
  assert.match(couponAtomic, /ReleaseByIntentTx/);
});

test("FS-07 WLT session creation remains checkout-owned and idempotent", () => {
  const handler = read("services/dsh/backend/internal/http/checkout.go");
  const binding = read("services/dsh/backend/internal/checkout/wlt_session_idempotency.go");
  assert.match(handler, /IdempotencyKey:\s+"dsh-checkout-intent:" \+ intent\.ID/);
  assert.match(handler, /MarkWltOutcomeUnknown/);
  assert.match(handler, /handleReconcileCheckoutIntent/);
  assert.match(binding, /wlt_outcome_unknown/);
});

test("FS-09..12 shared brain and client surface expose canonical recovery states", () => {
  const types = read("services/dsh/frontend/shared/checkout/checkout.types.ts");
  const viewModel = read("services/dsh/frontend/shared/checkout/checkout.view-model.ts");
  const flow = read("services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx");
  const client = read("services/dsh/frontend/app-client/checkout/GovernedCheckoutScreen.tsx");
  assert.match(types, /kind: "reconciliation_pending"/);
  assert.match(types, /kind: "terminal"/);
  assert.match(viewModel, /case "wlt_outcome_unknown"/);
  assert.match(viewModel, /checkoutReconciliationPendingState/);
  assert.match(viewModel, /case "payment_failed"/);
  assert.match(flow, /setTimeout/);
  assert.match(flow, /reconciliationPending \? 3_000 : 5_000/);
  assert.match(flow, /reloadCheckout/);
  assert.match(client, /نتيجة WLT غير مؤكدة/);
  assert.match(client, /تحديث الحالة الآن/);
  assert.match(client, /انتهت جلسة الدفع/);
  assert.match(client, /فشلت عملية الدفع/);
});

test("FS-10..15 control panel is read-oriented and exposes governed reconciliation queues", () => {
  const controlPanel = read("services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx");
  assert.match(controlPanel, /المستأجر/);
  assert.match(controlPanel, /تحتاج مصالحة/);
  assert.match(controlPanel, /wlt_outcome_unknown/);
  assert.match(controlPanel, /لا توجد أزرار خصم أو استرداد أو تسوية هنا/);
  assert.doesNotMatch(controlPanel, /capturePayment|refundPayment|settlePayment|walletBalance/);
});

test("FS-13 DSH protects client, operator and service boundaries", () => {
  const checkoutHandler = read("services/dsh/backend/internal/http/checkout.go");
  const eventHandler = read("services/dsh/backend/internal/http/wlt_events.go");
  assert.match(checkoutHandler, /requireActor\(w, r, "client"\)/);
  assert.match(checkoutHandler, /requirePermission\(w, r, "control-panel", OperationsPermissionRead/);
  assert.match(checkoutHandler, /requirePermission\(w, r, "control-panel", OperationsPermissionManage/);
  assert.match(eventHandler, /RequireServiceCaller\(w, r, "DSH_WLT_SERVICE_TOKEN", "wlt"\)/);
});

test("FS-13..17 initialize private media storage before DSH readiness", () => {
  const compose = read("infra/docker/compose.runtime.yml");
  assert.match(compose, /minio-init:/);
  assert.match(compose, /mc mb --ignore-existing local\/dsh-media/);
  assert.match(compose, /mc anonymous set none local\/dsh-media/);
  assert.match(compose, /mc admin policy attach local dsh-media-rw --user/);
  assert.match(compose, /minio-init:\s*\n\s*condition: service_completed_successfully/);
  assert.doesNotMatch(compose, /DSH_MINIO_ACCESS_KEY:.*BTHWANI_MINIO_ROOT_USER/);
});

test("FS-16..18 have a dedicated gate, workflow, runbook and evidence contract", () => {
  const gate = read("tools/guards/checkout/jrn-010-checkout-truth-gate.mjs");
  const workflow = read(".github/workflows/jrn-010-all-slices.yml");
  const runbook = read("governance/runbooks/JRN-010_CHECKOUT_WLT_OPERATIONS.md");
  const evidence = readJson("governance/evidence/JRN-010_CHECKOUT_WLT_ALL_SLICES_CLOSURE.json");
  assert.match(gate, /AttachWltPaymentSessionIdempotent/);
  assert.match(workflow, /journeys\/jrn-010\/all-slices/);
  assert.match(workflow, /runtime-postgresql/);
  assert.match(workflow, /infra\/docker\/compose\.runtime\.yml/);
  assert.match(runbook, /Rollback/);
  assert.equal(evidence.journeyId, "JRN-010");
  assert.equal(evidence.decision, "READY_FOR_REVIEW");
  assert.deepEqual(evidence.openCodeGaps, []);
});
