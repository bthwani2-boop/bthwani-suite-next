import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

function source(relativePath) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("JRN-030 partner fleet surface binding", () => {
  const controller = source("../frontend/shared/partner/use-partner-fleet-controller.ts");
  const barrel = source("../frontend/shared/partner/index.ts");
  const screen = source("../frontend/app-partner/team/PartnerTeamManagementScreen.tsx");

  it("keeps issue and revoke commands in the shared brain", () => {
    assert.match(controller, /issuePartnerCourierConnectionCode/);
    assert.match(controller, /listPartnerCourierConnections/);
    assert.match(controller, /revokePartnerCourierConnection/);
    assert.match(controller, /connection\.status === "pending"/);
    assert.match(barrel, /usePartnerFleetController/);
  });

  it("binds courier controls without raw API calls in the partner surface", () => {
    assert.match(screen, /usePartnerFleetController/);
    assert.match(screen, /fleet\.issueCourierConnectionCode/);
    assert.match(screen, /fleet\.revokePendingCourierConnection/);
    assert.match(screen, /إصدار رمز ربط/);
    assert.match(screen, /إلغاء رمز الربط/);
    assert.doesNotMatch(screen, /fetch\(|axios\.|createDshHttpClient|partner-fleet\.api/);
    assert.doesNotMatch(screen, /style=\{\{/);
  });
});
