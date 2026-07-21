import assert from "node:assert/strict";
import fs from "node:fs";

const screen = fs.readFileSync(
  "services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx",
  "utf8",
);

assert.match(screen, /feeRefState\.data\.amount/);
assert.doesNotMatch(screen, /feeRefState\.data\.amountMinor/);
assert.match(screen, /colorRoles\.brandAction/);
assert.match(screen, /colorRoles\.brandActionSoft/);
assert.doesNotMatch(screen, /colorRoles\.brandPrimary/);
assert.doesNotMatch(screen, /colorRoles\.surfaceRaised/);

for (const temporaryWorkflow of [
  ".github/workflows/jrn-001-fs-10-app-client-diagnostic.yml",
  ".github/workflows/jrn-001-fs-10-store-link-repair.yml",
]) {
  assert.equal(
    fs.existsSync(temporaryWorkflow),
    false,
    `temporary FS-10 workflow must be removed: ${temporaryWorkflow}`,
  );
}

console.log("JRN-001 FS-10 field onboarding contracts and temporary-workflow cleanup verified");
