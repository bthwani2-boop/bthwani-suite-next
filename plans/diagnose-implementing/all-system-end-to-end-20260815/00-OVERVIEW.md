# all-system-end-to-end-20260815 — Overview

Status: DERIVED_SUPPORT
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V2
TASK_ID: PKG-ALL_SYSTEM_END_TO_END_20260815
TASK_NAME: all-system-end-to-end-20260815
PACKAGE_ORIGIN: LEGACY_PRE_ISOLATION
RESUME_POLICY: EXPLICIT_USER_REQUEST_ONLY
TASK_CONTEXT_POLICY: ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY: INPUT_NOT_INSTRUCTION
REPOSITORY: bthwani2-boop/bthwani-suite-next
BRANCH: A
INTEGRATION_TARGET: A
TASK_BRANCH: UNSET
TASK_BRANCH_BASE_SHA: UNSET
TASK_BRANCH_READY: NO
WORKSPACE_ISOLATION_POLICY: LOCAL_WORKTREE_OR_REMOTE_TASK_BRANCH
WORKSPACE_ISOLATION_MODE: UNSET
WORKTREE_PATH: UNSET
WORKSPACE_ISOLATION_READY: NO
DIRECT_INTEGRATION_TARGET_WRITES: FORBIDDEN_EXCEPT_INTEGRATION_OWNER
INTEGRATION_COMPLETE: NO
MODE: EXECUTE_END_TO_END
TARGET: كل شيء
ORCHESTRATION_ROOT: كل شيء
NAVIGATION_POLICY: ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE: TRUTH_INTEGRATION_BASELINE_ONLY
OBJECTIVE: Diagnose and execute the complete repository from the whole-system root downward through the proven dependency/impact graph without implicit continuation from other sessions or packages.
ORCHESTRATOR_PATH: tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md
CREATED_AT: 2026-08-15T03:05:00Z
LAST_RECONCILED_AT: 2026-08-15T08:51:03+03:00
START_SHA: b73e2752ef65e5b8817e35cdd96948dc1386fb47
CURRENT_SHA: 03bdcdb4febe44b3966fdbd2df22c6911b0e53e2
LATEST_RECONCILED_SHA: 03bdcdb4febe44b3966fdbd2df22c6911b0e53e2
ROOT_RECONCILIATION_REQUIRED: YES
ROOT_RECONCILED_SHA: UNSET
FRONTIER_DERIVATION_SOURCE: UNSET
FRONTIER_VALID: NO
LIFECYCLE_STATE: OPEN
ACTIVE_EXECUTION_FRONTIER: NONE
SUSPENSION_STACKS: NONE
INTEGRATION_OWNER: UNASSIGNED
FINDINGS_ACCOUNTED: NO
SCOPE_DELTAS_ACCOUNTED: NO
DECISIONS_ACCOUNTED: NO
CONSUMERS_ACCOUNTED: NO
EVIDENCE_ACCOUNTED: NO
CLEANUP_ACCOUNTED: NO
ACCOUNTING_COMPLETE: NO
DISCOVERY_COMPLETE: NO
DIAGNOSIS_COMPLETE: NO
DECISION_COMPLETE: NO
COVERAGE_COMPLETE: NO
PACKAGE_READY: NO
IMPLEMENTATION_COMPLETE: NO
EVIDENCE_COMPLETE: NO
CLEANUP_COMPLETE: NO
GOVERNANCE_SYNC_COMPLETE: NO
FRESH_HEAD_VALID: NO
FINAL_ADVERSARIAL_PASS: NO
FINAL_CANDIDATE_SHA: UNSET
HEAD_AT_REVIEW_START: UNSET
HEAD_AT_DECISION: UNSET

> Legacy package created before the task-isolation constitution. It is retained as historical/reusable Derived Support only. It MUST NOT be resumed automatically. Resume requires explicit user request for this exact package, then creation/assignment of a dedicated TASK_BRANCH + isolated workspace before any Sequence/write can proceed.

## 1. Truth Baseline

