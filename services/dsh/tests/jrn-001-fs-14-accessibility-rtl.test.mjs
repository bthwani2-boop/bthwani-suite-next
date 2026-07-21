import assert from "node:assert/strict";
import fs from "node:fs";

const field = fs.readFileSync(
  "services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx",
  "utf8",
);
const control = fs.readFileSync(
  "services/dsh/frontend/control-panel/partners/PartnerDetailOperationalScreen.tsx",
  "utf8",
);
const runtime = fs.readFileSync(
  "services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts",
  "utf8",
);
const policy = JSON.parse(
  fs.readFileSync("services/dsh/contracts/jrn-001-experience-policy.json", "utf8"),
);

assert.equal(policy.locale, "ar-YE");
assert.equal(policy.direction, "rtl");
assert.match(field, /accessibilityRole="button"/);
assert.match(field, /accessibilityLabel=/);
assert.match(field, /accessibilityRole="alert"/);
assert.match(field, /flexDirection: 'row-reverse'/);
assert.match(field, /[\u0600-\u06FF]/);
assert.match(field, /launchImageLibraryAsync\(\{ quality: 0\.8 \}\)/);
assert.doesNotMatch(field, /base64:\s*true/);
assert.match(control, /role="tablist"/);
assert.match(control, /role="tab"/);
assert.match(control, /aria-selected/);
assert.match(runtime, /state: "offline"/);
assert.match(runtime, /state: "partial"/);
assert.match(runtime, /reloadRequired: true/);

console.log("JRN-001 FS-14 accessibility, RTL and weak-network UX closed");
