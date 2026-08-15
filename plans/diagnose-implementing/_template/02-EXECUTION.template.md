# __TASK_NAME__ — Execution

Status: DERIVED_SUPPORT
TASK_ID: __TASK_ID__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
PACKAGE_READY_BASE_SHA: UNSET
CURRENT_WORK_BASE_SHA: __CURRENT_SHA__
CURRENT_WAVE_ID: UNSET
CURRENT_WAVE_BASE_SHA: UNSET
CURRENT_WAVE_STATUS: NOT_SELECTED
CURRENT_WAVE_ROOT_CAUSE_PROVEN: NO
CURRENT_WAVE_DECISIONS_RESOLVED: NO
CURRENT_WAVE_REDIAGNOSIS_COMPLETE: NO
CURRENT_WAVE_IMPACT_MAPPED: NO
CURRENT_WAVE_VERIFICATION_DEFINED: NO
CURRENT_WAVE_READY_TO_EXECUTE: NO
CURRENT_WAVE_IMPLEMENTATION_COMPLETE: NO
CURRENT_WAVE_CONSUMERS_RECONCILED: NO
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE: NO
CURRENT_WAVE_VERIFICATION_PASS: NO
CURRENT_WAVE_GOVERNANCE_SYNC: NOT_APPLICABLE
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED: NO
EXECUTION_STATUS: PLANNED
IMPLEMENTATION_COMPLETE: NO

> هذا الملف Living Derived Documentation. في `PREPARE_ONLY` يوثق الحل الجذري القابل للتنفيذ Wave-by-Wave ولا يغيّر النظام. في `EXECUTE_END_TO_END` يوثق الـWave الحالية قبل الكتابة وما نُفذ وتحقق فعليًا بعدها. `PACKAGE_READY_BASE_SHA` يبقى `UNSET` حتى المصالحة العالمية النهائية؛ تنفيذ Wave في EXECUTE mode يعتمد على `CURRENT_WAVE_*` لا على Global Package Ready.

## 1. Execution Plan

Order by hard dependency, canonical owner, blast radius, shared foundation and operational criticality.

| Step/Wave ID | Finding/Decision refs | Root cause | Canonical owner | Exact target state | Depends on | Unlocks | Verification ref | PREPARE/EXECUTE status |
|---|---|---|---|---|---|---|---|---|

في `PREPARE_ONLY` يجب أن تصبح كل Wave حزمة تسليم قابلة للتنفيذ بلا Product/Architecture guessing قبل الانتقال للتالية. في `EXECUTE_END_TO_END` لا تبدأ الكتابة الحية قبل Wave Write Gate ولا تنتقل للتالية قبل Wave Complete Gate.

## 2. Change Impact / Boundaries

| Change/Wave ID | Paths/Symbols/Contracts/Data | Writers/Readers/Consumers | Surfaces/Journeys | Must-not-change | Risk / rollback |
|---|---|---|---|---|---|

## 3. Governance Promotion Plan / Result

| GOV ID | Wave ID | Canonical governance owner | Required machine counterpart | PREPARE status / EXECUTE result | Evidence |
|---|---|---|---|---|---|

No durable product/policy/authority truth may remain only in this package at final closure. In `PREPARE_ONLY`, record exact `GOVERNANCE_PROMOTION_PENDING`; do not mutate governance.

## 4. Root-Cause Implementation Steps

For each Wave/Finding:

```text
Confirm current failure/evidence
→ canonical owner/root cause
→ challenge competing hypothesis
→ resolve true decision(s) if required
→ impact propagation + re-diagnosis
→ exact root fix/refactor/redesign/rebuild
→ migrate all affected writers/readers/consumers
→ synchronize contracts/data/generated artifacts
→ remove obsolete/parallel path
→ local cleanup
→ exact verification/readback strategy
```

In `PREPARE_ONLY`, stop at a fully executable design for that wave and document it. In `EXECUTE_END_TO_END`, execute immediately after the Wave Write Gate, then verify before next wave.

| Task ID | Wave ID | Exact action | Paths/Symbols | Acceptance | Status |
|---|---|---|---|---|---|

## 5. Actual Change Ledger

In `PREPARE_ONLY`, keep this section explicitly `NOT_EXECUTED`.

| Change ID | Wave ID | Candidate/Commit SHA | Exact changed/removed/moved paths | Result | Related Finding | Evidence invalidated |
|---|---|---|---|---|---|---|

## 6. Candidate Lifecycle / Concurrent Movement

| Event | Wave ID | SHA/base/head | Concurrent delta classification | Reconciliation | Evidence impact |
|---|---|---|---|---|---|

Track `START_SHA → CURRENT_WORK_BASE_SHA → CURRENT_WAVE_BASE_SHA → IMPLEMENTATION_SHA(s) → FINAL_CANDIDATE_SHA`. Never claim foreign/pre-existing changes as this task’s work. No force-push or stale-candidate push.

## 7. Consumer / Contract / Data Migration

| Wave ID | Owner/Consumer | Before | Migration/transition | After | Compatibility/removal trigger | Verification |
|---|---|---|---|---|---|---|

In `PREPARE_ONLY`, specify the exact migration/disposition required. In `EXECUTE_END_TO_END`, every affected consumer must be migrated or proven `NOT_AFFECTED_WITH_PROOF` before the wave can be `COMPLETE`.

## 8. Local Cleanup

Cleanup is part of each root solution.

| Wave ID | Cleanup ID | Dead/stale/duplicate/obsolete residue | Trace/consumer proof | PREPARE action / EXECUTE result | Reference repair | Verification |
|---|---|---|---|---|---|---|

## 9. Blockers / Deviations / Remaining Execution State

| Wave/Item | Type | Evidence | Required action/decision | Resume point |
|---|---|---|---|---|

### Current Wave Write Gate — EXECUTE_END_TO_END

Before live mutation set all of the following truthfully:

```text
CURRENT_WAVE_ID != UNSET
CURRENT_WAVE_BASE_SHA = exact reconciled 40-SHA
CURRENT_WAVE_STATUS = READY_TO_EXECUTE
CURRENT_WAVE_ROOT_CAUSE_PROVEN = YES
CURRENT_WAVE_DECISIONS_RESOLVED = YES
CURRENT_WAVE_REDIAGNOSIS_COMPLETE = YES
CURRENT_WAVE_IMPACT_MAPPED = YES
CURRENT_WAVE_VERIFICATION_DEFINED = YES
CURRENT_WAVE_READY_TO_EXECUTE = YES
```

Global `PACKAGE_READY` may still be `NO` while later waves remain undiscovered/unresolved.

### Current Wave Complete Gate — EXECUTE_END_TO_END

Before selecting the next dependent Wave:

```text
CURRENT_WAVE_STATUS = COMPLETE
CURRENT_WAVE_IMPLEMENTATION_COMPLETE = YES
CURRENT_WAVE_CONSUMERS_RECONCILED = YES
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE = YES
CURRENT_WAVE_VERIFICATION_PASS = YES
CURRENT_WAVE_GOVERNANCE_SYNC = YES | NOT_APPLICABLE
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED = YES
```

Then select the next Wave and reset/update `CURRENT_WAVE_*` for that wave.

Set global `IMPLEMENTATION_COMPLETE: YES` only after every in-scope executable Wave is complete, every consumer is migrated/dispositioned, durable governance promotion required by execution is complete or explicitly blocking, all local residue is cleaned, global diagnosis/decision/coverage is reconciled, and final verification has a concrete acquisition path.
