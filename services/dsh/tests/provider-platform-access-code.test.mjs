import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");

test("provider applications consume only platform-issued access codes", () => {
  const gate = read("services/dsh/frontend/shared/session/IdentitySessionGate.tsx");

  assert.match(gate, /role === "partner" \|\| role === "captain" \|\| role === "field"/);
  assert.match(gate, /كود الدخول تمنحه منصة بثواني/);
  assert.match(gate, /لا يمكن طلبه من التطبيق/);
  assert.match(gate, /تسجيل هذا الجهاز والدخول/);
  assert.doesNotMatch(gate, /requestOtp|طلب رمز التفعيل|selfServiceOtpAllowed/);
});

test("partner access codes are bound to app-partner in Identity", () => {
  const partnerAccess = read("core/identity/backend/internal/identity/partner_access.go");
  assert.match(partnerAccess, /activationSurfaceByActorType\["partner"\]\s*=\s*"app-partner"/);
});
