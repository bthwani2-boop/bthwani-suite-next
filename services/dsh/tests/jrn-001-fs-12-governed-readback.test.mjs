import assert from "node:assert/strict";
import fs from "node:fs";

const admin = fs.readFileSync(
  "services/dsh/frontend/shared/partner/use-partner-admin-governed-controller.tsx",
  "utf8",
);
const field = fs.readFileSync(
  "services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx",
  "utf8",
);
const team = fs.readFileSync(
  "services/dsh/frontend/shared/partner/use-partner-team-governed-controller.ts",
  "utf8",
);
const barrel = fs.readFileSync("services/dsh/frontend/shared/partner/index.ts", "utf8");
const partnerSurface = fs.readFileSync(
  "services/dsh/frontend/app-partner/team/usePartnerTeamModel.ts",
  "utf8",
);

assert.match(admin, /createPartner\(input\)[\s\S]*fetchPartner\(created\.id\)/);
assert.match(admin, /transitionPartner\(partnerId[\s\S]*fetchPartner\(partnerId\)/);
assert.match(field, /fieldSubmitPartner[\s\S]*assertPartnerReadback[\s\S]*fieldGetPartner/);
assert.match(team, /await invitePartnerTeamMember[\s\S]*await loadTeam\(\)/);
assert.match(team, /await executePartnerTeamMemberAction[\s\S]*await loadTeam\(\)/);
assert.match(barrel, /use-partner-admin-governed-controller/);
assert.match(partnerSurface, /use-partner-team-governed-controller/);
for (const source of [admin, field, team]) {
  assert.doesNotMatch(source, /mockPartner|fakePartner|localSuccess/i);
}

console.log("JRN-001 FS-12 governed multisurface readback closed");
