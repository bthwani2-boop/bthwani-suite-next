# __TASK_NAME__ — Verification & Closure

Status: DERIVED_SUPPORT
TASK_ID: __TASK_ID__
MODE: __MODE__
VERIFICATION_STATUS: PLANNED
FINAL_CANDIDATE_SHA: UNSET
HEAD_AT_DECISION: UNSET
EVIDENCE_COMPLETE: NO
CLEANUP_COMPLETE: NO
GOVERNANCE_SYNC_COMPLETE: NO
FRESH_HEAD_VALID: NO
FINAL_ADVERSARIAL_PASS: NO
FINAL_DECISION: OPEN

> في `PREPARE_ONLY` هذا الملف خطة تحقق وإغلاق فقط ويبقى `FINAL_DECISION: OPEN`. في `EXECUTE_END_TO_END` لا يتحول إلى Closure evidence إلا على Candidate ثابت وحديث.

## 1. Verification Plan

| Verification ID | Claim/Finding | Exact check/source | Required capability/environment | What it proves | What it does NOT prove |
|---|---|---|---|---|---|

Use affected/risk-proportional verification. Do not duplicate heavy CI for the same still-valid candidate.

## 2. Evidence Ledger

| Evidence ID | Verification ID | Candidate SHA | Source/Run/Artifact | Environment/Profile | Result | Proof limit | Stale/Invalidation trigger |
|---|---|---|---|---|---|---|---|

No evidence may be relabeled to a newer SHA after a write or branch movement.

## 3. Runtime / E2E / Readback

Record actual scenario evidence when the claim is operational.

| Scenario | Candidate/runtime provenance | Preconditions | Action | Persisted canonical readback | Cross-surface observable result | Failure/recovery result |
|---|---|---|---|---|---|---|

## 4. Final Cleanup / Structural Hygiene

Trace before deletion; never delete blindly.

| Item | Classification | Consumers/references traced | Remove/Merge/Move/Rename/Keep reason | Reverification |
|---|---|---|---|---|

Final sweep must cover, when related: dead/stale/legacy code, duplicate truth/logic, obsolete paths, unused dependencies/config/flags, orphan refs, naming/placement/ownership, temporary workarounds/fallbacks, TODO/FIXME/HACK, stale docs/tests/scripts and affected structural residue.

## 5. Governance Reconciliation

| Durable rule / GOV ID | Canonical governance owner | Machine counterpart | Implementation/consumer parity | Runtime parity | Status |
|---|---|---|---|---|---|

Before closure: zero durable truth existing only in task artifacts and zero known governance ↔ contract ↔ implementation ↔ runtime contradiction.

## 6. Fresh-Head / Candidate Reconciliation

| Checkpoint | Expected candidate/base | Observed branch HEAD | Delta classification | Reverification performed |
|---|---|---|---|---|

Any material head movement after evidence requires impact classification and rerun of invalidated evidence.

## 7. Final Adversarial Completeness Pass

Rediscover from alternative entry points: unmapped routes/states/APIs, hidden writers/readers, jobs/events/background paths, admin interventions, fallbacks/legacy, errors/recovery, config/data refs and neighboring consumers.

| Probe | Alternative entry point | New material node/finding? | Disposition / reopened scope |
|---|---|---|---|

A new material node reopens diagnosis/execution; it is not silently appended after closure.

## 8. Final Closure Gate

For `EXECUTE_END_TO_END`, set the metadata gates above to `YES` only after proving all applicable conditions:

```text
DISCOVERY_COMPLETE
AND DIAGNOSIS_COMPLETE
AND DECISION_COMPLETE
AND COVERAGE_COMPLETE
AND PACKAGE_READY
AND IMPLEMENTATION_COMPLETE
AND CLEANUP_COMPLETE
AND EVIDENCE_COMPLETE
AND GOVERNANCE_SYNC_COMPLETE
AND FRESH_HEAD_VALID
AND FINAL_ADVERSARIAL_PASS
```

Also require:

- zero known unresolved/fixed-pending-verify Finding in scope;
- zero required missing/stale evidence;
- zero known unjustified duplicate source of truth or reachable obsolete path;
- actual runtime/readback evidence where the final claim requires runtime truth;
- final evidence bound to the exact immutable `FINAL_CANDIDATE_SHA`;
- `HEAD_AT_DECISION` relation to the claimed branch head explicitly proven.

If any required condition is unproven, keep `FINAL_DECISION: OPEN` or use the current governed blocked vocabulary; never infer closure from silence.