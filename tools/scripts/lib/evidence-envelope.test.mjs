import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvidenceEnvelope,
  buildUnifiedRootGraph,
  evidenceConsumptionClosed,
  summarizeEvidenceConsumption,
} from "./evidence-envelope.mjs";

const candidate = {
  headSha: "a".repeat(40),
  baseSha: "b".repeat(40),
  identity: `${"a".repeat(40)}:${"c".repeat(64)}`,
};

test("normalizes structured findings without losing raw accounting", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "actionlint",
    candidate,
    status: "FAIL",
    exitCode: 1,
    rawText: `${JSON.stringify({filepath: ".github/workflows/ci.yml", line: 12, column: 4, kind: "expression", message: "unknown context"})}\n`,
  });

  assert.equal(envelope.schema, "bthwani-evidence-envelope/1");
  assert.equal(envelope.findings.length, 1);
  assert.equal(envelope.findings[0].ruleId, "expression");
  assert.equal(envelope.findings[0].location.path, ".github/workflows/ci.yml");
  assert.equal(envelope.accounting.rawFindingCount, 1);
  assert.equal(envelope.accounting.accountedRawFindingCount, 1);
  assert.equal(envelope.accounting.unparsedMaterialOutput, 0);
  assert.equal(envelope.accounting.unmappedMaterialFindings, 0);
});

test("normalizes text analyzers into individual findings and root candidates", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "shellcheck",
    candidate,
    status: "FAIL",
    exitCode: 1,
    rawText: "tools/a.sh:7:3: warning: Quote this to prevent word splitting [SC2086]\ntools/a.sh:9:1: error: Use cd ... || exit [SC2164]\n",
  });

  assert.equal(envelope.findings.length, 2);
  assert.deepEqual(envelope.findings.map((finding) => finding.ruleId), ["SC2086", "SC2164"]);
  assert.ok(envelope.findings.every((finding) => finding.rootCandidate?.rootKey));
  assert.equal(envelope.accounting.allRawFindingsAccounted, true);
});

test("ignores ANSI-prefixed informational runner summaries while preserving findings", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "nx-typecheck",
    candidate,
    status: "PASS",
    exitCode: 0,
    rawText: "\u001b[2m wlt: \u001b[22mℹ fail 0\n\u001b[2m wlt: \u001b[22mℹ skipped 0\nsrc/a.ts:4:7: warning: Quote this [SC2086]\n",
  });

  assert.equal(envelope.findings.length, 1);
  assert.equal(envelope.findings[0].ruleId, "SC2086");
  assert.equal(envelope.accounting.rawFindingCount, 1);
  assert.equal(envelope.accounting.unparsedMaterialOutput, 0);
});

test("ignores generated asset size listings even when a filename contains error", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "nx-build",
    candidate,
    status: "PASS",
    exitCode: 0,
    rawText: "app-captain: ..\\..\\..\\node_modules\\.pnpm\\expo-router@57\\node_modules\\expo-router\\assets\\error.png (469B)\n",
  });

  assert.equal(envelope.findings.length, 0);
  assert.equal(envelope.accounting.rawFindingCount, 0);
  assert.equal(envelope.accounting.evidenceComplete, true);
});

test("ignores Node runtime warnings emitted by the test harness", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "nx-test",
    candidate,
    status: "PASS",
    exitCode: 0,
    rawText: "(node:1234) ExperimentalWarning: `--experimental-loader` may be removed in the future\n(Use `node --trace-warnings ...` to show where the warning was created)\n",
  });

  assert.equal(envelope.findings.length, 0);
  assert.equal(envelope.accounting.rawFindingCount, 0);
  assert.equal(envelope.accounting.evidenceComplete, true);
});

test("ignores Nx-prefixed passing test lines whose names contain failure words", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "nx-test",
    candidate,
    status: "PASS",
    exitCode: 0,
    rawText: "dsh: ✔ provider mutations fail closed and reuse actor-scoped commands (0.4ms)\\n",
  });

  assert.equal(envelope.findings.length, 0);
  assert.equal(envelope.accounting.rawFindingCount, 0);
  assert.equal(envelope.accounting.evidenceComplete, true);
});

