# __TASK_NAME__ — Execution

Status: DERIVED_SUPPORT
TASK_ID: __TASK_ID__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
PACKAGE_READY_BASE_SHA: __CURRENT_SHA__
CURRENT_WORK_BASE_SHA: __CURRENT_SHA__
EXECUTION_STATUS: PLANNED
IMPLEMENTATION_COMPLETE: NO

> في `PREPARE_ONLY` هذا الملف خطة تنفيذ جاهزة فقط. في `EXECUTE_END_TO_END` يصبح سجل التنفيذ الفعلي بعد اجتياز بوابات التشخيص/القرار/التغطية/الجاهزية.

## 1. Execution Plan

Order by hard dependency, canonical owner, blast radius, shared foundation and operational criticality.

| Step ID | Finding/Decision refs | Root cause | Canonical owner | Exact target state | Depends on | Unlocks | Verification ref |
|---|---|---|---|---|---|---|---|

## 2. Change Impact / Boundaries

| Change ID | Paths/Symbols/Contracts/Data | Writers/Readers/Consumers | Surfaces/Journeys | Must-not-change | Risk / rollback |
|---|---|---|---|---|---|

## 3. Governance Promotion Plan / Result

| GOV ID | Canonical governance owner | Required machine counterpart | PREPARE status / EXECUTE result | Evidence |
|---|---|---|---|---|

No durable product/policy/authority truth may remain only in this package at final closure.

## 4. Root-Cause Implementation Steps

For each executable Finding:

```text
Confirm current failure/evidence
→ canonical owner/root cause
→ challenge competing hypothesis
→ root fix/refactor/redesign/rebuild
→ migrate all affected writers/readers/consumers
→ synchronize contracts/data/generated artifacts
→ remove obsolete/parallel path
→ local cleanup
→ targeted verify
→ adjacent regression search
```

Record exact tasks below; do not write vague tasks such as “fix related files”.

| Task ID | Exact action | Paths/Symbols | Acceptance | Status |
|---|---|---|---|---|

## 5. Actual Change Ledger

In `PREPARE_ONLY`, keep this section explicitly `NOT_EXECUTED`.

| Change ID | Candidate/Commit SHA | Exact changed/removed/moved paths | Result | Related Finding | Evidence invalidated |
|---|---|---|---|---|---|

## 6. Candidate Lifecycle / Concurrent Movement

| Event | SHA/base/head | Concurrent delta classification | Reconciliation | Evidence impact |
|---|---|---|---|---|

Track `START_SHA → CURRENT_WORK_BASE_SHA → IMPLEMENTATION_SHA(s) → FINAL_CANDIDATE_SHA`. Never claim foreign/pre-existing changes as this task’s work. No force-push or stale-candidate push.

## 7. Consumer / Contract / Data Migration

| Owner/Consumer | Before | Migration/transition | After | Compatibility/removal trigger | Verification |
|---|---|---|---|---|---|

## 8. Local Cleanup

Cleanup happens after each root fix, not only at the end.

| Cleanup ID | Dead/stale/duplicate/obsolete residue | Trace/consumer proof | Action | Reference repair | Verification |
|---|---|---|---|---|---|

## 9. Blockers / Deviations / Remaining Execution State

| Item | Type | Evidence | Required action/decision | Resume point |
|---|---|---|---|---|

Set `IMPLEMENTATION_COMPLETE: YES` only when every in-scope executable Finding is implemented, every consumer is migrated or proven unaffected, durable governance promotion required by execution is complete or explicitly blocking, local residue is cleaned, and final verification has a concrete acquisition path.
