# Diagnose, Coverage, Project Consistency, Decisions, Canonical Target and Root-Cause Protocol

## 1. Purpose

Diagnosis exists to choose and prove the correct treatment, not to generate a report or enumerate every low-level defect before useful execution can begin.

```text
DISCOVER
→ MODEL
→ HYPOTHESIZE
→ CROSS-CHECK
→ RESEARCH WHEN REQUIRED
→ CHALLENGE
→ PROVE / DISPROVE
→ CLUSTER
→ RANK
→ MODEL CANONICAL TARGET
→ PROVE PROJECT CONSISTENCY
→ EXECUTE WHEN READY
→ RE-DIAGNOSE
```

## 2. Project-wide semantic orientation before deep diagnosis

Every objective begins with enough project-wide semantic orientation to locate it safely inside the same platform model used by all other objectives, workers and sessions.

The whole-system descent is:

`Mission/Product Outcomes → User/Operator Experience → Domains/Capabilities → Actors/Identities → Authorities/Responsibilities → Journeys → States/Transitions/Preconditions/Decision Rules/Invariants → Handoffs/Cross-Surface Meaning → Canonical Owners/Writers/Readers/Consumers → Contracts/APIs/Events → Data/Persistence/Readback → Services → Surfaces → Runtime/Config/Infrastructure → Code → Tests/CI/Observability`.

For broad/project work, deepen this descent across every materially applicable area and account for exclusions. For a narrow objective, first establish/revalidate enough of this project-wide frame to prove its semantic location, shared authorities, touched invariants and relevant prior closures; then deeply diagnose only the smallest complete proven working cone. Expand from that cone only through proven relations.

```text
PROJECT-WIDE ORIENTATION IS MANDATORY.
PROJECT-WIDE DEEP SCANNING IS NOT MANDATORY FOR EVERY NARROW OBJECTIVE.
NARROW WORKING CONE ≠ NARROW PROJECT WORLDVIEW.
```

Do not let the first TypeScript/Go error, failing test, endpoint, migration, table, route, local smell or objective wording dictate execution before its semantic parent and project-frame relation are understood.

## 3. UX is operational meaning

Treat UX as the full reality lived by an actor:

`entry → understanding → discoverability → available actions → authorization → decision → state change → feedback → handoff → later readback → failure → recovery → terminal outcome`.

A cross-surface discrepancy is material when it expresses a different state, authority, responsibility or canonical fact, even if each screen is locally functional.

A locally improved UX is not correct if it requires or creates Product/System semantics that contradict another surface, journey, authority or project invariant.

## 4. Material coverage

Coverage is a live reasoning model, not a required repository file.

Material nodes progress conceptually through:

`UNKNOWN → DISCOVERED → INSPECTED → MODELED → FINDINGS_MAPPED → ROOTS_PROVEN → TARGET_DEFINED → FIXED → VERIFIED → CLOSED`

or `N/A_PROVEN`.

Project-frame assertions may also remain explicitly `UNKNOWN | CONFLICTING | STALE | DECISION_REQUIRED` when they are outside the current working cone and cannot affect the claim. They must not be silently treated as clean.

Required dimensions when materially applicable:

- product/business outcome and semantic intent;
- project-frame relation and touched durable invariants;
- actors, identities, roles, authorities and responsibilities;
- journeys, states, transitions, preconditions, decision rules and invariants;
- handoffs and cross-surface meaning;
- success, failure, recovery and unknown-result behavior;
- canonical ownership, writers, readers and consumers;
- frontend/backend vertical binding;
- contracts, APIs, generated clients, schemas and events;
- data, database, migrations, consistency and persisted readback;
- runtime, configuration, networking, infrastructure and providers;
- security/isolation/privacy and finance where applicable;
- testing, CI, observability and operational proof;
- repository structure, naming, duplication, dead/stale/legacy paths;
- governance/product/policy consistency;
- previously proven canonical closures that can be invalidated by the change;
- engineering execution/toolchain cost when materially implicated.

Every canonical focus family must be activated or dispositioned with material reasoning before closure; deep proof remains risk/scope driven.

Coverage complete is not closure complete.

## 5. Project orientation and broad discovery before deep local repair

Build enough of the material landscape to avoid solving the objective in isolation without asking for discoverable facts:

