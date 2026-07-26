---
name: bthwani-engineering-loop-controller
version: 2026.07.26-v1
summary: Own the governed engineering-loop state — iteration records, hypotheses, convergence, anti-thrash detection, task-split escalation, and post-task learning — for one task under a frozen contract, without approving its own work.
---

# bthwani-engineering-loop-controller

## Purpose

Own the BThwani Governed Engineering Loop for one task once its contract is frozen: plan, execute, observe, evaluate, diagnose, correct, verify, improve, replan. Persist each cycle as an iteration record under `governance/remediation/iterations/<task-id>/`, evaluate convergence against the prior iterations, detect thrashing (a repeated hypothesis, patch, or failure fingerprint), and escalate to task-split or re-diagnosis when the loop stalls. After a task closes, run the portfolio-loop step: reconcile the baseline, update the gap ledger, extract lessons, and propose promoting a recurring fix into `tools/remediation/repairs/registry.json` or a new guard. This skill also performs the Agent Controller role from `governance/remediation/progressive-remediation-policy.json`: creating the child branch, applying patches, and proposing PR/merge actions — every git-mutating step is a proposal that requires an explicit human command per round; this skill never runs `git commit`, `git push`, or a merge itself.

## Invoke when

- A task contract reaches `CONTRACT_READY` and repair work is about to start.
- An iteration needs to be evaluated (a work unit finished, a check ran, a hypothesis needs updating).
- Two or more iterations show a repeated hypothesis hash, patch hash, or failure fingerprint (possible thrash).
- A task reached `INTEGRATED` and needs baseline reconciliation, ledger update, and lesson extraction.
- A child branch needs to be created, have a patch applied, or have a PR/merge proposed for a task already governed by a frozen contract.

## Do not invoke when

- No task contract exists yet (route to `bthwani-universal-task-router` and `bthwani-product-truth-governor` first).
- Independent review of a completed implementation is requested (that is `bthwani-independent-implementation-reviewer`'s scope, not this skill's).
- Final multi-dimensional closure is requested (that is `bthwani-final-journey-closure-judge`'s scope).
- Only work-unit decomposition and dispatch across independent bounded units is needed with no loop-convergence question (that is `bthwani-cost-aware-subagent-orchestrator`'s scope).
- The task's `agents.maximumRepairIterations` is already exhausted without a fresh hypothesis (stop and escalate; do not invoke again with the same inputs).

## Authority boundary

- Owns engineering-loop state, iteration convergence, and task-split escalation only.
- Cannot self-approve its own output as final; cannot substitute for Product Manager, Product Owner, Governance Contract, CI Workflow, QA, Security, Financial Control, Release, Production, or Risk Acceptance authority.
- Cannot expand a task's frozen scope; a wider scope requires a new task contract.
- Cannot merge to `master`; child-branch merges target the originating work branch only, per `governance/github/remediation-branch-return-policy.json`.
- Every git write (branch creation, commit, push, PR open, merge) is proposed and requires an explicit human command for that round; this skill never executes one autonomously.
- Conflicts with `bthwani-cost-aware-subagent-orchestrator`: whichever of the two coordinates or executes the change cannot also independently review it — see `bthwani-independent-implementation-reviewer`'s own conflict for the symmetric rule.

## Required method

1. Pin repository, branch, and resolved commit via `bthwani-current-workspace-authority` before reading or proposing anything.
2. Load the task contract from `governance/remediation/tasks/active/<task-id>.json`; refuse to proceed if it fails `guard:task-contract`.
3. For the MICRO loop: dispatch one bounded work unit through `bthwani-cost-aware-subagent-orchestrator`, cap attempts at two per unchanged assertion, and change the hypothesis (not just retry) after a failure.
4. Record every cycle as an iteration record (`iterationId`, `hypothesis`, `plan`, `execution`, `observation`, `evaluation`, `diagnosis`, `improve`, `decision`, `antiThrash`) validating against `governance/remediation/iteration-record.schema.json`.
5. For the GAP_CLOSURE loop: after work units pass, hand the integrated diff to `bthwani-independent-implementation-reviewer`, run the cross-surface verification profile from `calculate-required-proof.mjs`, and open corrective work units for anything the review finds.
6. For the PORTFOLIO loop: after `CLEANED`, run `remediation:reconcile-baseline`-equivalent checks, update `governance/remediation/gap-ledger.json`, record lessons in `improve`, and propose a `tools/remediation/repairs/registry.json` entry only when the same fix pattern recurred across two or more iterations.
7. Detect thrash: if a hypothesis hash, patch hash, or failure fingerprint repeats from a prior iteration's `antiThrash` block, the decision must be `LOOP_NOT_CONVERGING`, `REDIAGNOSE`, or `TASK_SPLIT_REQUIRED` — never a plain retry.
8. Stop at `agents.maximumRepairIterations` (3); a fourth attempt without a fresh hypothesis is a protocol violation, not a new iteration.

## Forbidden behavior

- Issuing `CLOSED_WITH_EVIDENCE` or any final approval itself.
- Widening `scope.allowedPaths` without a new task contract.
- Treating a repeated hypothesis, patch, or failure fingerprint as a fresh attempt.
- Running `git commit`, `git push`, opening a PR, or merging without an explicit human command for that round.
- Merging a child branch anywhere but its originating work branch.
- Fabricating a convergence claim (`IMPROVING`) when `failedGatesAfter` did not decrease or when regressions, scope violations, or unexpected deletions are non-zero.

## Required output

```text
task_id:
iteration_id:
loop:
transition_performed:
iteration_record_path:
checks:
decision:
remaining_risks:
```

Allowed decisions: `PASS`, `FIX_REQUIRED`, `NEEDS_EVIDENCE`, `BLOCKED_EXTERNAL`, and `PROTOCOL_VIOLATION`.

Per-iteration loop escalation states (recorded in the iteration record's own `decision.status` field, governed by `governance/remediation/iteration-record.schema.json`, not by the canonical decision vocabulary above) additionally include convergence-loop-only values such as loop-not-converging, re-diagnose, and task-split-required — see that schema for the exact enum.
