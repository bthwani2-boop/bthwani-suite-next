# __SEQUENCE_ID__ — __SEQUENCE_TITLE__

Status: DERIVED_SUPPORT
TASK_ID: __TASK_ID__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
TASK_BRANCH: __TASK_BRANCH__
MODE: __MODE__
SEQUENCE_ID: __SEQUENCE_ID__
SEQUENCE_NAME: __SEQUENCE_NAME__
SEQUENCE_ORDER: __SEQUENCE_ORDER__
BASE_SHA: __BASE_SHA__
RECONCILED_HEAD_SHA: __BASE_SHA__
ROOT_CAUSE_CLUSTER_ID: __ROOT_CAUSE_CLUSTER_ID__
PRIORITY_CLASS: __PRIORITY_CLASS__
PRIORITY_BASIS: __PRIORITY_BASIS__
DERIVATION_BASIS: __DERIVATION_BASIS__
DEPENDS_ON: __DEPENDS_ON__
CONFLICT_DOMAIN: UNCLASSIFIED
EXECUTION_OWNER: UNASSIGNED
PARALLEL_SAFETY: UNPROVEN
SEQUENCE_STATUS: DIAGNOSING
OPERATIONAL_GRAPH_POSITION_PROVEN: NO
JOURNEY_IMPACT_MAPPED: NO
STATE_IMPACT_MAPPED: NO
AUTHORITY_IMPACT_MAPPED: NO
HANDOFF_IMPACT_MAPPED: NO
CANONICAL_TRUTH_IMPACT_MAPPED: NO
ROOT_CAUSE_PROVEN: NO
DECISIONS_RESOLVED: NO
DECISION_IMPACT_PROPAGATED: NO
REDIAGNOSIS_COMPLETE: NO
IMPACT_MAPPED: NO
FINDINGS_DISPOSITIONED: NO
DEPENDENCIES_DISPOSITIONED: NO
VERIFICATION_DEFINED: NO
SOLUTION_READY: NO
IMPLEMENTATION_COMPLETE: NO
CONSUMERS_RECONCILED: NO
LOCAL_CLEANUP_COMPLETE: NO
VERIFICATION_PASS: NO
GOVERNANCE_SYNC: NOT_APPLICABLE
SCOPE_DELTA_CLASSIFIED: NO

## 1. Scope / Context / Graph Position
- Operational parent(s):
- Why this RC is current frontier:
- Upstream alternatives rejected/blocked:
- Conflict domain / owner:

## 2. Diagnosis / Findings / Disposition
No leaf finding is executed without operational/root placement.

## 3. Root Cause / Blast Radius
- Highest proven causal owner:
- Journeys/states/authorities/handoffs/truth owners affected:
- Dependencies/consumers/risk:

## 4. Decisions / Impact Propagation / Re-Diagnosis
Decision → impact cone → invalidate → re-diagnose/re-rank.

## 5. Exact Target State / Coherent Cutover
Define final operational + technical truth.

## 6. Treatment / Execution
Root treatment first; required lower-layer changes are consequences of cutover.

## 7. Consumers / Contracts / Data / Governance
Reconcile every affected writer/reader/consumer.

## 8. Cleanup
Remove related stale/duplicate/legacy/workaround residue with proof.

## 9. Verification / Runtime / Evidence
Verify operational claim through canonical readback and required runtime/edge scopes.

## 10. Sequence Exit / Suspension / Reopen
Suspend when higher root appears; rerank before resume.
