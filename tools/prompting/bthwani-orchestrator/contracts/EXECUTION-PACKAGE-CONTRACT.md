# Execution Package Contract

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Applies to: `plans/diagnose-implementing/<TASK_NAME>/02-EXECUTION.md`

## Required Header

```text
TASK_ID
REPOSITORY
BRANCH
MODE
PACKAGE_READY_BASE_SHA
CURRENT_WORK_BASE_SHA
EXECUTION_STATUS
IMPLEMENTATION_COMPLETE
```

`PACKAGE_READY_BASE_SHA` هو HEAD الذي اجتازت عليه الحزمة readiness، و`CURRENT_WORK_BASE_SHA` يتحرك فقط بعد reconciliation مثبت.

## Required Sections

```text
1. Execution Plan
2. Change Impact / Boundaries
3. Governance Promotion Plan / Result
4. Root-Cause Implementation Steps
5. Actual Change Ledger
6. Candidate Lifecycle / Concurrent Movement
7. Consumer / Contract / Data Migration
8. Local Cleanup
9. Blockers / Deviations / Remaining Execution State
```

## Execution Item

```text
EXECUTION_ID
RELATED_FINDING_IDS
ROOT_CAUSE
CANONICAL_OWNER
TARGET_STATE
PATHS/SYMBOLS
AFFECTED_CONTRACTS/DATA
WRITERS/READERS/CONSUMERS
ORDER / DEPENDS_ON
ROOT_FIX
MIGRATION / COMPATIBILITY when applicable
CLEANUP_REQUIRED
VERIFICATION_IDS
STATUS
ACTUAL_CHANGE
IMPLEMENTATION_SHA
```

In `PREPARE_ONLY`, actual changes/implementation SHA must not be fabricated.

## Completion Gate

```text
ZERO known implementation write still required in scope
ZERO affected consumer without migration/disposition
ZERO required durable governance promotion silently pending in EXECUTE mode
ZERO local cleanup residue known to require write
LATEST_HEAD_RECONCILED
```
