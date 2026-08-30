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
SEPARATE EXECUTION CONTEXT != PARALLEL SAFETY
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

### 4.1 Evidence disposition and discovery scheduling

Every materially applicable proof dimension must have an explicit disposition. Green is forbidden as a synonym for absence of evidence.

```text
PASS            = the exact current claim was executed and falsification did not occur.
FAIL            = the claim was executed and produced material failure evidence.
BLOCKED_BY      = execution was impossible because a proven prerequisite failed; never PASS.
NOT_APPLICABLE  = materiality analysis proves the claim is outside the current cone.
NOT_COVERED     = the claim is material but no adequate verifier/evidence exists or executed; closure is forbidden.
STALE           = evidence existed but its candidate/input/environment/freshness was invalidated.
SUPERSEDED      = newer exact evidence replaces an older item; the older item is not current proof.
```

`SKIPPED`, missing output, missing tool configuration, missing device/browser/runtime, or a green sibling check MUST NOT be translated to `PASS`. Resolve each to one of the dispositions above.

Discovery is an evidence stream, not an execution barrier:

```text
PIN ONE EXACT DISCOVERY SNAPSHOT
-> launch all independently executable applicable collectors with bounded safe parallelism
-> each collector continues through independent checks and aggregates at its own end
-> ingest findings as soon as they become available
-> agent continues repository audit/root proof/treatment while other collectors are still running
-> do not wait for the entire wave when a root is already proven executable
-> do not dispatch another broad remote wave merely because a remediation commit was pushed
-> first close/disposition the known findings/root families from the current wave
-> compute evidence invalidation from the actual remediation cone
-> rerun only invalidated/newly-required proof
-> reserve a fresh broad repository/Level-4 wave for fixed-point proof and the exact final candidate
```

A collector may stop only when a later check has a real causal prerequisite on the failed step. Such checks are `BLOCKED_BY`; independent checks must continue. Repeated `RED -> tiny fix -> rerun everything` caused by first-failure masking is a verification-system defect and must itself be root-corrected.

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

## 17. Final concurrent-execution contextconciliation gate

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
AND ALL_MATERIAL_HUMAN_EXPERIENCE_CLAIMS_SATISFY_§21_WHEN_USER_FACING
AND ALL_REQUIRED_APPLICABLE_FINAL_TOOL/REMOTE_EVIDENCE_PRESENT_ON_EXACT_FINAL_CANDIDATE
AND NO_STALE_OR_CROSS_PR_OR_CROSS_SHA_CLOSURE_EVIDENCE
AND FINAL_NEGATIVE_SPACE_CLEAN
AND FINAL_ADVERSARIAL_REDIAGNOSIS_CLEAN
```

This equation is scoped to the selected Closure Unit and its complete causal affected cone. It does not require an independent active root in another proven non-overlapping cone to be closed first.

If a deep post-treatment audit can still reasonably find material residue tied to the selected root that should have been closed with it, `CLOSED` is false.

## 19. System-completeness closure matrix

`04` is the only closure authority for the completeness dispositions introduced by `01` and the closure levels introduced by `00`.

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

### 19.3 Closure-level proof

```text
LEVEL_1_CLOSURE_UNIT
= selected root/causal cluster is fully treated and verified across its complete causal system cone.

LEVEL_2_CAPABILITY_OR_JOURNEY
= every material service/surface/state/transition/handoff in the capability/journey is mutually consistent from entry through failure/recovery to terminal/readback outcome.

LEVEL_3_FINAL_SYSTEM_CANDIDATE
= every Closure Unit required by the current objective is reconciled on one exact candidate with all applicable final evidence current.

