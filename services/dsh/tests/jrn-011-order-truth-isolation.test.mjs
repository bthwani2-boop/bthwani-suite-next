import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("JRN-011 verifies checkout ownership before checkout-level replay", () => {
  const backend = read("backend/internal/orders/order_truth.go");

  assert.match(
    backend,
    /SELECT 1\s+FROM dsh_checkout_intents\s+WHERE id=\$1::uuid AND tenant_id=\$2 AND client_id=\$3\s+FOR SHARE/s,
  );
  assert.match(
    backend,
    /FROM dsh_order_create_idempotency\s+WHERE tenant_id=\$1 AND client_id=\$2 AND checkout_intent_id=\$3::uuid\s+FOR UPDATE/s,
  );
  assert.match(
    backend,
    /FROM dsh_orders\s+WHERE tenant_id=\$1 AND client_id=\$2 AND checkout_intent_id=\$3::uuid\s+FOR UPDATE/s,
  );
  assert.match(backend, /if truth\.ClientID != input\.ClientID/);
  assert.doesNotMatch(
    backend,
    /WHERE tenant_id=\$1 AND checkout_intent_id=\$2::uuid\s+FOR UPDATE/s,
  );
});

test("JRN-011 client and partner detail reads apply actor scope before hydration", () => {
  const queries = read("backend/internal/orders/order_truth_queries.go");
  const handlers = read("backend/internal/http/order_truth.go");

  assert.match(queries, /WHERE id=\$1::uuid AND tenant_id=\$2 AND client_id=\$3/);
  assert.match(queries, /WHERE id=\$1::uuid AND tenant_id=\$2 AND store_id=\$3/);
  assert.match(handlers, /GetClientScopedOrderTruth/);
  assert.match(handlers, /GetPartnerScopedOrderTruth/);
  assert.doesNotMatch(handlers, /truth\.ClientID != actor\.ID/);
});
