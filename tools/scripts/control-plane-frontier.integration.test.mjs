import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

// BTHWANI_CONTROL_PLANE_FRONTIER_V2

const ci = fs.readFileSync(".github/workflows/ci-check.yml", "utf8");
const closure = fs.readFileSync(".github/workflows/final-closure.yml", "utf8");
const router = fs.readFileSync("tools/scripts/detect-ci-context.mjs", "utf8");
const evidence = fs.readFileSync("tools/scripts/lib/evidence-envelope.mjs", "utf8");

test("prior aggregate failure is eligible as a trusted per-claim evidence source", () => {
  assert.match(ci, /\.state == "failure"/u);
  assert.match(ci, /\.status == "completed"/u);
  assert.doesNotMatch(ci, /\.conclusion == "success" and \.event == "workflow_dispatch"/u);
  assert.match(ci, /prior_run_id/u);
});

test("broad control-plane change no longer resets the verification window to closure base", () => {
  assert.doesNotMatch(ci, /ci-verification-window-probe/u);
  assert.doesNotMatch(ci, /conservative closure-base verification because verification authority changed/u);
  assert.match(ci, /resolve-prior-ci-failures\.mjs/u);
  assert.match(ci, /FAILED ∪ INVALIDATED_BY_FIX ∪ NEWLY_REQUIRED/u);
});

test("Node and backend replay inputs are claim-local instead of shared invalidation switches", () => {
  for (const token of [
    "node_contracts",
    "node_ci_control_plane",
    "node_dependency_changed",
    "node_platform",
    "backend_database_changed",
  ]) {
    assert.match(ci, new RegExp(token, "u"), token);
    assert.match(router, new RegExp(token, "u"), token);
  }
});

test("Final Closure derives required evidence sensors from dynamic material claims", () => {
  assert.match(closure, /closure_required_claims/u);
  assert.match(closure, /TRUSTED_CLOSURE_CLAIMS/u);
  assert.match(closure, /--print-required-tools/u);
  assert.doesNotMatch(
    closure,
    /--required-tools 'codeql,sonar,semgrep,gitleaks,osv-scanner,trivy,actionlint,zizmor,pinact,shellcheck,hadolint,yamllint'/u,
  );
  assert.match(closure, /requiredClaims/u);
});

test("Root Graph suppresses only proven non-root dispositions and keeps BLOCKED_BY open", () => {
  assert.match(evidence, /N\/A_PROVEN/u);
  assert.match(evidence, /SUPERSEDED/u);
  assert.match(evidence, /DUPLICATE_CORRELATED/u);
  assert.match(evidence, /DESCENDANT_OF_ROOT/u);
  assert.doesNotMatch(evidence, /NON_ROOT_DISPOSITIONS[\s\S]{0,300}"BLOCKED_BY"/u);
});