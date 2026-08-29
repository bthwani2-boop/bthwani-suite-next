import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const source = fs.readFileSync(
  path.join(repoRoot, "services/dsh/frontend/shared/session/ControlPanelAuthBoundary.tsx"),
  "utf8",
);
const sectionBoundary = fs.readFileSync(
  path.join(repoRoot, "services/dsh/frontend/control-panel/ControlPanelSectionAccessBoundary.tsx"),
  "utf8",
);
const navigationSource = fs.readFileSync(
  path.join(repoRoot, "services/dsh/frontend/control-panel/navigation.ts"),
  "utf8",
);
const workforceHrSource = fs.readFileSync(
  path.join(repoRoot, "services/dsh/frontend/control-panel/hr/WorkforceHrScreen.tsx"),
  "utf8",
);
const workforceReferenceSource = fs.readFileSync(
  path.join(repoRoot, "services/dsh/frontend/control-panel/hr/WorkforceReferenceView.tsx"),
  "utf8",
);
const workforceOperationalCoreSource = fs.readFileSync(
  path.join(repoRoot, "services/dsh/frontend/control-panel/hr/ProviderOperationalCorePanel.tsx"),
  "utf8",
);
const routes = await import(
  pathToFileURL(path.join(repoRoot, "services/dsh/frontend/shared/control-panel-routes.ts")).href,
);

test("protected control-panel children require a proven control-panel session", () => {
  assert.match(source, /authenticatedForControlPanel[\s\S]*identitySessionIsBoundToSurface\(state\.identity,\s*"control-panel"\)/);
  assert.match(source, /if \(state\.kind === "unconfigured"\)/);
  assert.match(source, /if \(state\.kind === "service_unavailable"\)/);
  assert.match(source, /if \(authenticatedForControlPanel\) \{\s*return <>\{children\}<\/>;\s*\}/s);
  assert.match(source, /return loadingPanel\(\);\s*\n}/);
  assert.doesNotMatch(source, /\n\s*return <>\{children\}<\/>;\s*\n}/);
});

test("control-panel authentication preserves governed DSH and WLT return paths", () => {
  assert.equal(routes.resolveControlPanelReturnTo("/dsh/operations"), "/dsh/operations");
  assert.equal(routes.resolveControlPanelReturnTo("/wlt/finance"), "/wlt/finance");
  assert.equal(routes.resolveControlPanelReturnTo("/wlt/finance/ledger-inspector"), "/wlt/finance/ledger-inspector");
  assert.equal(routes.resolveControlPanelReturnTo("https://evil.example/path"), "/dsh/dashboard");
  assert.equal(routes.resolveControlPanelReturnTo("/outside"), "/dsh/dashboard");
  assert.match(source, /resolveControlPanelReturnTo\(pathname\)/);
});

test("control-panel section navigation and deep links share one fail-closed read contract", () => {
  assert.match(navigationSource, /readRequirements:/);
  assert.match(navigationSource, /canReadDshNavItem/);
  assert.match(navigationSource, /hasAnyControlPanelPermissionAlternative/);
  for (const action of [
    "analytics.read",
    "operations.read",
    "partners.read",
    "catalog.product.read",
    "marketing.read",
    "finance.read",
    "support.read",
    "platform:read",
    "administration.role.read",
    "provider:read",
  ]) assert.match(navigationSource, new RegExp(action.replaceAll(".", "\\.")));
  const hrStart = navigationSource.indexOf('section: "hr"');
  const hrBlock = navigationSource.slice(hrStart, navigationSource.indexOf("\n  },", hrStart));
  assert.match(hrBlock, /service: "workforce", action: "provider:read"/);
  assert.doesNotMatch(hrBlock, /service: "providers"|action: "employee:read"/);
  assert.match(sectionBoundary, /resolveDshNavigationItem\(pathname\)/);
  assert.match(sectionBoundary, /canReadDshNavItem\(state\.identity, item\)/);
  assert.match(sectionBoundary, /لا تملك جلسة لوحة التحكم صلاحية قراءة/);
  assert.match(sectionBoundary, /if \(state\.kind !== "authenticated"\) return null/);
});

test("workforce HR mutation surfaces bind to canonical Workforce permissions", () => {
  assert.match(workforceHrSource, /provider:create/);
  assert.match(workforceHrSource, /provider:update/);
  assert.match(workforceHrSource, /provider:suspend/);
  assert.match(workforceHrSource, /provider:reactivate/);
  assert.match(workforceHrSource, /reference:manage/);
  assert.match(workforceHrSource, /if \(!canCreate\)/);
  assert.match(workforceReferenceSource, /canManage: boolean/);
  assert.match(workforceReferenceSource, /props\.canManage \?/);
  assert.match(workforceOperationalCoreSource, /canUpdate: boolean/);
  assert.match(workforceOperationalCoreSource, /if \(!canUpdate\) return/);
  assert.match(workforceOperationalCoreSource, /<fieldset disabled=\{!canUpdate\}/);
});
