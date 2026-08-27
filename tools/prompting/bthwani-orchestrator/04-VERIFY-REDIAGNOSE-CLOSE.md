# Verification, Exact-Candidate Evidence, Re-Diagnosis and Fail-Closed Closure

## 1. Verification proves claims, not activity

Choose the smallest sufficient proof that can falsify the claim, then escalate by material risk.

Typical progression:

`direct inspection -> nearest unit/module regression -> affected integration/type/lint/build -> contract/data/security -> runtime/readback -> cross-surface/E2E -> broad final closure checks`.

```text
TEST PASS != PRODUCT CORRECTNESS
BUILD PASS != SYSTEM CORRECTNESS
TYPE/LINT PASS != OPERATIONAL CORRECTNESS
STATIC PASS != RUNTIME PROOF
TOOL GREEN != ALL FINDINGS RESOLVED
PR BODY != CURRENT PR TRUTH
OLD SHA != CURRENT CANDIDATE
SEPARATE WORKTREE != PARALLEL SAFETY
```

## 2. Candidate, PR and concurrent-work identity

For PR-scoped work, closure identity is:

```text
PR_NUMBER
CURRENT_HEAD_SHA
CURRENT_BASE_SHA
HEAD_REF
BASE_REF
```

`PR_NUMBER` is stable through the branch lifecycle. `HEAD_SHA` advances with commits.

```text
SAME PR + NEW SHA -> new candidate; invalidate affected old evidence
DIFFERENT PR -> never current-PR closure evidence
SYNTHETIC MERGE SHA -> distinct from PR head candidate unless the claim explicitly targets merge simulation
```

Candidate lifecycle:

```text
STARTING_LIVE_HEAD
WORK_BASE_HEAD
IMPLEMENTATION_COMMIT(S)
FINAL_CANDIDATE
HEAD_AT_REVIEW_START
HEAD_AT_DECISION
```

Any material write after `FINAL_CANDIDATE` creates a new candidate.

When `ACTIVE_WORKSET` or other concurrent work exists, closure identity additionally includes the **current coordination boundary**:

```text
human-known active objectives at final reconciliation
visible concurrent/ref delta
collision dispositions relevant to the selected Closure Unit
shared authority/write/cutover/evidence dependencies
```

An objective proven parallel-safe at selection can become overlapping later. Reconcile again before final closure.

## 3. Material evidence record

Every material evidence item used for closure remains reconstructable with:

```text
claim/finding/root proved
PR_NUMBER when PR-scoped
candidate SHA / immutable source identity
command/run/job/check/artifact/manual scenario
runner/environment/profile/device when relevant
result/status
what it proves
what it does NOT prove
config/rule provenance when relevant
freshness
invalidation trigger
```

Evidence without adequate provenance cannot support a stronger claim than its provenance.

## 4. Tool evidence is diagnostic input first, gate evidence last

Canonical lifecycle:

```text
RUN/READ TOOL ON EXACT CANDIDATE
-> INGEST RAW OUTPUT
-> ACCOUNT FOR EVERY MATERIAL FINDING + EXECUTION/COVERAGE WARNING
-> VALIDATE/FALSIFY
-> CORRELATE/DEDUPLICATE
-> MAP TO ROOTS
-> TREAT ACTUAL SOURCE-OF-FIX
-> RERUN INVALIDATED TOOL
-> INGEST AGAIN
-> FINAL STATUS/GATE ONLY AFTER FINDINGS LIFECYCLE IS COMPLETE
```

Passing a tool/gate without dispositioning its material findings is not closure.

Tools do not decide Product/System Truth. Their outputs are evidence and hypotheses subject to root analysis.

## 5. Required verification dimensions

Verify where material:

- root cause actually removed at Source-of-Fix;
- selected Closure Unit still corresponds to the proven root/canonical target;
- canonical owner/write path enforced;
- all materially affected writers/readers/consumers migrated;
- no half cutover or unintended regression;
- success/failure/recovery/unknown-result paths;
- states/invariants/handoffs;
- cross-surface meaning;
- contract/data/runtime vertical integrity;
- auth/authz/security/isolation;
- migration/backfill/readback/restart/idempotency/concurrency;
- previous canonical closures remain valid or are intentionally reconciled;
- focus applicability dispositions complete;
- governance impact synchronized where required;
- every still-valid cleanup/deletion obligation executed/verified;
- no new parallel truth;
- structural completion/finishing pass complete;
- repository-platform truth when relied upon;
- current ACTIVE_WORKSET/concurrent delta has been re-resolved and no unresolved collision now overlaps the selected root's authority/write/cutover/evidence cone.

