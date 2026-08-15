# __TASK_NAME__ — Overview

Status: DERIVED_SUPPORT
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V2
TASK_ID: __TASK_ID__
TASK_NAME: __TASK_NAME__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
TARGET: __TARGET__
OBJECTIVE: __TASK_OBJECTIVE__
ORCHESTRATOR_PATH: __ORCHESTRATOR_PATH__
CREATED_AT: __CREATED_AT_ISO__
LAST_RECONCILED_AT: __LAST_RECONCILED_AT_ISO__
START_SHA: __START_SHA__
CURRENT_SHA: __CURRENT_SHA__
LIFECYCLE_STATE: OPEN
CURRENT_SEQUENCE_ID: UNSET
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

> Living Derived Support only. This is the global map/index, not Product/Implementation/Runtime truth. Sequence details belong in `NNN-<sequence>.md`.

## 1. Truth Baseline

- Authority/Product/Policy/Product-Truth/Machine-Contract sources actually read:
- Pinned/current remote SHA evidence:
- Runtime/repository-platform evidence limits:
- Known source contradictions:

## 2. Macro Blueprint / Dependency Graph

### Domains / Actors / Responsibilities
Pending discovery.

### Major Journeys / States / Owners / Handoffs
Pending discovery.

### Dependency / Execution Graph
Pending discovery. Do not pre-create future Sequence files.

## 3. Sequence Registry

| Sequence ID | File | Subject | Derivation basis | Depends on | Unlocks | Status | Reopen trigger |
|---|---|---|---|---|---|---|---|
<!-- SEQUENCE_REGISTRY_ROWS -->

Rules: one row ↔ one file; no placeholder future sequences; `CURRENT_SEQUENCE_ID` points to at most one active sequence.

## 4. Global Decisions / Blockers

### Global Decisions
Only decisions whose scope truly crosses multiple Sequences belong here; otherwise reference the owning Sequence.

### Global Blockers
Record external/protected blockers that affect sequencing or final handoff/closure.

## 5. Global Coverage / Reconciliation

Track Universe/Coverage/Scope Delta at global level by references, not duplicated local details.

Required before final handoff/closure:

```text
cross-sequence reconciliation
cross-journey / cross-surface / cross-state reconciliation
canonical owner / duplicate truth reconciliation
latest-head reconciliation
adversarial completeness
```

## 6. Final Target Handoff / Closure

`SEQUENCE_PREPARED/COMPLETE` does not imply TARGET closure.

PREPARE_ONLY final state: `LIFECYCLE_STATE=PREPARED`, `PACKAGE_READY=YES`, all Sequence files PREPARED, no live implementation claim.

EXECUTE_END_TO_END final state additionally requires implementation/evidence/cleanup/governance/fresh-head/adversarial gates and canonical governed final decision on the exact candidate.
