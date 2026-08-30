import assert from "node:assert/strict";
import test from "node:test";
import { buildEphemeralRootGraph, captureCandidate, classifyDiscoveryResult } from "./run-deep-discovery.mjs";

test("local discovery candidate identity includes the working tree", () => {
  const candidate = captureCandidate();
  assert.match(candidate.headSha, /^[0-9a-f]{40}$/u);
  assert.match(candidate.worktreeSha, /^[0-9a-f]{64}$/u);
  assert.equal(candidate.candidateIdentity, `${candidate.headSha}:${candidate.worktreeSha}`);
  assert.equal(typeof candidate.dirty, "boolean");
  assert.equal(Number.isInteger(candidate.statusEntries), true);
});

test("discovery turns a Knip failure into an actionable root candidate", () => {
  const result = classifyDiscoveryResult(
    {id: "knip", status: "FAIL", exitCode: 1, logPath: "knip.log"},
    '{"issues":[{"file":"src/unused.ts"}]}\nEXIT_CODE: 1\n',
  );
  assert.equal(result.disposition, "ROOT_ANALYSIS_REQUIRED");
  assert.equal(result.failureClass, "STRUCTURAL_UNUSED_OR_OWNERLESS_ARTIFACT");
  assert.deepEqual(result.specializedEvidence.files, ["src/unused.ts"]);
  assert.equal(result.specializedEvidence.issueCount, 1);
  assert.equal(result.envelope.accounting.allRawFindingsAccounted, true);
});

test("discovery preserves Madge cycles and skipped imports as evidence", () => {
  const result = classifyDiscoveryResult(
    {id: "madge", status: "FAIL", exitCode: 1, logPath: "madge.log"},
    "1) src/a.ts > src/b.ts\n\nSkipped 2 files\n@bthwani/dsh/openapi\n@bthwani/ui-kit/web\n\n- Finding files\nEXIT_CODE: 1\n",
  );
  assert.equal(result.failureClass, "STRUCTURAL_CYCLE_AND_UNRESOLVED_IMPORT");
  assert.deepEqual(result.specializedEvidence.circularDependencies, ["src/a.ts > src/b.ts"]);
  assert.equal(result.specializedEvidence.skippedFiles, 2);
  assert.deepEqual(result.specializedEvidence.skippedImports, [
    "@bthwani/dsh/openapi",
    "@bthwani/ui-kit/web",
  ]);
});

test("discovery keeps unresolved Madge imports visible after cycles are closed", () => {
  const result = classifyDiscoveryResult(
    {id: "madge", status: "FAIL", exitCode: 1, logPath: "madge.log"},
    "Processed 1038 files (10s) (26 warnings)\n\n✖ Skipped 2 files\n@bthwani/dsh/openapi\n@bthwani/ui-kit/web\n\n- Finding files\n√ No circular dependency found!\nEXIT_CODE: 1\n",
  );
  assert.equal(result.failureClass, "STRUCTURAL_UNRESOLVED_IMPORT");
  assert.deepEqual(result.specializedEvidence.circularDependencies, []);
  assert.deepEqual(result.specializedEvidence.skippedImports, [
    "@bthwani/dsh/openapi",
    "@bthwani/ui-kit/web",
  ]);
});

test("discovery consumes jscpd native duplication JSON", () => {
  const result = classifyDiscoveryResult(
    {id: "jscpd", status: "PASS", exitCode: 0, logPath: "jscpd.log"},
    "JSON report saved\n",
    {},
    {duplicates: [{firstFile: {name: "src/a.ts", start: 4}, secondFile: {name: "src/b.ts", start: 8}}]},
  );
  assert.equal(result.disposition, "ROOT_ANALYSIS_REQUIRED");
  assert.equal(result.envelope.findings[0].ruleId, "JSCPD_DUPLICATION");
  assert.equal(result.envelope.accounting.allRawFindingsAccounted, true);
});

test("a passing check is accounted without becoming a closure claim", () => {
  const result = classifyDiscoveryResult({id: "guard", status: "PASS", exitCode: 0, logPath: "guard.log"}, "PASS\n");
  assert.equal(result.disposition, "EVIDENCE_ACCOUNTED");
  assert.deepEqual(result.rootCandidates, []);
});

test("discovery merges failure candidates into one ephemeral Root Graph", () => {
  const first = classifyDiscoveryResult(
    {id: "knip", status: "FAIL", exitCode: 1, logPath: "knip.log"},
    '{"issues":[{"file":"src/a.ts"}]}\n',
  );
  const second = classifyDiscoveryResult(
    {id: "knip", status: "FAIL", exitCode: 1, logPath: "knip-2.log"},
    '{"issues":[{"file":"src/b.ts"}]}\n',
  );
  const graph = buildEphemeralRootGraph([
    {...first, candidateIdentity: "head:tree"},
    {...second, candidateIdentity: "head:tree"},
  ], "head:tree");
  assert.equal(graph.schema, "bthwani-root-graph/1");
  assert.equal(graph.closureClaim, false);
  assert.equal(graph.roots.length, 1);
  assert.deepEqual(graph.roots[0].sources, ["knip"]);
  assert.equal(graph.roots[0].evidence.length, 2);
});
