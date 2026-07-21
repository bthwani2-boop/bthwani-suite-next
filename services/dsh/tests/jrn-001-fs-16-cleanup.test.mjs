import assert from "node:assert/strict";
import fs from "node:fs";

for (const file of [
  ".github/workflows/jrn-001-fs-10-app-client-diagnostic.yml",
  ".github/workflows/jrn-001-fs-10-store-link-repair.yml",
  ".github/workflows/jrn-001-fs-10-app-field-repair.yml",
  ".github/workflows/jrn-001-fs-11-visible-states.yml",
  ".github/workflows/jrn-001-fs-12-multisurface-readback.yml",
  ".github/workflows/jrn-001-fs-12-atomic.yml",
  ".github/workflows/jrn-001-sequential-orchestrator.yml",
]) {
  assert.equal(fs.existsSync(file), false, `${file} must remain removed`);
}

const screen = fs.readFileSync(
  "services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx",
  "utf8",
);
const barrel = fs.readFileSync(
  "services/dsh/frontend/shared/partner/index.ts",
  "utf8",
);
const teamSurface = fs.readFileSync(
  "services/dsh/frontend/app-partner/team/usePartnerTeamModel.ts",
  "utf8",
);

assert.doesNotMatch(screen, /amountMinor|brandPrimary|surfaceRaised/);
assert.match(barrel, /use-partner-admin-governed-controller/);
assert.match(teamSurface, /use-partner-team-governed-controller/);
assert.equal(fs.existsSync("services/dsh/frontend/app-field"), true);
assert.equal(fs.existsSync("services/dsh/frontend/app-partner"), true);
assert.equal(fs.existsSync("services/dsh/frontend/control-panel/partners"), true);

console.log("JRN-001 FS-16 cleanup and ownership closed");