`Product outcomes | Actors/identities | Roles/permissions/scopes | Authorities/responsibilities | Domains/capabilities | Surfaces/routes/screens/tabs/actions | Journeys | States/transitions/preconditions/invariants | Handoffs | Writers/readers/consumers | Contracts/APIs/events | Schemas/tables/constraints/migrations/backfills | Jobs/queues/providers/callbacks | Runtime/config/environment/networking | Observability/audit | Security/privacy/isolation | Tests/CI/release/rollback | Structure/ownership/naming/dependencies | Governance/Product Truth | Dead/stale/duplicate/legacy/fallback residue`.

For narrow work, reuse valid current evidence and inspect only enough of the project-wide landscape to locate the objective, prove shared authorities/invariants and detect invalidation of prior closures; then deepen the proven working cone. For repository-wide closure, a material domain/surface/foundation may be excluded only with current non-impact proof.

When internal evidence leaves a material technical/platform/standard knowledge gap, apply the research escalation rules in `01` rather than guessing.

## 6. Journey Matrix

For every material journey account for, as applicable:

```text
Journey ID / Name
Project/Product Outcome
Actor
Entry
Current Context
Preconditions
Available Action / Command
Validation
Authorization / Object Scope
Decision Rule
Current State
Legal Transition
Next State
Invariants
Side Effects
Persisted Mutation
Handoff
Next Actor / Surface
What every affected Surface sees
Success Outcome
Failure Path
Recovery Path
Later Readback
Canonical Owner / Source
Related project-frame invariants / prior closures
Evidence / Confidence / Missing Proof
```

Do not diagnose Client, Partner, Captain, Field, Control Panel, backend and data as independent products when the same journey crosses them.

## 7. Mandatory diagnostic angles

Use all materially applicable angles; do not run expensive techniques blindly.

### Logical
Actions legal in state, sufficient preconditions, valid decision rules, forbidden outcomes impossible, no purposeless step.

### Causal/root
`Observed behavior → immediate cause → canonical owner/writer → higher causal parent → Root Cause → consumers → blast radius → correct target behavior`.

### Project-consistency
For every material target/treatment ask whether it is correct for the platform as a whole rather than merely convenient for the current objective. Check touched shared authorities, journeys, invariants, governance, contracts/data/runtime boundaries and previously proven closures.

### Forward
`Entry → Preconditions → Action → Validation → Decision → State Mutation → Handoff → Outcome/Readback`.

### Reverse
`Observed Outcome/Data → Read Path → Writer → Transition/Decision → Preconditions → Initiating Actor/Entry`.

### Temporal
`Before → Trigger → During → Pending → Complete/Fail → Retry/Timeout → Restart/Recovery → Later Readback`.

Include stale state, delayed/out-of-order events, mixed-version timing and state changes between display and action.

### Actor/responsibility
Prove who initiates, decides, executes, owns truth, may cancel/recover, receives handoff, waits and intervenes.

### Cross-layer vertical
`UX/UI → Surface State → Client Logic → Controller/Adapter → Canonical/Generated Contract → API → Auth/AuthZ → Domain/State Machine → Transaction/Data/Event/Provider → Runtime → Persisted Readback → Observable Result`.

### Differential cross-surface
For the same entity/state/event compare meaning, available actions, timing and responsibility across every affected surface.

### Invariant
Extract what must never be violated, including project-wide ownership/security/financial invariants touched by the root, then try to violate it.

### Counterfactual
Test repeated action, absent next actor, late/out-of-order event, concurrent state change, restart, unknown provider result and mixed versions.

### Negative space
Search for missing journey/state/transition/action/validation/authorization/feedback/handoff/recovery/intervention/consumer/readback/ownership/decision rule, missing project-frame relation and missing governance disposition when semantics changed.

### Experimental
When capabilities permit: `falsifiable hypothesis → smallest real check → runtime/persisted readback → compare with semantic model → refine/reject`.

### Adversarial
Assume the current explanation is wrong and search for contradictory evidence, hidden writers/readers, fallback, stale state, race, partial transaction, permission leak, contract/data drift, legacy path, missing consumer, wrong owner/handoff, unhandled failure/recovery, objective-induced local optimization or contradiction with another canonical journey/domain/surface.

### Necessary complexity
Inspect materially affected layers, abstractions, wrappers, adapters, indirection, state/flow machinery, configs, scripts, dependencies, files and folders for necessary purpose, owner, real consumer, requirement and measurable correctness/assurance/operational value. `WORKING ≠ JUSTIFIED` and `COMPLEX ≠ ROBUST`. If a materially simpler design can preserve required semantics, invariants, security, reliability, performance and compatibility, treat the excess complexity as a finding; do not simplify on aesthetics or intuition alone.

