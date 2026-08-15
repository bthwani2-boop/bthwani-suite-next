# Closure Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: sequence exit gates and final target state in `00-OVERVIEW.md`.

## Sequence vs Target

```text
SEQUENCE_PREPARED / SEQUENCE_COMPLETE
≠
PACKAGE_READY / TARGET_CLOSED
```

A local sequence or task-branch result may be terminal while the overall TARGET remains OPEN. Sequence numbers do not imply a linear traversal.

## Isolation / Integration Preconditions

For any final handoff/closure:

```text
TASK_CONTEXT_POLICY=ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY=INPUT_NOT_INSTRUCTION
TASK_BRANCH != INTEGRATION_TARGET
TASK_BRANCH_READY=YES
WORKSPACE_ISOLATION_READY=YES
DIRECT_INTEGRATION_TARGET_WRITES=FORBIDDEN_EXCEPT_INTEGRATION_OWNER
INTEGRATION_OWNER != UNASSIGNED
INTEGRATION_COMPLETE=YES
```

`INTEGRATION_COMPLETE=YES` means the task/package result was reconciled against the latest Integration Target and integrated through the serialized Integration Owner. Task-branch green alone is not sufficient.

## Root-Cause Landscape / Priority Preconditions

Before final handoff/closure the target-wide landscape must still be reconciled and fully accounted:

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
PRIORITY_POLICY=HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
```

No closure if a known material Finding is unclustered, a material root-cause cluster is unranked, or a newer causal/dependency/authority fact invalidates the priority model.

## PREPARE_ONLY

Each material Sequence terminal state = `PREPARED`.

Final handoff requires:

```text
ACTIVE_EXECUTION_FRONTIER=NONE
all material sequence files PREPARED
FINDINGS_ACCOUNTED=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
UNRANKED_MATERIAL_CLUSTERS=0
SCOPE_DELTAS_ACCOUNTED=YES
DECISIONS_ACCOUNTED=YES
CONSUMERS_ACCOUNTED=YES
EVIDENCE_ACCOUNTED=YES
CLEANUP_ACCOUNTED=YES
ACCOUNTING_COMPLETE=YES
DISCOVERY_COMPLETE=YES
DIAGNOSIS_COMPLETE=YES
DECISION_COMPLETE=YES
COVERAGE_COMPLETE=YES
PACKAGE_READY=YES
INTEGRATION_COMPLETE=YES
LIFECYCLE_STATE=PREPARED
```

No final product decision is issued.

## EXECUTE_END_TO_END

Each material Sequence terminal state = `COMPLETE`; any `SUSPENDED_BY_DEPENDENCY`, `REOPENED`, or `BLOCKED_EXTERNAL` node must be resolved/dispositioned before target closure.

Final closure requires:

```text
ACTIVE_EXECUTION_FRONTIER=NONE
all material sequence files COMPLETE
FINDINGS_ACCOUNTED=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
UNRANKED_MATERIAL_CLUSTERS=0
SCOPE_DELTAS_ACCOUNTED=YES
DECISIONS_ACCOUNTED=YES
CONSUMERS_ACCOUNTED=YES
EVIDENCE_ACCOUNTED=YES
CLEANUP_ACCOUNTED=YES
ACCOUNTING_COMPLETE=YES
DISCOVERY_COMPLETE=YES
DIAGNOSIS_COMPLETE=YES
DECISION_COMPLETE=YES
COVERAGE_COMPLETE=YES
PACKAGE_READY=YES
IMPLEMENTATION_COMPLETE=YES
CLEANUP_COMPLETE=YES
EVIDENCE_COMPLETE=YES
GOVERNANCE_SYNC_COMPLETE=YES
INTEGRATION_COMPLETE=YES
FRESH_HEAD_VALID=YES
FINAL_ADVERSARIAL_PASS=YES
LIFECYCLE_STATE=CLOSED
```

And:

```text
FINAL_CANDIDATE_SHA
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA
FINAL_CANDIDATE_SHA belongs to Integration Target after task integration
FINAL_DECISION == current governance closureRules.closedDecision
```

No closure with a known fixable defect, undispositioned Finding/Root-Cause Cluster/Scope Delta/Decision/Consumer/Cleanup item, stale required evidence, duplicate truth, reachable obsolete path, unverified root fix, unintegrated task delta, stale priority landscape, or durable truth left only in derived task artifacts.

Any material new finding, related target drift, upstream dependency change, authority change, cluster split/merge, priority inversion, or invalidated evidence reopens the affected Sequence/global lifecycle and requires affected landscape re-ranking before continuation.
