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
STATUS
```

## Required Sections

```text
1. Execution Objective
2. Ordered Root-Cause Work
3. Dependency / Foundation Order
4. Canonical Owners
5. Files / Symbols / Contracts / Data Affected
6. Writers / Readers / Consumers Migration
7. Must-Not-Change Boundaries
8. Governance Promotions Required/Completed
9. Execution Ledger
10. Candidate Lifecycle
11. Local Cleanup / Structural Changes
12. Concurrent Movement / Reconciliation
13. Blockers / Deviations / Resume Point
14. Implementation Completion Gate
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

## Status Semantics

```text
PLANNED
IN_PROGRESS
FIXED_PENDING_VERIFY
PROVEN_COMPLETE
BLOCKED
NOT_APPLICABLE_WITH_PROOF
```

In `PREPARE_ONLY`, execution items remain plans; no `ACTUAL_CHANGE` or implementation SHA may be fabricated.

## Completion Gate

```text
ZERO known implementation write still required in scope
ZERO affected consumer without migration/disposition
ZERO required durable governance promotion silently pending in EXECUTE mode
ZERO local cleanup residue known to require write
LATEST_HEAD_RECONCILED = PASS
```

Failing any item means implementation remains OPEN.