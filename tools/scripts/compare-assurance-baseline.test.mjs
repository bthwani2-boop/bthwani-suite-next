import assert from "node:assert/strict";
import test from "node:test";
import { compareAssuranceBaseline } from "./compare-assurance-baseline.mjs";

const finding = (id, severity = "WARNING", state = "OPEN") => ({
  fingerprint: id,
  check_id: id,
  path: `src/${id}.ts`,
  start: {line: 1},
  extra: {severity, message: id},
  state,
});

test("baseline ratchet allows inherited debt while blocking new material findings", () => {
  const result = compareAssuranceBaseline({
    baselinePayload: {results: [finding("kept"), finding("fixed")]},
    candidatePayload: {results: [finding("kept")]},
    metadata: {headSha: "a", baseSha: "b", targetRootFixed: true, invalidatedProofs: "PASS"},
  });
  assert.equal(result.counts.fixed, 1);
  assert.deepEqual(result.dispositionCounts, {BASELINE: 2, CANDIDATE: 1, NEW: 0, FIXED: 1, UNCHANGED: 1, WORSENED: 0});
  assert.equal(result.changeVerification.state, "PASS");
  assert.equal(result.changeClosure.state, "PASS");
  assert.equal(result.staticRepositoryBaseline.state, "BASELINE_OPEN");
  assert.equal(result.repositoryClosure.state, "NOT_CLOSED");
});

test("new and worsened findings fail Change Verification", () => {
  const result = compareAssuranceBaseline({
    baselinePayload: {results: [finding("same", "INFO")]},
    candidatePayload: {results: [finding("same", "ERROR"), finding("new")]},
    metadata: {targetRootFixed: true, invalidatedProofs: "PASS"},
  });
  assert.equal(result.counts.newMaterial, 1);
  assert.equal(result.counts.worsenedMaterial, 1);
  assert.equal(result.changeVerification.state, "OPEN");
  assert.match(result.changeVerification.reasons.join(";"), /new material findings/u);
});

test("unknown coverage and bypass fail closed", () => {
  const result = compareAssuranceBaseline({
    baselinePayload: {results: []},
    candidatePayload: {results: [], errors: [{message: "unknown"}]},
    metadata: {bypassUsed: true},
  });
  assert.equal(result.staticRepositoryBaseline.state, "BASELINE_OPEN");
  assert.equal(result.counts.unknownRequiredCoverage, 1);
  assert.equal(result.repositoryClosure.state, "NOT_CLOSED");
  assert.match(result.repositoryClosure.reasons.join(";"), /bypass used/u);
});

test("missing required baseline evidence never becomes a clean change claim", () => {
  const result = compareAssuranceBaseline({
    candidatePayload: {results: [], evidenceComplete: true},
    metadata: {baselineRequired: true, executionStatus: "success"},
  });
  assert.equal(result.policy.baselineAvailable, false);
  assert.equal(result.changeVerification.state, "OPEN");
  assert.match(result.changeVerification.reasons.join(";"), /baseline evidence is missing/u);
});

test("scanner findings do not count as execution failure when baseline is unchanged", () => {
  const payload = {results: [{check_id: "same", path: "src/a.ts", start: {line: 1}, extra: {severity: "ERROR", fingerprint: "stable"}}], evidenceComplete: true};
  const result = compareAssuranceBaseline({
    baselinePayload: payload,
    candidatePayload: payload,
    metadata: {baselineRequired: true, executionStatus: "success", baselineExecutionStatus: "success"},
  });
  assert.equal(result.policy.evidenceComplete, true);
  assert.equal(result.counts.newMaterial, 0);
  assert.equal(result.changeVerification.state, "PASS");
  assert.equal(result.staticRepositoryBaseline.state, "BASELINE_OPEN");
});

test("scanner success cannot override incomplete evidence", () => {
  const result = compareAssuranceBaseline({
    candidatePayload: {results: [], evidenceComplete: false},
    metadata: {executionStatus: "success"},
  });
  assert.equal(result.policy.candidateExecutionComplete, false);
  assert.equal(result.policy.evidenceComplete, false);
  assert.equal(result.changeVerification.state, "OPEN");
  assert.equal(result.staticRepositoryBaseline.state, "BLOCKED");
});