LEVEL_4_REPOSITORY_SYSTEM_BASELINE
= the claimed repository/system baseline has complete live topology and lens dispositions, zero known material open roots or unknown material cells, every systemic baseline in §22 proven or N/A_PROVEN, a clean fresh broad adversarial re-audit, and exact-candidate baseline evidence.
```

A lower-level proof must never be reported as a higher-level proof.

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

## 20. Verification-technique selection, evidence diversity and fixed-point proof

Verification technique must be selected by the claim and failure model, not habit. Use the smallest sufficient technique set capable of falsifying the material risk, escalating only when required. Applicable techniques include:

```text
EXAMPLE-BASED TESTING
PROPERTY-BASED TESTING
STATE-MACHINE / MODEL-BASED TESTING
FUZZING
DIFFERENTIAL TESTING
CONTRACT TESTING
MUTATION TESTING
CONCURRENCY / RACE TESTING
FAULT INJECTION / DEPENDENCY FAILURE
LOAD / STRESS / SOAK TESTING
RESTART / RECOVERY TESTING
MIGRATION / BACKFILL REHEARSAL
CLEAN-STATE / CLEAN-ROOM REPRODUCTION
VISUAL / ACCESSIBILITY / RTL PROOF
DEVICE / PLATFORM / MOBILE-LIFECYCLE PROOF
REMOTE EXACT-CANDIDATE ANALYSIS
```

Do not run every technique mechanically. A technique is justified only when it can materially falsify a claim or expose a plausible failure mode.

For high-risk claims, increase **evidence diversity** rather than repeating one evidence class. Examples:

```text
AUTHORIZATION -> source/policy inspection + negative isolation test + runtime/readback when material
MIGRATION -> schema/migration inspection + representative upgrade/backfill + persisted readback
DISTRIBUTED RETRY -> logic proof + duplicate/replay integration + restart/unknown-result evidence
```

There is no fixed evidence-count quota. The rule is:

```text
MATERIAL RISK UP -> REQUIRED INDEPENDENT EVIDENCE DIVERSITY UP
```

A repository/system fixed point under `00` may be claimed only after the root queue is exhausted **and then** a fresh broad audit is rebuilt from current live topology, current lens dispositions and current exact candidate. If that fresh audit exposes a material root, stale/unknown cell or contradicted assumption, fixed point is false and the execution loop reopens.

`LEVEL_4_REPOSITORY_SYSTEM_BASELINE` additionally requires, where applicable to the claimed baseline:

```text
ALL LIVE MATERIAL DOMAINS/SERVICES/APPLICATIONS/SURFACES/JOURNEYS DISCOVERED
ALL MATERIAL TOPOLOGY + EXPERT-LENS DISPOSITIONS COMPLETE
ALL SYSTEMIC BASELINE FAMILIES IN §22 PROVEN OR N/A_PROVEN
ZERO KNOWN MATERIAL OPEN ROOTS IN CLAIMED BASELINE
ZERO UNKNOWN/UNCLASSIFIED MATERIAL CELLS
ZERO KNOWN MATERIAL LEGACY/SHADOW/NOISE RESIDUE
FRESH BROAD ADVERSARIAL RE-AUDIT CLEAN
CLEAN-STATE REPRODUCTION FROM DECLARED SOURCE/TOOLCHAIN/LOCKED INPUTS PROVEN
REQUIRED GENERATION/MIGRATION/STARTUP/HEALTH/BUILD/MATERIAL SMOKES PROVEN
ALL REQUIRED FINAL REMOTE/PLATFORM EVIDENCE CURRENT ON EXACT CANDIDATE
```

Clean-state proof must not rely on hidden manual database edits, undeclared global tools, machine-specific generated source, stale processes, untracked configuration or previous workspace mutation. If a material platform/environment requirement cannot be reproduced from declared inputs, the Level-4 claim remains open.

Fixed-point and Level-4 claims are always scope- and evidence-bounded. They must never be phrased as proof that no future or currently unknowable defect can exist.

## 21. Rendered human-experience proof

For every user-facing root where `01` marks human experience material:

```text
SOURCE / TOKEN / COMPONENT CORRECT != RENDERED EXPERIENCE CORRECT
PIXEL-SAME != DESIGN CORRECT
AUTOMATED ACCESSIBILITY PASS != ACCESSIBLE JOURNEY
DESIGNER/AGENT CONFIDENCE != USABILITY EVIDENCE
```

Select a **sparse rendered-experience matrix** containing only combinations capable of falsifying the actual claim. Dimensions may include:

```text
SURFACE / ROUTE / SCREEN
× VIEWPORT / DEVICE / PLATFORM
× MATERIAL UI / DOMAIN STATE
× ACTOR / PERMISSION CONTEXT
× LANGUAGE / DIRECTION
× TEXT SCALE
× INPUT MODE
× NETWORK / OFFLINE CONDITION
× THEME when governed
× REDUCED-MOTION / ACCESSIBILITY CONDITION
```

Evidence depth follows risk. As applicable combine canonical design/content-source inspection, component/pattern state proof, rendered visual comparison, responsive/layout inspection, keyboard/focus and screen-reader/platform accessibility proof, interaction/journey execution, user-perceived performance evidence and representative usability evidence when the claim depends on real-user comprehension or task completion.

Visual regression proves that an approved baseline did or did not change; it does not prove that the baseline was correct. Snapshot/pixel evidence therefore cannot replace Product/UX, accessibility or usability proof.

Human-experience closure requires, where material:

```text
ZERO_UNKNOWN_MATERIAL_USER_NEEDS
AND ZERO_UNKNOWN_MATERIAL_UX/DESIGN_DIMENSIONS
AND ZERO_UNJUSTIFIED_VISUAL_IDENTITY_DRIFT
AND ZERO_UNJUSTIFIED_LOCAL_DESIGN-TOKEN AUTHORITY
AND ZERO_DUPLICATE_COMPONENT/PATTERN DESIGN AUTHORITY
AND ZERO_UNCLASSIFIED_MATERIAL_COMPONENT/PATTERN STATES
AND ZERO_UNVERIFIED_MATERIAL_RESPONSIVE/PLATFORM STATES
AND ZERO_KNOWN_MATERIAL RTL/LOCALIZATION DEFECTS
AND ZERO_KNOWN_MATERIAL ACCESSIBILITY DEFECTS
AND ZERO_UNPROVEN_CROSS-SURFACE EXPERIENCE DIVERGENCE
AND ZERO_KNOWN_MATERIAL VISUAL/INTERACTION REGRESSIONS
AND ZERO_UNCLASSIFIED_MATERIAL CONTENT/MICROCOPY SEMANTICS
AND ZERO_UNPROVEN_HIGH-RISK USABILITY_ASSUMPTIONS
AND ZERO_UNKNOWN/INCOMPATIBLE_MATERIAL_DESIGN-ASSET_PROVENANCE
AND RENDERED EXPERIENCE EVIDENCE CURRENT ON THE EXACT CANDIDATE
```

If representative-user or platform/device evidence is genuinely required for the specific claim and cannot be obtained with available authority/capability, do not self-certify the claim. Keep the dependent closure open and map the inability to the existing legitimate `00` stop state that actually applies.

## 22. Level-4 systemic baseline proof

`LEVEL_4_REPOSITORY_SYSTEM_BASELINE` is stronger than exhaustion of the currently known root queue. At Level 4, each baseline family below becomes materially in scope for applicability proof even when no earlier Closure Unit happened to touch it.

Every family must end as `PROVEN_BASELINE`, `N/A_PROVEN`, or a legitimate `00` stop state. `NOT_INSPECTED`, implicit omission and “no complaint observed” are forbidden.

### 22.1 Durable-governance baseline

Audit the live `governance/` tree as a durable-truth graph, not as documentation polish:

```text
DISCOVER LIVE GOVERNANCE TREE
-> MAP EACH MATERIAL ARTIFACT TO A DURABLE CONCEPT
-> MAP EACH CONCEPT TO CURRENT PRODUCT/SYSTEM/POLICY AUTHORITY
-> CLASSIFY:
   CANONICAL
   DERIVED
   STALE
   WRONG
   CONFLICTING
   DUPLICATE
   INCOMPLETE
   MISPLACED
   OWNERLESS
   OBSOLETE
   MISSING_REQUIRED
   N/A_PROVEN
