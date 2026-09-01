import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

const screen = read("../frontend/app-field/stores/DshFieldPartnerProgressScreen.tsx");
const controller = read("../frontend/shared/partner/use-field-partner-progress-controller.tsx");
const types = read("../frontend/shared/partner/partner.types.ts");
const partnerSchema = read("../contracts/components/schemas/partner.schemas.yaml");
const systemSchema = read("../contracts/components/schemas/system.schemas.yaml");
const onboardingContract = read("../contracts/dsh.partner-onboarding.openapi.yaml");

describe("field partner readiness canonical consumer", () => {
  test("uses the backend aggregate without first-store or activation-status readiness derivation", () => {
    assert.match(controller, /fieldGetReadiness\(partnerId\)/);
    assert.doesNotMatch(controller, /fieldGetPartnerStore|buildPartnerReadinessViewModel|isDshPartnerClientVisible/);
    assert.doesNotMatch(screen, /getDshPartnerReadinessChecklist|partner\.activationStatus\)/);
  });

  test("renders canonical checklist, aggregate publication decision and summary", () => {
    assert.match(screen, /readiness\.checklist\.map/);
    assert.match(screen, /readiness\.publicationDecision/);
    assert.match(screen, /readiness\.storeSummary\.totalStores/);
    assert.match(screen, /readiness\.storeSummary\.readyStores/);
    assert.match(screen, /readiness\.storeSummary\.blockedStores/);
    assert.match(screen, /readiness\.storeSummary\.clientVisibleStores/);
  });

  test("renders and routes actions for every backend store readback", () => {
    assert.match(types, /readonly stores: readonly DshPartnerStorePublicationReadiness\[\]/);
    assert.match(screen, /readiness\.stores\.map\(\(store\)/);
    assert.match(screen, /onOpenVisit\(store\.storeId\)/);
    assert.match(screen, /onOpenEscalation\(store\.storeId\)/);
    assert.match(screen, /store\.publicationDecision/);
    assert.match(screen, /store\.blockingReasons\.join/);
  });

  test("keeps lifecycle and readiness ownership in the canonical contract", () => {
    assert.match(partnerSchema, /DshPartnerActivationStatusValue:[\s\S]*partner_suspended/);
    assert.match(systemSchema, /storeSummary:[\s\S]*stores:[\s\S]*generatedAt/);
    assert.doesNotMatch(onboardingContract, /^    (ActivationStatus|PartnerState|Readiness):/m);
    assert.doesNotMatch(onboardingContract, /#\/components\/schemas\/LinkedStore/);
  });
});