## 6. Failure classification

Classify the first causal failure in each materially independent failure chain, then correlate chains into root clusters:

```text
DETERMINISTIC_PRODUCT
DETERMINISTIC_TEST_OR_CONTRACT
DETERMINISTIC_TOOL_OR_WORKFLOW_CONFIG
AUTHORITY_PERMISSION_OR_CREDENTIAL
INEFFECTIVE_OR_MISSING_EXECUTION
INFRA_OR_RUNNER
EXTERNAL_PROVIDER
FLAKY_OR_NONDETERMINISTIC
CANCELLED_OR_SUPERSEDED
STALE_RUN
```

Deterministic failures become findings/root evidence and require correction before closure. Flakiness remains a defect until controlled/proven. Cancelled/superseded/stale is neither PASS nor current product FAIL.

## 7. Repository-platform truth

When the claim depends on GitHub/repository platform state, inspect it live against the exact candidate.

As applicable verify:

```text
current PR identity from repository API
current PR head/base SHA
workflow runs/checks bound to that exact PR/SHA
pending/missing/failed/cancelled/superseded/stale runs
review provenance / unresolved threads when governed
live rulesets/branch protection/settings
mergeability/base relation
Sonar/CodeQL/Semgrep/security/dependency/quality analysis provenance
final PR closure evidence
```

Rules:

```text
TRACKED WORKFLOW CONFIG != LIVE ENFORCEMENT
ABSENCE OF RED != PASS WHEN REQUIRED EVIDENCE IS MISSING
SUCCESS ON OTHER SHA != CURRENT EVIDENCE
SUCCESS ON OTHER PR != CURRENT EVIDENCE
SAME WORKFLOW NAME != SAME CANDIDATE
```

PR body/comments/plans may provide history/context but never current SHA authority.

## 8. Canonical PR Closure Evidence

When repository policy requires PR closure evidence, one stable final repository-platform check should prove **completeness/provenance**, not hide underlying analyzers.

Conceptually:

```text
BThwani / PR Closure Evidence
```

It proves, as applicable:

```text
CURRENT PR_NUMBER proven
CURRENT HEAD_SHA proven
CURRENT BASE_SHA proven
required CI/runtime evidence complete
required Sonar evidence complete
required CodeQL evidence complete
required Semgrep evidence complete
required security/dependency evidence complete
required semantic review complete
all required evidence bound to the same current candidate
zero missing/stale/mismatched required evidence
zero undispositioned material raw findings
zero unjustified/expired material suppressions
```

It does **not** turn “tool job success” into proof that findings are clean. Detailed tool evidence remains visible and traceable.

Final merge must be bound to the exact verified final head SHA. A newer commit after closure evidence invalidates merge readiness.

## 9. Remote evidence policy

Where a repository-platform analysis authority is remote, final repository-platform proof must come from remote exact-candidate execution/read-back.

Local analysis may be supporting diagnostic evidence, but cannot satisfy a required remote status/check/analysis authority.

`REMOTE TOOL CONFIG PRESENT != REMOTE ANALYSIS PRODUCED`.

If a scanner step was skipped because an upstream coverage/build step failed, classify `INEFFECTIVE_OR_MISSING_EXECUTION`; do not read old scanner output as current-candidate analysis.

## 10. Semantic review provenance

OpenCodeReview/CodeRabbit/agent review outputs are review evidence, not automatic truth.

A context-preparation workflow is not semantic review completion.

When semantic review is required, record:

```text
PR_NUMBER
HEAD_SHA
context/run/artifact identity
reviewer/agent provenance
material findings
finding dispositions/root mappings
review completion
```

Self-review is not independent review. Independent review is required only when policy/risk requires it.

## 11. Suppression closure

`AUTHORIZED_INTENTIONAL_CONDITION` requires explicit governing Product/Security/Policy/human authority; the executing agent may not self-authorize a material intentional suppression merely for convenience.

A suppression must have narrow scope, rationale, owner, proof it hides no required path and expiry/removal condition when temporary.

Closure requires:

`ZERO_UNJUSTIFIED_OR_EXPIRED_MATERIAL_SUPPRESSIONS`.

## 12. Evidence invalidation

