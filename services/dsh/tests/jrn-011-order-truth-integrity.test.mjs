import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const DSH_ROOT = new URL("../", import.meta.url);
const REPO_ROOT = new URL("../../../", import.meta.url);

const readDsh = (path) => fs.readFileSync(new URL(path, DSH_ROOT), "utf8");
const readRepo = (path) => fs.readFileSync(new URL(path, REPO_ROOT), "utf8");

function assertAll(source, markers, label) {
  for (const marker of markers) {
    assert.match(source, marker, `${label} is missing ${marker}`);
  }
}

function assertNone(source, markers, label) {
  for (const marker of markers) {
    assert.doesNotMatch(source, marker, `${label} contains forbidden ${marker}`);
  }
}

test("JRN-011 product, state, boundary and RBAC truth are explicit", () => {
  const product = readRepo("governance/product/contracts/jrn-011-order-creation-truth.product-truth.json");
  const rbac = readDsh("contracts/jrn-011-surface-rbac-registry.json");
  const state = readDsh("contracts/jrn-011-order-state-policy.json");
  const boundary = readRepo("governance/boundaries/jrn-011-dsh-wlt-order-truth-boundary.md");

  assertAll(product, [
    /"journeyId": "JRN-011"/,
    /Checkout Intent واحد طلبًا واحدًا فقط/,
    /snapshot السعر أو العنوان أو العناصر/,
    /"decision": "FIX_REQUIRED"/,
  ], "product truth");
  assertAll(rbac, [
    /"defaultEffect": "deny"/,
    /tenant_id = actor\.tenant_id AND client_id = actor\.id/,
    /store_id IN actor\.partnerStoreIds/,
    /operations\.read/,
  ], "RBAC registry");
  assertAll(state, [
    /"initialState": "pending"/,
    /"eventType": "order\.created"/,
    /"allowedActionsByActor"/,
  ], "state policy");
  assertAll(boundary, [
    /DSH owns/,
    /WLT owns/,
    /never calls a wallet mutation/,
    /No retry may create a second order/,
  ], "DSH-WLT boundary");
});

test("JRN-011 database stores one immutable order truth and transactional events", () => {
  const migration902 = readDsh("database/migrations/dsh-902_jrn_011_order_truth.sql");
  const migration903 = readDsh("database/migrations/dsh-903_jrn_011_order_event_runtime.sql");
  const migration904 = readDsh("database/migrations/dsh-904_jrn_011_order_truth_audit.sql");
  const pricing = readDsh("database/migrations/dsh-062_checkout_coupon_pricing_engine.sql");
  const dbTest = readDsh("database/tests/dsh-902_903_jrn011_order_truth_invariants.sql");

  assertAll(migration902, [
    /ADD COLUMN IF NOT EXISTS order_number TEXT/,
    /ADD COLUMN IF NOT EXISTS correlation_id TEXT/,
    /PRIMARY KEY \(tenant_id, client_id, idempotency_key\)/,
    /UNIQUE \(tenant_id, checkout_intent_id\)/,
    /CREATE TABLE IF NOT EXISTS dsh_order_event_outbox/,
    /trg_dsh_jrn011_protect_order_snapshot/,
  ], "dsh-902");
  assertAll(pricing, [
    /dsh_apply_checkout_pricing_to_order/,
    /NEW\.subtotal_minor_units := checkout_pricing\.subtotal_minor_units/,
    /NEW\.total_minor_units := checkout_pricing\.total_minor_units/,
    /pricing snapshot is missing or invalid/,
    /dsh_protect_order_pricing_snapshot/,
  ], "authoritative pricing trigger");
  assertAll(migration903, [
    /NEW\.version := OLD\.version \+ 1/,
    /trg_dsh_jrn011_enrich_order_event/,
    /trg_dsh_jrn011_order_event_outbox/,
    /ON CONFLICT \(tenant_id,event_id\) DO NOTHING/,
  ], "dsh-903");
  assertAll(migration904, [
    /CREATE TABLE IF NOT EXISTS dsh_order_truth_audit/,
    /dsh_jrn011_validate_audit_metadata/,
    /authorization\|bearer\|idempotency/,
  ], "dsh-904");
  assertAll(dbTest, [
    /tenant order-number uniqueness/,
    /tenant\/client idempotency key/,
    /immutable order snapshot trigger/,
    /transactional order event outbox trigger/,
  ], "database invariants");
});

