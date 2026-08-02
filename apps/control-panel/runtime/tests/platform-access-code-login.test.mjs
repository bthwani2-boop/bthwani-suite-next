import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("employee platform access code has a same-origin HttpOnly BFF route", () => {
  const route = read("apps/control-panel/runtime/src/app/api/auth/activate/route.ts");
  const identityActivation = read("apps/control-panel/runtime/src/app/api/auth/_lib/identity-activation.api.ts");
  const identityTransport = read("apps/control-panel/runtime/src/app/api/auth/_lib/identity-server-http.adapter.ts");

  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /activateEmployeeAccessCode\(\{\s*baseUrl,\s*phone,\s*code\s*\}\)/);
  assert.match(identityActivation, /path:\s*"\/auth\/activate"/);
  assert.match(identityActivation, /actorType:\s*"employee"/);
  assert.match(identityActivation, /deviceFingerprint:\s*"control-panel-access-code"/);
  assert.match(identityActivation, /postIdentityServerJson/);
  assert.match(identityTransport, /cache:\s*"no-store"/);
  assert.match(route, /tokens\.identity\.roles\.includes\("operator"\)/);
  assert.match(route, /setSessionCookies\(response, tokens\)/);
  assert.match(route, /Cache-Control":\s*"no-store"/);
  assert.doesNotMatch(`${route}\n${identityActivation}\n${identityTransport}`, /localStorage|sessionStorage/);
});

test("control-panel identity configuration owns the same-origin BFF transport", () => {
  const providers = read("apps/control-panel/runtime/src/app/providers.tsx");
  const identityConfig = read("core/identity/clients/identity-api-config.ts");
  const nextConfig = read("apps/control-panel/runtime/next.config.ts");

  assert.match(providers, /configureIdentitySession\(resolveIdentityApiBaseUrl\(\)\)/);
  assert.match(identityConfig, /NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED/);
  assert.match(identityConfig, /return "\/api\/identity"/);
  assert.match(nextConfig, /NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED:\s*"true"/);
});

test("employee invitation contract targets control-panel rather than webapp", () => {
  const employeeAccess = read("core/identity/backend/internal/identity/employee_access.go");
  const employeeContract = read("core/identity/contracts/employee-access.openapi.yaml");
  const workforceClient = read("core/workforce/backend/internal/identityclient/client.go");

  assert.match(employeeAccess, /activationSurfaceByActorType\["employee"\]\s*=\s*"control-panel"/);
  assert.doesNotMatch(employeeAccess, /activationSurfaceByActorType\["employee"\]\s*=\s*"webapp"/);
  assert.match(employeeContract, /actorType=employee and\s+surface=control-panel/);
  assert.doesNotMatch(employeeContract, /surface=webapp/);
  assert.match(workforceClient, /expectedActorType\)\s*==\s*"employee"[\s\S]*return "control-panel"/);
});

test("leadership form rejects an end date before the start date", () => {
  const panel = read("services/dsh/frontend/control-panel/platform/SovereignLeadershipPanel.tsx");
  assert.match(panel, /end < start/);
  assert.match(panel, /تاريخ نهاية التكليف يجب أن يساوي تاريخ البداية أو يأتي بعده/);
  assert.match(panel, /نهاية التكليف \(اختيارية\)/);
});
