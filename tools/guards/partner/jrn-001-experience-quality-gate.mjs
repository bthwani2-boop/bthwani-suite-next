import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const policy = JSON.parse(read("services/dsh/contracts/jrn-001-experience-quality-registry.json"));
const field = read("services/dsh/frontend/app-field/onboarding/DshFieldOnboardingScreen.tsx");
const partnerStatus = read("services/dsh/frontend/app-partner/account/PartnerOnboardingStatusView.tsx");
const controlDetail = read("services/dsh/frontend/control-panel/partners/PartnerDetailOperationalScreen.tsx");
const visible = read("services/dsh/frontend/shared/partner/partner-onboarding.visible-state.ts");
const admin = read("services/dsh/frontend/shared/partner/use-partner-admin-controller.tsx");

assert.equal(policy.locale, "ar-YE");
assert.equal(policy.direction, "rtl");
assert.match(field, /accessibilityLabel="رجوع"/);
assert.match(field, /accessibilityRole="button"/);
assert.match(field, /textAlign:\s*['"]right['"]/);
assert.match(partnerStatus, /checkmark-circle/);
assert.match(partnerStatus, /تحديث الحالة/);
assert.match(controlDetail, /role="tablist"/);
assert.match(controlDetail, /role="tab"/);
assert.match(visible, /لا يوجد اتصال بالخدمة/);
assert.match(visible, /لا تُعرض البيانات المحلية كحقيقة تشغيلية/);
assert.match(admin, /const PAGE_SIZE = 50/);
assert.doesNotMatch(field, /fetch\s*\(/);
assert.doesNotMatch(partnerStatus, /fetch\s*\(/);
assert.doesNotMatch(controlDetail, /fetch\s*\(/);

console.log("JRN-001 FS-14 accessibility, RTL, performance and weak-network gate passed");
