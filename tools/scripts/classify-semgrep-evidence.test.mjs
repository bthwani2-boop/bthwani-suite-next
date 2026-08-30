import fs from "node:fs";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  TOOL_LIMITATION_PROVEN,
  UNKNOWN_ENGINE_ERROR,
  classifySemgrepEngineCondition,
  classifySemgrepEvidence,
  runNormalizer,
} from "./classify-semgrep-evidence.mjs";

const workflowPartialParsing = {
  code: 3,
  type: ["PartialParsing", []],
  path: ".github/workflows/ci-backends.yml",
  rule_id: "yaml.github-actions.security.curl-eval.curl-eval",
  message: "Syntax error at line .github/workflows/ci-backends.yml:123: When parsing a snippet as Bash for metavariable-pattern in rule 'yaml.github-actions.security.curl-eval.curl-eval', '<' was unexpected",
};

const readonlyImportTypePartialParsing = {
  code: 3,
  type: ["PartialParsing", []],
  path: "services/dsh/frontend/app-partner/account/PartnerOperationsPanel.tsx",
  message: "Syntax error at line services/dsh/frontend/app-partner/account/PartnerOperationsPanel.tsx:59:\n `readonly import('../team/PartnerTeamManagementScreen').PartnerTeamMember` was unexpected",
};

test("classifies the proven GitHub Actions Bash parser limitation structurally", () => {
  const classified = classifySemgrepEngineCondition(workflowPartialParsing);
  assert.equal(classified.classification, TOOL_LIMITATION_PROVEN);
  assert.equal(classified.reason, "semgrep-yaml-github-actions-bash-metavariable-parser");
  assert.deepEqual(classified.raw, workflowPartialParsing);
});

test("classifies the internal GitHub Actions Bash parser limitation without a fixed message", () => {
  const classified = classifySemgrepEngineCondition({
    type: "Internal matching error",
    path: ".github/workflows/ci-runtime.yml",
    rule_id: "yaml.github-actions.security.gha-curl-pipe-shell.gha-curl-pipe-shell",
    message: "metavariable-pattern failed when parsing $SHELL's content as Bash: $ErrorActionPreference = 'Stop'",
  });
  assert.equal(classified.classification, TOOL_LIMITATION_PROVEN);
});

test("classifies the proven TypeScript readonly import-type parser limitation narrowly", () => {
  const classified = classifySemgrepEngineCondition(readonlyImportTypePartialParsing);
  assert.equal(classified.classification, TOOL_LIMITATION_PROVEN);
  assert.equal(classified.reason, "semgrep-typescript-readonly-import-type-parser");
  assert.deepEqual(classified.raw, readonlyImportTypePartialParsing);
});

test("does not turn a non-workflow parser error into a tool limitation", () => {
  const classified = classifySemgrepEngineCondition({
    type: ["PartialParsing", []],
    path: "services/dsh/frontend/shared/index.ts",
    message: "Syntax error at line services/dsh/frontend/shared/index.ts:15: `type` was unexpected",
  });
  assert.equal(classified.classification, UNKNOWN_ENGINE_ERROR);
});

test("does not classify a TypeScript parser error without the proven readonly import-type signature", () => {
  const classified = classifySemgrepEngineCondition({
    type: ["PartialParsing", []],
    path: "services/dsh/frontend/shared/index.tsx",
    message: "Syntax error at line services/dsh/frontend/shared/index.tsx:15: `readonly SomethingElse` was unexpected",
  });
  assert.equal(classified.classification, UNKNOWN_ENGINE_ERROR);
});

test("does not classify a workflow parser error without the proven Bash signature", () => {
  const classified = classifySemgrepEngineCondition({
    type: "PartialParsing",
    path: ".github/workflows/ci.yml",
    message: "Syntax error while parsing workflow YAML",
  });
  assert.equal(classified.classification, UNKNOWN_ENGINE_ERROR);
});

test("keeps findings separate and proves raw engine-condition cardinality", () => {
  const result = classifySemgrepEvidence({
    results: [{ extra: { severity: "WARNING" } }],
    errors: [workflowPartialParsing],
  }, { headSha: "head", mode: "full", baseSha: "base" });

  assert.equal(result.summary.totalFindings, 1);
  assert.equal(result.summary.engineConditions, 1);
  assert.equal(result.summary.classifiedEngineErrors, 1);
  assert.equal(result.summary.toolLimitationsProven, 1);
  assert.equal(result.summary.unknownEngineErrors, 0);
  assert.equal(result.summary.allRawFindingsAccounted, true);
  assert.equal(result.summary.executionStatus, "PASS");
  assert.equal(result.summary.coverageStatus, "COMPLETE");
  assert.equal(result.summary.findingStatus, "FINDINGS_OPEN");
  assert.equal(result.summary.evidenceConsumption, "COMPLETE");
  assert.equal(result.summary.evidenceDebt, false);
  assert.equal(result.summary.evidenceComplete, true);
  assert.deepEqual(result.summary.severities, [{ severity: "WARNING", count: 1 }]);
});

