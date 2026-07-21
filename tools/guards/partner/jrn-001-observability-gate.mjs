import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const slo = JSON.parse(read("services/dsh/contracts/jrn-001-observability-slo.json"));
const runbook = read(slo.runbook);
const repository = read("services/dsh/backend/internal/partner/onboarding_integrity_repository.go");
const outbox = read("services/dsh/backend/internal/partnerwltoutbox/outbox.go");
const visible = read("services/dsh/frontend/shared/partner/partner-onboarding.visible-state.ts");

assert.equal(slo.journeyId, "JRN-001");
assert.equal(slo.sliceId, "FS-15");
assert.ok(slo.slos.length >= 5);
assert.ok(slo.alerts.some((alert) => alert.severity === "critical"));
for (const metric of ["dsh_partner_mutation_total", "dsh_partner_wlt_outbox_oldest_seconds", "dsh_partner_publication_gate_reject_total"]) {
  assert.ok(slo.metrics.includes(metric), `missing metric ${metric}`);
}
assert.match(repository, /correlation_id/);
assert.match(repository, /idempotency_key/);
assert.match(repository, /request_hash/);
assert.match(outbox, /next_attempt_at|NextAttemptAt/);
assert.match(outbox, /dead_letter|DeadLetter/);
assert.match(visible, /رقم الارتباط|correlation/i);
assert.match(runbook, /VERSION_CONFLICT/);
assert.match(runbook, /IDEMPOTENCY_KEY_REUSED/);
assert.match(runbook, /PARTNER_READINESS_GATES_FAILED/);
assert.match(runbook, /publication gate/i);
assert.doesNotMatch(runbook, /paste raw bank|سجّل رقم الحساب كاملًا/i);

console.log("JRN-001 FS-15 SLO, alerting, diagnostics and support runbook gate passed");
