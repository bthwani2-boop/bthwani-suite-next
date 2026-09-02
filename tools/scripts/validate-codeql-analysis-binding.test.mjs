import assert from "node:assert/strict";
import test from "node:test";

import {validateCodeqlAnalysisBinding} from "./validate-codeql-analysis-binding.mjs";

const metadata = {
  repository: "bthwani2-boop/bthwani-suite-next",
  candidateSha: "a".repeat(40),
  candidateRef: "refs/heads/master",
  expectedCategory: "/language:javascript-typescript",
  uploadId: "42",
  runId: "100",
  runAttempt: "2",
};

const analysis = {
  id: 7,
  sarif_id: 42,
  commit_sha: metadata.candidateSha,
  ref: metadata.candidateRef,
  category: "/language:javascript-typescript/",
};

test("validates the GitHub CodeQL analyses array and returns exact provenance", () => {
  const result = validateCodeqlAnalysisBinding([analysis], metadata);
  assert.equal(result.valid, true);
  assert.deepEqual(result.analysis, {
    id: "7",
    sarifId: "42",
    category: "/language:javascript-typescript",
    commitSha: metadata.candidateSha,
    ref: metadata.candidateRef,
  });
  assert.deepEqual(result.trustedRun, {id: "100", attempt: "2"});
  assert.equal(result.exactBinding, true);
});

test("fails closed for the historical object-shaped API response", () => {
  const result = validateCodeqlAnalysisBinding({analyses: [analysis]}, metadata);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /root must be an array/u);
});

test("fails closed for null, malformed, and empty responses", () => {
  for (const response of [null, {}, [], [null], [{...analysis, commit_sha: "b".repeat(40)}]]) {
    const result = validateCodeqlAnalysisBinding(response, metadata);
    assert.equal(result.valid, false, JSON.stringify(response));
  }
});

test("rejects stale SHA, wrong ref, wrong category, and incompatible duplicates", () => {
  const cases = [
    [{...analysis, commit_sha: "b".repeat(40)}],
    [{...analysis, ref: "refs/pull/9/head"}],
    [{...analysis, category: "/language:go/"}],
    [analysis, {...analysis, id: 8}],
  ];
  for (const response of cases) {
    const result = validateCodeqlAnalysisBinding(response, metadata);
    assert.equal(result.valid, false, JSON.stringify(response));
  }
});

test("rejects invalid provenance metadata instead of emitting a reusable binding", () => {
  const result = validateCodeqlAnalysisBinding([analysis], {
    ...metadata,
    repository: "other-repository",
    candidateSha: "stale",
    runAttempt: "0",
  });
  assert.equal(result.valid, false);
  assert.equal(result.exactBinding, false);
});
