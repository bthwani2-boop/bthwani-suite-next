import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

const governedCoupons = read("services/dsh/backend/internal/coupons/governed.go");
const couponsController = read("services/dsh/frontend/shared/marketing/use-coupons-controller.ts");
const couponsPublic = read("services/dsh/frontend/shared/marketing/coupons.public.ts");
const couponsDeck = read("services/dsh/frontend/control-panel/marketing/components/CouponsCommandDeck.tsx");
const termsEditor = read("services/dsh/frontend/control-panel/marketing/components/CouponTermsEditor.tsx");

test("JRN-026 mounts a governed coupon terms and scope editor", () => {
  assert.match(couponsPublic, /useCouponsController/);
  assert.match(termsEditor, /coupons\.public/);
  assert.match(couponsDeck, /import \{ CouponTermsEditor \} from "\.\/CouponTermsEditor"/);
  assert.match(couponsDeck, /<CouponTermsEditor[\s\S]*coupon=\{coupon\}[\s\S]*onSave=\{controller\.update\}/);
  assert.match(termsEditor, /تعديل الشروط والنطاق/);
  assert.match(termsEditor, /شروط الكوبون ونطاقه/);
  assert.match(termsEditor, /eligibleFulfillmentModes: modes/);
  assert.match(termsEditor, /storeId: storeId\.trim\(\)/);
  assert.match(termsEditor, /globalUsageLimit: totalLimit/);
  assert.match(termsEditor, /perClientUsageLimit: perClient/);
  assert.match(termsEditor, /startsAt: startsAtValue/);
  assert.match(termsEditor, /endsAt: endsAtValue/);
});

test("JRN-026 prevents in-place edits of active and archived coupon terms", () => {
  assert.match(termsEditor, /coupon\.status === "active" \|\| coupon\.status === "archived"/);
  assert.match(termsEditor, /أوقف الكوبون قبل تعديل الشروط/);
  assert.match(governedCoupons, /current\.Status == "active" && \(baseTermsChanged \|\| fundingChanged\)/);
  assert.match(governedCoupons, /current\.Version != input\.ExpectedVersion/);
  assert.match(couponsController, /expectedVersion: coupon\.version/);
  assert.match(couponsController, /await load\(\)/);
});

test("JRN-026 enforces valid discount, limits, modes, and time windows before mutation", () => {
  assert.match(termsEditor, /discountType === "percent" && discount > 100/);
  assert.match(termsEditor, /Number\.isInteger\(totalLimit\)/);
  assert.match(termsEditor, /Number\.isInteger\(perClient\)/);
  assert.match(termsEditor, /modes\.length === 0/);
  assert.match(termsEditor, /new Date\(endsAtValue\) <= new Date\(startsAtValue\)/);
  assert.match(termsEditor, /fixedDiscountMinorUnits: discountType === "fixed" \? Math\.round\(discount \* 100\) : 0/);
  assert.match(termsEditor, /discountPercent: discountType === "percent" \? discount : 0/);
});
