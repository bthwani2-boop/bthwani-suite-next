import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const wltMigration = read("services/wlt/database/migrations/wlt-096_jrn_028_promotion_funding_audit_integrity.sql");
const integrityProof = read("services/wlt/database/tests/promotion-funding-integrity.sh");
const concurrencyProof = read("services/wlt/database/tests/promotion-funding-concurrency.sh");
const wltServer = read("services/wlt/backend/internal/http/server.go");
const wltJSON = read("services/wlt/backend/internal/promotionfunding/reservation_json.go");
const serviceAuth = read("services/wlt/backend/internal/shared/serviceauth.go");
const wltFundingContract = read("services/wlt/contracts/wlt.promotion-funding.openapi.yaml");
const dshMarketingContract = read("services/dsh/contracts/dsh.marketing-commercial.openapi.yaml");
const dshReadback = read("services/dsh/backend/internal/wlt/promotion_funding_read.go");
const diagnostics = read("services/dsh/backend/internal/coupons/funding_diagnostics.go");
const couponsHTTP = read("services/dsh/backend/internal/http/coupons.go");
const lifecycleHTTP = read("services/dsh/backend/internal/http/coupon_funding_lifecycle.go");
const couponTypes = read("services/dsh/frontend/shared/marketing/coupons.types.ts");
const couponsController = read("services/dsh/frontend/shared/marketing/use-coupons-controller.ts");
const couponsDeck = read("services/dsh/frontend/control-panel/marketing/components/CouponsCommandDeck.tsx");
const panel = read("services/dsh/frontend/control-panel/marketing/components/CouponFundingReconciliationPanel.tsx");
const dashboard = read("services/dsh/frontend/control-panel/marketing/MarketingDashboardScreen.tsx");

const cases = [
  ["Promotion Funding DSH/WLT ownership and lifecycle binding", () => {
    assert.match(diagnostics, /DSH state[\s\S]*WLT state/);
    assert.match(dshReadback, /GetPromotionFundingReservation/);
    assert.match(wltFundingContract, /x-bthwani-owner: services\/wlt/);
    assert.match(dshMarketingContract, /x-bthwani-owner: services\/dsh/);
    assert.match(wltServer, /POST \/wlt\/promotion-funding\/reservations"[\s\S]*gate\(serviceAuth\(promotionfunding\.HandleReserve/);
    assert.match(wltServer, /GET \/wlt\/promotion-funding\/reservations\/\{reservationId\}"[\s\S]*readGate\(promotionfunding\.HandleGet/);
    assert.match(wltServer, /\/commit"[\s\S]*HandleCommit/);
    assert.match(wltServer, /\/release"[\s\S]*HandleRelease/);
    assert.match(wltServer, /\/reverse"[\s\S]*HandleReverse/);
    assert.match(lifecycleHTTP, /reserveCouponFunding/);
    assert.match(lifecycleHTTP, /commitCouponFunding/);
    assert.match(lifecycleHTTP, /releaseCouponFunding/);
    assert.match(lifecycleHTTP, /reverseCouponFunding/);
  }],
  ["Promotion Funding transition, monetary, tenant, idempotency, and concurrency integrity", () => {
    assert.match(wltMigration, /DEFERRABLE INITIALLY DEFERRED/);
    assert.match(wltMigration, /same-transaction append-only event/);
    assert.match(wltMigration, /transaction_id = txid_current\(\)/);
    assert.match(wltMigration, /reservation_id, to_status/);
    assert.match(integrityProof, /Audited release from reserved/);
    assert.match(integrityProof, /Audited reverse from committed/);
    assert.match(integrityProof, /split mismatch was accepted/);
    assert.match(integrityProof, /conflicting idempotency replay was accepted/);
    assert.match(concurrencyProof, /BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE/);
    assert.match(concurrencyProof, /concurrent transitions produced more than one financial event/);
    assert.doesNotMatch(wltJSON, /IdempotencyKey\s+string/);
    assert.match(serviceAuth, /MISSING_TENANT_ID/);
  }],
  ["Promotion Funding outbox, recovery, reconciliation, and operator read model", () => {
    assert.match(couponsHTTP, /coupons\.ListFundingLifecycleDiagnostics/);
    assert.match(couponsHTTP, /s\.wlt\.GetPromotionFundingReservation/);
    assert.match(couponsHTTP, /coupons\.ReconcileFundingLifecycle/);
    assert.match(couponsHTTP, /"fundingLifecycle"/);
    assert.match(diagnostics, /func ListFundingLifecycleDiagnostics/);
    assert.match(diagnostics, /func ReconcileFundingLifecycle/);
    assert.match(couponTypes, /CouponFundingLifecycleRecord/);
    assert.match(couponTypes, /readonly fundingLifecycle/);
    assert.match(couponsController, /fundingLifecycle: response\.fundingLifecycle/);
    assert.match(couponsDeck, /<CouponFundingReconciliationPanel/);
    assert.match(couponsDeck, /records=\{fundingLifecycle\}/);
    assert.match(panel, /مصالحة تمويل العروض/);
    assert.doesNotMatch(panel, /createDshRawHttpClient/);
    assert.doesNotMatch(dashboard, /CouponFundingReconciliationPanel/);
  }],
  ["Promotion Funding UI states, privacy, audit, and negative recovery", () => {
    assert.match(diagnostics, /wlt_unavailable/);
    assert.match(diagnostics, /mismatch/);
    assert.match(panel, /role="alert"/);
    assert.match(integrityProof, /unaudited transition was accepted/);
    assert.match(integrityProof, /stale event authorized a later transition/);
    assert.match(integrityProof, /terminal reversed reservation transitioned again/);
    assert.doesNotMatch(panel, /idempotencyKey/i);
    assert.doesNotMatch(couponsHTTP, /idempotencyKey/i);
  }],
  ["Promotion Funding scoped contracts and manual adapter hygiene", () => {
    assert.match(wltFundingContract, /x-bthwani-client-generation: DISABLED/);
    assert.match(wltFundingContract, /x-bthwani-client-binding: MANUAL_TYPED_ADAPTER/);
    assert.match(wltFundingContract, /operationId: reserveWltPromotionFunding/);
    assert.match(wltFundingContract, /operationId: getWltPromotionFundingReservation/);
    assert.match(wltFundingContract, /operationId: commitWltPromotionFunding/);
    assert.match(wltFundingContract, /operationId: releaseWltPromotionFunding/);
    assert.match(wltFundingContract, /operationId: reverseWltPromotionFunding/);
    assert.match(dshMarketingContract, /x-bthwani-client-generation: DISABLED/);
    assert.match(dshMarketingContract, /x-bthwani-client-binding: MANUAL_TYPED_ADAPTER/);
    assert.match(dshMarketingContract, /operationId: listDshMarketingCoupons/);
    assert.doesNotMatch(panel, /fetch\s*\(/);
  }],
];

for (const [name, verify] of cases) {
  test(name, verify);
}
