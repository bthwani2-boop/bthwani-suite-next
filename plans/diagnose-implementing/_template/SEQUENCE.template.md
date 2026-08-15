# __SEQUENCE_ID__ — __SEQUENCE_TITLE__

Status: DERIVED_SUPPORT
TASK_ID: __TASK_ID__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
SEQUENCE_ID: __SEQUENCE_ID__
SEQUENCE_NAME: __SEQUENCE_NAME__
SEQUENCE_ORDER: __SEQUENCE_ORDER__
BASE_SHA: __BASE_SHA__
RECONCILED_HEAD_SHA: __BASE_SHA__
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

> One file = one coherent root-cause/execution/verification/closure unit. The graph may suspend/reopen/jump across sequences; never hide that movement in prose only.

## 1. Scope / Context / Graph Position

- Why this Sequence exists / proven boundary:
- Depends on / blocks / unlocks:
- Conflict Domain:
- Execution owner / worker mission / input SHA:
- Parallel safety proof or SERIAL_REQUIRED reason:
- In-scope journeys/surfaces/contracts/data/runtime:
- Supported exclusions + proof:

## 2. Diagnosis / Findings / Disposition

Record every material Finding ID and classify: SAME_ROOT_CAUSE / UPSTREAM_BLOCKER / INDEPENDENT_IN_SCOPE / SUPPORTED_EXCLUSION. No silent TODO/ignore.

## 3. Root Cause / Blast Radius

- Root cause / first causal failure:
- Competing hypotheses rejected:
- Canonical owner/source of truth:
- Writers/readers/consumers:
- States/transitions/handoffs:
- Security/data/finance/operational risks:

## 4. Decisions / Impact Propagation / Re-Diagnosis

After each true decision:

```text
decision → full proven impact graph → invalidate affected assumptions/evidence → re-diagnose
```

Record affected writers/readers/consumers/contracts/states/data/surfaces/governance/runtime.

## 5. Exact Target State / Coherent Cutover

Define final semantic/architectural state. No closure while a required consumer, parallel truth, migration, legacy path, workaround or contradictory state remains necessary for cutover correctness.

## 6. Treatment / Execution

### PREPARE_ONLY
Exact actionable root treatment/cutover/cleanup/verification; no fabricated execution.

### EXECUTE_END_TO_END
Record planned action and actual changes/candidates as they occur on latest reconciled head.

## 7. Consumers / Contracts / Data / Governance

| Item | Before | Required/Actual transition | After | Verification / disposition |
|---|---|---|---|---|

Every proven consumer = migrated/reconciled or not-affected-with-proof.

## 8. Cleanup

Resolve dead/stale/duplicate/legacy/compatibility/workaround/reference/naming/ownership/debug/temp residue related to this closure unit.

## 9. Verification / Runtime / Evidence

| Evidence ID | Claim | Check/source | Candidate/runtime provenance | Result | Proof limit | Invalidation/reopen trigger |
|---|---|---|---|---|---|---|

Static/build/mock green is not runtime proof.

## 10. Sequence Exit / Suspension / Reopen

Common gates:

```text
ROOT_CAUSE_PROVEN
DECISIONS_RESOLVED
DECISION_IMPACT_PROPAGATED
REDIAGNOSIS_COMPLETE
IMPACT_MAPPED
FINDINGS_DISPOSITIONED
DEPENDENCIES_DISPOSITIONED
VERIFICATION_DEFINED
SOLUTION_READY
```

Suspension: set `SEQUENCE_STATUS=SUSPENDED_BY_DEPENDENCY`, record `SUSPENDED_BY` + `RESUME_AFTER`, open upstream dependency JIT, then re-diagnose before resume.

Reopen: set `SEQUENCE_STATUS=REOPENED`, record new evidence/change and `INVALIDATES`, then rerun invalidated gates.

PREPARE terminal: `PREPARED`, no live implementation claim.
EXECUTE terminal: `COMPLETE` + implementation/consumers/cleanup/verification/governance/scope-delta gates.
