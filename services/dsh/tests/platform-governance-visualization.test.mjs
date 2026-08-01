import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const page = read("apps/control-panel/runtime/src/app/dsh/platform/page.tsx");
const dashboard = read("services/dsh/frontend/control-panel/platform/PlatformDashboardScreen.tsx");
const platformIndex = read("services/dsh/frontend/control-panel/platform/index.ts");
const visual = read("services/dsh/frontend/control-panel/platform/PlatformGovernanceVisual.tsx");

const workflow = read("services/dsh/frontend/shared/platform/use-platform-change-workflow-controller.tsx");
const platformApi = read("services/dsh/frontend/shared/platform/platform-control.api.ts");
const identityContract = read("core/identity/clients/generated/identity-api.ts");
const platformServer = read("core/platform-control/backend/internal/http/server.go");

test("platform governance renders the live visualization on the sovereign platform page", () => {
  assert.match(page, /PlatformDashboardScreen/);
  assert.match(page, /<PlatformDashboardScreen\s*\/>/);
  assert.match(dashboard, /PlatformGovernanceVisual/);
  assert.match(dashboard, /<PlatformGovernanceVisual\s*\/>/);
  assert.match(platformIndex, /export \{ PlatformGovernanceVisual \}/);
  assert.match(visual, /usePlatformChangeWorkflowController\(canRead\)/);
  assert.match(visual, /workflow\.state\.changeSets/);
  assert.doesNotMatch(visual, /const\s+changeSets\s*=\s*\[[\s\S]*\]/);
  assert.doesNotMatch(visual, /fetch\s*\(/);
});

test("platform governance binds the visualization to authenticated operator context", () => {
  assert.match(identityContract, /ActorIdentity:[\s\S]*operatorContextId: string/);

  assert.match(visual, /identity\?\.operatorContextId\.trim\(\)/);
  assert.match(visual, /hasControlPanelPermission\(identity, "platform:read"\)/);
  assert.doesNotMatch(visual, /local-dsh/);
  assert.doesNotMatch(visual, /X-Operator-Context-ID/);
  assert.match(platformServer, /enforceOperatorContext/);
  assert.match(platformServer, /authenticated identity has no trusted operator context/);
});

test("platform governance exposes the complete governed lifecycle without bypass actions", () => {
  for (const status of ["draft", "validated", "submitted", "approved", "applied", "rolled_back"]) {
    assert.match(visual, new RegExp(`status: "${status}"`));
  }
  assert.match(visual, /maker-checker/);
  assert.match(visual, /PostgreSQL/);
  assert.match(visual, /لقطة شروط مسبقة/);
  assert.match(visual, /التطبيق الذري/);
  assert.doesNotMatch(visual, /createPlatformChangeSet|approvePlatformChangeSet|applyPlatformChangeSet/);
  assert.match(workflow, /fetchPlatformChangeSets/);
  assert.match(workflow, /validatePlatformChangeSet/);
  assert.match(workflow, /approvePlatformChangeSet/);
  assert.match(workflow, /rollbackPlatformChangeSet/);
});

test("platform governance uses the typed boundary and supports real recovery states", () => {
  assert.match(platformApi, /createDshHttpClient/);
  assert.match(platformApi, /\/platform\/v1\/change-sets/);
  assert.match(visual, /workflow\.state\.kind === "loading"/);
  assert.match(visual, /workflow\.state\.kind === "error"/);
  assert.match(visual, /إعادة المحاولة/);
  assert.match(visual, /تحديث القراءة/);
  assert.match(visual, /صلاحية قراءة المنصة مطلوبة/);
});
