import assert from "node:assert/strict";
import fs from "node:fs";

const cartScreen = fs.readFileSync("services/dsh/frontend/app-client/cart/CartScreen.tsx", "utf8");
const governedCartScreen = fs.readFileSync("services/dsh/frontend/app-client/cart/GovernedCartScreen.tsx", "utf8");

assert.match(cartScreen, /controller\.removeItem\(item\.cartId, item\.id\)/);
assert.doesNotMatch(cartScreen, /controller\.state\.cart\.id/);
assert.match(cartScreen, /if \(cart\) void controller\.clear\(cart\)/);
assert.doesNotMatch(cartScreen, /controller\.clear\(controller\.state\.cart\)/);
assert.match(cartScreen, /serviceabilityController\.serviceability\.kind === "blocked"/);
assert.match(cartScreen, /serviceabilityController\.serviceability\.kind === "error"/);
assert.doesNotMatch(cartScreen, /disabled=\{serviceabilityController\.serviceability\.kind === "checking"\}/);

assert.match(governedCartScreen, /const payment = useWltDshPaymentController\(\);/);
assert.doesNotMatch(governedCartScreen, /useWltDshPaymentController\(presentationSubtotal\)/);
assert.match(governedCartScreen, /presentationSubtotal\.toLocaleString/);

console.log("JRN-001 FS-10 app-client cart actions and WLT presentation boundary verified");
