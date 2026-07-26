// Reconciles ledger state, task contract state, iteration records, and live locks
// for one task; any mismatch resolves to NEEDS_EVIDENCE rather than a guess.
// Also encodes the 26-point closure checklist from spec S25: none of these may be
// waved through — a missing item blocks CLOSED and returns the specific gap.
import fs from "node:fs";
import path from "node:path";
import { repoRoot, readJson } from "../_remediation-utils.mjs";

export const closureChecklist = [
  { id: "contract_valid", label: "Task contract is schema-valid." },
  { id: "root_cause_proven", label: "Root cause is proven (problem.evidenceState === PROVEN)." },
  { id: "product_model_approved", label: "Product model is approved when the task class requires it." },
  { id: "scope_not_expanded", label: "Scope has not expanded beyond the frozen contract." },
  { id: "writes_in_allowed_paths", label: "All writes are inside scope.allowedPaths." },
  { id: "no_lock_conflict", label: "No unresolved LOCK_CONFLICT exists for this task." },
  { id: "acceptance_proven", label: "Every acceptance criterion has required evidence." },
  { id: "negative_invariants_proven", label: "Declared forbidden behaviors are proven absent." },
  { id: "required_tests_pass", label: "All required tests pass." },
  { id: "no_required_flaky", label: "No FLAKY_CONFIRMED test is required for proof." },
  { id: "no_critical_surviving_mutations", label: "No critical surviving mutation remains (when mutation proof is required)." },
  { id: "runtime_proof_when_required", label: "Runtime proof passes when required." },
  { id: "visual_proof_when_required", label: "Visual proof passes when required." },
  { id: "native_proof_when_required", label: "Native proof passes when required." },
  { id: "tenancy_proof_when_required", label: "Tenant isolation proof passes when required." },
  { id: "finance_proof_when_required", label: "Finance review passes when required." },
  { id: "security_proof", label: "Security proof passes." },
  { id: "performance_within_budget", label: "Performance has not regressed beyond budget." },
  { id: "cleanup_complete", label: "Cleanup is complete." },
  { id: "baseline_reconciled", label: "Baseline reconciliation shows no unintended loss." },
  { id: "same_commit_evidence", label: "Every piece of evidence is on the same commit SHA." },
  { id: "child_pr_merged_to_work_branch", label: "The child PR merged to the correct work branch." },
  { id: "child_branch_deleted", label: "The task branch is deleted." },
  { id: "contract_moved_to_completed", label: "The task contract moved to tasks/completed/." },
  { id: "gap_ledger_updated", label: "The gap ledger is updated." },
  { id: "no_unrecorded_subgap", label: "No sub-gap discovered during the task remains unrecorded." },
];

export function evaluateClosureChecklist(contract, evidence = {}) {
  const results = closureChecklist.map((item) => ({ ...item, satisfied: Boolean(evidence[item.id]) }));
  const unresolved = results.filter((item) => !item.satisfied);
  return { canClose: unresolved.length === 0, results, unresolved: unresolved.map((item) => item.id) };
}

export function reconcileTaskState({ ledgerGap, contract, latestIteration, liveLock }) {
  const mismatches = [];
  if (ledgerGap && contract && ledgerGap.state !== contract.task.status) {
    mismatches.push(`LEDGER_CONTRACT_STATE_MISMATCH ledger=${ledgerGap.state} contract=${contract.task.status}`);
  }
  if (contract?.task?.status === "REPAIRING" && !liveLock) {
    mismatches.push("REPAIRING_WITHOUT_LOCK");
  }
  if (latestIteration && latestIteration.taskId !== contract?.task?.id) {
    mismatches.push(`ITERATION_TASK_ID_MISMATCH iteration=${latestIteration.taskId} contract=${contract?.task?.id}`);
  }
  return { consistent: mismatches.length === 0, mismatches, decision: mismatches.length === 0 ? "PASS" : "NEEDS_EVIDENCE" };
}

function main() {
  const [taskId] = process.argv.slice(2);
  if (!taskId) {
    console.error("usage: reconcile-task-state.mjs <task-id>");
    process.exit(2);
  }
  const ledger = readJson("governance/remediation/gap-ledger.json");
  const ledgerGap = (ledger?.gaps ?? []).find((gap) => gap.gap_id === taskId);
  if (!ledgerGap) {
    console.error(JSON.stringify({ decision: "NEEDS_EVIDENCE", reason: `UNKNOWN_TASK_ID ${taskId}` }, null, 2));
    process.exit(1);
  }
  const bucket = ["active", "blocked", "completed", "archived"].find((candidate) =>
    fs.existsSync(path.join(repoRoot, "governance/remediation/tasks", candidate, `${taskId}.json`)),
  );
  const contract = bucket ? readJson(`governance/remediation/tasks/${bucket}/${taskId}.json`) : undefined;
  const result = reconcileTaskState({ ledgerGap, contract });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.consistent ? 0 : 1);
}

if (process.argv[1]?.endsWith("reconcile-task-state.mjs")) main();
