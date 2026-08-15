# Sequence Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/NNN-<sequence-name>.md`

## Identity

```text
TASK_ID
REPOSITORY
BRANCH
MODE
SEQUENCE_ID
SEQUENCE_NAME
SEQUENCE_ORDER
BASE_SHA
DERIVATION_BASIS
DEPENDS_ON
SEQUENCE_STATUS
```

Allowed `SEQUENCE_STATUS`: `DIAGNOSING / DECISION_REQUIRED / SOLUTION_READY / PREPARED / READY_TO_EXECUTE / EXECUTING / VERIFYING / COMPLETE / BLOCKED`.

## Gate Fields

```text
ROOT_CAUSE_PROVEN: YES|NO
DECISIONS_RESOLVED: YES|NO
REDIAGNOSIS_COMPLETE: YES|NO
IMPACT_MAPPED: YES|NO
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
1. Scope / Context
2. Diagnosis / Findings
3. Root Cause / Blast Radius
4. Decisions / Re-Diagnosis
5. Exact Target State
6. Treatment / Execution
7. Consumers / Contracts / Data / Governance
8. Cleanup
9. Verification / Runtime / Evidence
10. Sequence Exit Gate / Reopen
```

## PREPARE_ONLY terminal sequence

```text
SEQUENCE_STATUS=PREPARED
ROOT_CAUSE_PROVEN=YES
DECISIONS_RESOLVED=YES
REDIAGNOSIS_COMPLETE=YES
IMPACT_MAPPED=YES
VERIFICATION_DEFINED=YES
SOLUTION_READY=YES
IMPLEMENTATION_COMPLETE=NO
```

The file must contain executable handoff detail sufficient for another agent without Product/Architecture guessing.

## EXECUTE_END_TO_END terminal sequence

```text
SEQUENCE_STATUS=COMPLETE
all solution-ready gates=YES
IMPLEMENTATION_COMPLETE=YES
CONSUMERS_RECONCILED=YES
LOCAL_CLEANUP_COMPLETE=YES
VERIFICATION_PASS=YES
GOVERNANCE_SYNC=YES|NOT_APPLICABLE
SCOPE_DELTA_CLASSIFIED=YES
```

No dependent Sequence starts before current is terminal for MODE. Independent parallelism requires explicit graph proof and concurrency authority; default package lifecycle remains serial.