For every material evidence item reason about candidate, inputs/environment, covered scope and invalidation triggers.

Examples:

- Product/authority change -> revalidate target + consumers;
- contract/schema change -> generators/consumers/integration;
- data/migration change -> DB/runtime/readback;
- runtime/config/network change -> affected runtime/E2E;
- auth/permission change -> negative isolation/security;
- shared canonical library change -> all proven consumers;
- workflow/ruleset/tool config change -> repository-platform evidence;
- active-objective/concurrent delta overlaps authority/write/cutover/evidence cone -> re-run collision analysis and invalidate dependent proof;
- unrelated docs change -> retain only if independence is proven.

Rerun invalidated proof; do not rerun everything mechanically and do not retain stale proof.

## 13. Re-diagnosis loop

After every material root treatment:

```text
reinspect operational outcome
-> rerun affected journey/state/ownership/contract/data/runtime traces
-> ingest all new tool/review/runtime outputs under 02
-> reconcile visible concurrent delta / ACTIVE_WORKSET assumptions under 01/05 when relevant
-> invalidate descendant symptoms
-> discover exposed roots
-> rebuild affected coverage
-> rerank
```

If a higher root appears, reopen affected descendant treatment. Never mechanically execute a stale finding list after system truth changes.

An independent newly discovered root does not silently expand the selected Closure Unit. It enters re-ranking unless it is a causal parent that invalidates the current root treatment.

## 14. Zero-reference/reachability proof

For each still-valid `DELETE_REQUIRED` item prove:

```text
ARTIFACT ABSENT FROM ACTIVE TREE
AND ZERO STALE/REACHABLE REFERENCE/REGISTRATION
AND REQUIRED REPLACEMENT/CUTOVER PRESENT
AND CONSUMERS/CONFIG/TESTS/GENERATED BINDINGS REPAIRED
AND REQUIRED VALUE PRESERVED OR INTENTIONALLY MIGRATED
```

Textual zero-reference search alone is insufficient when runtime/reachable registration can exist.

## 15. Final finishing gate

Before freeze, every material remaining affected artifact needs a defensible:

`Necessary Purpose | Canonical Owner | Single Responsibility | Real Consumer | Correct Layer | Dependency Direction | Proven Value | Correct Placement | Clear Name | No Duplicated Authority | No Superseded Implementation`.

Closure is blocked by known material related:

`dead/unreachable code | duplicate authority | stale/orphan reference | obsolete alias/path | misplaced/unowned artifact | unjustified wrapper/indirection | stale config/env/flag/script | unused dependency | obsolete test/fixture/mock | direct generated-output patch without authority | legacy/fallback residue | unfinished restructuring | misleading docs/comments that can redirect future work`.

## 16. Final negative-space and adversarial pass

Assume closure is false. Search deliberately for:

`hidden writer/consumer | duplicate truth | stale governance | missing durable truth | reachable old path | unexecuted cleanup | contract/data mismatch | cross-surface mismatch | missing recovery | half migration | runtime divergence | stale process/data | patch/workaround/fallback | race/idempotency | security/isolation gap | wrong placement/naming/context | orphan references | unjustified complexity | stale/mismatched PR/SHA/tool evidence | concurrent objective authority overlap | shared cutover collision | evidence dependency on unfinished external work`.

Any material issue reopens diagnosis/treatment/verification.

## 17. Final concurrent-work reconciliation gate

Immediately before declaring the selected Closure Unit closed:

```text
RE-RESOLVE TARGET / PR / HEAD
-> RE-INGEST HUMAN-KNOWN ACTIVE_WORKSET
-> RECONCILE VISIBLE FOREIGN/CONCURRENT DELTA
-> RECHECK AUTHORITY / WRITE SET / CONTRACT / DATA / MIGRATION / RUNTIME / GOVERNANCE / CUTOVER / EVIDENCE COLLISIONS
-> if overlap emerged: classify under 01/05 and reopen affected treatment or serialize
-> if independent: preserve foreign work and retain only valid evidence
```

A Closure Unit cannot be declared `CLOSED` while its final state depends on unresolved behavior from another active objective or while both units independently claim the same material authority.

## 18. Closure equation

`CLOSED` only when every materially applicable term is proven:

