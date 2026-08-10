import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const identityDependentCreateSurfaces = [
  "services/dsh/frontend/control-panel/hr/EmployeeCreateView.tsx",
  "services/dsh/frontend/control-panel/hr/FieldAgentCreateView.tsx",
  "services/dsh/frontend/control-panel/hr/CaptainCreateView.tsx",
];

describe("J001 Identity readiness control surfaces", () => {
  test("gates every Identity-dependent actor creation mutation", () => {
    for (const path of identityDependentCreateSurfaces) {
      const source = read(path);
      assert.match(source, /useIdentityRuntimeStatus/);
      assert.match(source, /runtimeValue\?\.status === "HEALTHY"/);
      assert.match(source, /identityReady &&/);
      assert.match(source, /if \(!identityReady\) return/);
      assert.match(source, /إعادة فحص Identity/);
      assert.match(source, /disabled=\{!canSubmit\}/);
    }
  });

  test("keeps provider data readable while activation mutations fail closed", () => {
    const source = read("services/dsh/frontend/control-panel/shared/ProviderActivationWorkspace.tsx");
    assert.match(source, /useIdentityRuntimeStatus/);
    assert.match(source, /runtimeValue\?\.status === "HEALTHY"/);
    assert.match(source, /Identity غير جاهزة؛ عمليات التفعيل متوقفة مغلقًا/);
    assert.match(source, /disabled=\{actionBusy \|\| !identityReady\}/);
    assert.match(source, /disabled=\{actionBusy \|\| !identityReady \|\| reason\.trim\(\)\.length < 3\}/);
    assert.match(source, /managerAllowed && identityReady && detail\.readyToIssue/);
    assert.match(source, /إعادة فحص Identity/);
  });

  test("maps detailed Identity readiness to dashboard, platform and administration", () => {
    const dashboardBarrel = read("services/dsh/frontend/control-panel/dashboard/index.ts");
    const platformPage = read("apps/control-panel/runtime/src/app/(shell)/dsh/platform/page.tsx");
    const administration = read("services/dsh/frontend/control-panel/administration/GovernedAdministrationScreen.tsx");

    assert.match(dashboardBarrel, /export \{ IdentityRuntimeHealthPanel \}/);
    assert.match(platformPage, /identity-health/);
    assert.match(platformPage, /الخدمات والجاهزية — Identity/);
    assert.match(platformPage, /<IdentityRuntimeHealthPanel/);
    assert.match(administration, /<IdentityRuntimeHealthPanel/);
  });
});
