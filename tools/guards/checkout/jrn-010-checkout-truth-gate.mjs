import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkoutHttp = readFileSync("services/dsh/backend/internal/http/checkout.go", "utf8");
const checkoutDomain = readFileSync("services/dsh/backend/internal/checkout/checkout.go", "utf8");
const wltClient = readFileSync("services/dsh/backend/internal/wlt/client.go", "utf8");
const routes = readFileSync("services/dsh/backend/internal/http/server.go", "utf8");
const operatorScreen = readFileSync("services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx", "utf8");

assert.match(checkoutHttp, /requireActor\(w, r, "client"\)/);
assert.match(checkoutHttp, /cartId, storeId and authenticated tenant are required/);
assert.match(checkoutHttp, /ComputeCheckoutSnapshotForClientTx/);
assert.match(routes, /POST \/dsh\/client\/checkout-intents/);