## 8. Full-stack operation trace

A material operation should be traceable, where applicable, through:

`Project/Product Truth → Actor/Service Identity → Session/Device → Trusted Scope → Role/Permission/Object Authorization → Surface/Route/Control → Shared Controller/Binding → Canonical/Generated Contract → API → Domain/State Machine → Validation/Transformation → Transaction/Database → Cache/Idempotency → Events/Jobs/Providers → Network/Response → Persisted Canonical Readback → Every Required Consumer/Surface → Audit/Observability/Runtime Evidence`.

Also prove the operation does not violate materially touched project-frame authorities/invariants or a previously proven canonical closure.

A successful screen, endpoint, build or unit test is not End-to-End proof by itself.

## 9. Findings Ledger

Every material finding remains addressable with at least:

```text
Finding ID
Category / Severity / Risk
Problem + exact evidence
Path / symbol / journey / surface
Project-frame relation / operational parent
Competing hypothesis checked
Candidate/proven Root Cause or Missing Proof
Canonical owner / write path
Writers / readers / consumers
Dependencies
Blast radius
Affected surfaces / journeys / contracts / data / runtime
Security / data / finance / operational / design risk
Current state
Canonical target state
Governance impact / prior-closure impact when material
Required decision if any
Required treatment / verification
Status
Reopen trigger
```

Statuses:

`OPEN | EVIDENCE/HOLD | FIXED_PENDING_VERIFY | PROVEN_CLOSED | NOT_APPLICABLE_WITH_PROOF`.

A finding does not disappear because it vanished from the latest log.

## 10. Root-cause proof

For each material root candidate establish:

```text
violated product/operational outcome
project-frame parent / touched invariants
exact direct evidence
contradictory evidence checked
competing hypotheses considered/falsified
operational parent
canonical owner / write path
upstream dependencies
writers/readers/consumers
blast radius
security/data/finance/runtime risk
unlock value / recurrence / structural multiplier
canonical target truth
proof that treatment here removes cause rather than symptom
proof that local treatment will not create a conflicting project truth
```

Try to disprove the candidate before declaring it proven.

## 11. Parallel-truth root signals

Treat the following as high-leverage root-cause signals, not mere cleanup smells, when they are authoritative/reachable:

`PARALLEL_TRUTH | DUPLICATE_AUTHORITATIVE_WRITER | SHADOW_STATE | LOCAL_BUSINESS_TRUTH | DUPLICATE_CONTRACT_AUTHORITY | DUPLICATE_CONFIG_AUTHORITY | LEGACY_CANONICAL_PATH`.

For any such signal prove:

```text
what concept is duplicated
→ which owner is actually canonical in the project frame
→ every writer
→ every reader/consumer
→ synchronization/fallback/compatibility paths
→ divergence/failure risk
→ migration/cutover needed to leave one authority
```

Do not resolve duplicated authority by adding another synchronization layer unless a bounded mixed-version transition is itself proven necessary.

## 12. Root clusters, graph and systemic leverage

Cluster dependent findings under highest proven common causes and reason through a dependency/impact graph.

Never prioritize by discovery order, easiest fix, latest commit, file/finding count, first CI failure, last-session topic or current-objective convenience.

Prefer by material relevance:

`upstream depth → blocking power → canonical/foundation importance → blast radius → user/operational impact → security/data/finance risk → unlock value → cross-surface/journey effect → recurrence → structural-debt multiplier → local cosmetic impact`.

Parallel/duplicate authority that can create divergent writes, states, contracts or decisions receives root-level priority proportional to its blast radius and recurrence risk.

If a root exposed by the current objective is materially higher and affects other objectives/domains, promote it to the shared project/root landscape rather than keeping it artificially local.

## 13. Competitive deepening

Deepen only candidates that can materially change priority or treatment.

The winning root must be:

```text
PROVEN
AND DEEPENED_ENOUGH_TO_RANK
AND HIGHEST_CURRENT_SYSTEMIC_LEVERAGE
AND EXECUTABLE
AND NO_KNOWN_HIGHER_ROOT_CAN_MATERIALLY_CHANGE_TREATMENT
AND PROJECT-FRAME RELATION SUFFICIENTLY PROVEN FOR SAFE TREATMENT
```

Then execute; do not keep wandering through details that cannot alter the next correct action.

## 14. Decision taxonomy

