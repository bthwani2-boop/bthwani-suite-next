import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const fieldProgress = read("../frontend/app-field/stores/DshFieldPartnerProgressScreen.tsx");
const fieldWizard = read("../frontend/app-field/stores/PartnerStoreCreateWizard.tsx");
const partnerHero = read("../frontend/app-partner/account/PartnerHubStoreHero.tsx");
const partnerWizard = read("../frontend/app-partner/store/PartnerStoreCreateWizard.tsx");
const operatorDetail = read("../frontend/control-panel/partners/PartnerDetailUnifiedScreen.tsx");

describe("store creation wizard wiring", () => {
  test("field wizard is reachable from the governed partner progress surface", () => {
    assert.match(fieldProgress, /PartnerStoreCreateWizard/);
    assert.match(fieldProgress, /partnerId=\{partnerId\}/);
    assert.match(fieldProgress, /void reload\(\)/);
    assert.match(fieldWizard, /\/dsh\/field\/stores/);
  });

  test("partner wizard derives partner identity from the authenticated self endpoint", () => {
    assert.match(partnerHero, /PartnerStoreCreateWizard/);
    assert.match(partnerHero, /showCreateStore/);
    assert.match(partnerWizard, /usePartnerSelfController/);
    assert.match(partnerWizard, /self\.statusState\.partner\.id/);
    assert.match(partnerWizard, /\/dsh\/partner\/stores/);
  });

  test("operator wizard remains wired to the partner stores tab and readback reload", () => {
    assert.match(operatorDetail, /PartnerStoreCreateWizard partnerId=\{partnerId\}/);
    assert.match(operatorDetail, /onStoreCreated=\{\(\) => stores\.reload\(\)\}/);
  });
});
