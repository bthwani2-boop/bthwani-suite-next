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
LIFECYCLE_STATE
CURRENT_SEQUENCE_ID
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
3. Sequence Registry
4. Global Decisions / Blockers
5. Global Coverage / Reconciliation
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
STATUS
REOPEN_TRIGGER
```

Rules:

```text
one row ↔ one sequence file
contiguous 001..NNN ordering
at most one active non-terminal sequence
CURRENT_SEQUENCE_ID references that active sequence or UNSET
no future placeholder sequences
no duplicated sequence detail in overview
```

`PACKAGE_READY` is final handoff readiness in PREPARE and global pre-closure readiness in EXECUTE.
