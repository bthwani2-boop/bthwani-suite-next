import assert from "node:assert/strict";
import test from "node:test";

import {resolvePriorCiFailures} from "./resolve-prior-ci-failures.mjs";

const priorSha = "a".repeat(40);
const headSha = "b".repeat(40);
const trustedWorkflowSha = "c".repeat(40);

function classification(overrides = {}) {
  return {
    full_scope: false,
    ci_control_plane: false,
    database_changed: false,
    backend_database_changed: false,
    contracts: false,
    node_contracts: false,
    node_ci_control_plane: false,
    dependency_changed: false,
    node_dependency_changed: false,
    platform: false,
    node_platform: false,
    dsh: false,
    wlt: false,
    identity: false,
    workforce: false,
    providers: false,
    backend: false,
    backend_required: false,
    diagnostics_required: false,
    verification_required: false,
    runtime_required: false,
    sonar_required: false,
    required_jobs: [],
    required_claims: [],
    closure_required_claims: [],
    ...overrides,
  };
}

function contextJob(conclusion = "success") {
  return {id: 1, name: "Verify exact candidate and resolve affected scope", conclusion, steps: []};
}

function job(id, name, conclusion = "success", steps = []) {
  return {id, name, conclusion, steps};
}

function resolve({current, prior, jobs, aggregateConclusion = "failure"}) {
  return resolvePriorCiFailures({
    currentClassification: current,
    priorClassification: prior,
    priorJobs: jobs,
    priorRunId: "100",
    priorSha,
    headSha,
    trustedWorkflowSha,
    aggregateConclusion,
  });
}

test("aggregate failure does not invalidate an unrelated successful runtime claim", () => {
  const prior = classification({runtime_required: true});
  const current = classification({ci_control_plane: true, verification_required: true, node: true, node_ci_control_plane: true});
  const result = resolve({
    current,
    prior,
    jobs: [
      contextJob(),
      job(2, "Runtime verification", "success"),
      job(3, "BThwani / Change Verification", "failure"),
    ],
  });

  assert.equal(result.frontier_usable, true);
  assert.ok(result.reused_pass_claims.includes("runtime:verification"));
  assert.equal(result.runtime_required, false);
  assert.equal(result.verification_required, true);
});

test("failed DSH backend replays DSH only and preserves successful WLT", () => {
  const prior = classification({dsh: true, wlt: true, backend: true, backend_required: true});
  const current = classification();
  const result = resolve({
    current,
    prior,
    jobs: [
      contextJob(),
      job(10, "Backend verification / Verify dsh backend", "failure"),
      job(11, "Backend verification / Verify wlt backend", "success"),
      job(12, "BThwani / Change Verification", "failure"),
    ],
  });

  assert.ok(result.replayed_failed_claims.includes("backend:dsh"));
  assert.ok(result.reused_pass_claims.includes("backend:wlt"));
  assert.equal(result.dsh, true);
  assert.equal(result.wlt, false);
  assert.equal(result.backend_required, true);
  assert.equal(result.runtime_required, false);
});

test("failed backend with prior database input replays database work only inside that backend claim", () => {
  const prior = classification({
    dsh: true,
    backend: true,
    backend_required: true,
    database_changed: true,
    backend_database_changed: true,
  });
  const current = classification();
  const result = resolve({
    current,
    prior,
    jobs: [
      contextJob(),
      job(20, "CI control-plane verification", "success"),
      job(21, "Backend verification / Verify dsh backend", "failure"),
    ],
  });

  assert.equal(result.dsh, true);
  assert.equal(result.backend_database_changed, true);
  assert.equal(result.database_changed, false, "migration control must not rerun merely because the backend claim used DB checks");
  assert.equal(result.ci_control_plane, false);
});

test("failed Node claim replays prior Node inputs without rerunning successful controls or diagnostics", () => {
  const prior = classification({
    ci_control_plane: true,
    contracts: true,
    node_contracts: true,
    node_ci_control_plane: true,
    verification_required: true,
    diagnostics_required: true,
  });
  const current = classification();
  const result = resolve({
    current,
    prior,
    jobs: [
      contextJob(),
      job(30, "CI control-plane verification", "success"),
      job(31, "Contract diagnostics", "success"),
      job(32, "Node verification", "failure"),
    ],
  });

  assert.equal(result.verification_required, true);
  assert.equal(result.node_contracts, true);
  assert.equal(result.node_ci_control_plane, true);
  assert.equal(result.diagnostics_required, false);
  assert.equal(result.ci_control_plane, false);
  assert.ok(result.reused_pass_claims.includes("contracts:diagnostics"));
});

test("individual failed control step replays only that control claim", () => {
  const prior = classification({ci_control_plane: true, verification_required: true});
  const current = classification();
  const controls = job(40, "CI control-plane verification", "failure", [
    {name: "Check protected assurance authority drift", conclusion: "failure"},
    {name: "Check verification-workflow source immutability with trusted verifier", conclusion: "success"},
    {name: "Check Sonar coverage ownership and configuration with trusted authority", conclusion: "success"},
  ]);
  const result = resolve({
    current,
    prior,
    jobs: [contextJob(), controls, job(41, "Node verification", "success")],
  });

  assert.ok(result.replayed_failed_claims.includes("control:assurance-authority-drift"));
  assert.equal(result.ci_control_plane, true);
  assert.equal(result.verification_required, false, "successful Node proof remains reusable");
});

test("failed or missing prior context makes the incremental frontier unusable", () => {
  const result = resolve({
    current: classification(),
    prior: classification({runtime_required: true}),
    jobs: [contextJob("failure")],
  });
  assert.equal(result.frontier_usable, false);
  assert.equal(result.reason, "PRIOR_CONTEXT_NOT_SUCCESSFUL");
});

test("cancelled required prior job is replayed fail-closed", () => {
  const prior = classification({runtime_required: true});
  const result = resolve({
    current: classification(),
    prior,
    jobs: [contextJob(), job(50, "Runtime verification", "cancelled")],
  });
  assert.ok(result.replayed_failed_claims.includes("runtime:verification"));
  assert.equal(result.runtime_required, true);
});

test("newly required current claim runs while unrelated prior PASS is reused", () => {
  const prior = classification({runtime_required: true});
  const current = classification({contracts: true, diagnostics_required: true});
  const result = resolve({
    current,
    prior,
    jobs: [contextJob(), job(60, "Runtime verification", "success")],
  });
  assert.ok(result.reused_pass_claims.includes("runtime:verification"));
  assert.ok(result.required_claims.includes("contracts:diagnostics"));
  assert.equal(result.diagnostics_required, true);
});