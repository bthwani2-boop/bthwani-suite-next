# Verification, Exact-Candidate Re-Diagnosis and Fail-Closed Closure

## 1. Verification proves claims, not activity

Choose the **smallest sufficient proof that can actually falsify/prove the claim**, then escalate by material risk.

Typical progression:

`direct code/contract inspection → nearest unit/module regression → affected integration/type/lint/build → contract/data/security/isolation → runtime/readback → cross-surface/E2E/visual → broad final closure checks`.

Do not automatically run the heaviest suite. Do not use a weak check to make a stronger claim.

## 2. Risk-proportional escalation

Escalate especially when materially involved:

- public contracts/API/events;
- database/migrations/data mutation;
- finance/money/provider outcome;
- security/auth/authz/privacy/secrets/isolation;
- runtime/infrastructure/provider behavior;
- move/delete/repository ownership restructuring;
- governance semantics;
- multi-surface journeys;
- release/production claims.

## 3. Proof limits

```text
TEST PASS ≠ PRODUCT CORRECTNESS
BUILD PASS ≠ SYSTEM CORRECTNESS
TYPECHECK/LINT PASS ≠ OPERATIONAL CORRECTNESS
STATIC PASS ≠ RUNTIME PROOF
MIGRATION APPLIED ≠ READBACK/IDEMPOTENCY/RESTART/COMPATIBILITY PROOF
HIDDEN UI ≠ SERVER AUTHORIZATION
ONE SURFACE PASS ≠ JOURNEY PASS
MOCK PASS ≠ REAL PROVIDER/RUNTIME PASS
DOC UPDATED ≠ IMPLEMENTATION FIXED
```

For material evidence state what it proves and what it does not prove.

## 4. Candidate lifecycle

Use precise identities:

```text
STARTING_LIVE_HEAD
= exact target ref head at task start.

WORK_BASE_HEAD
= latest reconciled head used to build the current owned delta.

IMPLEMENTATION_COMMIT(S)
= logical commits containing source/runtime/data/contract treatment.

FINAL_CANDIDATE
= exact immutable commit after every allowed project/package write required for the claimed state.

HEAD_AT_REVIEW_START
= live target head when final review begins.

HEAD_AT_DECISION
= live target head immediately before final closure decision.
```

Any material write after `FINAL_CANDIDATE` creates a new candidate and invalidates affected evidence.

Do not mix evidence from different candidate SHAs/runs/environments and call it one closure proof.

## 5. Exact-candidate evidence

Before final closure:

```text
freeze intended project writes
→ resolve FINAL_CANDIDATE identity
→ verify candidate exists/relation to target
→ bind required evidence to candidate/runtime derived from it
→ re-resolve target at decision time
```

If the claim is closure of the current target branch/head, `HEAD_AT_DECISION` must be reconciled with and proven by the closure evidence. An older reviewed commit cannot silently prove a newer head.

## 6. Runtime provenance/freshness

Runtime evidence must establish enough provenance to exclude stale execution, as applicable:

```text
candidate/source identity
artifact/image/bundle identity
service/process/container freshness
schema/migration level
runtime endpoint/profile/config
seed/fixture/data provenance
observed canonical readback
```

A screenshot, API response or green smoke result without sufficient provenance cannot prove a high-risk runtime claim.

## 7. Required verification dimensions

Verify where materially applicable:

- root cause actually removed;
- actual source of defect corrected;
- canonical owner/write path enforced;
- all affected writers/readers/consumers migrated;
- success/failure/recovery/unknown-result paths;
- state transitions/invariants;
- cross-surface semantic consistency;
- frontend/backend/data/contract vertical integrity;
- authorization/security/isolation;
- data integrity, migration/backfill/cutover/readback;
- idempotency/replay/concurrency/restart;
- runtime/config/provider behavior;
- governance/product/policy synchronization;
- deletion/retirement of superseded reachable paths;
- absence of newly introduced parallel truth;
- preservation of proven design/value through restructuring;
- repository naming/placement/reference integrity;
- absence of directly related cleanup residue.

## 8. Failure/edge verification

Cover materially applicable:

