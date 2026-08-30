import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p) => readFileSync(p, "utf8");

test("Final Closure cannot publish success before manifest upload", () => {
  const f = read(".github/workflows/final-closure.yml");
  const upload = f.indexOf("Upload generated closure manifest");
  const success = f.indexOf("Publish Final Closure success only after manifest publication");
  assert.ok(upload >= 0 && success > upload);
  const beforeUpload = f.slice(0, upload);
  assert.doesNotMatch(beforeUpload, /-f state=success -f context='BThwani \/ Final Closure'/u);
});

test("CI source-immutability meta-verifier is loaded from trusted workflow SHA", () => {
  const f = read(".github/workflows/ci-check.yml");
  assert.match(f, /Load trusted CI source-immutability verifier/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(f, /BTHWANI_TARGET_REPO/u);
  const v = read("tools/scripts/check-ci-source-immutability.mjs");
  assert.match(v, /BTHWANI_TARGET_REPO/u);
  assert.match(v, /targetRepoRoot/u);
});

test("evidence attestation rejects candidate-linked reviewers and weak evidence identities", () => {
  const v = read("tools/scripts/verify-pr-evidence-comments.mjs");
  assert.match(v, /candidateAuthors/u);
  assert.match(v, /candidate author\/committer\/PR creator cannot attest/u);
  assert.match(v, /evidenceSha256/u);
  assert.match(v, /capturedAt/u);
  assert.match(v, /external-device-runner/u);
  assert.match(v, /device\?\.appBuild/u);
});