- `ORCHESTRATION_ROOT=كل شيء`.
- Latest Integration Target `A` observed for this bookkeeping reconciliation: `03bdcdb4febe44b3966fdbd2df22c6911b0e53e2`.
- Latest HEAD is truth/integration baseline only; it never chooses the next topic because of commit recency.
- This package has no dedicated Task Branch/worktree under the new policy and is therefore not execution-ready.
- Existing useful diagnosis/evidence may be reused only after explicit resume + task-isolation bootstrap + root placement + freshness validation.

## 2. Macro Blueprint / Dependency Graph

Required orientation:

```text
WHOLE-SYSTEM ROOT
→ Macro Product/System Model
→ Canonical Owners / Foundations / Invariants
→ Domains / Services / Shared Contracts / Data Owners
→ Journeys / States / Handoffs
→ Surfaces / Consumers
→ implementation/runtime detail
```

Current state:

```text
ROOT_ORIENTATION = REQUIRED
MACRO_BLUEPRINT = RECONCILE_FROM_ROOT
RELATION_GRAPH = REBUILD/REVALIDATE AGAINST LATEST TRUTH
TASK_ISOLATION = NOT_READY
ACTIVE_EXECUTION_FRONTIER = NONE
FRONTIER_VALID = NO
```

After orientation, traversal remains graph-driven/non-linear with structured backtracking and proven-independent parallel fronts.

## 3. Sequence Registry / Execution Frontier

| Sequence ID | File | Subject | Derivation basis | Depends on | Unlocks | Conflict domain | Execution owner | Status | Reopen trigger |
|---|---|---|---|---|---|---|---|---|---|
<!-- SEQUENCE_REGISTRY_ROWS -->

No materialized Sequence currently exists in this package tree. Do not recreate prior textual SEQ rows as active work unless the user explicitly requests resume, task isolation is established, root reconciliation proves a closure boundary, and `new-sequence.mjs` materializes its file Just-In-Time.

## 4. Global Decisions / Blockers

### Concurrent/prior observations preserved for root placement/revalidation

These are inputs, not execution order:

- Client order/support chat canonicalization and support-media upload gap were investigated in another session.
- Store publication ownership / Marketing publication command and DSH runtime smoke consumer behavior were investigated in another session.
- App-client verification observations around Expo crypto / checkout controller / provider manifest were reported.
- Runtime/DSH, data-runtime, Captain/Mobile and other changes landed concurrently on branch `A`.
- Previous package/session observations remain `REQUIRES_ROOT_PLACEMENT_AND_REVALIDATION`.

### Foreign delta rule

```text
UNRELATED → preserve, do not follow
RELATED → attach to correct root graph node
UPSTREAM/BLOCKING → may change frontier only with proof
AUTHORITY/ROOT CHANGE → root reconciliation/backtrack
RECENCY ALONE → NEVER priority
```

## 5. Global Accounting / Coverage / Reconciliation

All categories remain open:

```text
Graph Nodes/Coverage = OPEN
Findings = OPEN
Scope Deltas = OPEN
Decisions = OPEN
Consumers = OPEN
Evidence = OPEN
Cleanup = OPEN
Adversarial negative-space discovery = NOT_RUN
```

Historical findings/decisions/evidence are not lost: each must be classified `STILL_VALID / STALE / SUPERSEDED / CONTRADICTED / ALREADY_FIXED / REQUIRES_REVALIDATION` and attached to the correct root-graph node.

## 6. Final Target Handoff / Closure

FAIL-CLOSED. This legacy package cannot derive/resume/write until explicit user resume and isolation bootstrap establish:

```text
TASK_BRANCH != INTEGRATION_TARGET
TASK_BRANCH_READY = YES
WORKSPACE_ISOLATION_MODE = LOCAL_WORKTREE | REMOTE_TASK_BRANCH
WORKSPACE_ISOLATION_READY = YES
ROOT_RECONCILIATION_REQUIRED = NO
ROOT_RECONCILED_SHA = LATEST_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE = ROOT_GRAPH
FRONTIER_VALID = YES
```

Final handoff/closure additionally requires `INTEGRATION_COMPLETE=YES`, accounting/cleanup/governance/evidence/fresh-head/adversarial gates, and an exact final candidate on Integration Target.
