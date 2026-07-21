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

console.log("JRN-001 FS-10 field onboarding fee and color contracts verified");
