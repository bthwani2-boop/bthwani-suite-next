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

test("CI control-plane authorities are loaded from trusted workflow SHA", () => {
  const f = read(".github/workflows/ci-check.yml");
  assert.match(f, /authoritative definition must run from/u);
  assert.match(f, /required CI status publication is forbidden outside/u);
  assert.match(f, /Load trusted CI control-plane authorities/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(f, /verify-assurance-authority-drift\.mjs/u);
  assert.match(f, /TRUSTED_ASSURANCE_AUTHORITY_DRIFT/u);
  assert.match(f, /ASSURANCE_AUTHORITY/u);
  assert.match(f, /fetch_trusted tools\/scripts\/check-ci-source-immutability\.mjs/u);
  assert.match(f, /fetch_trusted tools\/guards\/migration-manifest-drift-gate\.mjs/u);
  assert.match(f, /fetch_trusted tools\/guards\/sonar-coverage-ownership-gate\.mjs/u);
  assert.match(f, /fetch_trusted tools\/verification\/ownership.manifest\.json/u);
  assert.match(f, /TRUSTED_MIGRATION_MANIFEST_GUARD/u);
  assert.match(f, /TRUSTED_SONAR_OWNERSHIP_GUARD/u);
  assert.doesNotMatch(f, /run:\s*node tools\/guards\/migration-manifest-drift-gate\.mjs/u);
  assert.doesNotMatch(f, /node --test tools\/guards\/sonar-coverage-ownership-gate\.test\.mjs/u);

  const drift = read("tools/scripts/verify-assurance-authority-drift.mjs");
  for (const protectedAuthority of [
    '".github/workflows"',
    '".github/actions"',
    '".opencodereview"',
    '"tools/guards"',
    '"tools/verification"',
    '"tools/scripts/invoke-runtime-phase.ps1"',
    '"tools/scripts/run-guard-suite.mjs"',
    '"infra/docker/scripts/runtime-dispatch.ps1"',
  ]) assert.ok(drift.includes(protectedAuthority), `missing drift authority ${protectedAuthority}`);
  assert.match(drift, /ASSURANCE_AUTHORITY_CHANGE_REQUIRES_BOOTSTRAP/u);
  assert.match(drift, /BTHWANI_ASSURANCE_AUTHORITY_DRIFT:v1/u);
  assert.match(drift, /authorityDiffSha256/u);
  assert.match(drift, /tools\/prompting\/bthwani-orchestrator/u);

  const verifier = read("tools/scripts/check-ci-source-immutability.mjs");
  assert.match(verifier, /BTHWANI_TARGET_REPO/u);
  assert.match(verifier, /targetRepoRoot/u);
  assert.match(read("tools/guards/migration-manifest-drift-gate.mjs"), /BTHWANI_TARGET_REPO/u);
  assert.match(read("tools/guards/_guard-utils.mjs"), /BTHWANI_TARGET_REPO/u);
});

test("Remote Security authority, wrappers, installer, and policy come from trusted workflow SHA", () => {
  const f = read(".github/workflows/security-remote.yml");
  assert.match(f, /Materialize trusted remote-analysis authority/u);
  assert.match(f, /Materialize trusted analyzer authority and policy/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(f, /git archive "\$\{TRUSTED_WORKFLOW_SHA\}"/u);
  assert.match(f, /TRUSTED_SECURITY_ROOT/u);
  assert.match(f, /BTHWANI_TRUSTED_POLICY_ROOT/u);
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/tools/scripts/install-oss-toolchain-binaries.sh"));
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/tools/guards/remote-analysis-authority-gate.mjs"));
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/tools/scripts/run-osv-scanner.mjs"));
  assert.ok(f.includes("${TRUSTED_SECURITY_ROOT}/.gitleaksignore"));
  assert.doesNotMatch(f, /run:\s*bash tools\/scripts\/install-oss-toolchain-binaries\.sh/u);
  assert.doesNotMatch(f, /osv-scanner\) node tools\/scripts\/run-osv-scanner\.mjs/u);
  assert.match(read("tools/scripts/run-pinact.mjs"), /BTHWANI_TARGET_REPO/u);
  assert.match(read("tools/scripts/run-osv-scanner.mjs"), /BTHWANI_TRUSTED_POLICY_ROOT/u);
  assert.match(read("tools/scripts/run-trivy.mjs"), /BTHWANI_TRUSTED_POLICY_ROOT/u);
  assert.match(read("tools/scripts/run-shellcheck.mjs"), /--norc/u);
});

test("Semgrep evidence disposition is loaded from trusted workflow authority", () => {
  const f = read(".github/workflows/semgrep.yml");
  assert.match(f, /Load trusted Semgrep evidence classifier/u);
  assert.match(f, /TRUSTED_WORKFLOW_SHA/u);
  assert.match(f, /TRUSTED_SEMGREP_CLASSIFIER/u);
  assert.ok(f.includes('git show "${TRUSTED_WORKFLOW_SHA}:tools/scripts/classify-semgrep-evidence.mjs"'));
  assert.ok(f.includes('node "${TRUSTED_SEMGREP_CLASSIFIER}"'));
  assert.doesNotMatch(f, /node tools\/scripts\/classify-semgrep-evidence\.mjs/u);
});

test("evidence attestation rejects candidate-linked reviewers and binds assurance bootstrap exactly", () => {
  const v = read("tools/scripts/verify-pr-evidence-comments.mjs");
  assert.match(v, /candidateAuthors/u);
  assert.match(v, /candidate author\/committer\/PR creator cannot attest/u);
  assert.match(v, /evidenceSha256/u);
  assert.match(v, /capturedAt/u);
  assert.match(v, /external-device-runner/u);
  assert.match(v, /device\?\.appBuild/u);
  assert.match(v, /BTHWANI_ASSURANCE_BOOTSTRAP:v1/u);
  assert.match(v, /external-authorized-assurance-reviewer/u);
  assert.match(v, /bootstrap authority diff SHA-256 does not match trusted evidence/u);
  assert.match(v, /bootstrap protected changed-count does not match trusted evidence/u);
  assert.match(v, /assurance-authority-only/u);
});
