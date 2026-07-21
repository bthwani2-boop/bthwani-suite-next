import assert from "node:assert/strict";
import fs from "node:fs";

const observer = fs.readFileSync(
  "services/dsh/backend/internal/http/partner_onboarding_observability.go",
  "utf8",
);
const routes = fs.readFileSync(
  "services/dsh/backend/internal/http/partner_lifecycle_routes.go",
  "utf8",
);
const runbook = fs.readFileSync(
  "governance/runbooks/JRN_001_PARTNER_ONBOARDING.md",
  "utf8",
);

assert.match(observer, /partner_onboarding_operation/);
assert.match(observer, /duration_ms/);
assert.match(observer, /correlation_id/);
assert.doesNotMatch(observer, /account_number|bank_iban|payout_mobile/i);
for (const operation of [
  "operator.create_partner",
  "operator.transition_partner",
  "field.create_draft",
  "field.update_draft",
  "field.capture_visit",
  "field.submit_partner",
]) {
  assert.match(routes, new RegExp(operation));
}
assert.match(runbook, /p95/);
assert.match(runbook, /Error budget/);
assert.match(runbook, /Alerts/);
assert.match(runbook, /Diagnosis/);
assert.match(runbook, /Recovery/);

console.log("JRN-001 FS-15 observability, SLA and runbook closed");