-> APPLY THE GOVERNANCE WRITE GATE
-> UPDATE / MOVE / MERGE / SPLIT / DELETE ONLY AS PROVEN
-> REPAIR REFERENCES
-> SEARCH NEGATIVE SPACE
-> PROVE ONE DURABLE AUTHORITY PER MATERIAL CONCEPT
```

This Level-4 pass makes governance integrity itself a material baseline claim; it is not an unrelated documentation sweep and does not weaken the governance write gate.

### 22.2 Operational-surface completeness

A surface/section is not operationally complete merely because it renders, calls an API or exposes controls. For every material operational area—especially administrative/control surfaces—prove the applicable chain:

```text
OPERATING PURPOSE
-> RESPONSIBLE ACTOR
-> INPUT / WORK INTAKE OR QUEUE
-> PRIORITY / CONTEXT
-> CURRENT CANONICAL STATE
-> RECOMMENDED / NEXT OWNED ACTION
-> ALLOWED COMMANDS
-> AUTHORITY / PRECONDITIONS
-> REQUIRED EVIDENCE
-> DECISION
-> CANONICAL WRITE
-> READBACK
-> HANDOFF
-> EXCEPTION
-> ESCALATION
-> RECOVERY
-> AUDITABILITY
-> TERMINAL OUTCOME OR NEXT OWNER
-> OPERATIONAL SIGNAL
```

A link may be `N/A_PROVEN` when the capability genuinely does not require it. A materially missing link is a root candidate. Local frontend stage/transition/permission/financial logic must be proven derived from canonical authority; otherwise it is a parallel-truth finding.

### 22.3 Frontend engineering baseline

For every live material frontend application/surface prove, as applicable:

```text
CANONICAL PRODUCT/JOURNEY BINDING
ONE SERVER/CANONICAL AUTHORITY FOR MATERIAL BUSINESS DECISIONS
CURRENT CONTRACT / GENERATED-BINDING ALIGNMENT
NO LOCAL SHADOW STATE MACHINE / AUTHORIZATION / MONEY AUTHORITY
COMPLETE MATERIAL UI STATES:
  loading / empty / offline / forbidden / conflict / error / recovery / success