test("adapts existing classified evidence into the universal envelope", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "codeql",
    candidate,
    status: "FAIL",
    exitCode: 1,
    nativePayload: {
      schema: "bthwani-codeql-evidence/1",
      candidate: {headSha: candidate.headSha, baseSha: candidate.baseSha},
      findings: [{fingerprint: "fp-1", ruleId: "js/sql-injection", level: "ERROR", path: "src/a.ts", startLine: 4, message: "tainted input", material: true}],
      errors: [],
      evidenceComplete: true,
    },
  });

  assert.equal(envelope.findings.length, 1);
  assert.equal(envelope.findings[0].fingerprint, "fp-1");
  assert.equal(envelope.coverage.status, "COMPLETE");
  assert.equal(envelope.accounting.unmappedMaterialFindings, 0);
});

test("accounts inherited findings without promoting baseline debt into the change Root Queue", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "codeql",
    candidate,
    status: "PASS",
    exitCode: 0,
    nativePayload: {
      schema: "bthwani-codeql-evidence/1",
      candidate: {headSha: candidate.headSha, baseSha: candidate.baseSha},
      mode: "affected",
      findings: [{fingerprint: "inherited", ruleId: "js/xss", level: "ERROR", path: "src/old.ts", startLine: 1, message: "inherited", material: true, inChangedCone: false}],
      errors: [],
      evidenceComplete: true,
    },
  });
  const graph = buildUnifiedRootGraph([envelope], candidate.identity);

  assert.equal(envelope.findings.length, 1);
  assert.equal(envelope.findings[0].disposition, "BASELINE");
  assert.equal(envelope.accounting.allRawFindingsAccounted, true);
  assert.equal(graph.rootQueue.length, 0);
});

test("Semgrep raw baseline findings and proven engine limitations stay accounted but non-blocking", () => {
  const inherited = {check_id: "rule.inherited", path: "src/old.ts", start: {line: 1}, extra: {severity: "ERROR", message: "old"}};
  const envelope = buildEvidenceEnvelope({
    toolId: "semgrep",
    candidate,
    status: "PASS",
    exitCode: 0,
    nativePayload: {
      schema: "bthwani-semgrep-evidence/1",
      headSha: candidate.headSha,
      baseSha: candidate.baseSha,
      results: [],
      rawResults: [inherited],
      errors: [{message: "known parser limitation"}],
      unknownRequiredCoverage: 0,
      evidenceComplete: true,
    },
  });
  const graph = buildUnifiedRootGraph([envelope], candidate.identity);

  assert.equal(envelope.findings[0].disposition, "BASELINE");
  assert.equal(envelope.engineConditions[0].disposition, "TOOL_LIMITATION_PROVEN");
  assert.equal(envelope.accounting.allRawFindingsAccounted, true);
  assert.equal(graph.rootQueue.length, 0);
});

test("a failed binary gate becomes traceable evidence instead of an exit-only verdict", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "generated-client-provenance",
    candidate,
    status: "FAIL",
    exitCode: 1,
    rawText: "ERROR services/dsh/client.ts generated binding does not match openapi bundle\n",
  });

  assert.equal(envelope.findings.length, 1);
  assert.equal(envelope.findings[0].category, "CONTRACT_OR_PROVENANCE");
  assert.match(envelope.findings[0].rootCandidate.rootKey, /contract_or_provenance/u);
  assert.equal(envelope.accounting.unparsedMaterialOutput, 0);
});

test("normalizes contract and compiler failure wording from text output", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "oasdiff",
    candidate: {headSha: "a".repeat(40)},
    status: "FAIL",
    exitCode: 1,
    rawText: "breaking change detected: GET /v1/orders was removed\n",
    rawPath: "oasdiff.log",
  });

  assert.equal(envelope.findings.length, 1);
  assert.match(envelope.findings[0].message, /breaking change detected/iu);
  assert.equal(envelope.accounting.unparsedMaterialOutput, 0);
});

