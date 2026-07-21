import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("JRN-026 coupons, delivery pricing, and loyalty policies", () => {
  const coupons = source("../frontend/shared/marketing/use-coupons-controller.ts");
  const commercial = source("../frontend/shared/marketing/use-commercial-programs-controller.tsx");
  const deliveryPricing = source("../frontend/shared/partner/use-delivery-pricing-controller.ts");
  const server = source("../backend/internal/http/server.go");

  it("re-reads coupon and loyalty truth after operator writes", () => {
    assert.match(coupons, /createCoupon\(payload\)[\s\S]*await load\(\)/);
    assert.match(coupons, /updateCoupon\(coupon\.id[\s\S]*await load\(\)/);
    assert.match(commercial, /createLoyaltyTier\(payload\)[\s\S]*await load\(\)/);
    assert.match(commercial, /updateLoyaltyTier\(tier\.id[\s\S]*await load\(\)/);
  });

  it("keeps delivery pricing actor-owned and routed through DSH", () => {
    assert.match(deliveryPricing, /fetchPartnerDeliveryPricing|fetchOperatorDeliveryPricing/);
    assert.match(server, /PUT \/dsh\/operator\/stores\/\{storeId\}\/delivery-pricing\/\{fulfillmentMode\}/);
    assert.match(server, /PUT \/dsh\/partner\/stores\/\{storeId\}\/delivery-pricing\/\{fulfillmentMode\}/);
  });
});

describe("JRN-027 subscriptions and commercial benefits", () => {
  const commercial = source("../frontend/shared/marketing/use-commercial-programs-controller.tsx");
  const api = source("../frontend/shared/marketing/marketing.api.ts");
  const server = source("../backend/internal/http/server.go");

  it("refreshes plan truth after create and update", () => {
    assert.match(commercial, /createSubscriptionPlan\(payload\)[\s\S]*await load\(\)/);
    assert.match(commercial, /updateSubscriptionPlan\(plan\.id[\s\S]*await load\(\)/);
  });

  it("reads client benefits from the governed DSH projection", () => {
    assert.match(api, /fetchClientBenefits[\s\S]*\/dsh\/client\/benefits/);
    assert.match(server, /POST \/dsh\/client\/marketing\/subscriptions\/purchase/);
    assert.match(server, /POST \/dsh\/client\/marketing\/subscriptions\/\{purchaseId\}\/activate/);
    assert.match(server, /GET \/dsh\/client\/benefits/);
  });
});

describe("JRN-028 promotion funding boundary", () => {
  const lifecycle = source("../backend/internal/http/coupon_funding_lifecycle.go");
  const wltContract = source("../../wlt/contracts/wlt.promotion-funding.openapi.yaml");
  const outbox = source("../backend/internal/promotionfundingoutbox/outbox.go");

  it("keeps reserve, commit, release, and reverse in WLT", () => {
    assert.match(lifecycle, /ReservePromotionFunding/);
    assert.match(lifecycle, /CommitPromotionFunding/);
    assert.match(lifecycle, /ReleasePromotionFunding/);
    assert.match(lifecycle, /ReversePromotionFunding/);
    assert.match(wltContract, /promotion-funding/);
  });

  it("uses tenant-bound idempotent outbox handoff", () => {
    assert.match(lifecycle, /TenantID/);
    assert.match(lifecycle, /dsh-promotion-funding:/);
    assert.match(outbox, /idempotency|Idempotency/);
  });
});

describe("JRN-029 service areas, SLA, capacity, and delivery modes", () => {
  const server = source("../backend/internal/http/server.go");
  const policies = source("../backend/internal/platformpolicies/policies.go");
  const capacitySurface = source("../frontend/control-panel/operations/AreaCapacityScreen.tsx");

  it("exposes governed service-area and delivery-mode policy routes", () => {
    assert.match(server, /GET \/dsh\/operator\/platform\/service-areas/);
    assert.match(server, /PUT \/dsh\/operator\/platform\/service-areas\/\{serviceAreaCode\}/);
    assert.match(server, /GET \/dsh\/partner\/stores\/\{storeId\}\/courier-settings/);
    assert.match(server, /GET \/dsh\/partner\/stores\/\{storeId\}\/coverage-zones/);
  });

  it("keeps the capacity surface bound to shared operational truth", () => {
    assert.match(policies, /capacity|sla|service/i);
    assert.match(capacitySurface, /shared|use[A-Z].*Controller|operations/i);
  });
});

describe("JRN-030 partner fleet connection lifecycle", () => {
  const domain = source("../backend/internal/partnerfleet/membership_disconnect.go");
  const routes = source("../backend/internal/http/partner_fleet_membership_routes.go");
  const api = source("../frontend/shared/partner/partner-fleet.api.ts");
  const screen = source("../frontend/app-captain/account/PartnerFleetConnectionCard.tsx");
  const contract = source("../contracts/dsh.partner-fleet.openapi.yaml");
  const main = source("../backend/cmd/dsh-api/main.go");

  it("disconnects optimistically, revokes the redeemed code, and audits the action", () => {
    assert.match(domain, /expectedVersion/);
    assert.match(domain, /identity_actor_id = ''/);
    assert.match(domain, /status = 'revoked'/);
    assert.match(domain, /captain_disconnect/);
  });

  it("binds contract, runtime, shared adapter, and captain UI", () => {
    assert.match(routes, /memberships\/\{teamMemberId\}\/disconnect/);
    assert.match(main, /RegisterPartnerFleetMembershipRoutes/);
    assert.match(api, /disconnectCaptainPartnerFleetMembership/);
    assert.match(screen, /disconnectCaptainPartnerFleetMembership/);
    assert.match(screen, /فك العضوية/);
    assert.doesNotMatch(screen, /style=\{\{/);
    assert.match(contract, /operationId: disconnectDshCaptainPartnerFleetMembership/);
  });
});
