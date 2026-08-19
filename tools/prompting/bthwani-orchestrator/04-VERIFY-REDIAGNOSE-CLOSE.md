# Verification, Project-Consistency Re-Diagnosis, Exact-Candidate Evidence and Fail-Closed Closure

## 1. Verification proves claims, not activity

Choose the **smallest sufficient proof that can falsify/prove the claim**, then escalate by material risk.

Typical progression:

`direct code/contract inspection → nearest unit/module regression → affected integration/type/lint/build → contract/data/security/isolation → runtime/readback → cross-surface/E2E/visual → broad final closure checks`.

Do not automatically run the heaviest suite and do not use a weak check to make a stronger claim.

A locally correct objective is not closed until its materially touched project-frame invariants, governance impact and affected prior canonical closures are reconciled.

## 2. Risk-proportional escalation

Escalate especially for public contracts/events, database/migrations, finance/provider outcomes, security/auth/privacy/isolation, runtime/infrastructure, structural move/delete, governance semantics, shared project-frame authorities/invariants, multi-surface journeys, repository-platform claims and release/production claims.

## 3. Proof limits

```text
TEST PASS ≠ PRODUCT CORRECTNESS
BUILD PASS ≠ SYSTEM CORRECTNESS
TYPECHECK/LINT PASS ≠ OPERATIONAL CORRECTNESS
STATIC PASS ≠ RUNTIME PROOF
MIGRATION APPLIED ≠ READBACK/IDEMPOTENCY/RESTART/COMPATIBILITY PROOF
HIDDEN UI ≠ SERVER AUTHORIZATION
ONE SURFACE PASS ≠ JOURNEY PASS
LOCAL FIX ≠ SYSTEM FIX
LOCAL OBJECTIVE PASS ≠ PROJECT CONSISTENCY
CANONICAL CHANGE WITHOUT ALL AFFECTED CONSUMERS MIGRATED ≠ COMPLETE
MOCK PASS ≠ REAL PROVIDER/RUNTIME PASS
DOC UPDATED ≠ IMPLEMENTATION FIXED
GOVERNANCE UNCHANGED ≠ GOVERNANCE CONFIRMED
TRACKED WORKFLOW CONFIG ≠ LIVE REPOSITORY ENFORCEMENT
EXTERNAL DOCUMENTATION ≠ LOCAL VERSION/RUNTIME PROOF
```

State what material evidence proves and what it does not prove.

## 4. Candidate lifecycle