`success | empty/missing | invalid/malformed | unauthenticated | denied | wrong role/scope | IDOR | forbidden state | not found | stale/conflict | boundary/min/max | duplicate/replay | idempotency | race/concurrency | partial failure | dependency/database/network/provider failure | timeout/unknown result | retry/backoff/DLQ | offline/reconnect | restart/recovery | old/new data | mixed-version | rollback/roll-forward | compensation/reconciliation`.

A happy-path-only proof is insufficient when any of these are material to correctness.

## 9. CI/runtime failure classification — no blind rerun

When project CI/runtime evidence fails, identify the first real causal failure and classify:

```text
DETERMINISTIC_PRODUCT
DETERMINISTIC_TEST_OR_CONTRACT
INFRA_OR_RUNNER
EXTERNAL_PROVIDER
FLAKY_OR_NONDETERMINISTIC
CANCELLED_OR_SUPERSEDED
STALE_RUN
```

Treatment:

```text
DETERMINISTIC_* → root-cause fix before rerun.
INFRA/PROVIDER → prove external cause before targeted retry.
FLAKY → flakiness itself remains a defect until controlled/proven.
CANCELLED/SUPERSEDED → neither PASS nor product FAIL.
STALE_RUN → cannot prove current candidate.
```

Do not rerun deterministic failures repeatedly to manufacture green.

## 10. Evidence invalidation

For material evidence reason about:

```text
bound candidate
inputs/environment
covered scope
what changes invalidate it
```

Examples:

```text
contract/schema change → reverify generators/consumers/integration.
data/migration owner change → reverify DB/runtime/readback.
runtime/config/network change → reverify affected runtime/E2E.
auth/permission change → reverify negative isolation/security paths.
shared canonical library change → reverify all proven consumers.
unrelated documentation-only change → retain evidence only when independence is actually provable.
```

Rerun what is invalidated; do not rerun everything mechanically and do not retain stale proof.

## 11. Affected-only first

Begin with nearest proof for the affected cone. Broaden when:

- shared/canonical ownership changed;
- multiple surfaces/services depend on the root;
- public contract/data/runtime boundary changed;
- targeted evidence fails or leaves material uncertainty;
- feature/project closure is claimed.

Speed comes from accurate scope, not weaker proof.

## 12. Zero-reference and reachability proof

After cutover/removal inspect materially relevant:

`imports/exports/re-exports | routes/navigation | callers/callees | writers/readers | contracts/generated consumers | DB/schema/migrations | runtime/config | tests/CI | project scripts/manifests | governance/documentation references`.

Textual zero-reference search may be necessary but is not sufficient by itself. Also prove no runtime/reachable alternate path, registration, indirect consumer or authoritative data writer remains.

## 13. Re-diagnosis after every material root

```text
reinspect affected product/operational outcome
→ rerun affected journey/actor/state/handoff traces
→ rerun ownership/contract/data/runtime traces
→ invalidate descendant findings that were symptoms
→ discover newly exposed roots
→ rebuild affected coverage
→ rerank
```

Never mechanically execute an old finding list after the system truth changes.

## 14. Final finishing gate

Before final candidate freeze, every materially affected remaining artifact should have a defensible:

`Responsibility | Purpose | Consumer | Requirement | Correct Owner | Correct Placement | Correct Naming/Context`.

Closure is blocked by known materially related:

`dead/unreachable code | superseded implementation | duplicate authority | stale/orphan reference | old path/alias | misleading naming | wrong placement/ownership | unused dependency | obsolete config/env/flag | stale project script | TODO/FIXME/HACK substitute | workaround/fallback | stale documentation/comment/example | debug/temp artifact | unjustified compatibility residue`.

Do not pull unrelated cosmetic cleanup into the task.

## 15. Final freeze

After all required writes and structural finishing:

```text
FREEZE PROJECT WRITES
→ FINAL_CANDIDATE = exact last allowed candidate
→ no formatter/generator/fix/cleanup/source mutation during final evidence
```

Any subsequent material write reopens the candidate cycle.

Final verification should be read-only with respect to the candidate.

## 16. Branch-race gate

Immediately before push/ref update and before final decision:

```text
re-resolve target HEAD
→ compare with expected parent/candidate
→ classify movement using 01-SCOPE-AUTHORITY-RULES.md
```

If the head moved materially:

`DO NOT FORCE → reconcile → rebuild affected candidate → rerun invalidated evidence`.

