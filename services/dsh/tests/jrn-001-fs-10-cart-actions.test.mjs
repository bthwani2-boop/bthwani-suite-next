import assert from "node:assert/strict";
import fs from "node:fs";

const cartScreen = fs.readFileSync("services/dsh/frontend/app-client/cart/CartScreen.tsx", "utf8");
const governedCartScreen = fs.readFileSync("services/dsh/frontend/app-client/cart/GovernedCartScreen.tsx", "utf8");
const cartIndex = fs.readFileSync("services/dsh/frontend/app-client/cart/index.ts", "utf8");
const checkoutRoute = fs.readFileSync("services/dsh/frontend/app-client/checkout/ClientCheckoutRoute.tsx", "utf8");
const storeMeasurementSheet = fs.readFileSync("services/dsh/frontend/app-client/store/StoreMeasurementSheet.tsx", "utf8");

assert.match(cartIndex, /export \{ CartScreen \} from ["']\.\/CartScreen["']/);
assert.match(cartIndex, /export \{ GovernedCartScreen \} from ["']\.\/GovernedCartScreen["']/);
assert.doesNotMatch(cartIndex, /GovernedCartScreen as CartScreen/);

assert.match(cartScreen, /controller\.removeItem\(item\.cartId, item\.id\)/);
assert.doesNotMatch(cartScreen, /controller\.state\.cart\.id/);
assert.match(cartScreen, /if \(cart\) void controller\.clear\(cart\)/);
assert.doesNotMatch(cartScreen, /controller\.clear\(controller\.state\.cart\)/);
assert.match(cartScreen, /serviceabilityController\.serviceability\.kind === "blocked"/);
assert.match(cartScreen, /serviceabilityController\.serviceability\.kind === "error"/);
assert.doesNotMatch(cartScreen, /disabled=\{serviceabilityController\.serviceability\.kind === "checking"\}/);
assert.match(cartScreen, /authKind\?: "authenticated" \| "unauthenticated" \| undefined/);
assert.match(cartScreen, /onProceedToCheckout\?: \(\(/);
assert.match(cartScreen, /onManageAddresses\?: \(\(\) => void\) \| undefined/);
assert.match(cartScreen, /onBrowseCatalog\?: \(\(\) => void\) \| undefined/);
assert.match(cartScreen, /onBack\?: \(\(\) => void\) \| undefined/);

assert.match(governedCartScreen, /const payment = useWltDshPaymentController\(\);/);
assert.doesNotMatch(governedCartScreen, /useWltDshPaymentController\(presentationSubtotal\)/);
assert.match(governedCartScreen, /presentationSubtotal\.toLocaleString/);

assert.match(checkoutRoute, /\.\.\.\(onSuccess \? \{ onSuccess \} : \{\}\)/);
assert.doesNotMatch(checkoutRoute, /onSuccess=\{onSuccess\}/);

assert.match(storeMeasurementSheet, /errorMessage\?: string \| null \| undefined/);

console.log("JRN-001 FS-10 canonical cart, checkout, and store sheet optional boundaries verified");