test("JRN-011 OpenAPI matches the exact canonical runtime paths and flat JSON model", () => {
  const contract = readDsh("contracts/dsh.order-truth.openapi.yaml");
  assertAll(contract, [
    /\/dsh\/client\/order-truth:/,
    /\/dsh\/client\/order-truth\/\{orderId\}:/,
    /\/dsh\/client\/order-truth\/\{orderId\}\/events:/,
    /\/dsh\/partner\/order-truth:/,
    /\/dsh\/operator\/order-truth\/diagnostics:/,
    /Idempotency-Key/,
    /Idempotent-Replay/,
    /deliveryAddressSnapshot:/,
    /subtotalMinorUnits:/,
    /totalMinorUnits:/,
    /paymentStatusProjection:/,
    /wltPaymentRefId:/,
  ], "order truth OpenAPI");
  assertNone(contract, [
    /\/dsh\/client\/orders:/,
    /^\s+pricing:\s+\{ \$ref:/m,
    /^\s+paymentProjection:\s+\{ \$ref:/m,
  ], "order truth OpenAPI");
});

test("JRN-011 backend creation is tenant/client scoped, idempotent and replay safe", () => {
  const backend = readDsh("backend/internal/orders/order_truth.go");
  const queries = readDsh("backend/internal/orders/order_truth_queries.go");
  const handler = readDsh("backend/internal/http/order_truth.go");
  const routes = readDsh("backend/internal/http/catalog_unified_routes.go");

  assertAll(backend, [
    /pg_advisory_xact_lock/,
    /dsh_order_create_idempotency/,
    /WHERE tenant_id=\$1 AND checkout_intent_id=\$2::uuid/,
    /checkout intent is not eligible for order creation/,
    /ON CONFLICT \(tenant_id,event_id\) DO NOTHING/,
    /getOrderTruthTx/,
    /AllowedActions/,
  ], "order truth backend");
  assertAll(queries, [
    /WHERE id=\$1::uuid AND tenant_id=\$2 AND client_id=\$3/,
    /WHERE id=\$1::uuid AND tenant_id=\$2 AND store_id=\$3/,
    /truth\.ClientID = ""/,
    /\{\"redacted\":true\}/,
  ], "actor scoped reads");
  assertAll(handler, [
    /r\.Header\.Get\("Idempotency-Key"\)/,
    /IDEMPOTENCY_KEY_REUSED/,
    /Idempotent-Replay/,
    /GetClientScopedOrderTruth/,
    /GetPartnerScopedOrderTruth/,
    /RecordOrderTruthAudit/,
  ], "order truth HTTP handlers");
  assertAll(routes, [
    /POST \/dsh\/client\/order-truth/,
    /GET \/dsh\/partner\/order-truth/,
    /GET \/dsh\/operator\/order-truth\/diagnostics/,
  ], "canonical route registry");
});

test("JRN-011 outbox retries, stale lease recovery and diagnostics are bounded", () => {
  const outbox = readDsh("backend/internal/orders/order_event_outbox.go");
  const diagnostics = readDsh("backend/internal/orders/order_truth_diagnostics.go");
  const runbook = readRepo("governance/runbooks/jrn-011-order-truth-operations.md");

  assertAll(outbox, [
    /FOR UPDATE SKIP LOCKED/,
    /status='processing' AND updated_at < NOW\(\)-INTERVAL '5 minutes'/,
    /attempt_count >= 12/,
    /NOW\(\)\+\(\$3 \* INTERVAL '1 second'\)/,
    /dead_letter/,
  ], "order event outbox");
  assertAll(diagnostics, [
    /IncompleteCreateAttempts/,
    /DeadLetterOutboxEvents/,
    /UnknownPaymentProjections/,
    /ORDER_SNAPSHOT_TAMPER_ATTEMPT/,
    /tenant_id=\$1/,
  ], "order truth diagnostics");
  assertAll(runbook, [
    /Duplicate orders per Checkout Intent/,
    /ORDER_EVENT_OUTBOX_DEAD_LETTER/,
    /Safe recovery/,
    /Rollback/,
  ], "operations runbook");
});

test("JRN-011 shared brain performs durable create and actor-scoped read-after-write", () => {
  const attempt = readDsh("frontend/shared/order-truth/order-truth-create-attempt.ts");
  const api = readDsh("frontend/shared/order-truth/order-truth.api.ts");
  const controller = readDsh("frontend/shared/order-truth/use-order-truth-controller.ts");
  const states = readDsh("frontend/shared/order-truth/order-truth.visible-states.ts");
  const experience = readDsh("frontend/shared/order-truth/order-truth.experience.ts");

  assertAll(attempt, [
    /AsyncStorage/,
    /@bthwani\/order-truth-create-attempt:v1/,
    /getOrCreateOrderTruthAttempt/,
    /clearOrderTruthAttempt/,
  ], "durable order attempt");
  assertAll(api, [
    /\/dsh\/client\/order-truth/,
    /idempotencyKey: context\.idempotencyKey/,
    /\/dsh\/partner\/order-truth/,
    /\/dsh\/operator\/order-truth/,
  ], "shared order truth API");
  assertAll(controller, [
    /createOrderTruth\(input, attempt\.context/,
    /fetchClientOrderTruthDetail\(created\.id/,
    /readback\.checkoutIntentId/,
    /clearOrderTruthAttempt\(attempt\.fingerprint\)/,
    /isTerminalOrderTruth/,
  ], "shared order truth controller");
  assertAll(states, [
    /"partial"/,
    /"offline"/,
    /"forbidden"/,
    /"conflict"/,
    /retryable: false/,
  ], "visible state policy");
  assertAll(experience, [
    /bidiIsolate/,
    /buildOrderTruthAccessibilityLabel/,
    /networkClass === "offline"/,
    /input\.terminal/,
    /minimumTouchTargetPx: 44/,
  ], "RTL accessibility and network policy");
});

test("JRN-011 surfaces consume immutable totals, business numbers and server actions", () => {
  const checkout = readDsh("frontend/shared/checkout/use-checkout-to-order-flow.tsx");
  const list = readDsh("frontend/app-client/orders/OrdersListScreen.tsx");
  const journey = readDsh("frontend/shared/orders/use-client-order-journey-controller.ts");
  const tracking = readDsh("frontend/app-client/orders/OrderTrackingScreen.tsx");
  const partner = readDsh("frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx");
  const operator = readDsh("frontend/control-panel/operations/OrderJourneyLiveOrdersScreen.tsx");

  assertAll(checkout, [
    /useCreateOrderTruthController/,
    /orderNumber/,
    /correlationId/,
  ], "client checkout");
  assertAll(list, [
    /useOrderTruthCollectionController\("client"/,
    /order\.orderNumber/,
    /order\.totalMinorUnits/,
    /order\.allowedActions/,
    /item\.lineTotalMinorUnits/,
  ], "client order list");
  assertNone(list, [
    /items\.reduce/,
    /useClientOrdersController/,
    /ORDER_STATUS_LABELS/,
  ], "client order list");
  assertAll(journey, [
    /fetchClientOrderTruthDetail/,
    /type OrderTruth/,
    /isTerminalOrderTruth/,
  ], "client order journey controller");
  assertAll(tracking, [
    /order\.orderNumber/,
    /order\.totalMinorUnits/,
    /order\.statusTimeline/,
    /order\.paymentStatusProjection/,
    /order\.correlationId/,
    /allowedActions\.includes\('cancel_if_policy_allows'\)/,
  ], "client tracking surface");
  assertNone(tracking, [/items\.reduce/, /fetchClientOrder\(/], "client tracking surface");
  assertAll(partner, [/<OrderTruthReadbackSummary/, /actor="partner"/], "partner surface");
  assertAll(operator, [/<OrderTruthReadbackSummary/, /actor="operator"/], "operator surface");
});

test("JRN-011 keeps DSH outside financial execution and local mock truth", () => {
  const api = readDsh("frontend/shared/order-truth/order-truth.api.ts");
  const backend = readDsh("backend/internal/orders/order_truth.go");
  const compatibility = readDsh("contracts/jrn-011-legacy-compatibility.json");

  assertNone(api, [/mockOrder/, /fakeOrder/, /localStorage/, /Math\.random\(\)/, /wallet\.debit/, /wallet\.credit/], "shared API");
  assertNone(backend, [/wallet\.debit/, /wallet\.credit/, /refund\.execute/, /settlement\.execute/], "backend order creation");
  assertAll(compatibility, [
    /"status": "COMPATIBILITY_ONLY"/,
    /"newJrn011ConsumersAllowed": false/,
    /Client list does not sum live item prices/,
  ], "legacy compatibility registry");
});
