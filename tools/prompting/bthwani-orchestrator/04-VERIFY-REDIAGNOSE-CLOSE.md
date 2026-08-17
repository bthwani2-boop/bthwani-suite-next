# Verification, Re-Diagnosis and Fail-Closed Closure

## 1. Verification proves claims, not activity

Choose the **smallest sufficient proof that can actually prove the claim**, then escalate by material risk.

Typical progression:

`direct code/contract inspection → nearest unit/module check → affected integration/type/lint/build → contract/data/security/isolation checks → runtime/readback → cross-surface/E2E → broad/final closure checks`.

Do not run the heaviest suite automatically. Do not use a weak check to make a stronger claim.

## 2. Risk-proportional escalation

Escalate when materially involved, especially for:

- public contracts/API;
- database/migrations/data mutation;
- finance/WLT/money state;
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
DOC UPDATED ≠ IMPLEMENTATION FIXED
```

State explicitly what a check proves and, when material, what it does not prove.

## 4. Exact candidate evidence

Evidence must bind to the actual candidate it claims to verify.

Any material source/contract/data/runtime write invalidates affected prior evidence.

Before final closure:

```text
resolve exact latest target HEAD
→ reconcile foreign/concurrent delta
→ ensure final evidence applies to that exact candidate/current runtime state
```

Old SHA evidence cannot silently prove a changed candidate.

## 5. Required verification dimensions

Verify where materially applicable:

- root cause actually removed;
- canonical write/read ownership;
- all affected writers/readers/consumers;
- success, failure and recovery/unknown-result paths;
- cross-surface semantic consistency;
- frontend/backend/data/contract vertical integrity;
- authorization/security/isolation;
- data integrity, migrations and readback;
- runtime/config/provider behavior;
- governance/product/policy synchronization;
- deletion/retirement of superseded reachable paths;
- absence of newly introduced parallel truth;
- preservation of proven design/value through restructuring.

## 6. Affected-only first

Start with the nearest proof for the affected cone. Broaden when:

- shared/canonical ownership changed;
- multiple surfaces/services depend on the root;
- a public contract/data model/runtime boundary changed;
- targeted evidence fails or leaves material uncertainty;
- final project/feature closure is claimed.

This preserves speed without lowering proof quality.

## 7. Zero-reference and reachability proof

After cutover/removal, search and reason across material references:

`imports/exports | routes/navigation | writers/readers | contracts/generated consumers | DB/schema/migrations | runtime/config | tests/guards/CI | scripts/manifests | governance/command-bearing docs`.

A textual zero-reference search may be necessary but is not always sufficient; also prove that no runtime/reachable alternate path remains.

## 8. Re-diagnosis

After every material root treatment:

```text
reinspect affected outcome
→ rerun material journey/ownership/contract/data traces
→ invalidate descendant findings that were symptoms
→ discover newly exposed roots
→ rerank
```

Do not mechanically continue an old task list after the system truth changed.

## 9. Final negative-space pass

Before closure, deliberately search for what should exist but may be missing:

- missing consumer/surface;
- missing route/handler/contract field;
- missing failure/recovery path;
- missing readback/reconciliation;
- missing authorization boundary;
- missing governance representation;
- missing migration/compatibility transition;
- hidden duplicate/legacy truth.

Unexplained absence is open.

## 10. Final adversarial re-diagnosis

Assume the closure claim is false and try to prove it.

Search for:

`missed domain/capability | remaining duplicate truth | stale/wrong governance | hidden consumer | legacy/reachable old path | contract/data mismatch | cross-surface mismatch | failure/recovery gap | runtime divergence | unresolved semantic ambiguity | patch/workaround | concurrency/idempotency issue | security/isolation issue`.

If any material issue is found:

`REOPEN → prove root → execute → verify → adversarial re-diagnose again`.

## 11. Coverage vs closure

`COVERAGE_COMPLETE` means all required material nodes are accounted and inspected/proven N/A.

`CLOSURE_COMPLETE` additionally means all material roots/findings are treated and verified.

Never conflate them.

## 12. Closure equation

`CLOSED` only when all materially required conditions hold:

```text
ZERO_UNKNOWN_REQUIRED_COVERAGE
AND ZERO_UNINSPECTED_REQUIRED_NODES
AND ZERO_KNOWN_MATERIAL_OPEN_ROOTS
AND ZERO_UNRESOLVED_MATERIAL_FINDINGS
AND ZERO_UNRESOLVED_DECISIONS
AND ZERO_UNACCOUNTED_AFFECTED_CONSUMERS
AND ZERO_UNJUSTIFIED_PARALLEL_TRUTH
AND ZERO_UNJUSTIFIED_REACHABLE_LEGACY_PATHS
AND ZERO_KNOWN_FINAL_PATCHES/WORKAROUNDS
AND ZERO_PROVEN_GOVERNANCE_DRIFT_LEFT_IN_SCOPE
AND ZERO_UNVERIFIED_MATERIAL_CLAIMS
AND ZERO_SILENT_EXCLUSIONS
AND ZERO_KNOWN_BROKEN_REFERENCES
AND LATEST_EXACT_HEAD_RECONCILED
AND FINAL_NEGATIVE_SPACE_PASS
AND FINAL_ADVERSARIAL_REDIAGNOSIS_PASS
```

If any conjunct is unproven, closure is blocked.

## 13. Final report

Keep the final report concise and evidence-based. State:

- exact branch/ref and final observed HEAD;
- highest roots treated;
- major canonical cutovers/cleanup;
- verification performed and proof limits;
- governance/system reconciliation where applicable;
- remaining `DECISION_REQUIRED` or true `EXTERNAL_BLOCKER`, if any;
- final state: `CLOSED` or `OPEN`.

Do not restate the entire orchestrator and do not manufacture a large documentation artifact merely to report completion.