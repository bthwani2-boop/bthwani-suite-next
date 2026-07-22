import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "../../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function assertIncludesAll(content, values, label) {
  for (const value of values) {
    assert.ok(content.includes(value), `${label} is missing ${value}`);
  }
}

test("JRN-025 product truth is schema-valid and remains independently approvable", () => {
  const schema = JSON.parse(read("governance/product/product-truth.schema.json"));
  const productTruth = JSON.parse(read("governance/product/contracts/jrn-025-campaigns-tickers-partner-offers.product-truth.json"));
  const validate = new Ajv({ allErrors: true, strict: false }).compile(schema);
  assert.equal(validate(productTruth), true, JSON.stringify(validate.errors));
  assert.equal(productTruth.capabilityId, "JRN_025_CAMPAIGNS_TICKERS_PARTNER_OFFERS");
  assert.equal(productTruth.state, "DISCOVERY");
  assert.equal(productTruth.owners.productManagerApproval, "PENDING");
  assert.equal(productTruth.owners.productOwnerApproval, "PENDING");
  assert.equal(productTruth.owners.productAcceptanceDecision, "PENDING");
  assert.deepEqual(
    productTruth.surfaces.filter((surface) => surface.required).map((surface) => surface.id),
    ["control-panel", "app-partner", "app-client", "backend", "database", "shared"],
  );
});

test("JRN-025 database migration enforces concurrency, schedule, region and offer invariants", () => {
  const migration = read("services/dsh/database/migrations/dsh-101_jrn_025_marketing_lifecycle.sql");
  assertIncludesAll(migration, [
    "ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1",
    "ADD COLUMN IF NOT EXISTS target_city_code TEXT",
    "ADD COLUMN IF NOT EXISTS target_service_area_code TEXT",
    "dsh_marketing_campaigns_schedule_chk",
    "dsh_marketing_campaigns_placement_chk",
    "dsh_marketing_campaigns_region_chk",
    "idx_dsh_marketing_campaigns_active_window",
    "idx_dsh_marketing_campaigns_region",
    "dsh_partner_offers_eligibility_chk",
    "dsh_partner_offers_schedule_chk",
    "dsh_partner_offers_rejection_reason_chk",
    "idx_dsh_partner_offers_client_projection",
  ], "JRN-025 migration");
});

test("JRN-025 campaign backend owns schedule, region, target and versioned lifecycle", () => {
  const backend = read("services/dsh/backend/internal/marketing/marketing.go");
  const http = read("services/dsh/backend/internal/http/marketing.go");
  assertIncludesAll(backend, [
    "ExpectedVersion       int",
    "ErrCommercialVersionConflict",
    "validateCampaignActivationWindow",
    "validateCampaignRegion",
    "campaignTransitionAllowed",
    "TargetCityCode",
    "TargetServiceAreaCode",
    "version=version+1",
    "WriteVisibilityGateCheck",
    "next.Audience != \"all\" && next.Audience != \"client\"",
  ], "campaign backend");
  assertIncludesAll(http, [
    "ExpectedVersion       int     `json:\"expectedVersion\"`",
    "TargetCityCode        *string `json:\"targetCityCode\"`",
    "TargetServiceAreaCode *string `json:\"targetServiceAreaCode\"`",
    "Placement             string  `json:\"placement\"`",
    '"VERSION_CONFLICT"',
  ], "campaign HTTP adapter");
});

test("JRN-025 partner offers follow one legal review graph", () => {
  const backend = read("services/dsh/backend/internal/marketing/partner_offers.go");
  const controller = read("services/dsh/frontend/shared/marketing/use-governed-partner-offers-controller.ts");
  const deck = read("services/dsh/frontend/control-panel/marketing/components/PartnerOffersCommandDeck.tsx");
  assertIncludesAll(backend, [
    "func partnerOfferTransitionAllowed",
    'case "inbound":',
    'return to == "review" || to == "rejected"',
    'case "marketing-ready":',
    'return to == "published" || to == "rejected"',
    "partnerOfferEligibilities",
    "validateCampaignActivationWindow",
    "ErrRejectionReasonRequired",
    "ErrCouponLinkRequired",
    "ExpectedVersion",
  ], "partner offer backend");
  assertIncludesAll(controller, [
    'case "review":',
    'return "marketing-ready"',
    'case "marketing-ready":',
    'return "published"',
    "expectedVersion: current.version",
    "حدد تاريخ بداية ونهاية",
  ], "partner offer controller");
  assertIncludesAll(deck, [
    "statusOptions(controller.selected.status)",
    "activeFromDate",
    "activeToDate",
    "سبب الرفض مطلوب",
    "الإصدار {offer.version}",
  ], "partner offer command deck");
});

