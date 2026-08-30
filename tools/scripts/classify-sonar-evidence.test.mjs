import assert from "node:assert/strict";
import test from "node:test";

import {classifySonarEvidence} from "./classify-sonar-evidence.mjs";

const validPayload = (overrides = {}) => ({
  analysis: {analyses: [{key: "analysis-1", revision: "head"}]},
  qualityGate: {projectStatus: {status: "OK", conditions: []}},
  issues: {issues: [{key: "ISSUE-1", rule: "typescript:S999", severity: "MAJOR", component: "apps/web/src/app.ts", line: 12, message: "unsafe operation"}], paging: {total: 1}},
  hotspots: {hotspots: [], paging: {total: 0}},
  measures: {component: {key: "bthwani2-boop_bthwani-suite-next", measures: [{metric: "coverage", value: "82.1"}]}},
  warnings: [],
  ...overrides,
});

test("Sonar evidence accounts quality gate, findings, hotspots, and measures separately", () => {
  const result = classifySonarEvidence(validPayload(), {headSha: "head", baseSha: "base", mode: "affected"});
  assert.equal(result.status, "FINDINGS_OPEN");
  assert.equal(result.executionStatus, "PASS");
  assert.equal(result.coverageStatus, "COMPLETE");
  assert.equal(result.qualityGate.status, "OK");
  assert.equal(result.findingStatus, "FINDINGS_OPEN");
  assert.equal(result.evidenceConsumption, "COMPLETE");
  assert.equal(result.evidenceDebt, false);
  assert.equal(result.counts.materialFindings, 1);
  assert.equal(result.measures.component.measures[0].metric, "coverage");
});

test("Sonar evidence fails closed when a paged response is truncated", () => {
  const result = classifySonarEvidence(validPayload({
    issues: {issues: [{key: "ISSUE-1"}], paging: {total: 2}},
  }));
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.coverageStatus, "INCOMPLETE");
  assert.match(result.errors.join("\n"), /truncated/u);
});

test("Sonar quality-gate failure is distinct from evidence collection failure", () => {
  const result = classifySonarEvidence(validPayload({
    qualityGate: {projectStatus: {status: "ERROR", conditions: [{status: "ERROR", metricKey: "coverage"}]}},
  }));
  assert.equal(result.status, "QUALITY_GATE_OPEN");
  assert.equal(result.evidenceComplete, true);
  assert.equal(result.coverageStatus, "COMPLETE");
  assert.equal(result.qualityGate.conditions[0].metricKey, "coverage");
});

test("Sonar evidence rejects a stale analysis revision", () => {
  const result = classifySonarEvidence(validPayload({analysis: {analyses: [{revision: "older"}]}}), {headSha: "head"});
  assert.equal(result.status, "INCOMPLETE");
  assert.match(result.errors.join("\n"), /does not match candidate/u);
});

test("Sonar retrieval warnings remain closure-blocking evidence debt", () => {
  const result = classifySonarEvidence(validPayload({warnings: ["measures: request failed"]}), {headSha: "head"});
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.evidenceComplete, false);
  assert.equal(result.counts.warnings, 1);
  assert.match(result.errors.join("\n"), /measures: request failed/u);
});

test("Sonar execution failure cannot be relabeled as complete evidence", () => {
  const result = classifySonarEvidence(validPayload(), {headSha: "head", executionStatus: "failure"});
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.executionStatus, "FAILURE");
  assert.equal(result.evidenceComplete, false);
});