test("one Root Graph correlates findings and exposes unresolved Source-of-Fix work", () => {
  const first = buildEvidenceEnvelope({
    toolId: "shellcheck",
    candidate,
    status: "FAIL",
    exitCode: 1,
    rawText: "tools/a.sh:7:3: warning: Quote this [SC2086]\n",
  });
  const second = buildEvidenceEnvelope({
    toolId: "shellcheck",
    candidate,
    status: "FAIL",
    exitCode: 1,
    rawText: "tools/a.sh:9:2: warning: Quote this too [SC2086]\n",
  });
  const graph = buildUnifiedRootGraph([first, second], candidate.identity);
  const summary = summarizeEvidenceConsumption([first, second], graph);

  assert.equal(graph.schema, "bthwani-root-graph/1");
  assert.equal(graph.roots.length, 1);
  assert.equal(graph.rootQueue.length, 1);
  assert.equal(graph.roots[0].sourceOfFix.status, "UNRESOLVED");
  assert.equal(summary.allToolEvidenceConsumed, true);
  assert.equal(summary.unaccountedRawFindings, 0);
  assert.equal(summary.unmappedMaterialFindings, 0);
  assert.equal(summary.sourceOfFixUnresolved, 1);
});


test("proven non-root dispositions remain accounted without opening duplicate Root Queue entries", () => {
  for (const disposition of ["N/A_PROVEN", "SUPERSEDED", "DUPLICATE_CORRELATED", "DESCENDANT_OF_ROOT"]) {
    const envelope = buildEvidenceEnvelope({
      toolId: "custom",
      candidate,
      status: "FAIL",
      exitCode: 1,
      nativePayload: {
        findings: [{
          ruleId: "CUSTOM",
          level: "ERROR",
          path: "src/a.ts",
          startLine: 1,
          message: disposition,
          material: true,
          disposition,
        }],
        errors: [],
        evidenceComplete: true,
      },
    });
    envelope.findings[0].disposition = disposition;
    const graph = buildUnifiedRootGraph([envelope], candidate.identity);
    assert.equal(envelope.accounting.allRawFindingsAccounted, true, disposition);
    assert.equal(graph.rootQueue.length, 0, disposition);
  }
});

test("N/A_PROVEN is an explicit non-execution disposition and NOT_APPLICABLE cannot close", () => {
  const proven = buildEvidenceEnvelope({
    toolId: "optional-codeql",
    candidate,
    status: "N/A_PROVEN",
    exitCode: 0,
    nativePayload: {evidenceComplete: true, findings: [], errors: []},
  });
  const provenGraph = buildUnifiedRootGraph([proven], candidate.identity);
  const provenSummary = summarizeEvidenceConsumption([proven], provenGraph);
  assert.equal(proven.execution.status, "N/A_PROVEN");
  assert.equal(provenSummary.notApplicableExecution, 0);
  assert.equal(evidenceConsumptionClosed(provenSummary), true);

  const collapsed = buildEvidenceEnvelope({
    toolId: "optional-codeql",
    candidate,
    status: "NOT_APPLICABLE",
    exitCode: 0,
    nativePayload: {evidenceComplete: true, findings: [], errors: []},
  });
  const collapsedGraph = buildUnifiedRootGraph([collapsed], candidate.identity);
  const collapsedSummary = summarizeEvidenceConsumption([collapsed], collapsedGraph);
  assert.equal(collapsed.execution.status, "NOT_APPLICABLE");
  assert.equal(collapsedSummary.notApplicableExecution, 1);
  assert.equal(collapsedSummary.nonPassingExecution, 1);
  assert.equal(evidenceConsumptionClosed(collapsedSummary), false);
});

test("BLOCKED_BY remains an open root until the blocker relationship is actually resolved", () => {
  const envelope = buildEvidenceEnvelope({
    toolId: "custom",
    candidate,
    status: "FAIL",
    exitCode: 1,
    nativePayload: {
      findings: [{
        ruleId: "CUSTOM",
        level: "ERROR",
        path: "src/a.ts",
        startLine: 1,
        message: "blocked descendant",
        material: true,
        disposition: "BLOCKED_BY",
      }],
      errors: [],
      evidenceComplete: true,
    },
  });
  envelope.findings[0].disposition = "BLOCKED_BY";
  const graph = buildUnifiedRootGraph([envelope], candidate.identity);
  assert.equal(graph.rootQueue.length, 1);
  assert.equal(graph.roots[0].evidence[0].disposition, "BLOCKED_BY");
});