```text
DERIVABLE_FACT
= resolve from evidence/code/contracts/data/runtime/research where valid; do not ask.

TRUE_DECISION_GAP
= multiple materially valid product/business/semantic/architectural behaviors remain and evidence cannot choose; ask.

EXTERNAL_EVIDENCE_GAP
= correctness requires an unavailable environment/provider/capability/technical evidence source; keep the claim open with exact acquisition/unblock path.
```

At a true Decision Boundary, batch overlapping questions, remove derivatives and order by unlock value. After a decision, update/reconcile the affected project-frame claims and re-diagnose the affected semantic cone before implementation.

## 15. Source-of-fix readiness

Before treating a material root identify:

```text
ROOT_CAUSE_ID
ACTUAL_SOURCE_OF_DEFECT
CANONICAL_TARGET_STATE
PROJECT-FRAME PARENT / TOUCHED INVARIANTS
CANONICAL_OWNER / WRITE PATH
ACTUAL_IMPLEMENTATION_COMPONENTS
AFFECTED_WRITERS
AFFECTED_READERS
AFFECTED_CONSUMERS
AFFECTED_SURFACES/JOURNEYS
REQUIRED_CONTRACT CHANGES
REQUIRED_DATA/MIGRATION CHANGES
REQUIRED_RUNTIME/CONFIG CHANGES
REQUIRED_GOVERNANCE DISPOSITION
AFFECTED_PREVIOUSLY_PROVEN_CLOSURES
OBSOLETE IMPLEMENTATION TO REMOVE
REQUIRED_VERIFICATION
```

If a root requires source/runtime/data/contract mutation and the actual source of defect is still unknown, it is not executable yet.

If project-frame relation, shared authority or a touched invariant is materially unresolved in a way that can change treatment, the dependent mutation is not executable yet.

## 16. Canonical Target Model

Before a material architectural/semantic/data/contract/state/ownership reconstruction, define enough of the target model to make the treatment non-random and falsifiable.

As applicable establish:

```text
Target Project/Product/Operational Outcome
Canonical Owner
Allowed Writers
Readers / Projections / Consumers
Actors / Permissions / Object Scope
State Machine / Legal Transitions
Invariants / Decision Rules
API / Contract / Event Semantics
Data Model / Persistence Ownership
Transaction / Handoff Model
Idempotency / Retry / Recovery / Unknown-Result Semantics
Surface Readback / Cross-Surface Meaning
Security / Audit Requirements
Runtime / Configuration Ownership
Observability / Correlation Requirements
Governance disposition
Migration / Backfill / Cutover Sequence
Legacy/Parallel-Truth Removal Condition
Previously Proven Closure Compatibility
Verification That Can Falsify The Target
```

Model only what is material to the proven root; do not create speculative architecture for unrelated areas.

`EXISTING ≠ CANONICAL`, `OLD ≠ DELETE`, and `NEW ≠ BETTER`. Preserve proven value while correcting ownership/context/boundaries.

### 16.1 Project-consistency execution gate

Before any material mutation, prove enough of the following to make treatment safe:

```text
LOCAL OBJECTIVE CORRECTNESS
AND PROJECT-WIDE SEMANTIC CONSISTENCY FOR TOUCHED CONCEPTS
AND NO KNOWN CROSS-JOURNEY / CROSS-SURFACE CONTRADICTION
AND NO AUTHORITY / OWNERSHIP REGRESSION
AND NO CONTRACT / DATA / RUNTIME CONTRADICTION
AND NO SECURITY / FINANCIAL INVARIANT REGRESSION
AND NO NEW PARALLEL TRUTH
AND NO UNRECONCILED IMPACT ON PREVIOUSLY PROVEN CANONICAL CLOSURES
AND GOVERNANCE IMPACT CLASSIFIED
```

If the target is locally attractive but fails this gate, do not adapt the project to the objective. Promote/re-diagnose the higher shared root or raise the true decision gap.

## 17. Patch-loop breaker

Repeated descendant edits without a stronger falsifiable root hypothesis are a diagnostic failure mode.

Trigger re-diagnosis when the pattern becomes materially like:

```text
local error
→ local fix
→ new related error
→ another local fix
→ compatibility/fallback/workaround
→ another symptom
```

Then:

```text
STOP DESCENDANT PATCH LOOP
→ CLUSTER RELATED SYMPTOMS
→ RECONSTRUCT THE SHARED OPERATIONAL/OWNERSHIP/PERHAPS PROJECT-FRAME PARENT
→ RE-DIAGNOSE UPSTREAM
→ PROVE OR DISPROVE A COMMON ROOT
→ RE-RANK
→ TREAT THE ROOT, NOT THE ERROR SEQUENCE
```

