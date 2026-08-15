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
LATEST_RECONCILED_SHA: __CURRENT_SHA__
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

> Living Derived Support only. The graph governs movement; sequence numbers record closure-unit identity, not a forced linear path. Details belong in `NNN-<sequence>.md`.

## 1. Truth Baseline

- Authority/Product/Policy/Product-Truth/Machine-Contract sources actually read:
- Pinned/current/latest reconciled SHA evidence:
- Runtime/repository-platform evidence limits:
- Known source contradictions:

## 2. Macro Blueprint / Dependency Graph

### Domains / Actors / Responsibilities
Pending discovery.

### Major Journeys / States / Owners / Handoffs
Pending discovery.

### Multi-Directional Dependency / Impact Graph
Pending discovery. Track vertical/horizontal/reverse/cross-layer edges and proven invalidation cones.

## 3. Sequence Registry / Execution Frontier

| Sequence ID | File | Subject | Derivation basis | Depends on | Unlocks | Conflict domain | Execution owner | Status | Reopen trigger |
|---|---|---|---|---|---|---|---|---|---|
<!-- SEQUENCE_REGISTRY_ROWS -->

`ACTIVE_EXECUTION_FRONTIER` may contain multiple comma-separated Sequence IDs only when graph-proven independent. No two live fronts may share the same Conflict Domain. Suspended/reopened nodes remain in the registry and are not forgotten.

## 4. Global Decisions / Blockers

### Global Decisions
Only decisions that truly cross multiple Sequences; all decisions must propagate through the proven impact graph.

### Global Blockers
Record protected/external blockers without freezing unrelated independent frontiers.

## 5. Global Accounting / Coverage / Reconciliation

Track by IDs/references, not duplicated prose:

```text
Graph Nodes / Coverage
Findings
Scope Deltas
Decisions
Consumers
Evidence
Cleanup Findings
Suspended/Reopened Sequences
Invalidated Evidence Cones
```

Before handoff/closure all accounting categories must be dispositioned and adversarial negative-space discovery must challenge completeness.

## 6. Final Target Handoff / Closure

`SEQUENCE_PREPARED/COMPLETE` does not imply TARGET closure.

PREPARE_ONLY: all material sequences PREPARED + accounting/global gates PASS.

EXECUTE_END_TO_END: all material sequences COMPLETE + accounting + implementation/evidence/cleanup/governance/fresh-head/adversarial gates + canonical final decision on the exact final candidate.
