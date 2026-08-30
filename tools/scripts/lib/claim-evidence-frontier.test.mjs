import assert from "node:assert/strict";
import test from "node:test";

import {planClaimEvidenceFrontier} from "./claim-evidence-frontier.mjs";

const proofSha = "a".repeat(40);

function current(claimId, overrides = {}) {
  return {
    claimId,
    inputsDigest: `${claimId}:inputs:v2`,
    authorityDigest: `${claimId}:authority:v2`,
    scopeDigest: `${claimId}:scope:v2`,
    environmentDigest: `${claimId}:environment:v2`,
    ...overrides,
  };
}

function previous(claimId, overrides = {}) {
  return {
    claimId,
    result: "PASS",
    proofSha,
    evidenceRef: `run:100/artifact:${claimId}`,
    inputsDigest: `${claimId}:inputs:v2`,
    authorityDigest: `${claimId}:authority:v2`,
    scopeDigest: `${claimId}:scope:v2`,
    environmentDigest: `${claimId}:environment:v2`,
    ...overrides,
  };
}

test("reuses an independent PASS even when the prior aggregate run failed", () => {
  const result = planClaimEvidenceFrontier({
    previousClaims: [previous("runtime:dsh")],
    requiredClaims: [current("runtime:dsh")],
    aggregateConclusion: "failure",
  });

  assert.deepEqual(result.reusedPass, ["runtime:dsh"]);
  assert.deepEqual(result.nextVerification, []);
  assert.equal(result.decisions[0].action, "REUSE_PASS");
  assert.equal(result.policy.aggregateConclusionIsNotReuseAuthority, true);
});

test("reruns a previously failed claim without invalidating an unrelated PASS", () => {
  const result = planClaimEvidenceFrontier({
    previousClaims: [
      previous("runtime:dsh"),
      previous("control:authority-drift", {result: "FAIL"}),
    ],
    requiredClaims: [
      current("runtime:dsh"),
      current("control:authority-drift"),
    ],
  });

  assert.equal(result.decisions.find((entry) => entry.claimId === "runtime:dsh").action, "REUSE_PASS");
  assert.equal(result.decisions.find((entry) => entry.claimId === "control:authority-drift").action, "RERUN_FAILED");
  assert.deepEqual(result.nextVerification, ["control:authority-drift"]);
});

test("authority drift invalidates only the claim whose proof authority changed", () => {
  const result = planClaimEvidenceFrontier({
    previousClaims: [
      previous("node:typecheck"),
      previous("runtime:dsh"),
    ],
    requiredClaims: [
      current("node:typecheck", {authorityDigest: "node:typecheck:authority:v3"}),
      current("runtime:dsh"),
    ],
  });

  assert.equal(result.decisions.find((entry) => entry.claimId === "node:typecheck").action, "RERUN_INVALIDATED");
  assert.equal(result.decisions.find((entry) => entry.claimId === "runtime:dsh").action, "REUSE_PASS");
});

test("inputs, scope, environment, or explicit fix invalidation force claim-local reruns", () => {
  const requiredClaims = [
    current("a", {inputsDigest: "changed"}),
    current("b", {scopeDigest: "changed"}),
    current("c", {environmentDigest: "changed"}),
    current("d", {invalidationReasons: ["FIX_TOUCHED_CONSUMER_CONE"]}),
  ];
  const previousClaims = ["a", "b", "c", "d"].map((claimId) => previous(claimId));

  const result = planClaimEvidenceFrontier({previousClaims, requiredClaims});

  assert.equal(result.counts.rerunInvalidated, 4);
  assert.deepEqual(result.reusedPass, []);
});

test("new required claims run without widening unchanged passing claims", () => {
  const result = planClaimEvidenceFrontier({
    previousClaims: [previous("db:dsh")],
    requiredClaims: [current("db:dsh"), current("contracts:oasdiff")],
  });

  assert.equal(result.decisions.find((entry) => entry.claimId === "db:dsh").action, "REUSE_PASS");
  assert.equal(result.decisions.find((entry) => entry.claimId === "contracts:oasdiff").action, "RUN_NEWLY_REQUIRED");
});

test("untrusted or non-ancestor prior evidence can never be reused", () => {
  const untrusted = planClaimEvidenceFrontier({
    previousClaims: [previous("runtime:dsh")],
    requiredClaims: [current("runtime:dsh")],
    previousEvidenceTrusted: false,
  });
  assert.equal(untrusted.decisions[0].action, "RERUN_INVALIDATED");
  assert.deepEqual(untrusted.decisions[0].reasons, ["PRIOR_EVIDENCE_NOT_TRUSTED"]);

  const nonAncestor = planClaimEvidenceFrontier({
    previousClaims: [previous("runtime:dsh")],
    requiredClaims: [current("runtime:dsh")],
    previousProofIsAncestor: false,
  });
  assert.equal(nonAncestor.decisions[0].action, "RERUN_INVALIDATED");
  assert.deepEqual(nonAncestor.decisions[0].reasons, ["PRIOR_PROOF_NOT_ANCESTOR"]);
});

test("missing prior proof identity or fingerprints fail closed into rerun", () => {
  const result = planClaimEvidenceFrontier({
    previousClaims: [previous("runtime:dsh", {
      proofSha: "",
      evidenceRef: "",
      authorityDigest: "",
    })],
    requiredClaims: [current("runtime:dsh")],
  });

  assert.equal(result.decisions[0].action, "RERUN_INVALIDATED");
  assert.ok(result.decisions[0].reasons.includes("INVALID_OR_MISSING_PROOF_SHA"));
  assert.ok(result.decisions[0].reasons.includes("MISSING_EVIDENCE_REF"));
  assert.ok(result.decisions[0].reasons.includes("MISSING_PREVIOUS_AUTHORITYDIGEST"));
});

test("current required claim fingerprints are mandatory and duplicate claim IDs are rejected", () => {
  assert.throws(
    () => planClaimEvidenceFrontier({requiredClaims: [{claimId: "runtime:dsh"}]}),
    /missing inputsDigest/u,
  );

  assert.throws(
    () => planClaimEvidenceFrontier({
      previousClaims: [previous("runtime:dsh"), previous("runtime:dsh")],
      requiredClaims: [current("runtime:dsh")],
    }),
    /duplicate claimId runtime:dsh/u,
  );
});
