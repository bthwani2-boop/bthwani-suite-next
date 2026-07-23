import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

const page = read("apps/control-panel/runtime/src/app/dsh/platform/page.tsx");
const platformIndex = read("services/dsh/frontend/control-panel/platform/index.ts");
const visual = read("services/dsh/frontend/control-panel/platform/PlatformGovernanceVisual.tsx");
const session = read("services/dsh/frontend/shared/session/control-panel-session.tsx");
const workflow = read("services/dsh/frontend/shared/platform/use-platform-change-workflow-controller.tsx");
const platformApi = read("services/dsh/frontend/shared/platform/platform-control.api.ts");
const identityContract = read("core/identity/clients/generated/identity-api.ts");
const platformServer = read("core/platform-control/backend/internal/http/server.go");

test("JRN-040 renders the live governance visualization on the sovereign platform page", () => {
  assert.match(page, /PlatformGovernanceVisual/);
  assert.match(page, /<PlatformGovernanceVisual\s*\/>/);
  assert.match(platformIndex, /export \{ PlatformGovernanceVisual \}/);
  assert.match(visual, /usePlatformChangeWorkflowController\(canRead\)/);
  assert.match(visual, /workflow\.state\.changeSets/);
  assert.doesNotMatch(visual, /const\s+changeSets\s*=\s*\[[\s\S]*\]/);
  assert.doesNotMatch(visual, /fetch\s*\(/);
});

test("JRN-040 binds the visualization to authenticated SaaS tenant context", () => {
  assert.match(identityContract, /ActorIdentity:[\s\S]*tenantId: string/);
  assert.match(session, /identity: ActorIdentity/);
  assert.match(visual, /identity\?\.tenantId\.trim\(\)/);
  assert.match(visual, /hasControlPanelPermission\(identity, "platform:read"\)/);
  assert.doesNotMatch(visual, /local-dsh/);
  assert.doesNotMatch(visual, /X-Tenant-ID/);
  assert.match(platformServer, /enforceSaasTenantContext/);
  assert.match(platformServer, /authenticated identity has no trusted tenant context/);
});

test("JRN-040 exposes the complete governed lifecycle without bypass actions", () => {
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

test("JRN-040 uses the typed platform-control boundary and supports real recovery states", () => {
  assert.match(platformApi, /createDshHttpClient/);
  assert.match(platformApi, /\/platform\/v1\/change-sets/);
  assert.match(visual, /workflow\.state\.kind === "loading"/);
  assert.match(visual, /workflow\.state\.kind === "error"/);
  assert.match(visual, /إعادة المحاولة/);
  assert.match(visual, /تحديث القراءة/);
  assert.match(visual, /صلاحية قراءة المنصة مطلوبة/);
});
