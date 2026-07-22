import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import "./jrn-028-promotion-funding.test.mjs";

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");

const governedCoupons = read("services/dsh/backend/internal/coupons/governed.go");
const deliveryPricingHTTP = read("services/dsh/backend/internal/http/delivery_pricing.go");
const deliveryPricingDomain = read("services/dsh/backend/internal/checkout/delivery_pricing.go");
const deliveryPricingAdmin = read("services/dsh/backend/internal/checkout/delivery_pricing_admin.go");
const loyaltyPolicy = read("services/dsh/backend/internal/marketing/loyalty_policy.go");
const loyaltyHTTP = read("services/dsh/backend/internal/http/loyalty_policy.go");
const wltOutboxWorker = read("services/dsh/backend/internal/wltoutbox/worker.go");
const wltCommercial = read("services/wlt/backend/internal/commercial/commercial.go");
const partnerController = read("services/dsh/frontend/shared/partner/use-delivery-pricing-controller.ts");
const partnerPublic = read("services/dsh/frontend/shared/partner/partner-delivery-pricing.public.ts");
const operatorPublic = read("services/dsh/frontend/shared/partner/operator-delivery-pricing.public.ts");
const partnerIndex = read("services/dsh/frontend/shared/partner/index.ts");
const partnerCard = read("services/dsh/frontend/app-partner/store/PartnerDeliveryPricingCard.tsx");
const partnerCourierScreen = read("services/dsh/frontend/app-partner/store/DshPartnerStoreCourierScreen.tsx");
const operatorPanel = read("services/dsh/frontend/control-panel/partners/stores/OperatorDeliveryPricingPanel.tsx");
const partnerDetailScreen = read("services/dsh/frontend/control-panel/partners/PartnerDetailOperationalScreen.tsx");
const couponsDeck = read("services/dsh/frontend/control-panel/marketing/components/CouponsCommandDeck.tsx");
const clientCheckout = read("services/dsh/frontend/app-client/checkout/GovernedCheckoutScreen.tsx");

