import test from "node:test";
import assert from "node:assert/strict";
import { validateTransition } from "./validate-transition.mjs";
import { calculateTaskRisk } from "./calculate-task-risk.mjs";
import { calculateRequiredProof } from "./calculate-required-proof.mjs";
import { selectNextTask, dependenciesSatisfied } from "./select-next-task.mjs";
import { reconcileTaskState, evaluateClosureChecklist, closureChecklist } from "./reconcile-task-state.mjs";

const machine = {
  states: ["DISCOVERED", "TRIAGED", "QUEUED", "DIAGNOSING", "BLOCKED", "CONTRACT_READY", "REPAIRING", "VERIFYING", "FIX_REQUIRED", "READY_TO_INTEGRATE", "INTEGRATING", "INTEGRATED", "CLEANING", "CLEANED", "RECONCILED", "CLOSED"],
  transitions: {
    DISCOVERED: ["TRIAGED"], TRIAGED: ["QUEUED", "BLOCKED"], QUEUED: ["DIAGNOSING"],
    DIAGNOSING: ["CONTRACT_READY", "BLOCKED"], CONTRACT_READY: ["REPAIRING"], REPAIRING: ["VERIFYING"],
    VERIFYING: ["FIX_REQUIRED", "READY_TO_INTEGRATE"], FIX_REQUIRED: ["REPAIRING", "BLOCKED"],
    READY_TO_INTEGRATE: ["INTEGRATING"], INTEGRATING: ["INTEGRATED"], INTEGRATED: ["CLEANING"],
    CLEANING: ["CLEANED"], CLEANED: ["RECONCILED"], RECONCILED: ["CLOSED", "FIX_REQUIRED"], BLOCKED: ["TRIAGED"], CLOSED: [],
  },
  forbiddenTransitions: [
    { from: "REPAIRING", to: "CLOSED", reason: "no" },
    { from: "VERIFYING", to: "CLOSED", reason: "no" },
    { from: "INTEGRATED", to: "CLOSED", reason: "no" },
  ],
};

test("validate-transition: legal and illegal moves", () => {
  assert.equal(validateTransition(machine, "DISCOVERED", "TRIAGED").legal, true);
  assert.equal(validateTransition(machine, "REPAIRING", "CLOSED").legal, false);
  assert.equal(validateTransition(machine, "DISCOVERED", "INTEGRATED").legal, false);
  assert.equal(validateTransition(machine, "GHOST", "TRIAGED").legal, false);
});

test("calculate-task-risk: protected domain drives the floor", () => {
  const riskClasses = {
    classes: [
      { id: "LOW", minCapabilityTier: "T0_MINIMAL", minVerificationProfile: "STATIC_SCOPED" },
      { id: "CRITICAL", minCapabilityTier: "T3_ADVISORY_MAX", minVerificationProfile: "FULL_GATE" },
    ],
    protectedDomainFloors: { finance: "CRITICAL", docs: "LOW" },
  };
  const result = calculateTaskRisk(riskClasses, ["docs", "finance"]);
  assert.equal(result.riskClass, "CRITICAL");
  assert.equal(result.drivenBy, "finance");
});

test("calculate-required-proof: resolves guard ids and dispatch workflows for the risk class", () => {
  const riskClasses = { classes: [{ id: "CRITICAL", minCapabilityTier: "T3_ADVISORY_MAX", minVerificationProfile: "FULL_GATE" }], protectedDomainFloors: { finance: "CRITICAL" } };
  const profiles = { profiles: [{ id: "FULL_GATE", guardIds: ["wlt-financial-boundary"], commands: ["pnpm run guard:journey:full"], dimensions: ["finance"] }] };
  const result = calculateRequiredProof(riskClasses, profiles, ["finance"]);
  assert.equal(result.profile, "FULL_GATE");
  assert.deepEqual(result.guardIds, ["wlt-financial-boundary"]);
  assert.ok(result.dispatchWorkflows.includes("task-security-isolation"));
});

test("select-next-task: orders by priority and skips blocked dependencies", () => {
  const ledger = {
    gaps: [
      { gap_id: "GAP-0002", status: "OPEN", state: "TRIAGED", priority: "P2" },
      { gap_id: "GAP-0001", status: "OPEN", state: "TRIAGED", priority: "P0", blockedBy: ["GAP-0003"] },
      { gap_id: "GAP-0003", status: "OPEN", state: "TRIAGED", priority: "P1" },
    ],
  };
  const result = selectNextTask(ledger, { activeTaskIds: new Set() });
  // GAP-0001 is P0 but blocked by GAP-0003 (not closed) so it must be skipped in favor of GAP-0003.
  assert.equal(result.selected.gap_id, "GAP-0003");
});

test("select-next-task: WIP_WRITE_LIMIT=1 blocks selection while another task writes", () => {
  const ledger = {
    gaps: [
      { gap_id: "GAP-0001", status: "OPEN", state: "TRIAGED", priority: "P0" },
      { gap_id: "GAP-0002", status: "OPEN", state: "REPAIRING", priority: "P0" },
    ],
  };
  const result = selectNextTask(ledger, { activeTaskIds: new Set(["GAP-0002"]) });
  assert.equal(result.selected, null);
  assert.equal(result.reason, "WIP_WRITE_LIMIT_REACHED");
});

test("dependenciesSatisfied: true only once every blocker is CLOSED", () => {
  const ledgerById = new Map([["GAP-0003", { gap_id: "GAP-0003", status: "OPEN" }]]);
  assert.equal(dependenciesSatisfied({ blockedBy: ["GAP-0003"] }, ledgerById), false);
  ledgerById.set("GAP-0003", { gap_id: "GAP-0003", status: "CLOSED" });
  assert.equal(dependenciesSatisfied({ blockedBy: ["GAP-0003"] }, ledgerById), true);
});

test("reconcile-task-state: flags ledger/contract state mismatch as NEEDS_EVIDENCE", () => {
  const result = reconcileTaskState({
    ledgerGap: { gap_id: "GAP-0001", state: "VERIFYING" },
    contract: { task: { id: "GAP-0001", status: "REPAIRING" } },
  });
  assert.equal(result.consistent, false);
  assert.equal(result.decision, "NEEDS_EVIDENCE");
});

test("closure checklist has all 26 points and blocks CLOSED on any missing item", () => {
  assert.equal(closureChecklist.length, 26);
  const allSatisfied = Object.fromEntries(closureChecklist.map((item) => [item.id, true]));
  assert.equal(evaluateClosureChecklist({}, allSatisfied).canClose, true);
  const missingOne = { ...allSatisfied, cleanup_complete: false };
  const result = evaluateClosureChecklist({}, missingOne);
  assert.equal(result.canClose, false);
  assert.deepEqual(result.unresolved, ["cleanup_complete"]);
});
