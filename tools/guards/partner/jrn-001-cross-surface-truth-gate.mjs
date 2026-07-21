import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const files = {
  field: "services/dsh/frontend/shared/field-onboarding/use-field-partner-onboarding-controller.tsx",
  admin: "services/dsh/frontend/shared/partner/use-partner-admin-controller.tsx",
  self: "services/dsh/frontend/shared/partner/use-partner-self-controller.tsx",
  runtime: "services/dsh/frontend/shared/partner/partner-onboarding.runtime.ts",
};
const source = Object.fromEntries(Object.entries(files).map(([key, path]) => [key, read(path)]));

for (const [name, text] of Object.entries(source)) {
  assert.doesNotMatch(text, /AsyncStorage|localStorage|sessionStorage|MMKV|fixture|mockPartner/i, `${name} contains a local partner truth source`);
}

assert.match(source.runtime, /assertPartnerReadback/);
assert.match(source.runtime, /PARTNER_READBACK_MISMATCH/);
assert.match(source.runtime, /PARTNER_READBACK_STALE/);
assert.match(source.field, /assertPartnerReadback\(res\.id, res\.version, await fieldGetPartner\(res\.id\)\)/);
assert.match(source.field, /assertPartnerReadback\([\s\S]*await fieldGetPartner\(state\.partnerId\)/);
assert.match(source.field, /fieldSubmitPartner[\s\S]*assertPartnerReadback/);
assert.match(source.admin, /await addPartnerDocument\(partnerId, input\);\s*await load\(\);/);
assert.match(source.admin, /await reviewPartnerDocument\(partnerId, docId, input\);\s*await load\(\);/);
assert.match(source.admin, /await transitionPartner\(partnerId, input, version\);\s*await load\(\);/);
assert.match(source.admin, /await linkPartnerStore\(partnerId, storeId\);\s*await load\(\);/);

console.log("JRN-001 FS-12 cross-surface committed readback and no-local-truth gate passed");
