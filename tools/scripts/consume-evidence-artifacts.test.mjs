import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {consumeEvidenceArtifacts} from "./consume-evidence-artifacts.mjs";

const headSha = "a".repeat(40);
const baseSha = "b".repeat(40);

const temporaryDirectory = () => fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-evidence-consumer-test-"));

test("consumes heterogeneous analyzer artifacts into one Root Graph", () => {
  const inputDir = temporaryDirectory();
  const outputDir = temporaryDirectory();
  const securityDir = path.join(inputDir, "remote-security-shellcheck-1");
  const codeqlDir = path.join(inputDir, "codeql-disposition-1");
  fs.mkdirSync(securityDir, {recursive: true});
  fs.mkdirSync(codeqlDir, {recursive: true});
  fs.writeFileSync(path.join(securityDir, "shellcheck.log"), "tools/a.sh:7:3: warning: Quote this [SC2086]\n");
  fs.writeFileSync(path.join(securityDir, "shellcheck.json"), JSON.stringify({analyzer: "shellcheck", candidateSha: headSha, outcome: "FAIL", log: "shellcheck.log"}));
  fs.writeFileSync(path.join(codeqlDir, "summary.json"), JSON.stringify({
    schema: "bthwani-codeql-evidence/1",
    candidate: {headSha, baseSha},
    findings: [{fingerprint: "q1", ruleId: "js/xss", level: "ERROR", path: "src/a.ts", startLine: 3, message: "unsafe output", material: true}],
    errors: [],
    evidenceComplete: true,
  }));

  const result = consumeEvidenceArtifacts({inputDir, outputDir, headSha, baseSha});

  assert.equal(result.envelopes.length, 2);
  assert.equal(result.rootGraph.roots.length, 2);
  assert.equal(result.summary.unaccountedRawFindings, 0);
  assert.equal(result.summary.rootQueue, 2);
  assert.ok(fs.existsSync(path.join(outputDir, "root-graph.json")));
});

test("fails closed when a required analyzer artifact is absent", () => {
  const inputDir = temporaryDirectory();
  const outputDir = temporaryDirectory();
  const result = consumeEvidenceArtifacts({
    inputDir,
    outputDir,
    headSha,
    baseSha,
    requiredTools: ["codeql"],
  });

  assert.equal(result.summary.unknownRequiredCoverage, 1);
  assert.equal(result.closed, false);
  assert.equal(result.envelopes[0].tool.id, "codeql");
});

test("clean normalized evidence closes consumption without claiming product closure", () => {
  const inputDir = temporaryDirectory();
  const outputDir = temporaryDirectory();
  fs.mkdirSync(path.join(inputDir, "semgrep-evidence-1"), {recursive: true});
  fs.writeFileSync(path.join(inputDir, "semgrep-evidence-1", "assurance-evidence.json"), JSON.stringify({
    schema: "bthwani-semgrep-evidence/1",
    tool: "semgrep",
    headSha,
    baseSha,
    results: [],
    errors: [],
    evidenceComplete: true,
  }));

  const result = consumeEvidenceArtifacts({inputDir, outputDir, headSha, baseSha, requiredTools: ["semgrep"]});

  assert.equal(result.summary.allToolEvidenceConsumed, true);
  assert.equal(result.summary.rootQueue, 0);
  assert.equal(result.closed, true);
  assert.equal(result.rootGraph.closureClaim, false);
});

test("consumes native jscpd output and preserves explicit baseline disposition", () => {
  const inputDir = temporaryDirectory();
  const outputDir = temporaryDirectory();
  fs.mkdirSync(path.join(inputDir, "jscpd"), {recursive: true});
  fs.writeFileSync(path.join(inputDir, "jscpd", "jscpd-report.json"), JSON.stringify({
    duplicates: [{firstFile: {name: "src/a.ts", start: 1}, secondFile: {name: "src/b.ts", start: 1}}],
    statistics: {total: {newClones: 0, newDuplicatedLines: 0}},
  }));

  const result = consumeEvidenceArtifacts({inputDir, outputDir, headSha, baseSha, requiredTools: ["jscpd"]});

  assert.equal(result.envelopes.length, 1);
  assert.equal(result.envelopes[0].tool.id, "jscpd");
  assert.equal(result.envelopes[0].accounting.rawFindingCount, 1);
  assert.equal(result.envelopes[0].findings[0].disposition, "BASELINE");
  assert.equal(result.summary.rootQueue, 0);
  assert.equal(result.closed, true);
});

test("infers tool identity from native runner markers in completed job logs", () => {
  const inputDir = temporaryDirectory();
  const outputDir = temporaryDirectory();
  fs.writeFileSync(path.join(inputDir, "job-1.log"), "[SHELLCHECK FAIL] command failed\nEXIT_CODE: 1\n");

  const result = consumeEvidenceArtifacts({inputDir, outputDir, headSha, baseSha});

  assert.equal(result.envelopes.length, 1);
  assert.equal(result.envelopes[0].tool.id, "shellcheck");
  assert.equal(result.envelopes[0].execution.status, "FAIL");
  assert.equal(result.summary.allToolEvidenceConsumed, true);
});

test("consumes an unknown JSON analyzer report instead of dropping it", () => {
  const inputDir = temporaryDirectory();
  const outputDir = temporaryDirectory();
  fs.writeFileSync(path.join(inputDir, "custom-tool-report.json"), JSON.stringify({
    tool: "custom-tool",
    status: "FAIL",
    breakingChanges: [{path: "contracts/api.yaml", line: 12, ruleId: "BREAKING_ENDPOINT", message: "endpoint removed"}],
  }));

  const result = consumeEvidenceArtifacts({inputDir, outputDir, headSha, baseSha});

  assert.equal(result.envelopes.length, 1);
  assert.equal(result.envelopes[0].tool.id, "custom-tool");
  assert.equal(result.envelopes[0].findings[0].ruleId, "BREAKING_ENDPOINT");
  assert.equal(result.summary.unparsedMaterialOutput, 0);
  assert.equal(result.summary.unmappedMaterialFindings, 0);
  assert.equal(result.closed, false, "material unknown findings must remain open in the Root Graph");
});
