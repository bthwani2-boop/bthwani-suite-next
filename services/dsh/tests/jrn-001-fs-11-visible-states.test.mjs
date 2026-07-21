import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const registry = JSON.parse(read("services/dsh/contracts/jrn-001-visible-state-registry.json"));
const runtime = read("services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts");
const visible = read("services/dsh/frontend/shared/partner/partner-onboarding.visible-state.ts");
const barrel = read("services/dsh/frontend/shared/partner/index.ts");

assert.equal(registry.journeyId, "JRN-001");
assert.equal(registry.sliceId, "FS-11");
for (const state of ["loading", "offline", "forbidden", "conflict", "readiness_blocked", "wlt_unavailable", "partial", "error", "ready"]) {
  assert.ok(registry.states[state], `visible state registry missing: ${state}`);
  assert.match(runtime, new RegExp(`\\|?\\s*["']${state}["']`), `runtime state missing: ${state}`);
  assert.match(visible, new RegExp(`\\b${state}:\\s*\\{`), `visible copy missing: ${state}`);
}
assert.equal(registry.states.conflict.recovery, "reload-committed-state");
assert.equal(registry.states.wlt_unavailable.recovery, "retry-same-idempotency-key");
assert.match(visible, /blocksMutation:\s*true/);
assert.match(visible, /لا تُعرض البيانات المحلية كحقيقة تشغيلية/);
assert.match(visible, /لم تُحفظ بيانات مالية خام في DSH/);
assert.match(visible, /resolvePartnerOnboardingFailureState/);
assert.match(barrel, /partner-onboarding\.visible-state/);
assert.deepEqual(
  registry.surfaceRequirements.map((surface) => surface.surfaceId).sort(),
  ["app-client", "app-field", "app-partner", "control-panel"],
);
console.log("JRN-001 FS-11 visible states and governed recovery actions verified");
