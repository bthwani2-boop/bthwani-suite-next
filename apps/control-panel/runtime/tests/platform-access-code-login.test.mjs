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

test("control-panel makes the platform-issued code the primary employee entry", () => {
  const page = read("apps/control-panel/runtime/src/app/dsh/login/page.tsx");
  const session = read("services/dsh/frontend/shared/session/control-panel-session.tsx");
  const api = read("services/dsh/frontend/shared/session/control-panel-session.api.ts");

  assert.match(page, /useState<LoginMode>\("access-code"\)/);
  assert.match(page, /كود الدخول الصادر من منصة بثواني/);
  assert.match(page, /ليس رمز تحقق/);
  assert.match(page, /تسجيل المتصفح والدخول/);
  assert.match(session, /activate\(phone: string, code: string\)/);
  assert.match(api, /"\/api\/auth\/activate"/);
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
