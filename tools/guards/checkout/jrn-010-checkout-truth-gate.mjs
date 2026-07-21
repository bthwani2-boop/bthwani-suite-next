import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkoutHttp = readFileSync("services/dsh/backend/internal/http/checkout.go", "utf8");
const checkoutDomain = readFileSync("services/dsh/backend/internal/checkout/checkout.go", "utf8");
const wltClient = readFileSync("services/dsh/backend/internal/wlt/client.go", "utf8");
const routes = readFileSync("services/dsh/backend/internal/http/server.go", "utf8");
const operatorScreen = readFileSync("services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx", "utf8");

assert.match(routes, /GET \/dsh\/operator\/checkout-intents/);
assert.match(routes, /POST \/dsh\/operator\/checkout-intents\/\{intentId\}\/reconcile/);
assert.match(operatorScreen, /reconciliationRequired/);
assert.match(operatorScreen, /إعادة المصالحة/);
assert.match(checkoutHttp, /OperationsPermissionManage/);
assert.match(checkoutHttp, /reconciliationAgeSeconds/);
