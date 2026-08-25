import assert from "node:assert/strict";
import test from "node:test";

import {
  TOOL_LIMITATION_PROVEN,
  UNKNOWN_ENGINE_ERROR,
  classifySemgrepEngineCondition,
  classifySemgrepEvidence,
} from "./classify-semgrep-evidence.mjs";

const workflowPartialParsing = {
  code: 3,
  type: ["PartialParsing", []],
  path: ".github/workflows/ci-backends.yml",
  rule_id: "yaml.github-actions.security.curl-eval.curl-eval",
  message: "Syntax error at line .github/workflows/ci-backends.yml:123: When parsing a snippet as Bash for metavariable-pattern in rule 'yaml.github-actions.security.curl-eval.curl-eval', '<' was unexpected",
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

test("does not turn a non-workflow parser error into a tool limitation", () => {
  const classified = classifySemgrepEngineCondition({
    type: ["PartialParsing", []],
    path: "services/dsh/frontend/shared/index.ts",
    message: "Syntax error at line services/dsh/frontend/shared/index.ts:15: `type` was unexpected",
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
  }, { headSha: "head", mode: "diff", baseSha: "base" });

  assert.equal(result.summary.totalFindings, 1);
  assert.equal(result.summary.engineConditions, 1);
  assert.equal(result.summary.classifiedEngineErrors, 1);
  assert.equal(result.summary.toolLimitationsProven, 1);
  assert.equal(result.summary.unknownEngineErrors, 0);
  assert.equal(result.summary.allRawFindingsAccounted, true);
  assert.deepEqual(result.summary.severities, [{ severity: "WARNING", count: 1 }]);
});

test("accounts for malformed raw conditions instead of dropping them", () => {
  const result = classifySemgrepEvidence({ results: [], errors: [null, "raw"] });
  assert.equal(result.summary.engineConditions, 2);
  assert.equal(result.summary.classifiedEngineErrors, 2);
  assert.equal(result.summary.unknownEngineErrors, 2);
  assert.equal(result.summary.allRawFindingsAccounted, true);
});