```text
STARTING_LIVE_HEAD
= exact target-ref head at task start.

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

Any material write after `FINAL_CANDIDATE` creates a new candidate and invalidates affected evidence. Never mix evidence from different candidates/runs/environments and call it one proof set.

## 5. Exact-candidate evidence

Before final closure:

`freeze intended writes → resolve FINAL_CANDIDATE → prove relation to target → bind required evidence to candidate/runtime derived from it → re-resolve target at decision time`.

An older reviewed commit cannot silently prove a newer target head.

## 6. Material evidence record

Do not require a heavyweight matrix for every task, but every material evidence item relied upon for closure must remain reconstructable with enough provenance:

```text
Claim / Finding / Root proved
Candidate SHA or exact immutable source identity
Command / Run / Job / Artifact / Manual Scenario source
Environment / Profile / Runner / Device when relevant
Started/completed time or freshness window when relevant
Result / Exit / Status
What this evidence proves
What this evidence explicitly does NOT prove
Required capability / provenance
Invalidation trigger
```

Evidence without sufficient candidate/environment provenance cannot support a stronger claim than its provenance allows.

## 7. Runtime provenance/freshness

Runtime evidence must exclude stale execution as applicable:

`candidate/source identity | artifact/image/bundle identity | service/process/container freshness | schema/migration level | runtime endpoint/profile/config | seed/fixture provenance | canonical readback`.

A screenshot, API response or smoke result without sufficient provenance cannot prove a high-risk runtime claim.

## 8. Required verification dimensions

Verify where material:

- root cause actually removed and actual source corrected;
- canonical owner/write path enforced;
- affected writers/readers/consumers migrated;
- required previously correct behavior preserved or intentionally migrated across the affected blast radius;
- no unintended regression, missing consumer, partial migration or half cutover remains;
- success/failure/recovery/unknown-result paths;
- state transitions/invariants;
- cross-surface semantic consistency;
- frontend/backend/data/contract vertical integrity;
- authorization/security/isolation;
- data migration/backfill/cutover/readback;
- idempotency/replay/concurrency/restart;
- runtime/config/provider behavior;
- materially touched project-frame authorities/invariants remain consistent;
- previously proven canonical closures affected by the change remain valid or were explicitly reopened/reconciled;
- every canonical focus family has an applicability disposition and every material one received sufficient proof;
- governance/product/policy impact is classified and synchronized where required;
- deletion/retirement of superseded reachable paths;
- absence of new parallel truth;
- preservation of proven design/value;
- removal of materially unjustified complexity identified in scope without weakening required correctness/assurance;
- naming/placement/reference integrity;
- directly related cleanup residue removed;
- engineering-control-path assurance/performance before→after when that root was treated;
- repository-platform truth when the claim depends on current GitHub/ruleset/check/review state.

## 9. Failure/edge verification

Cover materially applicable:

`success | empty/missing | invalid/malformed | unauthenticated | denied | wrong role/scope | IDOR | forbidden state | not found | stale/conflict | boundary/min/max | duplicate/replay | idempotency | race/concurrency | partial failure | dependency/database/network/provider failure | timeout/unknown result | retry/backoff/DLQ | offline/reconnect | restart/recovery | old/new data | mixed-version | rollback/roll-forward | compensation/reconciliation`.

When shared meaning/authority changed, also verify a representative contradictory use from another affected journey/surface/domain cannot recreate the old or locally optimized truth.

## 10. CI/runtime failure classification

Classify first causal failure:

`DETERMINISTIC_PRODUCT | DETERMINISTIC_TEST_OR_CONTRACT | INFRA_OR_RUNNER | EXTERNAL_PROVIDER | FLAKY_OR_NONDETERMINISTIC | CANCELLED_OR_SUPERSEDED | STALE_RUN`.

Deterministic failures require root correction before rerun. Flakiness remains a defect until controlled/proven. Cancelled/superseded is neither PASS nor product FAIL. Stale runs cannot prove current candidate.

## 11. Repository-platform truth

When a material claim depends on GitHub or repository-platform state, verify that live state against the exact candidate instead of inferring it from tracked configuration.

As applicable inspect:

```text
workflow runs bound to the candidate SHA
required/expected checks and status context names
pending / missing / failed / cancelled / superseded / stale runs
pull-request reviews and unresolved review threads when policy/claim requires them
live rulesets / branch protection / repository settings relevant to the claim
candidate reachability / base relation / mergeability when merge readiness is claimed
Sonar / CodeQL / dependency / security / quality gates when governed or materially relied upon
```

Rules:

- a tracked workflow file proves only configuration in the tree, not live enforcement;
- absence of red is not PASS when a required check is pending/missing/stale;
- a successful run for another SHA cannot prove the current candidate;
- repository-platform checks do not replace product/runtime evidence they do not exercise;
- do not perform this platform inspection when the claim does not materially depend on it.

## 12. Evidence invalidation

For each material evidence item reason about bound candidate, inputs/environment, covered scope and what changes invalidate it.

Examples:

- product/governance/authority change → revalidate affected project-frame claims, target and consumers;
- contract/schema change → reverify generators/consumers/integration;
- data/migration owner change → reverify DB/runtime/readback;
- runtime/config/network change → reverify affected runtime/E2E;
- auth/permission change → reverify negative isolation/security paths;
- shared canonical library change → reverify all proven consumers;
- workflow/ruleset/repository-setting change → reverify affected repository-platform claims;
- unrelated documentation-only change → retain evidence only when independence is actually provable.

Rerun what is invalidated; do not rerun everything mechanically and do not retain stale proof.

## 13. Affected-only first

Begin with nearest proof. Broaden when shared/canonical ownership changed, project-frame invariants changed, multiple consumers depend on root, public contract/data/runtime boundary changed, targeted evidence leaves material uncertainty, or feature/project closure is claimed.

Speed comes from accurate scope and valid reusable project context, not weaker proof.

## 14. Review provenance

```text
SELF_REVIEW ≠ INDEPENDENT_REVIEW
```

Do not label self-review as independent. When a governing policy or risk decision requires independent review, prove reviewer provenance and exact candidate binding. If the reviewer mutates the candidate, the previous review no longer independently proves the new candidate.

Independent review is not mandatory by default merely because it existed in a historical package; it is risk/policy-driven.

## 15. Zero-reference and reachability proof

After cutover/removal inspect materially relevant imports/exports/re-exports, routes/navigation, callers/callees, writers/readers, contracts/generated consumers, DB/schema/migrations, runtime/config, tests/CI, scripts/manifests and governance/docs references.

Textual zero-reference search may be necessary but is insufficient alone; prove no runtime/reachable alternate path or authoritative writer remains.

## 16. Re-diagnosis after every material root

`reinspect operational outcome → rerun affected journey/actor/state/handoff traces → rerun ownership/contract/data/runtime traces → revalidate materially touched project-frame claims + governance impact + affected prior closures → invalidate descendant symptoms → discover exposed roots → rebuild affected coverage → rerank`.

If a treatment changes shared authority, Product/System semantics, cross-domain boundary or durable invariant, broaden re-diagnosis far enough to prove project-level consistency for that concept; do not confine proof to the objective that exposed the root.

Never mechanically execute an old finding list after system truth changes. The adaptive treatment loop and saturation condition are owned by `03-LIVE-EXECUTION-RESTRUCTURE-CLEANUP.md`.

## 17. Final finishing gate

Before freeze, every materially affected remaining artifact needs a defensible:

`Necessary Purpose | Correct Owner | Real Consumer | Requirement | Proven Value | Correct Placement | Correct Naming/Context`.

Closure is blocked by known related dead/unreachable code, superseded implementation, duplicate authority, stale/orphan reference, old path/alias, misleading naming, wrong placement/ownership, unused dependency, obsolete config/env/flag/script, workaround/fallback, stale docs/comments/examples, debug/temp artifact, unjustified compatibility residue or materially unjustified complexity tied to scope.

Material governance/product artifacts capable of directing future work toward a stale owner/path/semantic model are closure-blocking even if runtime currently works.

## 18. Final freeze and branch-race gate

After required writes:

`FREEZE PROJECT WRITES → FINAL_CANDIDATE = exact last allowed candidate → final evidence is read-only with respect to candidate`.

Any subsequent material write reopens the candidate cycle.

Immediately before ref update/push and final decision re-resolve target HEAD and classify movement under `01`. Do not force stale candidates over newer truth.

## 19. Final negative-space pass

Search deliberately for missing consumer/surface, route/handler/contract field, writer/readback, failure/recovery path, authorization boundary, handoff/intervention, migration/compatibility transition, hidden duplicate/legacy truth, missing project-frame relation/invariant impact, missing prior-closure reconciliation, missing focus applicability disposition, missing governance reconciliation, missing repository-platform proof when relied upon, and missing operational/audit evidence required by the claim.

Unexplained material absence remains open.

## 20. Final adversarial re-diagnosis

Assume closure is false and search for:

`missed domain/capability | objective-induced local optimization | project-frame contradiction | cross-objective regression | duplicate truth | stale/wrong governance | hidden consumer/writer | reachable old path | contract/data mismatch | cross-surface mismatch | unintended affected regression | incomplete consumer migration | failure/recovery gap | runtime divergence | stale process/data | unresolved semantic ambiguity | patch/workaround | race/idempotency issue | security/isolation issue | wrong placement/naming/context | orphan references | unjustified complexity | assurance loss/cost shift in tooling changes | stale/mismatched repository-platform evidence`.

Any material issue reopens diagnosis/treatment/verification.

## 21. Coverage vs closure

`COVERAGE_COMPLETE` means required material nodes are accounted for and inspected or proven N/A, including required project-frame/focus/governance dispositions for the claim.

`CLOSURE_COMPLETE` additionally means all material roots/findings are treated and verified on the correct candidate/runtime and the treatment remains consistent with the project-wide Canonical frame.

## 22. Closure equation

`CLOSED` only when every materially required condition is proven:

```text
ZERO_UNKNOWN_REQUIRED_COVERAGE
AND ZERO_UNINSPECTED_REQUIRED_NODES
AND ALL_MATERIAL_FOCUS_DIMENSIONS_DISPOSITIONED
AND ZERO_KNOWN_MATERIAL_OPEN_ROOTS
AND ZERO_UNRESOLVED_MATERIAL_FINDINGS
AND ZERO_FIXED_PENDING_VERIFY_FINDINGS
AND ZERO_UNRESOLVED_REQUIRED_DECISIONS
AND ZERO_UNACCOUNTED_AFFECTED_CONSUMERS
AND ZERO_UNMIGRATED_AFFECTED_CONSUMERS
AND ZERO_UNINTENDED_AFFECTED_REGRESSIONS
AND ZERO_CROSS_OBJECTIVE_REGRESSIONS
AND ZERO_PROJECT_INVARIANT_REGRESSIONS
AND ZERO_UNKNOWN_MATERIAL_DEPENDENCIES
AND ZERO_UNRECONCILED_PROJECT_FRAME_CONTRADICTIONS
AND ZERO_CONTRADICTORY_CANONICAL_TRUTHS
AND ZERO_DUPLICATE_AUTHORITATIVE_WRITERS
AND ZERO_UNJUSTIFIED_PARALLEL_TRUTH
AND ZERO_UNJUSTIFIED_REACHABLE_LEGACY_PATHS
AND ZERO_KNOWN_FINAL_PATCHES/WORKAROUNDS/FALLBACKS
AND ZERO_MATERIAL_MIGRATION/BACKFILL/CUTOVER_GAPS
AND ZERO_MATERIAL_CONTRACT/BINDING_DRIFT
AND ZERO_MATERIAL_AUTH/SCOPE/SECURITY_GAPS
AND ZERO_UNRESOLVED_RUNTIME/DATA_STATE
AND ZERO_UNRECONCILED_MATERIAL_GOVERNANCE_IMPACT
AND ZERO_MATERIAL_GOVERNANCE_DRIFT_CAPABLE_OF_MISLEADING CURRENT_OR_FUTURE_WORK
AND ZERO_BROKEN/ORPHAN/STALE_REFERENCES_EXPOSED_BY_WORK
AND ZERO_MATERIAL_CLEANUP_RESIDUE_TIED_TO_SCOPE
AND ZERO_MATERIAL_UNJUSTIFIED_COMPLEXITY_TIED_TO_SCOPE
AND ZERO_UNVERIFIED_MATERIAL_CLAIMS
AND ZERO_REQUIRED_MISSING/STALE_EVIDENCE
AND ZERO_REQUIRED_REPOSITORY_PLATFORM_TRUTH_GAPS
AND ZERO_SILENT_EXCLUSIONS
AND LATEST_REQUIRED_HEAD_RECONCILED
AND FINAL_PROJECT_CONSISTENCY_PASS
AND FINAL_NEGATIVE_SPACE_PASS
AND FINAL_ADVERSARIAL_REDIAGNOSIS_PASS
```

If any conjunct is unproven, state is `OPEN` unless a valid `DECISION_REQUIRED` or `EXTERNAL_BLOCKER` applies.

`FINAL_PROJECT_CONSISTENCY_PASS` means the current objective/root is proven compatible with the materially touched project-wide Product/System frame, shared authorities/invariants, affected governance and previously proven canonical closures. It does not require exhaustive proof of unrelated unknown areas.

## 23. Temporary plan-file closure lifecycle

When the optional `PHASE=EXECUTE_CLOSE` overlay from `00` is active, `PLAN_FILE` remains a temporary execution record until every material item it carried and every materially related item exposed during treatment satisfies the closure requirements above. Do not delete it merely because its original checklist was exhausted.

After all closure conditions are proven except the plan-file retirement/final read-only pass:

```text
DELETE PLAN_FILE AS THE LAST INTENDED PROJECT WRITE
→ NEW FINAL_CANDIDATE
→ FINAL READ-ONLY PROJECT-CONSISTENCY / AUDIT / INSPECTION / DIAGNOSIS / ANALYSIS / NEGATIVE-SPACE PASS
→ RE-RESOLVE LIVE HEAD
→ CLOSED ONLY IF NOTHING MATERIAL REOPENS
```

The deletion is a write and therefore creates a new candidate. If the final read-only pass exposes a material issue, closure is revoked; recreate/continue the temporary execution record before further mutation and resume the normal treatment cycle.

## 24. Final report

Keep reporting concise and evidence-based: repository/ref, objective, starting/final observed HEAD, final candidate relation, relevant project-frame authority/invariants, highest roots treated, canonical owners, migrations/cutovers/cleanup, affected consumers/surfaces, governance disposition, verification actually performed and proof limits, runtime provenance/readback when claimed, repository-platform truth when materially relied upon, foreign-delta reconciliation, any prior closure reopened/reconciled, remaining true blocker/decision, and final state.

Package independence/self-validation rules remain governed solely by `00-ORCHESTRATOR.md`.