Evidence from a workflow/run remains bound to the SHA it actually tested even if the branch moves while it runs.

## 17. Final negative-space pass

Deliberately search for what should exist but may be missing:

- missing consumer/surface;
- missing route/handler/contract field;
- missing writer/readback;
- missing failure/recovery path;
- missing authorization boundary;
- missing handoff/intervention;
- missing migration/compatibility transition;
- hidden duplicate/legacy truth;
- missing operational/audit evidence required by the claim.

Unexplained material absence is open.

## 18. Final adversarial re-diagnosis

Assume the closure claim is false and try to prove it.

Search for:

`missed domain/capability | remaining duplicate truth | stale/wrong governance | hidden consumer/writer | reachable old path | contract/data mismatch | cross-surface mismatch | failure/recovery gap | runtime divergence | stale process/data | unresolved semantic ambiguity | patch/workaround | race/idempotency issue | security/isolation issue | wrong placement/naming/context | orphan references`.

If a material issue is found:

`REOPEN → prove root → execute → verify → adversarially re-diagnose again`.

## 19. Coverage vs closure

`COVERAGE_COMPLETE` means all required material nodes are accounted for and inspected or proven N/A.

`CLOSURE_COMPLETE` additionally means all material roots/findings are treated and verified on the correct candidate/runtime.

Never conflate them.

## 20. Closure equation

`CLOSED` only when every materially required condition is proven:

```text
ZERO_UNKNOWN_REQUIRED_COVERAGE
AND ZERO_UNINSPECTED_REQUIRED_NODES
AND ZERO_KNOWN_MATERIAL_OPEN_ROOTS
AND ZERO_UNRESOLVED_MATERIAL_FINDINGS
AND ZERO_FIXED_PENDING_VERIFY_FINDINGS
AND ZERO_UNRESOLVED_REQUIRED_DECISIONS
AND ZERO_UNACCOUNTED_AFFECTED_CONSUMERS
AND ZERO_UNKNOWN_MATERIAL_DEPENDENCIES
AND ZERO_CONTRADICTORY_CANONICAL_TRUTHS
AND ZERO_DUPLICATE_AUTHORITATIVE_WRITERS
AND ZERO_UNJUSTIFIED_PARALLEL_TRUTH
AND ZERO_UNJUSTIFIED_REACHABLE_LEGACY_PATHS
AND ZERO_KNOWN_FINAL_PATCHES/WORKAROUNDS/FALLBACKS
AND ZERO_MATERIAL_MIGRATION/BACKFILL/CUTOVER_GAPS
AND ZERO_MATERIAL_CONTRACT/BINDING_DRIFT
AND ZERO_MATERIAL_AUTH/SCOPE/SECURITY_GAPS
AND ZERO_UNRESOLVED_RUNTIME/DATA_STATE
AND ZERO_PROVEN_GOVERNANCE_DRIFT_LEFT_IN_SCOPE
AND ZERO_BROKEN/ORPHAN/STALE_REFERENCES_EXPOSED_BY_WORK
AND ZERO_MATERIAL_CLEANUP_RESIDUE_TIED_TO_SCOPE
AND ZERO_UNVERIFIED_MATERIAL_CLAIMS
AND ZERO_REQUIRED_MISSING/STALE_EVIDENCE
AND ZERO_SILENT_EXCLUSIONS
AND LATEST_REQUIRED_HEAD_RECONCILED
AND FINAL_NEGATIVE_SPACE_PASS
AND FINAL_ADVERSARIAL_REDIAGNOSIS_PASS
```

If any conjunct is unproven, state is `OPEN` unless a true `DECISION_REQUIRED` or `EXTERNAL_BLOCKER` applies.

## 21. Final report

Keep reporting concise and evidence-based. State:

- repository/ref and starting/final observed HEAD;
- final candidate and its relation to the target head;
- highest roots treated and canonical owners;
- major migrations/cutovers/cleanup;
- affected writers/readers/consumers/surfaces;
- verification actually performed and proof limits;
- runtime provenance/readback when claimed;
- foreign/concurrent delta reconciliation;
- remaining true decision/external blocker, if any;
- final state: `CLOSED` or `OPEN`.

Do not create a large evidence package merely to report completion. Do not use any script, workflow, guard, validator, CLI or registry to self-certify this orchestrator.