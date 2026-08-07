import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const exists = (relativePath) => existsSync(fileURLToPath(new URL(relativePath, import.meta.url)));

const fieldProgress = read("../frontend/app-field/stores/DshFieldPartnerProgressScreen.tsx");
const fieldOnboardingController = read("../frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx");
const partnerHero = read("../frontend/app-partner/account/PartnerHubStoreHero.tsx");
const operatorDetail = read("../frontend/control-panel/partners/PartnerDetailUnifiedScreen.tsx");
const storeCreateHandler = read("../backend/internal/http/store_create.go");
const partnerPolicy = read("../backend/internal/partner/state_policy.go");

describe("canonical store creation authority", () => {
  test("field owns only the first-store onboarding update", () => {
    assert.equal(exists("../frontend/app-field/stores/PartnerStoreCreateWizard.tsx"), false);
    assert.doesNotMatch(fieldProgress, /PartnerStoreCreateWizard|showCreateStore|إنشاء فرع جديد/);
    assert.match(fieldOnboardingController, /fieldUpdatePartnerStore/);
    assert.match(fieldOnboardingController, /ensureDraftCreated/);
  });

  test("partner manages authorized stores without creating ownership", () => {
    assert.equal(exists("../frontend/app-partner/store/PartnerStoreCreateWizard.tsx"), false);
    assert.doesNotMatch(partnerHero, /PartnerStoreCreateWizard|showCreateStore|add-circle-outline/);
    assert.match(storeCreateHandler, /app-partner cannot create store ownership/);
    assert.match(partnerPolicy, /case "app-partner"/);
    assert.doesNotMatch(
      partnerPolicy.match(/case "app-partner":[\s\S]*?case "app-client":/)?.[0] ?? "",
      /create_store/,
    );
  });

  test("operator is the only generic branch-creation surface", () => {
    assert.match(operatorDetail, /PartnerStoreCreateWizard partnerId=\{partnerId\}/);
    assert.match(operatorDetail, /onStoreCreated=\{\(\) => stores\.reload\(\)\}/);
    assert.match(storeCreateHandler, /CreateGovernedStoreForOperatorContextIdempotent/);
    assert.match(storeCreateHandler, /app-field must update the governed first store/);
    assert.match(partnerPolicy, /create_store/);
  });
});
