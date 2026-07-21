import assert from "node:assert/strict";
import fs from "node:fs";

const evidence = JSON.parse(
  fs.readFileSync("governance/evidence/JRN_001_SEQUENTIAL_CLOSURE.json", "utf8"),
);

assert.equal(evidence.journeyId, "JRN-001");
assert.equal(evidence.branch, "journey/jrn-001-sequential-closure");
assert.match(evidence.commitBinding, /SELF/);
assert.ok(evidence.sliceEvidence["FS-01..FS-10"]);
for (let index = 11; index <= 18; index += 1) {
  const key = `FS-${String(index).padStart(2, "0")}`;
  assert.ok(evidence.sliceEvidence[key], `${key} evidence is missing`);
}
assert.equal(evidence.implementationDecision, "READY_FOR_INDEPENDENT_REVIEW");
assert.equal(evidence.independentApprovals.qa, "PENDING");
assert.equal(evidence.independentApprovals.security, "PENDING");
assert.equal(evidence.independentApprovals.release, "PENDING");
assert.ok(evidence.rollback.length >= 3);
assert.ok(evidence.residualRisks.length >= 3);
assert.equal(evidence.nextJourney, null);
assert.equal(evidence.stopAfterJourney, true);

console.log("JRN-001 FS-18 evidence, rollback and residual risk closed");
