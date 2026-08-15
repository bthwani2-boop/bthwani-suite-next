# Overview Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/00-OVERVIEW.md`

## Required Header

```text
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V2
TASK_ID
TASK_NAME
REPOSITORY
BRANCH
MODE
TARGET
OBJECTIVE
ORCHESTRATOR_PATH
CREATED_AT
LAST_RECONCILED_AT
START_SHA
CURRENT_SHA
LATEST_RECONCILED_SHA
LIFECYCLE_STATE
ACTIVE_EXECUTION_FRONTIER
SUSPENSION_STACKS
INTEGRATION_OWNER
FINDINGS_ACCOUNTED
SCOPE_DELTAS_ACCOUNTED
DECISIONS_ACCOUNTED
CONSUMERS_ACCOUNTED
EVIDENCE_ACCOUNTED
CLEANUP_ACCOUNTED
ACCOUNTING_COMPLETE
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
PACKAGE_READY
IMPLEMENTATION_COMPLETE
EVIDENCE_COMPLETE
CLEANUP_COMPLETE
GOVERNANCE_SYNC_COMPLETE
FRESH_HEAD_VALID
FINAL_ADVERSARIAL_PASS
FINAL_CANDIDATE_SHA
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
```

`FINAL_DECISION` remains absent until a canonical final decision is actually issued.

## Required Sections

```text
1. Truth Baseline
2. Macro Blueprint / Dependency Graph
3. Sequence Registry / Execution Frontier
4. Global Decisions / Blockers
5. Global Accounting / Coverage / Reconciliation
6. Final Target Handoff / Closure
```

## Sequence Registry Record

```text
SEQUENCE_ID
FILE
SUBJECT
DERIVATION_BASIS
DEPENDS_ON
UNLOCKS
CONFLICT_DOMAIN
EXECUTION_OWNER
STATUS
REOPEN_TRIGGER
```

Rules:

```text
one row ↔ one sequence file
contiguous IDs describe creation history, not forced execution chain
no placeholder future sequences
multiple non-terminal rows allowed only when graph-justified
ACTIVE_EXECUTION_FRONTIER references zero or more graph-proven independent live fronts
no duplicate live conflict domain
SUSPENDED_BY_DEPENDENCY / REOPENED are first-class
INTEGRATION_OWNER is single target-branch integration authority at a time
```

Before final handoff/closure all accounting fields and `ACCOUNTING_COMPLETE` must be YES.