```text
ZERO_UNKNOWN_REQUIRED_COVERAGE
AND ZERO_KNOWN_MATERIAL_OPEN_ROOTS_WITHIN_SELECTED_CLOSURE
AND ZERO_UNRESOLVED_MATERIAL_FINDINGS_WITHIN_SELECTED_CLOSURE
AND ZERO_FIXED_PENDING_VERIFY_FINDINGS_WITHIN_SELECTED_CLOSURE
AND ZERO_UNRESOLVED_REQUIRED_DECISIONS_FOR_SELECTED_CLOSURE
AND ZERO_UNACCOUNTED_OR_UNMIGRATED_AFFECTED_CONSUMERS
AND ZERO_UNINTENDED_AFFECTED_REGRESSIONS
AND ZERO_PROJECT_INVARIANT_REGRESSIONS
AND ZERO_CONTRADICTORY_CANONICAL_TRUTHS
AND ZERO_DUPLICATE_AUTHORITATIVE_WRITERS
AND ZERO_UNJUSTIFIED_PARALLEL_TRUTH
AND ZERO_UNJUSTIFIED_REACHABLE_LEGACY_PATHS
AND ZERO_UNEXECUTED_DELETE_REQUIRED_ARTIFACTS
AND ZERO_UNCLASSIFIED_MATERIAL_RELATED_CLEANUP_RESIDUE
AND ZERO_UNVERIFIED_CLEANUP/DELETION_OUTCOMES
AND ZERO_KNOWN_FINAL_PATCHES/WORKAROUNDS/FALLBACKS
AND ZERO_COSMETIC_ONLY_ROOT_TREATMENTS
AND ZERO_KNOWN_MATERIAL_SOURCE_OF_FIX_BYPASSES
AND ZERO_DIRECT_GENERATED_OUTPUT_PATCHES_WITHOUT_PROVEN_AUTHORITY
AND ZERO_MATERIAL_UNJUSTIFIED_WRAPPERS_OR_INDIRECTION
AND ZERO_MATERIAL_OWNERLESS_OR_MISPLACED_ARTIFACTS
AND ZERO_MATERIAL_STRUCTURAL_DUPLICATION
AND ZERO_MATERIAL_UNJUSTIFIED_DIRECTORIES
AND ZERO_MATERIAL_STALE_CONFIG_OR_SCRIPTS
AND ZERO_MATERIAL_UNUSED_DEPENDENCIES
AND ZERO_MATERIAL_OBSOLETE_TESTS_FIXTURES_MOCKS
AND ZERO_MATERIAL_UNFINISHED_RESTRUCTURING
AND ZERO_UNDISPOSITIONED_MATERIAL_TOOL_FINDINGS
AND ZERO_UNJUSTIFIED_OR_EXPIRED_MATERIAL_SUPPRESSIONS
AND ZERO_UNRECONCILED_ACTIVE_WORKSET_COLLISIONS
AND ZERO_UNRESOLVED_SHARED_CUTOVER_OR_EVIDENCE_DEPENDENCIES
AND ALL_REQUIRED_APPLICABLE_FINAL_TOOL/REMOTE_EVIDENCE_PRESENT_ON_EXACT_FINAL_CANDIDATE
AND NO_STALE_OR_CROSS_PR_OR_CROSS_SHA_CLOSURE_EVIDENCE
AND FINAL_NEGATIVE_SPACE_CLEAN
AND FINAL_ADVERSARIAL_REDIAGNOSIS_CLEAN
```

This equation is scoped to the selected Closure Unit and its complete causal affected cone. It does not require an independent active root in another proven non-overlapping cone to be closed first.

If a deep post-treatment audit can still reasonably find material residue tied to the selected root that should have been closed with it, `CLOSED` is false.

## 19. System-completeness closure matrix

`04` is the only closure authority for the completeness dispositions introduced by `01` and the three levels introduced by `00`.

Before any closure claim, reconcile the selected root against the live material matrix:

```text
DOMAINS
SERVICES
APPLICATIONS
SURFACES
ACTORS
JOURNEYS / CAPABILITIES
STATES
TRANSITIONS
HANDOFFS
WRITERS
READERS / CONSUMERS
CONTRACTS / EVENTS
GENERATED BINDINGS
DATA / DATABASE / MIGRATIONS
JOBS / ASYNC PROCESSING
RUNTIME / INTEGRATIONS / PROVIDERS
AUTHORIZATION / SECURITY / PRIVACY
FAILURE / RECOVERY / IDEMPOTENCY / CONCURRENCY
PERFORMANCE / RESOURCE BEHAVIOR
TESTS / ASSURANCE
LEGACY / NEGATIVE SPACE
DURABLE GOVERNANCE when materially touched
```