A new local fix is allowed only when evidence proves the issue is itself the highest relevant root or a minimal diagnostic blocker.

## 18. JIT execution frontier

Derive only the next coherent treatment frontier from the currently proven root and hard dependencies. Do not build speculative multi-root task forests whose assumptions may disappear after the current root is fixed. After treatment, revalidate touched project-frame claims, re-diagnose and derive the next frontier from the new live state.

Different objectives, workers or sessions may advance independent roots only when they share the same reconciled project frame and single integration truth under `00`/`01`; no local worker target may become a competing canonical model.

## 19. Durable-truth discovery and governance-clarity findings

Diagnosis must distinguish facts needed only to fix the current implementation from durable knowledge that should improve future project understanding.

For every newly proven material fact that can affect platform understanding, classify it under `01` as one of:

`EPHEMERAL_IMPLEMENTATION_FACT | CURRENT_RUNTIME_FACT | TASK_LOCAL_FACT | DURABLE_PROJECT_TRUTH | DURABLE_POLICY_INVARIANT | DECISION_REQUIRED`.

When a `DURABLE_PROJECT_TRUTH` or `DURABLE_POLICY_INVARIANT` is sufficiently proven and current governance is missing, materially incomplete or materially ambiguous about it, create/retain a `GOVERNANCE_CLARITY_GAP` finding when the gap can mislead future objectives, agents or sessions.

A governance-clarity finding records at least:

```text
PROVEN DURABLE TRUTH
EVIDENCE / PROOF LIMIT
WHY IT IS DURABLE + REUSABLE
CURRENT GOVERNANCE HOME / ABSENCE
CURRENT CLASSIFICATION: CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | MISSING_BUT_PROVEN | DECISION_REQUIRED
FUTURE MISDIRECTION RISK
CANONICAL GOVERNANCE HOME
SYSTEM CHANGE REQUIRED? YES/NO
GOVERNANCE TREATMENT AFTER SYSTEM PROOF
```

`GOVERNANCE_CLARITY_GAP` is not authority to write speculative documentation. The governance-write gate in the governance focus module still applies. If the truth is unresolved, keep the finding open/held or raise the true decision gap instead of manufacturing completeness.

A bootstrap governance audit uses this same model against current live project truth. It should improve established durable context without turning governance into a task ledger, source-code mirror or exhaustive registry of implementation facts.

## 20. `AUDIT_PREPARE` execution-handoff construction

This section canonically owns construction/readiness of the phase-scoped handoff defined by `01`; it does not change the live-truth authority rules there and does not own final verification semantics from `04`.

After all blocking material decisions are resolved, synthesize the already-proven diagnosis into the three canonical contracts without duplicating ownership between them.

### 20.1 `00-AUDIT-TRUTH.md`

Record the audit truth needed to prevent execution from rediscovering or silently redesigning the system:

```text
Plan identity / exact baseline
Objective / closure claim
Project/System orientation
Observed Current State
E-* Evidence Register with source/provenance/proof limit
F-* Findings Ledger
Root-Cause Landscape + RC-* Proven Root-Cause Contracts
Canonical Product/System Truth
Current → Target model
Authority / Ownership map
Writers / Readers / Consumers
Effective Working Cone
Blast Radius
Negative Space
D-* Decision Ledger
INV-* Invariant Register
Material unknown/conflict disposition
Remaining Ambiguity class
```

For each material resolved decision retain enough traceability to prevent accidental reopening:

```text
D-*
DECISION
EVIDENCE
RATIONALE
ALTERNATIVES_REJECTED when material
SUPERSEDES when applicable
AFFECTED_ROOTS
EXECUTOR_MAY_CHANGE
EXECUTOR_MAY_NOT_REOPEN
REOPEN_TRIGGER
```

Do not copy execution mechanics into this file when `01-EXECUTION-CONTRACT.md` owns them.

### 20.2 `01-EXECUTION-CONTRACT.md`

For each root on the current executable frontier instantiate the Source-of-Fix and target treatment already proven by §§15-18:

```text
RC-* reference
ACTUAL_SOURCE_OF_DEFECT
REQUIRED_SOURCE_OF_FIX
CANONICAL_CORRECTION
REQUIRED_MATERIAL_MUTATIONS
STEP-* dependency-ordered treatment
ADD / CHANGE / MOVE / REFACTOR / MIGRATE / BACKFILL / REGENERATE / CUTOVER / DELETE / VERIFY as materially applicable
AFFECTED_WRITERS / READERS / CONSUMERS
HARD_DEPENDENCIES
PARALLELIZATION disposition
ALLOWED_CHANGE_CONE
CONDITIONAL_EXPANSION
READ_ONLY
FORBIDDEN_WITHOUT_REPLAN
CLEANUP / RETIREMENT
STOP_ESCALATION_TRIGGERS
```