test("JRN-026 mounts partner delivery pricing and lets the partner create the first policy", () => {
  assert.match(partnerCourierScreen, /import \{ PartnerDeliveryPricingCard \} from '\.\/PartnerDeliveryPricingCard'/);
  assert.match(partnerCourierScreen, /<PartnerDeliveryPricingCard storeId=\{storeId\} \/>/);
  assert.match(partnerPublic, /usePartnerDeliveryPricingController/);
  assert.match(partnerPublic, /findDeliveryPricing/);
  assert.match(partnerCard, /partner-delivery-pricing\.public/);
  assert.doesNotMatch(partnerCard, /use-delivery-pricing-controller/);
  assert.doesNotMatch(partnerIndex, /\n\s*usePartnerDeliveryPricingController,\n/);
  assert.match(partnerController, /record: DeliveryPricingRecord \| null/);
  assert.match(partnerController, /expectedVersion: record\?\.version \?\? 0/);
  assert.doesNotMatch(partnerCard, /if \(!partnerPolicy\) return/);
  assert.match(partnerCard, /controller\.state\.kind === "success" \|\| controller\.state\.kind === "empty"/);
  assert.match(partnerCard, /إنشاء سياسة التوصيل/);
  assert.match(partnerCard, /controller\.save\(partnerPolicy/);
});

test("JRN-026 mounts operator delivery pricing and supports first-policy creation for every mode", () => {
  assert.match(operatorPublic, /useOperatorDeliveryPricingController/);
  assert.match(operatorPublic, /findDeliveryPricing/);
  assert.match(partnerController, /requestedMode\?: DeliveryPricingMode/);
  assert.match(partnerController, /record\?\.fulfillmentMode \?\? requestedMode/);
  assert.match(partnerController, /expectedVersion: record\?\.version \?\? 0/);
  assert.match(operatorPanel, /operator-delivery-pricing\.public/);
  assert.match(operatorPanel, /const MODES: readonly DeliveryPricingMode\[] = \["bthwani_delivery", "partner_delivery", "pickup"\]/);
  assert.match(operatorPanel, /controller\.save\(record,[\s\S]*?, mode\)/);
  assert.match(operatorPanel, /mode === "pickup" \? 0 : Number\(draft\.feeYer\)/);
  assert.match(operatorPanel, /record \? "حفظ" : "إنشاء"/);
  assert.match(operatorPanel, /لا توجد سياسات مهيأة/);
  assert.match(partnerDetailScreen, /import \{ OperatorDeliveryPricingPanel \} from "\.\/stores\/OperatorDeliveryPricingPanel"/);
  assert.match(partnerDetailScreen, /selectedPricingStoreId/);
  assert.match(partnerDetailScreen, /<OperatorDeliveryPricingPanel storeId=\{selectedPricingStoreId\} \/>/);
});

test("JRN-026 confines partner pricing writes to the owned store and partner-delivery mode", () => {
  assert.match(deliveryPricingHTTP, /r\.PathValue\("storeId"\) != storeID/);
  assert.match(deliveryPricingHTTP, /r\.PathValue\("fulfillmentMode"\) != "partner_delivery"/);
  assert.match(deliveryPricingHTTP, /body\.Status == "archived"/);
  assert.match(deliveryPricingHTTP, /PricingSource:\s+"partner_store"/);
  assert.match(deliveryPricingAdmin, /ExpectedVersion != 0/);
  assert.match(deliveryPricingAdmin, /dsh_store_delivery_pricing_audit/);
});

test("JRN-026 checkout reads active server-owned delivery pricing and coupon snapshots", () => {
  assert.match(deliveryPricingDomain, /p\.status='active'/);
  assert.match(deliveryPricingDomain, /s\.status='active'/);
  assert.match(deliveryPricingDomain, /ErrDeliveryPricingUnavailable/);
  assert.match(clientCheckout, /couponCode: couponCode\.trim\(\)\.toUpperCase\(\)/);
  assert.match(clientCheckout, /intent\.deliveryFeeMinorUnits/);
  assert.match(clientCheckout, /intent\.discountMinorUnits/);
  assert.match(clientCheckout, /intent\.couponCodeLast4/);
  assert.doesNotMatch(clientCheckout, /deliveryFeeMinorUnits\s*=/);
  assert.doesNotMatch(clientCheckout, /discountMinorUnits\s*=/);
});

test("JRN-026 protects coupon terms, funding ownership, and maker-checker activation", () => {
  assert.match(governedCoupons, /sql\.LevelSerializable/);
  assert.match(governedCoupons, /current\.Status == "active" && \(baseTermsChanged \|\| fundingChanged\)/);
  assert.match(governedCoupons, /current\.CreatedByActorID == strings\.TrimSpace\(input\.ActorID\)/);
  assert.match(governedCoupons, /validateFundingPolicyInput/);
  assert.match(couponsDeck, /الكود مشفر/);
  assert.match(couponsDeck, /تمويله يُحجز ويُلتزم ويُعكس في WLT/);
});

test("JRN-026 governs loyalty earning policies and delegates financial entries to WLT", () => {
  assert.match(loyaltyPolicy, /ErrActiveLoyaltyPolicyImmutable/);
  assert.match(loyaltyPolicy, /ErrLoyaltyPolicySelfApproval/);
  assert.match(loyaltyPolicy, /current\.Status == "active" && termsChanged/);
  assert.match(loyaltyPolicy, /current\.CreatedByActorID == input\.ActorID/);
  assert.match(loyaltyHTTP, /MarketingPermissionManage/);
  assert.match(wltOutboxWorker, /EventTypeLoyaltyEarned/);
  assert.match(wltOutboxWorker, /EventTypeLoyaltyReversed/);
  assert.match(wltOutboxWorker, /AppendLoyaltyEntry/);
  assert.match(wltOutboxWorker, /:loyalty:earn/);
  assert.match(wltOutboxWorker, /:loyalty:reverse/);
  assert.match(wltCommercial, /wlt_loyalty_accounts/);
  assert.match(wltCommercial, /sql\.LevelSerializable/);
  assert.match(wltCommercial, /GetLoyaltyEntryByIdempotency/);
  assert.match(wltCommercial, /ErrAlreadyReversed/);
});

test("JRN-028 compiles and runs DSH and WLT funding packages in the trusted coupons gate", () => {
  execFileSync("go", ["test", "./internal/promotionfunding", "./internal/shared"], {
    cwd: new URL("../../../services/wlt/backend/", import.meta.url),
    stdio: "inherit",
  });
  execFileSync("go", ["test", "./internal/coupons", "./internal/wlt", "./internal/promotionfundingoutbox"], {
    cwd: new URL("../../../services/dsh/backend/", import.meta.url),
    stdio: "inherit",
  });
});
