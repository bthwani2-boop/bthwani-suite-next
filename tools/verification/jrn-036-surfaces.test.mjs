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
const settlementApi = read("services/dsh/frontend/shared/finance-wlt-link/finance/finance-hub-runtime.api.ts");
const settlementPanel = read("services/dsh/frontend/control-panel/finance/GovernedSettlementPanel.tsx");

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

test("control-panel commission mutations are reasoned and state-gated", () => {
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

test("settlement policy editor sends the complete strict contract", () => {
  for (const required of [
    "cycleDays",
    "minimumNetMinorUnits",
    "changeReason",
    "سبب تغيير سياسة التسوية",
    "حفظ إصدار سياسة التسوية في WLT",
  ]) {
    assert.equal(settlementPanel.includes(required), true, `missing settlement policy field/copy: ${required}`);
    assert.equal(settlementApi.includes(required), true, `missing settlement API field: ${required}`);
  }

  const createFunction = settlementApi.slice(
    settlementApi.indexOf("export async function createSettlementFromDeliveredOrders"),
  );
  assert.match(createFunction, /partnerId:\s*input\.partnerId/);
  assert.match(createFunction, /periodStart:\s*input\.periodStart/);
  assert.match(createFunction, /periodEnd:\s*input\.periodEnd/);
  assert.doesNotMatch(createFunction, /currency:\s*input\.currency/);
});

test("all actionable controls carry explicit labels", () => {
  const commissionLabels = [...control.matchAll(/<Button\s+label="([^"]+)"/g)].map((match) => match[1]);
  const settlementLabels = [...settlementPanel.matchAll(/<Button[\s\S]*?label=\{?"([^"]+)"/g)].map((match) => match[1]);
  assert.ok(commissionLabels.length >= 5, "expected labelled commission actions");
  assert.equal([...commissionLabels, ...settlementLabels].some((label) => label.trim() === ""), false);
});
