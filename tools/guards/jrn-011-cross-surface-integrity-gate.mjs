import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("../../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, ROOT), "utf8");
}

function mustContain(source, markers, label) {
  for (const marker of markers) {
    assert.ok(source.includes(marker), `${label} is missing canonical marker: ${marker}`);
  }
}

function mustNotContain(source, markers, label) {
  for (const marker of markers) {
    assert.ok(!source.includes(marker), `${label} contains forbidden local-truth marker: ${marker}`);
  }
}

const [
  api,
  controller,
  checkoutFlow,
  partnerSurface,
  operatorSurface,
  backendRoutes,
  backendTruth,
] = await Promise.all([
  text("services/dsh/frontend/shared/order-truth/order-truth.api.ts"),
  text("services/dsh/frontend/shared/order-truth/use-order-truth-controller.ts"),
  text("services/dsh/frontend/shared/checkout/use-checkout-to-order-flow.tsx"),
  text("services/dsh/frontend/app-partner/orders/OperationalOrdersInboxScreen.tsx"),
  text("services/dsh/frontend/control-panel/operations/OrderJourneyLiveOrdersScreen.tsx"),
  text("services/dsh/backend/internal/http/catalog_unified_routes.go"),
  text("services/dsh/backend/internal/orders/order_truth.go"),
]);

mustContain(api, [
  "/dsh/client/order-truth",
  "idempotencyKey: context.idempotencyKey",
  "correlationId: context.correlationId",
  "fetchClientOrderTruthDetail",
  "/dsh/partner/order-truth",
  "/dsh/operator/order-truth",
], "shared order-truth API");

mustContain(controller, [
  "getOrCreateOrderTruthAttempt",
  "createOrderTruth(input, attempt.context",
  "fetchClientOrderTruthDetail(created.id",
  "readback.checkoutIntentId",
  "clearOrderTruthAttempt(attempt.fingerprint)",
], "order-truth controller read-after-write");

mustContain(checkoutFlow, [
  'from "../order-truth"',
  "useCreateOrderTruthController",
  "orderNumber",
  "correlationId",
], "app-client checkout binding");

mustContain(partnerSurface, [
  "from '../../shared/order-truth'",
  "<OrderTruthReadbackSummary",
  'actor="partner"',
], "app-partner binding");

mustContain(operatorSurface, [
  "from '../../shared/order-truth'",
  "<OrderTruthReadbackSummary",
  'actor="operator"',
], "control-panel binding");

mustContain(backendRoutes, [
  "POST /dsh/client/order-truth",
  "GET /dsh/client/order-truth/{orderId}",
  "GET /dsh/partner/order-truth",
  "GET /dsh/operator/order-truth",
], "backend canonical routes");

mustContain(backendTruth, [
  "pg_advisory_xact_lock",
  "dsh_order_create_idempotency",
  "tenant_id=$1",
  "AllowedActions",
  "payment_status_projection",
], "backend order truth");

mustNotContain(api, [
  "mockOrder",
  "fakeOrder",
  "localStorage",
  "Math.random()",
  "wallet.debit",
  "wallet.credit",
], "shared order-truth API");

mustNotContain(checkoutFlow, [
  "useCreateOrderController",
  "totalPrice =",
  "allowedActions =",
], "app-client checkout binding");

console.log("JRN-011 cross-surface integrity gate passed.");
