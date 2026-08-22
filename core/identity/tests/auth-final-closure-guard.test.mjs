import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(repoRoot, relative));

function filesUnder(relative) {
  const root = path.join(repoRoot, relative);
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    const childRelative = path.relative(repoRoot, absolute).replaceAll(path.sep, "/");
    if (entry.isDirectory()) result.push(...filesUnder(childRelative));
    else result.push(childRelative);
  }
  return result;
}

const authSources = [
  ...filesUnder("core/identity/clients").filter((file) => file.endsWith(".ts") && !file.includes("/generated/")),
  ...filesUnder("apps/control-panel/runtime/src/app/api/auth").filter((file) => file.endsWith(".ts")),
  "apps/control-panel/runtime/src/server/bff-proxy.adapter.ts",
  "services/dsh/frontend/shared/session/IdentitySessionGate.tsx",
  "services/dsh/frontend/shared/session/ControlPanelAuthBoundary.tsx",
  "services/dsh/backend/internal/http/protected_store.go",
  "services/dsh/backend/internal/http/administration_permission.go",
  "core/identity/backend/internal/identity/refresh_concurrency.go",
  "core/identity/backend/internal/http/refresh_concurrency_boundary.go",
  "tools/dev/local-dev-session-broker.mjs",
];

test("auth scope contains no deferred cleanup markers or skipped identity tests", () => {
  for (const file of authSources) {
    const source = read(file);
    assert.doesNotMatch(source, /\bTODO\b|\bFIXME\b/, `${file} contains deferred auth work`);
  }

  for (const file of [
    ...filesUnder("core/identity/tests").filter((item) => item.endsWith(".test.mjs")),
    ...filesUnder("apps/control-panel/runtime/tests").filter((item) => item.endsWith(".test.mjs")),
  ]) {
    assert.doesNotMatch(read(file), /\btest\.skip\s*\(/, `${file} contains a skipped auth verification`);
  }
});

test("cached identity cannot authenticate before live validation", () => {
  const store = read("core/identity/clients/identity-session-store.ts");
  assert.doesNotMatch(store, /commitAuthenticatedSession\(saved,\s*false\)/);
  assert.match(store, /await restoreStoredSession\(identityClient, saved\)/);
});

test("session ending is never best-effort local-first", () => {
  const store = read("core/identity/clients/identity-session-store.ts");
  const logoutRoute = read("apps/control-panel/runtime/src/app/api/auth/logout/route.ts");
  const genericProxy = read("apps/control-panel/runtime/src/server/bff-proxy.adapter.ts");

  assert.doesNotMatch(store, /client\.logout\(accessToken\)\.catch\(/);
  assert.doesNotMatch(store, /clearSession\(\);\s*\n\s*if \(client !== null && accessToken/);
  assert.match(logoutRoute, /IDENTITY_LOGOUT_REVOCATION_UNCONFIRMED/);
  assert.match(genericProxy, /logoutRevocationConfirmed/);
});

test("mobile actor authorization requires its exact session surface", () => {
  const protectedStore = read("services/dsh/backend/internal/http/protected_store.go");
  assert.match(protectedStore, /if identity\.SessionSurface != expectedSurface \{/);
  assert.doesNotMatch(protectedStore, /identity\.SessionSurface != expectedSurface\s*&&\s*identity\.SessionSurface != "system"/);
});

test("control-panel permissions never fabricate operator role", () => {
  const protectedStore = read("services/dsh/backend/internal/http/protected_store.go");
  const administration = read("services/dsh/backend/internal/http/administration_permission.go");

  assert.match(protectedStore, /Role:\s+controlPanelActorRole\(identity\)/);
  assert.doesNotMatch(protectedStore, /Role:\s*"operator"/);
  assert.match(administration, /SessionSurface != "control-panel"/);
  assert.match(administration, /resolvedControlPanelPermissions/);
});

test("generic control-panel authentication is exact-surface and role-neutral", () => {
  const genericFiles = [
    "apps/control-panel/runtime/src/app/api/auth/login/route.ts",
    "apps/control-panel/runtime/src/app/api/auth/session/route.ts",
    "apps/control-panel/runtime/src/app/api/auth/activate/route.ts",
    "apps/control-panel/runtime/src/server/bff-proxy.adapter.ts",
    "services/dsh/frontend/shared/session/ControlPanelAuthBoundary.tsx",
  ];
  for (const file of genericFiles) {
    const source = read(file);
    assert.match(source, /identitySessionIsBoundToSurface/);
    assert.match(source, /control-panel/);
    assert.doesNotMatch(source, /roles\.includes\("operator"\)/);
  }

  const devSession = read("apps/control-panel/runtime/src/app/api/auth/dev-session/route.ts");
  assert.match(devSession, /identitySessionAuthorizesSurface/);
  assert.match(devSession, /"operator",\s*"control-panel"/);
});

test("refresh coordination has one database owner and one browser owner", () => {
  const serverSession = read("apps/control-panel/runtime/src/app/api/auth/_lib/session.ts");
  const dsh = read("services/dsh/frontend/shared/_kernel/dsh-http-request.ts");
  const wlt = read("services/wlt/frontend/shared/dsh/dsh-link/dsh-http-request.ts");
  const browser = read("core/identity/clients/control-panel-cookie-session.ts");
  const coordination = read("core/identity/backend/internal/identity/refresh_concurrency.go");
  const boundary = read("core/identity/backend/internal/http/refresh_concurrency_boundary.go");

  assert.doesNotMatch(serverSession, /inFlightRefresh|new Map<string, Promise<TokenResponse>>/);
  assert.doesNotMatch(dsh, /controlPanelRefreshInFlight|\/api\/auth\/refresh/);
  assert.doesNotMatch(wlt, /controlPanelRefreshInFlight|\/api\/auth\/refresh/);
  assert.match(dsh, /executeWithControlPanelCookieSession/);
  assert.match(wlt, /executeWithControlPanelCookieSession/);
  assert.match(browser, /CONTROL_PANEL_SESSION_LOCK/);
  assert.match(coordination, /pg_advisory_xact_lock/);
  assert.match(coordination, /RefreshGoverned/);
  assert.match(boundary, /next\.ServeHTTP\(w, r\)/);
  assert.doesNotMatch(boundary, /randomToken\(|createSession|mint|generate.*token/i);
  const refreshRoute = read("apps/control-panel/runtime/src/app/api/auth/refresh/route.ts");
  assert.match(refreshRoute, /identitySessionIsBoundToSurface\(rotated\.identity,\s*"control-panel"\)/);
});
