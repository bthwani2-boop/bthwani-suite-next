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

> New invocation package. This package is isolated from other sessions by TASK_BRANCH/workspace. TARGET/ORCHESTRATION_ROOT governs orientation; latest Integration Target HEAD governs truth/integration only. Existing packages never imply automatic resume. The first execution frontier is forbidden until the target-wide gap/root-cause landscape is clustered, ranked, adversarially challenged and justified.

## 1. Truth Baseline

- Resolved orchestration root:
- Integration Target + exact starting SHA:
- Dedicated Task Branch:
- Workspace isolation mode/path:
- Authority/Product/Policy/Product-Truth/Machine-Contract sources actually read:
- Previous packages/evidence reused vs invalidated:
- Concurrent/foreign delta classification:

## 2. Macro Blueprint / Dependency Graph

Start root-down: Macro System/Product → Canonical Owners/Foundations → Domains/Contracts/Data → Journeys/States/Handoffs → Surfaces/Consumers → details.

Movement after orientation may be vertical/horizontal/reverse/cross-layer/cross-surface/jump-to-root.

### Target-Wide Gap & Root-Cause Landscape

Before the first execution frontier, map material gaps/defects/contradictions/structural debt across the authorized TARGET, correlate symptoms into root-cause clusters, and rank the clusters by evidence-backed systemic leverage.

| Cluster ID | Proven/working root cause or foundation gap | Findings/symptoms | Dependency position | Blocking power | Blast radius | Canonical/foundation importance | Risk/severity | Unlock value | Finding density | Priority class | Disposition |
|---|---|---|---|---|---|---|---|---|---|---|---|
<!-- ROOT_CAUSE_LANDSCAPE_ROWS -->

Priority is comparative and evidence-backed, not a naive arithmetic score. Finding density is supporting evidence only. A cluster with fewer symptoms may outrank a noisy cluster when it is more upstream, foundational, blocking, risky, or unlocks more of the graph.

Required before first/later frontier derivation after any material landscape change:

```text
TARGET_LANDSCAPE_COMPLETE=YES
LANDSCAPE_RECONCILED_SHA=LATEST_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
PRIORITY_MODEL_COMPLETE=YES
PRIORITY_DERIVATION_SOURCE=ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS=0
PRIMARY_FRONTIER_JUSTIFIED=YES
LANDSCAPE_ADVERSARIAL_PASS=YES
```

## 3. Sequence Registry / Execution Frontier

| Sequence ID | File | Subject | Root-cause cluster | Priority class | Priority basis | Derivation basis | Depends on | Unlocks | Conflict domain | Execution owner | Status | Reopen trigger |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
<!-- SEQUENCE_REGISTRY_ROWS -->

No Sequence may be created/resumed from recency, finding count alone, easiest-fix bias, or latest changed files. Frontier must be derived/revalidated from `ROOT_GRAPH` after the root-cause landscape/priority gates pass.

## 4. Global Decisions / Blockers

Record cross-sequence decisions, blockers, prior-package observations and concurrent/foreign deltas. Foreign changes are inputs to classification, not automatic work direction.

## 5. Global Accounting / Coverage / Reconciliation

Track Graph Nodes, Findings, Root-Cause Clusters, Scope Deltas, Decisions, Consumers, Evidence, Cleanup, suspended/reopened sequences and invalidation cones. Every material Finding must be clustered or explicitly dispositioned; every material cluster must be ranked before frontier selection.

## 6. Final Target Handoff / Closure

No handoff/closure while root/frontier provenance is stale, target landscape/clustering/priority is incomplete or stale, task/workspace isolation is unproven, integration is incomplete, accounting incomplete, or final evidence/fresh-head/adversarial gates are missing.
