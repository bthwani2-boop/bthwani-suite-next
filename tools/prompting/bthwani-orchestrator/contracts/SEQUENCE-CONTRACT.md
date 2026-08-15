# Sequence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/NNN-<sequence-name>.md`

## Identity / Graph Fields

```text
TASK_ID
REPOSITORY
BRANCH
MODE
SEQUENCE_ID
SEQUENCE_NAME
SEQUENCE_ORDER
BASE_SHA
RECONCILED_HEAD_SHA
DERIVATION_BASIS
DEPENDS_ON
BLOCKS
UNLOCKS
CONFLICT_DOMAIN
EXECUTION_OWNER
PARALLEL_SAFETY
SUSPENDED_BY
RESUME_AFTER
INVALIDATES
SEQUENCE_STATUS
```

Allowed `SEQUENCE_STATUS`:

```text
DIAGNOSING / DECISION_REQUIRED / SOLUTION_READY / READY_TO_EXECUTE
EXECUTING / VERIFYING / SUSPENDED_BY_DEPENDENCY / REOPENED
BLOCKED_EXTERNAL / PREPARED / COMPLETE
```

`PARALLEL_SAFETY`: `UNPROVEN / SERIAL_REQUIRED / PROVEN_INDEPENDENT`.

## Gate Fields

```text
ROOT_CAUSE_PROVEN: YES|NO
DECISIONS_RESOLVED: YES|NO
DECISION_IMPACT_PROPAGATED: YES|NO
REDIAGNOSIS_COMPLETE: YES|NO
IMPACT_MAPPED: YES|NO
FINDINGS_DISPOSITIONED: YES|NO
DEPENDENCIES_DISPOSITIONED: YES|NO
VERIFICATION_DEFINED: YES|NO
SOLUTION_READY: YES|NO
IMPLEMENTATION_COMPLETE: YES|NO
CONSUMERS_RECONCILED: YES|NO
LOCAL_CLEANUP_COMPLETE: YES|NO
VERIFICATION_PASS: YES|NO
GOVERNANCE_SYNC: YES|NO|NOT_APPLICABLE
SCOPE_DELTA_CLASSIFIED: YES|NO
```

## Required Sections

```text
1. Scope / Context / Graph Position
2. Diagnosis / Findings / Disposition
3. Root Cause / Blast Radius
4. Decisions / Impact Propagation / Re-Diagnosis
5. Exact Target State / Coherent Cutover
6. Treatment / Execution
7. Consumers / Contracts / Data / Governance
8. Cleanup
9. Verification / Runtime / Evidence
10. Sequence Exit / Suspension / Reopen
```

## PREPARE_ONLY terminal

`PREPARED` + all common solution/accounting gates YES + `IMPLEMENTATION_COMPLETE=NO`.

## EXECUTE_END_TO_END terminal

`COMPLETE` + all common gates YES + implementation/consumers/cleanup/verification/governance/scope-delta gates PASS.

A Sequence may be suspended/reopened by graph evidence. Dependent work cannot falsely close around unresolved upstream dependency. Parallel execution requires distinct proven conflict domains and explicit execution ownership; target-branch integration remains serialized.