MUTATION -> CANONICAL READBACK / RECONCILIATION
CROSS-SURFACE HANDOFF CONSISTENCY
SESSION / CACHE / OFFLINE / RESUME / RETRY CORRECTNESS
ACCESSIBILITY / LOCALIZATION / RTL / PLATFORM ADAPTATION
RESPONSIVE / RENDERED / INTERACTION CORRECTNESS
RESOURCE / SUBSCRIPTION / REQUEST BOUNDEDNESS
PERCEIVED-PERFORMANCE / PAYLOAD BEHAVIOR WHERE MATERIAL
ZERO DEAD OR DUPLICATE ROUTES/COMPONENT/PATTERN AUTHORITIES
ZERO STALE GENERATED OR MANUAL CONTRACT FORKS
FOCUSED + INTEGRATION + RENDERED/JOURNEY EVIDENCE AS RISK REQUIRES
```

Frontend quality is not proven by build/type/lint success alone.

### 22.4 Backend engineering baseline

For every live material backend/domain/service prove, as applicable:

```text
CANONICAL DOMAIN/SERVICE OWNER + BOUNDARY
ONE MATERIAL MUTATION AUTHORITY / WRITE POLICY
EXPLICIT COMMAND / QUERY / STATE-TRANSITION SEMANTICS
SERVER-SIDE AUTHENTICATION / AUTHORIZATION / OBJECT SCOPE
CANONICAL API / EVENT / ERROR CONTRACT
INPUT VALIDATION + TRUST-BOUNDARY CONTROL
TRANSACTION / CONSTRAINT / CONCURRENCY SAFETY
IDEMPOTENCY / REPLAY / ORDERING / UNKNOWN-RESULT SEMANTICS
MIGRATION / BACKFILL / RECONCILIATION / PERSISTED READBACK
TIMEOUT / RETRY / BACKOFF / CANCELLATION / RESOURCE BOUNDS
FAILURE / DEGRADATION / RECOVERY / RESTART CORRECTNESS
OBSERVABILITY / HEALTH / READINESS TRUTHFULNESS
CONFIG / SECRET / PROVIDER AUTHORITY
PRIVACY / RETENTION / AUDIT / FINANCIAL SAFETY WHERE MATERIAL
QUERY / PAYLOAD / CAPACITY / BACKPRESSURE CORRECTNESS
ZERO SHADOW ENDPOINTS / DUPLICATE BUSINESS RULES / OLD WRITERS
CLEAN-STATE STARTUP + REQUIRED TEST/CONTRACT/DB/RUNTIME EVIDENCE
```

Backend quality is not proven by handler success, unit tests or scanner green alone.

### 22.5 Repository structural baseline

Prove the live implementation tree reflects canonical system ownership rather than historical accident:

```text
PRODUCT CAPABILITY
-> CANONICAL OWNER
-> DOMAIN
-> SERVICE / BOUNDED RESPONSIBILITY
-> CONTRACT / DATA
-> APPLICATION / SURFACE
-> PACKAGE / MODULE
-> DIRECTORY
-> FILE
-> SYMBOL
```

Search for and resolve proven material:

```text
AMBIGUOUS CANONICAL HOMES
GOD MODULES / MIXED OWNERSHIP
JUNK-DRAWER DIRECTORIES
UNJUSTIFIED MICRO-FRAGMENTATION
ACCIDENTAL PUBLIC/RE-EXPORT SURFACES
DEAD PACKAGES / DIRECTORIES / FILES
HISTORICAL OR SUPERSEDED PATHS
DUPLICATE IMPLEMENTATIONS
WRONG DEPENDENCY DIRECTION
UNJUSTIFIED SHARED/COMMON/UTILS
UNFINISHED MOVES / SPLITS / MERGES
STALE ALIASES / REFERENCES
```

File size alone is never the decision rule. Cohesion, owner, responsibility, dependencies, consumers and canonical discoverability decide the treatment.

### 22.6 Level-4 systemic equation

In addition to all earlier applicable terms:

```text
SYSTEM_BASELINE_CLOSED =
ZERO_UNKNOWN_MATERIAL_TOPOLOGY
AND ZERO_UNCLASSIFIED_MATERIAL_LENSES
AND ZERO_KNOWN_MATERIAL_OPEN_ROOTS
AND ZERO_MISSING_MATERIAL_OPERATIONAL_CAPABILITIES
AND ZERO_UNVERIFIED_MATERIAL_JOURNEYS_OR_HANDOFFS
AND ZERO_UNRECONCILED_DURABLE_GOVERNANCE
AND ZERO_STALE_DUPLICATE_MISPLACED_GOVERNANCE_AUTHORITY
AND ZERO_AMBIGUOUS_CANONICAL_OWNERS
AND ZERO_UNJUSTIFIED_PARALLEL_TRUTH
AND ZERO_KNOWN_MATERIAL_STRUCTURAL_ENTROPY
AND ZERO_AMBIGUOUS_CANONICAL_PATHS
AND FRONTEND_BASELINE_PROVEN
AND BACKEND_BASELINE_PROVEN
AND OPERATIONAL_SURFACE_BASELINE_PROVEN
AND GOVERNANCE_BASELINE_PROVEN
AND STRUCTURAL_BASELINE_PROVEN
AND ALL_OTHER_MATERIAL_00_§14_BASELINE_FAMILIES_PROVEN_OR_N/A_PROVEN
AND ZERO_UNDISPOSITIONED_MATERIAL_TOOL_FINDINGS
AND ZERO_UNVERIFIED_MATERIAL_CUTOVERS
AND ZERO_KNOWN_MATERIAL_LEGACY_SHADOW_DEAD_RESIDUE
AND FRESH_REPOSITORY_WIDE_ADVERSARIAL_REAUDIT_FINDS_NO_NEW_MATERIAL_ROOT
AND EXACT_CANDIDATE_EVIDENCE_IS_CURRENT
```

The equation is evidence-bounded. It is not a mathematical guarantee that an unknowable future defect cannot exist.
