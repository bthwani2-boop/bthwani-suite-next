import assert from "node:assert/strict";
import { test } from "node:test";
import { reconcileDiagnostics } from "./reconcile-operational-diagnostics.mjs";

function documents(headSha = "abc123") {
  return {
    "gap-ledger.json": {
      head_sha: headSha,
      status: "DISCOVERY_ONLY",
      gap_count: 0,
      gaps: [],
    },
    "journey-inventory.json": {
      head_sha: headSha,
      status: "DISCOVERY_ONLY",
      journeys: [],
    },
    "surface-inventory.json": {
      head_sha: headSha,
      status: "DISCOVERY_ONLY",
      surfaces: [],
    },
    "toolchain-inventory.json": {
      head_sha: headSha,
      status: "DISCOVERY_ONLY",
      tools: [],
    },
  };
}

test("reconciles current discovery inventories without promoting closure", () => {
  const result = reconcileDiagnostics({
    headSha: "abc123",
    branch: "smsm",
    documents: documents(),
  });

  assert.equal(result.decision, "PASS");
  assert.equal(result.scope, "static-discovery");
  assert.ok(result.does_not_prove.includes("CLOSED_WITH_EVIDENCE"));
});

test("fails stale and fabricated diagnostic evidence", () => {
  const input = documents("old-sha");
  input["toolchain-inventory.json"].output = "Mock successful run for graphify";
  const result = reconcileDiagnostics({
    headSha: "new-sha",
    branch: "smsm",
    documents: input,
  });

  assert.equal(result.decision, "FIX_REQUIRED");
  assert.ok(result.errors.some((error) => error.includes("stale head_sha")));
  assert.ok(result.errors.some((error) => error.includes("fabricated mock-success")));
});

test("fails open gaps and unclassified journeys", () => {
  const input = documents();
  input["gap-ledger.json"].gap_count = 1;
  input["gap-ledger.json"].gaps.push({ gap_id: "GAP-1" });
  input["journey-inventory.json"].journeys.push({ status: "PROPOSED_UNFILLED" });
  const result = reconcileDiagnostics({
    headSha: "abc123",
    branch: "smsm",
    documents: input,
  });

  assert.equal(result.decision, "FIX_REQUIRED");
  assert.equal(result.counts.gaps, 1);
  assert.equal(result.counts.proposedUnfilledJourneys, 1);
});
