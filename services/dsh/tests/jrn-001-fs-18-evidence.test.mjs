import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const evidence = JSON.parse(read("governance/evidence/JRN-001_PARTNER_ONBOARDING_EVIDENCE.json"));
const narrative = read("governance/evidence/JRN-001_PARTNER_ONBOARDING_STORE_PUBLICATION.md");
const cleanup = JSON.parse(read("services/dsh/contracts/jrn-001-cleanup-manifest.json"));
const sliceRegistry = JSON.parse(read("services/dsh/contracts/jrn-001-slice-verification-registry.json"));

assert.equal(evidence.journeyId, "JRN-001");
assert.equal(evidence.sliceId, "FS-18");
assert.equal(evidence.trackingStatus, "READY_FOR_REVIEW");
assert.equal(evidence.decision, "READY_FOR_REVIEW");
assert.equal(evidence.implementationDecision, "PASS");
assert.equal(evidence.closedTechnicalSliceCount, 18);
assert.equal(evidence.totalTechnicalSliceCount, 18);
assert.notEqual(evidence.decision, "CLOSED_WITH_EVIDENCE");
assert.equal(evidence.slices.length, 18);
assert.deepEqual(evidence.slices.map((slice) => slice.id), Array.from({ length: 18 }, (_, index) => `FS-${String(index + 1).padStart(2, "0")}`));
assert.deepEqual(sliceRegistry.slices.map((slice) => slice.id), evidence.slices.map((slice) => slice.id));
assert.ok(evidence.slices.every((slice) => slice.status === "PASS"));
assert.ok(evidence.slices.every((slice) => slice.commit === evidence.evidenceBaseSha));
assert.ok(evidence.slices.every((slice) => slice.runId === evidence.latestTargetedVerification.runId));
assert.equal(evidence.latestTargetedVerification.aggregateContext, "journeys/jrn-001/all-slices-sequential");
assert.ok(evidence.openGaps.length >= 6);
assert.match(evidence.closureClaim, /not claimed/i);
assert.ok(fs.existsSync(evidence.rollback.runbook));
assert.match(narrative, /Implementation decision: `PASS`/);
assert.match(narrative, /FS-01 through FS-18/);
assert.match(narrative, /READY_FOR_REVIEW/);
assert.match(narrative, /not claimed/);
assert.match(narrative, /Product acceptance/);
assert.match(narrative, /production rollout/i);
for (const path of cleanup.removedTransientFiles) assert.equal(fs.existsSync(path), false, `transient workflow remains: ${path}`);
for (const context of [
  "journeys/jrn-001/fs-12-cross-surface-truth",
  "journeys/jrn-001/fs-17-comprehensive",
  "journeys/jrn-001/fs-18-evidence",
]) {
  assert.ok(evidence.sameCommitVerification.requiredContexts.includes(context));
}
assert.equal(evidence.sameCommitVerification.aggregateContext, "journeys/jrn-001/all-slices-sequential");

console.log("JRN-001 FS-18 evidence, rollback and open-gap gate passed");
