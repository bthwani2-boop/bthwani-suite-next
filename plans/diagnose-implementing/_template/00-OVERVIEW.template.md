# __TASK_NAME__ — Overview

Status: DERIVED_SUPPORT
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V2
TASK_ID: __TASK_ID__
TASK_NAME: __TASK_NAME__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
TARGET: __TARGET__
ORCHESTRATION_ROOT: __ORCHESTRATION_ROOT__
NAVIGATION_POLICY: ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE: TRUTH_INTEGRATION_BASELINE_ONLY
OBJECTIVE: __TASK_OBJECTIVE__
ORCHESTRATOR_PATH: __ORCHESTRATOR_PATH__
CREATED_AT: __CREATED_AT_ISO__
LAST_RECONCILED_AT: __LAST_RECONCILED_AT_ISO__
START_SHA: __START_SHA__
CURRENT_SHA: __CURRENT_SHA__
LATEST_RECONCILED_SHA: __CURRENT_SHA__
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

> Living Derived Support. TARGET/ORCHESTRATION_ROOT governs orientation; latest HEAD governs truth/integration only. Persisted frontier is never automatic resume authority.

## 1. Truth / Root Baseline

- Resolved orchestration root:
- Authority/Product/Policy/Product-Truth/Machine-Contract sources actually read:
- Latest reconciled SHA:
- Previous evidence reused vs invalidated:
- Concurrent/foreign delta classification:

## 2. Macro Blueprint / Dependency Graph

Start root-down: Macro System/Product → Canonical Owners/Foundations → Domains/Contracts/Data → Journeys/States/Handoffs → Surfaces/Consumers → details.

Movement after orientation may be vertical/horizontal/reverse/cross-layer/cross-surface/jump-to-root.

## 3. Sequence Registry / Execution Frontier

| Sequence ID | File | Subject | Derivation basis | Depends on | Unlocks | Conflict domain | Execution owner | Status | Reopen trigger |
|---|---|---|---|---|---|---|---|---|---|
<!-- SEQUENCE_REGISTRY_ROWS -->

No Sequence may be created/resumed from recency. Frontier must be derived/revalidated from `ROOT_GRAPH`.

## 4. Global Decisions / Blockers / Foreign Deltas

Record cross-sequence decisions, blockers, and concurrent observations. Foreign changes are inputs to classification, not automatic work direction.

## 5. Global Accounting / Coverage / Reconciliation

Track Graph Nodes, Findings, Scope Deltas, Decisions, Consumers, Evidence, Cleanup, suspended/reopened sequences and invalidation cones.

## 6. Final Target Handoff / Closure

No handoff/closure while root/frontier provenance is stale, accounting incomplete, or final evidence/fresh-head/adversarial gates are missing.