`VERIFY` here references the V-* requirements owned by `02-VERIFICATION-CLOSURE.md`; it does not redefine verification law.

The Source-of-Fix gate is fail-closed: when a root requires code, contract, data, schema, runtime or configuration mutation, the required actual source(s) must be identified before readiness. Planning/report/governance/comment changes alone cannot be specified as the treatment for such a root.

### 20.3 `02-VERIFICATION-CLOSURE.md`

Instantiate only the task-specific claims and acceptance/closure requirements from the verification law owned by `04`:

```text
V-* verification requirements
AC-* falsifiable acceptance criteria
CE-* required closure evidence
Final-candidate requirements
Definition-of-DONE references/applicability
```

Do not restate generic verification doctrine already owned by `04`.

### 20.4 Remaining Ambiguity

Classify execution readiness by the highest remaining material ambiguity:

```text
R0 — DETERMINISTIC
No material semantic/architectural decision remains; treatment is mechanically determined apart from trivial local choices.

R1 — LOCAL_REASONING
Only equivalent local implementation choices remain; Canonical Truth/authority/target/migration/cutover are fixed.

R2 — REASONING_HEAVY
Canonical Truth is fixed, but substantial engineering reasoning remains inside the allowed implementation boundary.

R3 — NOT_EXECUTION_READY
A material Product/Domain/Authority/Architecture/Invariant/Migration/Cutover decision or unknown can still change treatment.
```

`R3` cannot produce `READY_FOR_EXECUTION`. Model names or vendor-specific routing do not belong in this package; routing systems may map these classes externally.

### 20.5 Root landscape vs executable frontier

The handoff may record multiple proven roots, but it must distinguish:

```text
ROOT_LANDSCAPE
= all material roots currently proven for the objective.

EXECUTION_FRONTIER
= only roots/tightly coupled root sets safe to treat now under current dependencies and authority.

DEFERRED_REVALIDATE
= proven roots whose treatment assumptions may change after the current frontier mutates live truth.
```

Do not turn a broad audit into a frozen checklist that bypasses JIT re-diagnosis.

### 20.6 Traceability

Every material execution obligation must remain reconstructable through IDs without duplicating the underlying truth:

```text
E-* → F-* → RC-* → D-* / INV-* when applicable → STEP-* → V-* → AC-* → CE-*
```

Not every chain requires every optional node, but every material `STEP-*` must trace back to a proven root/decision and forward to sufficient verification/acceptance evidence.

### 20.7 Handoff-readiness gate

`READY_FOR_EXECUTION` is valid only when all materially applicable conditions are proven:

```text
EXACT_BASELINE_RECORDED
AND MATERIAL_DECISIONS_RESOLVED
AND HIGHEST_RELEVANT_ROOTS_PROVEN
AND CANONICAL_TARGET_FIXED
AND SOURCE_OF_FIX_KNOWN_FOR_EXECUTION_FRONTIER
AND WRITERS_READERS_CONSUMERS_ACCOUNTED_FOR_MATERIALLY
AND WORKING_CONE_COMPLETE_BUT_NOT_UNJUSTIFIABLY_BROAD
AND BLAST_RADIUS_AND_NEGATIVE_SPACE_SUFFICIENTLY_PROVEN
AND MATERIAL_INVARIANTS_EXPLICIT
AND MIGRATION_BACKFILL_RECONCILIATION_DEFINED_WHEN_REQUIRED
AND CUTOVER_AND_CLEANUP_DEFINED_WHEN_REQUIRED
AND CHANGE_CONE_AND_ESCALATION_BOUNDARY_DEFINED
AND TASK_SPECIFIC_VERIFICATION_ACCEPTANCE_CLOSURE_EVIDENCE_DEFINED
AND TRACEABILITY_SUFFICIENT_TO_EXPLAIN_EVERY_MATERIAL_EXECUTION_STEP
AND REMAINING_AMBIGUITY != R3
```

If any conjunct is materially unproven, remain `NOT_READY_FOR_EXECUTION`, `DECISION_REQUIRED` or `EXTERNAL_BLOCKER` as applicable. Writing the three files does not itself satisfy readiness.
