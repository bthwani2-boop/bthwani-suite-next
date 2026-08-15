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
BLOCKS: NONE
UNLOCKS: NONE
CONFLICT_DOMAIN: UNCLASSIFIED
EXECUTION_OWNER: UNASSIGNED
PARALLEL_SAFETY: UNPROVEN
SUSPENDED_BY: NONE
RESUME_AFTER: NONE
INVALIDATES: NONE
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

> One file = one coherent machine-selected root-cause execution/verification/closure unit. Lower-layer symptoms cannot create a Sequence while HOLD.

## 1. Scope / Context / Graph Position
- Operational parent(s) and graph position:
- Journey/state/authority/handoff/canonical-truth impact:
- Why this RC is current highest/independent frontier:
- Competing higher roots rejected/resolved:
- Depends on / blocks / unlocks:
- Conflict domain / execution owner / workspace:
- Supported exclusions + proof:

## 2. Diagnosis / Findings / Disposition
Record every material Finding; correlate symptoms. No silent TODO/ignore and no one-Sequence-per-symptom when shared root explains them.

## 3. Root Cause / Blast Radius
- Highest proven causal owner/root:
- Competing hypotheses rejected:
- Writers/readers/consumers:
- Blast radius/dependencies/risk/unlock:
- Operational/cross-surface meaning:

## 4. Decisions / Impact Propagation / Re-Diagnosis
Decision → full impact graph → invalidate affected assumptions/evidence → re-diagnose/re-rank.

## 5. Exact Target State / Coherent Cutover
Define final operational + technical semantic state; no required consumer/parallel truth/migration/legacy path/workaround remains contradictory.

## 6. Treatment / Execution
PREPARE_ONLY: exact treatment/cutover/cleanup/verification. EXECUTE_END_TO_END: actual root treatment after all canonical gates.

## 7. Consumers / Contracts / Data / Governance
| Item | Before | Required/Actual transition | After | Verification / disposition |
|---|---|---|---|---|

## 8. Cleanup
Resolve proven-related dead/stale/duplicate/legacy/workaround/reference/naming/ownership/debug/temp residue.

## 9. Verification / Runtime / Evidence
| Evidence ID | Claim | Check/source | Candidate/runtime provenance | Result | Proof limit | Invalidation/reopen trigger |
|---|---|---|---|---|---|---|

## 10. Sequence Exit / Suspension / Reopen
Before READY_TO_EXECUTE all six operational impact fields + all existing common gates are YES. Suspend/backtrack if a higher root appears; resume only after machine re-ranking. PREPARE terminal=`PREPARED`; EXECUTE terminal=`COMPLETE` plus implementation/consumer/cleanup/verification/governance/scope-delta gates.
