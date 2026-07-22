import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const wltMigration = read("services/wlt/database/migrations/wlt-034_jrn_028_promotion_funding_audit_integrity.sql");
const wltJSON = read("services/wlt/backend/internal/promotionfunding/reservation_json.go");
const serviceAuth = read("services/wlt/backend/internal/shared/serviceauth.go");
const dshReadback = read("services/dsh/backend/internal/wlt/promotion_funding_read.go");
const diagnostics = read("services/dsh/backend/internal/coupons/funding_diagnostics.go");
const couponsHTTP = read("services/dsh/backend/internal/http/coupons.go");
const couponTypes = read("services/dsh/frontend/shared/marketing/coupons.types.ts");
const couponsController = read("services/dsh/frontend/shared/marketing/use-coupons-controller.ts");
const couponsDeck = read("services/dsh/frontend/control-panel/marketing/components/CouponsCommandDeck.tsx");
const panel = read("services/dsh/frontend/control-panel/marketing/components/CouponFundingReconciliationPanel.tsx");
const dashboard = read("services/dsh/frontend/control-panel/marketing/MarketingDashboardScreen.tsx");

const slices = [
  ["FS-01..04 product and service boundary", () => {
    assert.match(diagnostics, /DSH state[\s\S]*WLT state/);
    assert.match(dshReadback, /GetPromotionFundingReservation/);
  }],
  ["FS-05..08 sovereign financial integrity", () => {
    assert.match(wltMigration, /DEFERRABLE INITIALLY DEFERRED/);
    assert.match(wltMigration, /same-transaction append-only event/);
    assert.match(wltMigration, /transaction_id = txid_current\(\)/);
    assert.match(wltMigration, /reservation_id, to_status/);
    assert.doesNotMatch(wltJSON, /IdempotencyKey\s+string/);
    assert.match(serviceAuth, /MISSING_TENANT_ID/);
  }],
  ["FS-09..12 operator reconciliation surface", () => {
    assert.match(couponsHTTP, /ListFundingLifecycleDiagnostics/);
    assert.match(couponsHTTP, /GetPromotionFundingReservation/);
    assert.match(couponsHTTP, /"fundingLifecycle"/);
    assert.match(couponTypes, /CouponFundingLifecycleRecord/);
    assert.match(couponTypes, /readonly fundingLifecycle/);
    assert.match(couponsController, /fundingLifecycle: response\.fundingLifecycle/);
    assert.match(couponsDeck, /<CouponFundingReconciliationPanel/);
    assert.match(couponsDeck, /records=\{fundingLifecycle\}/);
    assert.match(panel, /مصالحة تمويل العروض/);
    assert.doesNotMatch(panel, /createDshRawHttpClient/);
    assert.doesNotMatch(dashboard, /CouponFundingReconciliationPanel/);
  }],
  ["FS-13..16 safety, privacy and recovery", () => {
    assert.match(diagnostics, /wlt_unavailable/);
    assert.match(diagnostics, /mismatch/);
    assert.match(panel, /role="alert"/);
    assert.doesNotMatch(panel, /idempotencyKey/i);
    assert.doesNotMatch(couponsHTTP, /idempotencyKey/i);
  }],
];

for (const [name, verify] of slices) {
  test(`JRN-028 ${name}`, verify);
}
