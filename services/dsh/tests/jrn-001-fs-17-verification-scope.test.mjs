import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(
  ".github/workflows/jrn-001-sequential-verification.yml",
  "utf8",
);
const scope = JSON.parse(
  fs.readFileSync("services/dsh/contracts/jrn-001-verification-scope.json", "utf8"),
);

assert.equal(scope.journeyId, "JRN-001");
assert.equal(scope.statusContext, "journeys/jrn-001-sequential");
assert.ok(scope.requiredChecks.length >= 9);
for (const marker of [
  "jrn-001-*.test.mjs",
  "apps/app-field/runtime typecheck",
  "apps/app-partner/runtime typecheck",
  "apps/control-panel/runtime typecheck",
  "go test ./internal/partner",
  "go test ./internal/http",
  "go test ./cmd/dsh-api",
  "guard:fullstack-boundary",
  "guard:wlt-financial-boundary",
  "journeys/jrn-001-sequential",
]) {
  assert.equal(workflow.includes(marker), true, `${marker} verification marker is missing`);
}

console.log("JRN-001 FS-17 permanent verification scope closed");