test("JRN-025 governed campaign UI edits all registered campaign fields", () => {
  const controller = read("services/dsh/frontend/shared/marketing/use-governed-campaigns-controller.ts");
  const deck = read("services/dsh/frontend/control-panel/marketing/components/CampaignsCommandDeck.tsx");
  assertIncludesAll(controller, [
    "expectedVersion: campaign.version",
    "targetCityCode",
    "targetServiceAreaCode",
    "await load()",
    "candidate?.status === 409",
    "لا يوجد اتصال",
  ], "campaign controller");
  assertIncludesAll(deck, [
    "useGovernedCampaignsController",
    "startDate",
    "endDate",
    "audience",
    "placement",
    "targetCityCode",
    "targetServiceAreaCode",
    "targetType",
    "targetId",
    "الإصدار {campaign.version}",
    "حفظ التعديلات",
  ], "campaign command deck");
  assert.ok(!deck.includes("useCampaignsController("), "campaign deck must not bind the legacy non-versioned controller");
});

test("JRN-025 client sees only eligible tickers, campaigns and partner offers", () => {
  const projection = read("services/dsh/backend/internal/homediscovery/marketing_projection.go");
  const handler = read("services/dsh/backend/internal/homediscovery/handler.go");
  const events = read("services/dsh/backend/internal/homediscovery/events.go");
  assertIncludesAll(projection, [
    "ListMarketingPromos",
    "listTickerPromos",
    "t.status='published'",
    "c.status='active'",
    "o.status='published'",
    "CURRENT_DATE",
    "clientEligibleStorePredicate",
    "target_city_code",
    "target_service_area_code",
    "ticker:",
    "campaign:",
    "partner-offer:",
    "AudienceSegment",
  ], "client marketing projection");
  assertIncludesAll(handler, [
    "ListMarketingPromos",
    "MARKETING_PROJECTION_UNAVAILABLE",
    "promos = append(marketingPromos, promos...)",
  ], "home discovery handler");
  assertIncludesAll(events, [
    "resolvePublishableHomeEntity",
    'strings.HasPrefix(contentID, "ticker:")',
    'strings.HasPrefix(contentID, "campaign:")',
    'strings.HasPrefix(contentID, "partner-offer:")',
    "target_city_code",
    "target_service_area_code",
    "sha256.Sum256",
    'return "ticker"',
    '"partner_offer"',
    "CONTENT_NOT_PUBLISHABLE",
  ], "marketing measurement ingress");
});

test("JRN-025 OpenAPI exposes schedule, region, version and conflict semantics", () => {
  const schemas = read("services/dsh/contracts/components/schemas/marketing-commercial.schemas.yaml");
  const paths = read("services/dsh/contracts/paths/marketing-commercial.paths.yaml");
  assertIncludesAll(schemas, [
    "required: [title, startDate, endDate]",
    "required: [expectedVersion]",
    "version: { type: integer, minimum: 1 }",
    "targetCityCode:",
    "targetServiceAreaCode:",
    "audience: { type: string, enum: [all, client] }",
    "placement: { type: string, enum: [home, hero, feed, floating, banner, store-card] }",
  ], "marketing OpenAPI schemas");
  assertIncludesAll(paths, [
    "stale writes return 409",
    '"409": { $ref: "../dsh.openapi.yaml#/components/responses/Conflict" }',
    "one legal partner-offer transition",
    "required: [expectedVersion]",
    "couponId: { type: string }",
    "never client-supplied",
  ], "marketing OpenAPI paths");
});

test("JRN-025 route test covers operator, partner and client surfaces", () => {
  const routes = read("services/dsh/backend/internal/http/jrn_025_marketing_routes_test.go");
  assertIncludesAll(routes, [
    '"GET /dsh/operator/marketing/campaigns/{campaignId}"',
    '"DELETE /dsh/operator/marketing/partner-offers/{offerId}"',
    '"POST /dsh/partner/marketing/offers"',
    '"GET /dsh/home-discovery"',
    '"POST /dsh/home-discovery/events"',
  ], "JRN-025 route test");
});
