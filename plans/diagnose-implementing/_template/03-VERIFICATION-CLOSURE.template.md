# __TASK_NAME__ — Verification & Closure

Status: DERIVED_SUPPORT
TASK_ID: __TASK_ID__
REPOSITORY: __REPOSITORY__
BRANCH: __BRANCH__
MODE: __MODE__
LIFECYCLE_STATE: OPEN
VERIFICATION_STATUS: PLANNED
FINAL_CANDIDATE_SHA: UNSET
HEAD_AT_REVIEW_START: UNSET
HEAD_AT_DECISION: UNSET
EVIDENCE_COMPLETE: NO
CLEANUP_COMPLETE: NO
GOVERNANCE_SYNC_COMPLETE: NO
FRESH_HEAD_VALID: NO
FINAL_ADVERSARIAL_PASS: NO

> `LIFECYCLE_STATE` is internal task state, not governance decision vocabulary. `FINAL_DECISION` is intentionally absent until an evidence-supported canonical decision is actually issued. In `PREPARE_ONLY`, no final product decision may be issued.

## 1. Verification Plan

| Verification ID | Claim/Finding | Exact check/source | Required capability/environment | What it proves | What it does NOT prove |
|---|---|---|---|---|---|

Use affected/risk-proportional verification. Do not duplicate heavy CI for the same still-valid candidate. When a PR exists, let PR-heavy verification own expensive checks unless policy requires another run; final candidate and post-merge checks remain separate when applicable.

## 2. Evidence Matrix

| Scope | Applicable + reason | Status | Source/Run/Artifact | Candidate SHA | Environment/Profile | Proof limit | Required capability | Approval binding |
|---|---|---|---|---|---|---|---|---|

Use only evidence scopes required by current governance/decision vocabulary and actual blast radius. `PASS` in one scope never implies another scope.

## 3. Evidence Ledger / Failure Classification

| Evidence ID | Verification ID | Candidate SHA | Source/Run/Artifact | Result | Failure class | First causal failure / root cause | Stale trigger |
|---|---|---|---|---|---|---|---|

Classify deterministic product/test failures, infra/runner/provider failures, flaky/non-deterministic failures, cancellation/supersession and stale runs. Never blind-rerun deterministic failures until green.

## 4. Runtime / E2E / Readback

Record actual scenario evidence when the claim is operational.

| Scenario | Candidate/runtime provenance | Preconditions | Action | Persisted canonical readback | Cross-surface observable result | Failure/recovery result |
|---|---|---|---|---|---|---|

Static/build/mock green is not runtime proof. Prove process/artifact/schema/config freshness before using runtime evidence.

## 5. Approval / Independent Review

| Approval/Review domain | Required + reason | Allowed authority/reviewer | Actual provenance | Exact candidate binding | Status |
|---|---|---|---|---|---|

`SELF_REVIEW ≠ INDEPENDENT_REVIEW`. Historical blanket authorization does not replace a protected approval required by current governance.

## 6. Final Cleanup / Structural Hygiene

Trace before deletion; never delete blindly.

| Item | Classification | Consumers/references traced | Remove/Merge/Move/Rename/Keep reason | Reverification |
|---|---|---|---|---|

Final sweep must cover, when related: dead/stale/legacy code, duplicate truth/logic, obsolete paths, unused dependencies/config/flags, orphan refs, naming/placement/ownership, temporary workarounds/fallbacks, TODO/FIXME/HACK, stale docs/tests/scripts and affected structural residue.

## 7. Governance Reconciliation

| Durable rule / GOV ID | Canonical governance owner | Machine counterpart | Implementation/consumer parity | Runtime parity | Status |
|---|---|---|---|---|---|

Before closure: zero durable truth existing only in task artifacts and zero known governance ↔ Product Truth ↔ machine contract ↔ implementation ↔ runtime contradiction.

## 8. Fresh-Head / Candidate Reconciliation

| Checkpoint | Expected candidate/base | Observed branch HEAD | Delta classification | Reverification performed |
|---|---|---|---|---|

`FINAL_CANDIDATE_SHA` is assigned only after all allowed writes and Freeze. `HEAD_AT_REVIEW_START` and `HEAD_AT_DECISION` are live re-resolved SHAs. For branch-head closure, `HEAD_AT_DECISION` must equal `FINAL_CANDIDATE_SHA`; otherwise reopen/reconcile.

## 9. Final Adversarial Completeness Pass

Rediscover from alternative entry points: unmapped routes/states/APIs, hidden writers/readers, jobs/events/background paths, admin interventions, fallbacks/legacy, errors/recovery, config/data refs, approvals/evidence gaps and neighboring consumers.

| Probe | Alternative entry point | New material node/finding? | Disposition / reopened scope |
|---|---|---|---|

A new material node reopens diagnosis/execution; it is not silently appended after closure.

## 10. Final Closure Gate

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
- zero required missing/stale/pending/cancelled evidence;
- zero required missing/unproven approval or independent review;
- zero known unjustified duplicate source of truth or reachable obsolete path;
- actual runtime/readback evidence where the final claim requires runtime truth;
- final evidence bound to the exact immutable `FINAL_CANDIDATE_SHA`;
- branch-head closure relation proven by `HEAD_AT_DECISION == FINAL_CANDIDATE_SHA`;
- final decision taken from the **current** `governance/contracts/decision-vocabulary.json` only.

When closure is actually proven, set:

```text
LIFECYCLE_STATE: CLOSED
FINAL_DECISION: <current closureRules.closedDecision>
```

If any required condition is unproven, keep lifecycle non-closed and, when a governed decision is issued, use the appropriate current canonical non-closed decision (`FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, etc.). Never invent `OPEN`/`BLOCKED` as canonical decisions.
