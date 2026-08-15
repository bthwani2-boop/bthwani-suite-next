# __TASK_NAME__ — Overview

Status: DERIVED_SUPPORT
PACKAGE_SCHEMA: BTHWANI_TASK_PACKAGE_V2
TASK_ID: __TASK_ID__
TASK_NAME: __TASK_NAME__
PACKAGE_ORIGIN: NEW_INVOCATION
RESUME_POLICY: EXPLICIT_USER_REQUEST_ONLY
TASK_CONTEXT_POLICY: ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY: INPUT_NOT_INSTRUCTION
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
INTEGRATION_TARGET: __BRANCH__
TASK_BRANCH: __TASK_BRANCH__
TASK_BRANCH_BASE_SHA: __CURRENT_SHA__
TASK_BRANCH_READY: YES
WORKSPACE_ISOLATION_POLICY: LOCAL_WORKTREE_OR_REMOTE_TASK_BRANCH
WORKSPACE_ISOLATION_MODE: __WORKSPACE_ISOLATION_MODE__
WORKTREE_PATH: __WORKTREE_PATH__
WORKSPACE_ISOLATION_READY: YES
DIRECT_INTEGRATION_TARGET_WRITES: FORBIDDEN_EXCEPT_INTEGRATION_OWNER
INTEGRATION_COMPLETE: NO
MODE: __MODE__
TARGET: __TARGET__
ORCHESTRATION_ROOT: __ORCHESTRATION_ROOT__
MINIMUM_DIAGNOSTIC_ALTITUDE: UNSET
MACHINE_REGISTRY_PATH: UNSET
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
OPERATIONAL_ROOT_REQUIRED: YES
OPERATIONAL_ROOT_COMPLETE: NO
OPERATIONAL_ROOT_RECONCILED_SHA: UNSET
OPERATIONAL_NEGATIVE_SPACE_PASS: NO
OPERATIONAL_ADVERSARIAL_PASS: NO
LOWER_LAYER_HOLD_COUNT: UNSET
TARGET_LANDSCAPE_COMPLETE: NO
LANDSCAPE_RECONCILED_SHA: UNSET
ROOT_CAUSE_CLUSTERING_COMPLETE: NO
ROOT_CAUSE_CLUSTERS_ACCOUNTED: NO
UNCLUSTERED_MATERIAL_FINDINGS: UNSET
PRIORITY_MODEL_COMPLETE: NO
PRIORITY_DERIVATION_SOURCE: UNSET
UNRANKED_MATERIAL_CLUSTERS: UNSET
PRIMARY_FRONTIER_JUSTIFIED: NO
LANDSCAPE_ADVERSARIAL_PASS: NO
PRIORITY_POLICY: HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
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

> New invocation package. Operational meaning governs initial diagnosis. Technical findings discovered before operational/root placement are evidence held outside this flat package in the machine registry and cannot govern execution.

## 1. Truth Baseline

- Operational/Product/Governance truth sources actually read:
- Resolved ORCHESTRATION_ROOT / diagnostic altitude:
- Integration Target + exact starting SHA:
- Dedicated Task Branch / workspace:
- Previous evidence reused vs invalidated:
- Concurrent/foreign delta classification:

## 2. Macro Blueprint / Dependency Graph

Start: Product Outcomes → Actors/Authority/Responsibility → Journeys → States/Transitions/Invariants → Handoffs → Canonical Owners → Writers/Readers/Consumers → Data/Contract/API/Persistence/Event/Readback → Surfaces/Services/Runtime.

Machine operational coverage lives under `MACHINE_REGISTRY_PATH`; this Overview summarizes it but does not manufacture PASS.

### Target-Wide Gap & Root-Cause Landscape

Only after Operational Root PASS: findings → RC-NNN correlation → competitive deepening → comparative systemic ranking → adversarial priority challenge.

| Cluster ID | Proven/working root cause | Findings/symptoms | Operational parents | Dependency position | Blocking power | Blast radius | Foundation importance | Risk | Unlock value | Priority class | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|
<!-- ROOT_CAUSE_LANDSCAPE_ROWS -->

## 3. Sequence Registry / Execution Frontier

| Sequence ID | File | Subject | Root-cause cluster | Priority class | Priority basis | Derivation basis | Depends on | Unlocks | Conflict domain | Execution owner | Status | Reopen trigger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
<!-- SEQUENCE_REGISTRY_ROWS -->

No Sequence from recency/finding count/easiest fix/latest file. Public `new-sequence.mjs` requires canonical Operational Root + Priority + Frontier Derivation gates.

## 4. Global Decisions / Blockers

Record true non-derivable decisions, diagnostic blockers, concurrent delta and affected invalidation cones.

## 5. Global Accounting / Coverage / Reconciliation

Track Operational Nodes, Lower-Layer Observations, Findings, RCs, Scope Deltas, Decisions, Consumers, Evidence, Cleanup, suspended/reopened sequences and invalidation cones. Machine registry is authoritative for operational/RC proof.

## 6. Final Target Handoff / Closure

No handoff/closure while operational/root/frontier provenance is stale, machine accounting incomplete, task isolation/integration incomplete, accounting/cleanup/evidence/governance/fresh-head/adversarial gates missing, or material HOLD/unresolved RC remains.
