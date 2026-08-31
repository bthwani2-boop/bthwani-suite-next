import assert from "node:assert/strict";
import test from "node:test";
import { classifyCodeqlEvidence } from "./classify-codeql-evidence.mjs";

const documentFor = (results = [], category = "/language:javascript-typescript/") => ({
  version: "2.1.0",
  runs: [{
    automationDetails: {id: category},
    tool: {driver: {rules: [{id: "js/example", properties: {"security-severity": "7.5"}}]}},
    results,
  }],
});

test("CodeQL classifier normalizes SARIF categories and counts findings", () => {
  const result = classifyCodeqlEvidence({
    headSha: "a".repeat(40),
    baseSha: "b".repeat(40),
    documents: [{
      file: "javascript.sarif",
      document: documentFor([{
        ruleId: "js/example",
        level: "warning",
        message: {text: "example finding"},
        locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 7}}}],
      }]),
    }],
  });
  assert.deepEqual(result.categories, ["/language:javascript-typescript"]);
  assert.equal(result.status, "FINDINGS_OPEN");
  assert.equal(result.counts.materialFindings, 1);
  assert.equal(result.findings[0].securitySeverity, 7.5);
  assert.equal(result.findings[0].path, "src/example.ts");
});

test("CodeQL change mode only blocks findings whose primary or related location intersects the diff", () => {
  const result = classifyCodeqlEvidence({
    mode: "affected",
    documents: [{
      file: "javascript.sarif",
      document: documentFor([
        {
          ruleId: "js/example",
          level: "warning",
          message: {text: "in changed line"},
          locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 7}}}],
        },
        {
          ruleId: "js/example",
          level: "warning",
          message: {text: "in inherited line"},
          locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 20}}}],
        },
        {
          ruleId: "js/example",
          level: "warning",
          message: {text: "related changed line"},
          locations: [{physicalLocation: {artifactLocation: {uri: "src/other.ts"}, region: {startLine: 30}}}],
          relatedLocations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 8}}}],
        },
      ]),
    }],
    diffText: "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -7,1 +7,2 @@\n+changed\n",
  });
  assert.equal(result.status, "FINDINGS_OPEN");
  assert.equal(result.counts.scopedFindings, 2);
  assert.equal(result.counts.inheritedFindings, 1);
});

test("CodeQL change mode passes inherited-only findings", () => {
  const result = classifyCodeqlEvidence({
    mode: "affected",
    documents: [{file: "javascript.sarif", document: documentFor([{
      ruleId: "js/example",
      message: {text: "inherited"},
      locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 20}}}],
    }])}],
    diffText: "diff --git a/src/example.ts b/src/example.ts\n--- a/src/example.ts\n+++ b/src/example.ts\n@@ -7,1 +7,2 @@\n+changed\n",
  });
  assert.equal(result.status, "PASS");
  assert.equal(result.counts.scopedFindings, 0);
});

test("CodeQL classifier fails incomplete SARIF instead of treating it as clean", () => {
  const result = classifyCodeqlEvidence({
    documents: [{file: "broken.sarif", document: {version: "2.1.0", runs: []}}],
  });
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.counts.errors, 1);
  assert.match(result.errors[0], /no runs/u);
});

test("CodeQL classifier preserves an empty, valid result as an execution pass", () => {
  const result = classifyCodeqlEvidence({documents: [{file: "empty.sarif", document: documentFor()}]});
  assert.equal(result.status, "PASS");
  assert.equal(result.counts.findings, 0);
  assert.equal(result.executionStatus, "PASS");
  assert.equal(result.coverageStatus, "COMPLETE");
  assert.equal(result.securityClean, true);
  assert.equal(result.evidenceConsumption, "COMPLETE");
});

test("CodeQL command success does not hide material SARIF findings", () => {
  const result = classifyCodeqlEvidence({
    headSha: "a".repeat(40),
    baseSha: "b".repeat(40),
    documents: [{file: "javascript.sarif", document: documentFor([{
      ruleId: "js/example",
      level: "warning",
      message: {text: "material finding"},
      locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 7}}}],
    }])}],
  });
  assert.equal(result.executionStatus, "PASS");
  assert.equal(result.coverageStatus, "COMPLETE");
  assert.equal(result.findingStatus, "FINDINGS_OPEN");
  assert.equal(result.securityClean, false);
  assert.equal(result.evidenceConsumption, "COMPLETE");
  assert.equal(result.evidenceDebt, false);
  assert.equal(result.closureClaim, false);
});

test("CodeQL full analysis can disposition only the exact changed cone for a PR", () => {
  const document = documentFor([
    {
      ruleId: "js/example",
      message: {text: "changed finding"},
      locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 7}}}],
    },
    {
      ruleId: "js/example",
      message: {text: "inherited finding"},
      locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 80}}}],
    },
  ]);
  const result = classifyCodeqlEvidence({
    documents: [{file: "javascript.sarif", document}],
    mode: "affected",
    diffText: "diff --git a/src/example.ts b/src/example.ts\n+++ b/src/example.ts\n@@ -7,1 +7,1 @@\n+changed\n",
  });
  assert.equal(result.counts.findings, 2);
  assert.equal(result.counts.scopedFindings, 1);
  assert.equal(result.counts.inheritedFindings, 1);
  assert.equal(result.status, "FINDINGS_OPEN");
});

test("CodeQL deduplicates only identical category/rule/fingerprint/location identities", () => {
  const duplicate = {
    ruleId: "js/example",
    message: {text: "same finding"},
    partialFingerprints: {primaryLocationLineHash: "stable"},
    locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 7}}}],
  };
  const sameFingerprintDifferentRule = {...duplicate, ruleId: "js/other"};
  const sameFingerprintDifferentLocation = {...duplicate, locations: [{physicalLocation: {artifactLocation: {uri: "src/example.ts"}, region: {startLine: 8}}}]};
  const result = classifyCodeqlEvidence({
    documents: [{file: "javascript.sarif", document: documentFor([duplicate, duplicate, sameFingerprintDifferentRule, sameFingerprintDifferentLocation])}],
  });
  assert.equal(result.rawFindingCount, 4);
  assert.equal(result.duplicateFindings, 1);
  assert.equal(result.counts.findings, 3);
  assert.equal(result.counts.rawFindings, 4);
});
