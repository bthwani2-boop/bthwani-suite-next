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
CURRENT_WAVE_ID
CURRENT_WAVE_BASE_SHA
CURRENT_WAVE_STATUS
CURRENT_WAVE_ROOT_CAUSE_PROVEN
CURRENT_WAVE_DECISIONS_RESOLVED
CURRENT_WAVE_REDIAGNOSIS_COMPLETE
CURRENT_WAVE_IMPACT_MAPPED
CURRENT_WAVE_VERIFICATION_DEFINED
CURRENT_WAVE_READY_TO_EXECUTE
CURRENT_WAVE_IMPLEMENTATION_COMPLETE
CURRENT_WAVE_CONSUMERS_RECONCILED
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE
CURRENT_WAVE_VERIFICATION_PASS
CURRENT_WAVE_GOVERNANCE_SYNC
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED
EXECUTION_STATUS
IMPLEMENTATION_COMPLETE
```

Semantics:

```text
PACKAGE_READY_BASE_SHA
= UNSET until global PACKAGE_READY is actually proven.

CURRENT_WORK_BASE_SHA
= latest safe reconciled work base.

CURRENT_WAVE_BASE_SHA
= exact head/base against which the current wave was diagnosed/reconciled before live execution; UNSET when no wave is selected.
```

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
WAVE_ID
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

In `PREPARE_ONLY`, actual changes/implementation SHA must not be fabricated. كل Wave يجب أن تحتوي handoff قابلًا للتنفيذ بلا Product/Architecture guessing قبل الانتقال للـWave التالية.

## Current Wave Write Gate — EXECUTE_END_TO_END

Before live write:

```text
CURRENT_WAVE_ID != UNSET
CURRENT_WAVE_BASE_SHA = valid exact SHA
CURRENT_WAVE_STATUS = READY_TO_EXECUTE
CURRENT_WAVE_ROOT_CAUSE_PROVEN = YES
CURRENT_WAVE_DECISIONS_RESOLVED = YES
CURRENT_WAVE_REDIAGNOSIS_COMPLETE = YES
CURRENT_WAVE_IMPACT_MAPPED = YES
CURRENT_WAVE_VERIFICATION_DEFINED = YES
CURRENT_WAVE_READY_TO_EXECUTE = YES
```

Global `PACKAGE_READY` is **not** required for this per-wave write gate.

## Current Wave Completion Gate — EXECUTE_END_TO_END

Before selecting the next dependent wave:

```text
CURRENT_WAVE_STATUS = COMPLETE
CURRENT_WAVE_IMPLEMENTATION_COMPLETE = YES
CURRENT_WAVE_CONSUMERS_RECONCILED = YES
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE = YES
CURRENT_WAVE_VERIFICATION_PASS = YES
CURRENT_WAVE_GOVERNANCE_SYNC = YES | NOT_APPLICABLE
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED = YES
```

## Global Completion Gate

### PREPARE_ONLY

```text
all material waves WAVE_PREPARED
all global diagnosis/decision/coverage gates complete
PACKAGE_READY_BASE_SHA = exact reconciled SHA
PACKAGE_READY = YES
no live implementation claimed
```

### EXECUTE_END_TO_END

```text
ZERO material wave not COMPLETE
ZERO known implementation write still required in scope
ZERO affected consumer without migration/disposition
ZERO required durable governance promotion silently pending
ZERO local cleanup residue known to require write
all global diagnosis/decision/coverage gates complete
PACKAGE_READY_BASE_SHA = exact reconciled SHA
LATEST_HEAD_RECONCILED
```
