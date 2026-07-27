import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("employee platform access code has a same-origin HttpOnly BFF route", () => {
  const route = read("apps/control-panel/runtime/src/app/api/auth/activate/route.ts");
  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /actorType:\s*"employee"/);
  assert.match(route, /tokens\.identity\.roles\.includes\("operator"\)/);
  assert.match(route, /setSessionCookies\(response, tokens\)/);
  assert.match(route, /Cache-Control":\s*"no-store"/);
  assert.doesNotMatch(route, /localStorage|sessionStorage/);
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
