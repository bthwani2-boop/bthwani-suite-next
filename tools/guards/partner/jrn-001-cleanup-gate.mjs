import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const manifest = JSON.parse(read("services/dsh/contracts/jrn-001-cleanup-manifest.json"));
for (const path of manifest.removedTransientFiles) {
  assert.equal(fs.existsSync(path), false, `completed transient workflow remains: ${path}`);
}
for (const path of Object.values(manifest.canonicalFiles)) {
  assert.equal(fs.existsSync(path), true, `canonical JRN-001 file missing: ${path}`);
}
const routes = read(manifest.canonicalFiles.routes);
const fieldController = read(manifest.canonicalFiles.fieldController);
const barrel = read(manifest.canonicalFiles.sharedBrain);
for (const route of [
  "POST /dsh/operator/partners",
  "GET /dsh/operator/partners/{partnerId}",
  "POST /dsh/field/partners/drafts",
  "PATCH /dsh/field/partners/{partnerId}",
  "POST /dsh/field/partners/{partnerId}/submit",
]) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = routes.match(new RegExp(`mux\\.HandleFunc\\(["']${escaped}["']\\s*,`, "g")) ?? [];
  assert.equal(matches.length, 1, `route must be registered exactly once: ${route}`);
}
assert.doesNotMatch(fieldController, /AsyncStorage|localStorage|mockPartner|partnerFixture/i);
assert.doesNotMatch(fieldController, /fetch\s*\(/);
assert.match(barrel, /Partner Onboarding & Store Publication — shared brain public barrel/);
assert.match(barrel, /partner-onboarding\.visible-state/);

console.log("JRN-001 FS-16 cleanup, canonical ownership and duplicate-route gate passed");
