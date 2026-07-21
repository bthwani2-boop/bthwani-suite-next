import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkoutHttp = readFileSync("services/dsh/backend/internal/http/checkout.go", "utf8");
const checkoutDomain = readFileSync("services/dsh/backend/internal/checkout/checkout.go", "utf8");
const wltSessionBinding = readFileSync("services/dsh/backend/internal/checkout/wlt_session_idempotency.go", "utf8");
const routes = readFileSync("services/dsh/backend/internal/http/server.go", "utf8");
const operatorScreen = readFileSync("services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx", "utf8");
const sharedIntegrity = readFileSync("services/dsh/tests/jrn-005-010-integrity.test.mjs", "utf8");
const idempotencyMigration = readFileSync("services/dsh/database/migrations/dsh-901_checkout_create_idempotency.sql", "utf8");

assert.match(routes, /GET \/dsh\/operator\/checkout-intents/);
assert.match(routes, /POST \/dsh\/operator\/checkout-intents\/\{intentId\}\/reconcile/);
assert.match(operatorScreen, /reconciliationRequired/);
assert.match(operatorScreen, /إعادة المصالحة/);
assert.match(checkoutHttp, /OperationsPermissionManage/);
assert.match(checkoutHttp, /reconciliationAgeSeconds/);
assert.match(checkoutHttp, /intent\.State != checkout\.StatePending && intent\.State != checkout\.StateWltOutcomeUnknown/);
assert.match(checkoutHttp, /AttachWltPaymentSessionIdempotent/);
assert.match(checkoutHttp, /IdempotencyKey:\s+"dsh-checkout-intent:" \+ intent\.ID/);
assert.match(wltSessionBinding, /state IN \('pending', 'wlt_handoff_failed', 'wlt_outcome_unknown'\)/);
assert.match(checkoutDomain, /StateWltOutcomeUnknown/);
assert.match(sharedIntegrity, /test\("JRN-010 reuses one checkout and one WLT session for retries"/);
assert.match(sharedIntegrity, /getOrCreateCheckoutAttempt/);
assert.match(sharedIntegrity, /AttachWltPaymentSessionIdempotent/);
assert.match(idempotencyMigration, /PRIMARY KEY \(tenant_id, client_id, idempotency_key\)/);

console.log("JRN-010 checkout truth gate passed.");