test("accounts for multiple proven tool limitations without converting them to findings", () => {
  const result = classifySemgrepEvidence({
    results: [],
    errors: [workflowPartialParsing, readonlyImportTypePartialParsing],
  });

  assert.equal(result.summary.totalFindings, 0);
  assert.equal(result.summary.engineConditions, 2);
  assert.equal(result.summary.classifiedEngineErrors, 2);
  assert.equal(result.summary.toolLimitationsProven, 2);
  assert.equal(result.summary.unknownEngineErrors, 0);
  assert.equal(result.summary.allRawFindingsAccounted, true);
});

test("accounts for malformed raw conditions instead of dropping them", () => {
  const result = classifySemgrepEvidence({ results: [], errors: [null, "raw"] });
  assert.equal(result.summary.engineConditions, 2);
  assert.equal(result.summary.classifiedEngineErrors, 2);
  assert.equal(result.summary.unknownEngineErrors, 2);
  assert.equal(result.summary.allRawFindingsAccounted, true);
  assert.equal(result.summary.evidenceComplete, false);
  assert.equal(result.summary.coverageStatus, "INCOMPLETE");
});

test("a valid scan with findings is execution-complete but not a clean closure claim", () => {
  const result = classifySemgrepEvidence({results: [{path: "src/a.ts", extra: {severity: "ERROR"}}], errors: []});
  assert.equal(result.summary.executionStatus, "PASS");
  assert.equal(result.summary.evidenceComplete, true);
  assert.equal(result.summary.findingStatus, "FINDINGS_OPEN");
  assert.equal(result.summary.evidenceConsumption, "COMPLETE");
  assert.equal(result.summary.evidenceDebt, false);
});

test("change mode separates inherited Semgrep findings and engine errors from the changed cone", () => {
  const result = classifySemgrepEvidence({
    results: [
      {path: "services/dsh/backend/internal/health/health.go", start: {line: 3}, end: {line: 3}, extra: {severity: "WARNING"}},
      {path: "services/dsh/backend/internal/health/health.go", start: {line: 20}, end: {line: 20}, extra: {severity: "WARNING"}},
    ],
    errors: [
      {type: "PartialParsing", path: "services/dsh/backend/internal/health/health.go", message: "unproven parser error"},
      workflowPartialParsing,
    ],
  }, {
    mode: "diff",
    diffText: "diff --git a/services/dsh/backend/internal/health/health.go b/services/dsh/backend/internal/health/health.go\n--- a/services/dsh/backend/internal/health/health.go\n+++ b/services/dsh/backend/internal/health/health.go\n@@ -3,1 +3,1 @@\n+changed\n",
  });
  assert.equal(result.summary.totalFindings, 2);
  assert.equal(result.summary.scopedFindings, 1);
  assert.equal(result.summary.inheritedFindings, 1);
  assert.equal(result.summary.unknownEngineErrorsInChangedCone, 1);
});

test("change evidence exposes only the evaluated cone while retaining raw scan evidence", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "bthwani-semgrep-cone-"));
  try {
    const input = path.join(outputDir, "semgrep.json");
    fs.writeFileSync(input, JSON.stringify({
      results: [
        {path: "src/changed.ts", start: {line: 4}, extra: {severity: "WARNING"}},
        {path: "src/inherited.ts", start: {line: 9}, extra: {severity: "ERROR"}},
      ],
      errors: [],
    }));
    runNormalizer({
      input,
      outputDir,
      headSha: "head",
      baseSha: "base",
      mode: "diff",
      diffText: "diff --git a/src/changed.ts b/src/changed.ts\n--- a/src/changed.ts\n+++ b/src/changed.ts\n@@ -4,1 +4,1 @@\n+changed\n",
    });
    const evidence = JSON.parse(fs.readFileSync(path.join(outputDir, "assurance-evidence.json"), "utf8"));
    assert.equal(evidence.results.length, 1);
    assert.equal(evidence.rawResults.length, 2);
    assert.equal(evidence.results[0].path, "src/changed.ts");
  } finally {
    fs.rmSync(outputDir, {recursive: true, force: true});
  }
});
