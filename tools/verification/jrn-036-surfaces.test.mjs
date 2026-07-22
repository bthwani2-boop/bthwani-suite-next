import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(path) {
  assert.equal(fs.existsSync(path), true, `missing ${path}`);
  return fs.readFileSync(path, "utf8");
}

const api = read("services/dsh/frontend/shared/finance-wlt-link/jrn036/jrn036.api.ts");
const representative = read("services/dsh/frontend/shared/finance-wlt-link/jrn036/RepresentativeCommissionPanel.tsx");
const partner = read("services/dsh/frontend/shared/finance-wlt-link/wlt/generated/WltDshPartnerBridge.tsx");
const captain = read("services/dsh/frontend/app-captain/account/DshCaptainFinanceScreen.tsx");
const field = read("services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx");
const control = read("services/dsh/frontend/control-panel/finance/Jrn036CommissionGovernancePanel.tsx");

test("representative API is actor-owned and never accepts arbitrary actor ids", () => {
  assert.match(api, /\/dsh\/\$\{actorType\}\/me\/finance\/commissions/);
  assert.doesNotMatch(api, /beneficiaryActorId=/);
  assert.doesNotMatch(api, /partnerId=/);
});

test("partner, captain, and field surfaces expose WLT-owned commission truth", () => {
  assert.match(partner, /RepresentativeCommissionPanel/);
  assert.match(partner, /actorType="partner"/);
  assert.match(captain, /RepresentativeCommissionPanel/);
  assert.match(captain, /actorType="captain"/);
  assert.match(field, /useFieldFinanceController/);
  assert.match(field, /مصدرها WLT/);
  assert.doesNotMatch(field, /partnerId\s*[=:]/);
});

test("representative commission panel has loading, error, empty, retry, and lifecycle states", () => {
  for (const required of [
    "جارٍ تحميل",
    "تعذر تحميل",
    "إعادة المحاولة",
    "لا توجد عمولات",
    "pending",
    "confirmed",
    "settled",
    "rejected",
    "reversed",
    "resolutionNote",
    "القيمة والسياسة والحالة من WLT فقط",
  ]) {
    assert.equal(representative.includes(required), true, `missing representative state/copy: ${required}`);
  }
  assert.doesNotMatch(representative, /TextInput/);
  assert.doesNotMatch(representative, /amountMinorUnits\s*[=:]\s*Number/);
});

test("control-panel mutations are reasoned and state-gated", () => {
  for (const required of [
    "upsertJrn036CommissionPolicy",
    "confirmJrn036Commission",
    "settleJrn036Commission",
    "rejectJrn036Commission",
    "reverseJrn036Commission",
    "adjustJrn036Commission",
    "سبب رفض العمولة",
    "سبب عكس العمولة",
    "سبب التعديل",
    "commission.status === \"pending\"",
    "commission.status === \"confirmed\"",
    "commission.status === \"settled\"",
  ]) {
    assert.equal(control.includes(required), true, `missing control-panel invariant: ${required}`);
  }
});

test("all actionable controls carry explicit Arabic labels", () => {
  const labels = [...control.matchAll(/<Button\s+label="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(labels.length >= 5, "expected labelled finance actions");
  assert.equal(labels.some((label) => label.trim() === ""), false);
});
