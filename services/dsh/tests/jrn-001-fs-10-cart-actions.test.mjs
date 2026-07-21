import assert from "node:assert/strict";
import fs from "node:fs";

const cartScreen = fs.readFileSync("services/dsh/frontend/app-client/cart/CartScreen.tsx", "utf8");

assert.match(cartScreen, /controller\.removeItem\(item\.cartId, item\.id\)/);
assert.doesNotMatch(cartScreen, /controller\.state\.cart\.id/);
assert.match(cartScreen, /if \(cart\) void controller\.clear\(cart\)/);
assert.doesNotMatch(cartScreen, /controller\.clear\(controller\.state\.cart\)/);

console.log("JRN-001 FS-10 app-client cart action ownership verified");
