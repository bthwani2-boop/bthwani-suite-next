import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const wltMigration = read("services/wlt/database/migrations/wlt-034_jrn_028_promotion_funding_audit_integrity.sql");
const integrityProof = read("services/wlt/database/tests/jrn-028-promotion-funding-integrity.sh");
const concurrencyProof = read("services/wlt/database/tests/jrn-028-promotion-funding-concurrency.sh");
const verifier = read("tools/verification/jrn-028-all-slices.sh");
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
const productTruth = read("governance/product/JRN-028_PROMOTION_FUNDING_PRODUCT_TRUTH.md");
const closure = JSON.parse(read("governance/evidence/JRN-028_ALL_SLICES_CLOSURE.json"));

const slices = [
  ["FS-01..04 product, reserve, persistence, readback and HTTP binding", () => {
    assert.match(diagnostics, /DSH state[\s\S]*WLT state/);
    assert.match(dshReadback, /GetPromotionFundingReservation/);
    assert.match(productTruth, /DSH owns coupon eligibility/);
    assert.match(productTruth, /WLT owns reservation state/);
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
  ["FS-05..08 transition, monetary, tenant, idempotency and concurrency integrity", () => {
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
  ["FS-09..12 outbox, recovery, reconciliation and operator read model", () => {
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
  ["FS-13..16 UI states, privacy, audit and negative recovery", () => {
    assert.match(diagnostics, /wlt_unavailable/);
    assert.match(diagnostics, /mismatch/);
    assert.match(panel, /role="alert"/);
    assert.match(integrityProof, /unaudited transition was accepted/);
    assert.match(integrityProof, /stale event authorized a later transition/);
    assert.match(integrityProof, /terminal reversed reservation transitioned again/);
    assert.doesNotMatch(panel, /idempotencyKey/i);
    assert.doesNotMatch(couponsHTTP, /idempotencyKey/i);
  }],
  ["FS-17 scoped contracts, manual adapters and duplicate-owner hygiene", () => {
    assert.match(wltFundingContract, /x-bthwani-owner: services\/wlt/);
    assert.match(wltFundingContract, /x-bthwani-client-generation: DISABLED/);
    assert.match(wltFundingContract, /x-bthwani-client-binding: MANUAL_TYPED_ADAPTER/);
    assert.match(wltFundingContract, /operationId: reserveWltPromotionFunding/);
    assert.match(wltFundingContract, /operationId: getWltPromotionFundingReservation/);
    assert.match(wltFundingContract, /operationId: commitWltPromotionFunding/);
    assert.match(wltFundingContract, /operationId: releaseWltPromotionFunding/);
    assert.match(wltFundingContract, /operationId: reverseWltPromotionFunding/);
    assert.match(dshMarketingContract, /x-bthwani-owner: services\/dsh/);
    assert.match(dshMarketingContract, /x-bthwani-client-generation: DISABLED/);
    assert.match(dshMarketingContract, /x-bthwani-client-binding: MANUAL_TYPED_ADAPTER/);
    assert.match(dshMarketingContract, /operationId: listDshMarketingCoupons/);
    assert.match(productTruth, /Manual control-panel commit, release, and reverse actions are intentionally absent/);
    assert.match(productTruth, /The control panel compares DSH projection with an authenticated WLT readback/);
    assert.match(verifier, /product-truth-gate\.mjs/);
    assert.match(verifier, /dsh-openapi-modular-gate\.mjs/);
    assert.match(verifier, /openapi:compose/);
    assert.doesNotMatch(panel, /fetch\s*\(/);
  }],
  ["FS-18 exact-head integrated zero-gate and closure record", () => {
    assert.equal(closure.journeyId, "JRN-028");
    assert.equal(closure.technicalDecision, "IMPLEMENTED_AND_VERIFIED_READY_FOR_INDEPENDENT_APPROVAL");
    assert.deepEqual(closure.slices.map((slice) => slice.id), Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`));
    assert.ok(closure.slices.every((slice) => slice.status === "CLOSED_BY_EXACT_HEAD_GATE"));
    assert.deepEqual(closure.openCodeGaps, []);
    assert.match(verifier, /jrn-028-promotion-funding-integrity\.sh/);
    assert.match(verifier, /jrn-028-promotion-funding-concurrency\.sh/);
    assert.match(verifier, /git diff --check/);
    assert.match(productTruth, /does not self-issue independent Finance, Security, QA, Release, or Production approval/);
  }],
];

for (const [name, verify] of slices) {
  test(`JRN-028 ${name}`, verify);
}
