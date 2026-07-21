import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkoutHttp = readFileSync("services/dsh/backend/internal/http/checkout.go", "utf8");
const checkoutDomain = readFileSync("services/dsh/backend/internal/checkout/checkout.go", "utf8");
const wltClient = readFileSync("services/dsh/backend/internal/wlt/client.go", "utf8");
const routes = readFileSync("services/dsh/backend/internal/http/server.go", "utf8");
const operatorScreen = readFileSync("services/dsh/frontend/control-panel/operations/CheckoutActivityScreen.tsx", "utf8");

assert.match(checkoutHttp, /ModeBthwaniDelivery/);
assert.match(checkoutHttp, /ModePartnerDelivery/);
assert.match(checkoutHttp, /ModePickup/);
assert.match(checkoutHttp, /MethodCOD/);
assert.match(checkoutHttp, /MethodWallet/);
assert.match(checkoutHttp, /MethodMixed/);
assert.match(checkoutHttp, /MethodOfficialWallet/);
assert.match(checkoutHttp, /DELIVERY_ADDRESS_REQUIRED/);