For every material matrix cell, final state must be one of:

```text
TREATED_AND_VERIFIED
VERIFIED_UNCHANGED
DERIVED_ONLY_WITH_CANONICAL_SOURCE_PROVEN
N/A_PROVEN
```

A closure claim is forbidden while any materially relevant cell is:

```text
UNKNOWN_MATERIAL
AFFECTED_PENDING_TREATMENT
STALE
PARTIAL
UNVERIFIED
CONFLICTING
BLOCKED
DECISION_REQUIRED
UNCLASSIFIED
```

A legitimate stop state may explain why work cannot close; it does not turn the blocked cell into a pass.

### 19.1 Transition and handoff proof

Every materially affected transition/handoff must prove, as applicable:

```text
CURRENT STATE
-> ACTOR / INITIATOR
-> ACTION / EVENT
-> AUTHORIZATION + PRECONDITIONS
-> CANONICAL DECISION OWNER
-> CANONICAL WRITER / TRANSACTION
-> NEW STATE
-> CONTRACT / EVENT / TRANSPORT
-> NEXT SERVICE / CONSUMER
-> NEXT SURFACE / ACTOR
-> CANONICAL READBACK / ACKNOWLEDGEMENT
-> FAILURE / RETRY / DUPLICATE / ORDERING / RECOVERY
-> TERMINAL OR NEXT OWNED ACTION
```

Check domain transitions, service handoffs, surface handoffs and data/schema transitions separately when each is material. An unverified boundary keeps the parent journey/capability open.

### 19.2 Invariant proof

For every material invariant prove:

```text
INVARIANT
-> CANONICAL OWNER
-> ENFORCEMENT LAYER(S)
-> CONCURRENCY / TRANSACTION SAFETY WHEN MATERIAL
-> FALSIFIABLE TEST/PROOF
-> RUNTIME/PERSISTED READBACK WHEN MATERIAL
```

An invariant with no proven enforcement owner is a material gap.

### 19.3 Three-level closure proof

```text
LEVEL_1_CLOSURE_UNIT
= selected root/causal cluster is fully treated and verified across its complete causal system cone.

LEVEL_2_CAPABILITY_OR_JOURNEY
= every material service/surface/state/transition/handoff in the capability/journey is mutually consistent from entry through failure/recovery to terminal/readback outcome.

LEVEL_3_FINAL_SYSTEM_CANDIDATE
= every Closure Unit required by the current objective is reconciled on one exact candidate with all applicable final evidence current.
```

A Level 1 proof must never be reported as Level 2 or Level 3.

### 19.4 Zero-unclassified-noise gate

Closure does **not** mean zero useful logging or zero intentional observability. It requires zero **unclassified material noise** within the proven cone, including as applicable:

```text
owned unexplained compiler warnings
material type/lint findings
unexpected runtime errors/warnings
unexpected console noise
known test flakiness
unexplained skipped material tests
active-code deprecation residue
scanner findings without disposition
silent degradation/fake-success behavior
```

A system must not appear healthy while materially broken. Failure must be explicit, deliberately degraded under a proven design, or recovered through a proven recovery path.

### 19.5 Adversarial completeness pass

When materially applicable, actively challenge the final candidate with negative-space scenarios such as:

`wrong actor | wrong role/scope | stale state | duplicate request | replayed event | out-of-order event | concurrent mutation | double submit | timeout | unknown result | dependency outage | partial service failure | invalid data | stale generated client | legacy consumer | retry/restart/recovery`.

Do not run every scenario mechanically. Select the scenarios capable of falsifying the actual invariants, transitions, handoffs and failure model of the selected root.

### 19.6 Additional non-optional closure terms

The §18 equation additionally requires, where material:

```text
ZERO_UNKNOWN_MATERIAL_MATRIX_CELLS
AND ZERO_UNVERIFIED_MATERIAL_TRANSITIONS_OR_HANDOFFS
AND ZERO_MATERIAL_INVARIANTS_WITHOUT_PROVEN_ENFORCEMENT
AND ZERO_UNCLASSIFIED_MATERIAL_NOISE
AND LEVEL_CLAIM_MATCHES_ACTUAL_PROOF
```

These terms strengthen, and do not replace, the existing Closure Equation.