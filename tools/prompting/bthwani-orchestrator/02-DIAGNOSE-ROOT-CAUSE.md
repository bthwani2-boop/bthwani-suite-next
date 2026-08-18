# Diagnose, Coverage, Decisions, Canonical Target and Root-Cause Protocol

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
→ EXECUTE WHEN READY
→ RE-DIAGNOSE
```

## 2. Whole-system semantic descent

For broad/project work diagnose top-down:

`Mission/Product Outcomes → User/Operator Experience → Domains/Capabilities → Actors/Identities → Authorities/Responsibilities → Journeys → States/Transitions/Preconditions/Decision Rules/Invariants → Handoffs/Cross-Surface Meaning → Canonical Owners/Writers/Readers/Consumers → Contracts/APIs/Events → Data/Persistence/Readback → Services → Surfaces → Runtime/Config/Infrastructure → Code → Tests/CI/Observability`.

For a narrow target start at the highest material meaning inside it and expand only where evidence proves relation.

Do not let the first TypeScript/Go error, failing test, endpoint, migration, table, route or local smell dictate execution before its semantic parent is understood.

## 3. UX is operational meaning

Treat UX as the full reality lived by an actor:

`entry → understanding → discoverability → available actions → authorization → decision → state change → feedback → handoff → later readback → failure → recovery → terminal outcome`.

A cross-surface discrepancy is material when it expresses a different state, authority, responsibility or canonical fact, even if each screen is locally functional.

## 4. Material coverage

Coverage is a live reasoning model, not a required repository file.

Material nodes progress conceptually through:

`UNKNOWN → DISCOVERED → INSPECTED → MODELED → FINDINGS_MAPPED → ROOTS_PROVEN → TARGET_DEFINED → FIXED → VERIFIED → CLOSED`

or `N/A_PROVEN`.

Required dimensions when materially applicable:

- product/business outcome and semantic intent;
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
- engineering execution/toolchain cost when materially implicated.

Coverage complete is not closure complete.

## 5. Broad discovery before deep local repair

Build the material landscape without asking for discoverable facts:

`Product outcomes | Actors/identities | Roles/permissions/scopes | Authorities/responsibilities | Domains/capabilities | Surfaces/routes/screens/tabs/actions | Journeys | States/transitions/preconditions/invariants | Handoffs | Writers/readers/consumers | Contracts/APIs/events | Schemas/tables/constraints/migrations/backfills | Jobs/queues/providers/callbacks | Runtime/config/environment/networking | Observability/audit | Security/privacy/isolation | Tests/CI/release/rollback | Structure/ownership/naming/dependencies | Dead/stale/duplicate/legacy/fallback residue`.

For repository-wide closure, a material domain/surface/foundation may be excluded only with current non-impact proof.

When internal evidence leaves a material technical/platform/standard knowledge gap, apply the research escalation rules in `01` rather than guessing.

## 6. Journey Matrix

For every material journey account for, as applicable:

```text
Journey ID / Name
Product Outcome
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
Evidence / Confidence / Missing Proof
```

Do not diagnose Client, Partner, Captain, Field, Control Panel, backend and data as independent products when the same journey crosses them.

## 7. Mandatory diagnostic angles

Use all materially applicable angles; do not run expensive techniques blindly.

### Logical
Actions legal in state, sufficient preconditions, valid decision rules, forbidden outcomes impossible, no purposeless step.

### Causal/root
`Observed behavior → immediate cause → canonical owner/writer → higher causal parent → Root Cause → consumers → blast radius → correct target behavior`.

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
Extract what must never be violated, then try to violate it.

### Counterfactual
Test repeated action, absent next actor, late/out-of-order event, concurrent state change, restart, unknown provider result and mixed versions.

### Negative space
Search for missing journey/state/transition/action/validation/authorization/feedback/handoff/recovery/intervention/consumer/readback/ownership/decision rule.

### Experimental
When capabilities permit: `falsifiable hypothesis → smallest real check → runtime/persisted readback → compare with semantic model → refine/reject`.

### Adversarial
Assume the current explanation is wrong and search for contradictory evidence, hidden writers/readers, fallback, stale state, race, partial transaction, permission leak, contract/data drift, legacy path, missing consumer, wrong owner/handoff or unhandled failure/recovery.

### Necessary complexity
Inspect materially affected layers, abstractions, wrappers, adapters, indirection, state/flow machinery, configs, scripts, dependencies, files and folders for necessary purpose, owner, real consumer, requirement and measurable correctness/assurance/operational value. `WORKING ≠ JUSTIFIED` and `COMPLEX ≠ ROBUST`. If a materially simpler design can preserve required semantics, invariants, security, reliability, performance and compatibility, treat the excess complexity as a finding; do not simplify on aesthetics or intuition alone.

## 8. Full-stack operation trace

A material operation should be traceable, where applicable, through:

`Product Truth → Actor/Service Identity → Session/Device → Trusted Scope → Role/Permission/Object Authorization → Surface/Route/Control → Shared Controller/Binding → Canonical/Generated Contract → API → Domain/State Machine → Validation/Transformation → Transaction/Database → Cache/Idempotency → Events/Jobs/Providers → Network/Response → Persisted Canonical Readback → Every Required Consumer/Surface → Audit/Observability/Runtime Evidence`.

A successful screen, endpoint, build or unit test is not End-to-End proof by itself.

## 9. Findings Ledger

Every material finding remains addressable with at least:

```text
Finding ID
Category / Severity / Risk
Problem + exact evidence
Path / symbol / journey / surface
Operational parent
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
```

Try to disprove the candidate before declaring it proven.

## 11. Parallel-truth root signals

Treat the following as high-leverage root-cause signals, not mere cleanup smells, when they are authoritative/reachable:

`PARALLEL_TRUTH | DUPLICATE_AUTHORITATIVE_WRITER | SHADOW_STATE | LOCAL_BUSINESS_TRUTH | DUPLICATE_CONTRACT_AUTHORITY | DUPLICATE_CONFIG_AUTHORITY | LEGACY_CANONICAL_PATH`.

For any such signal prove:

```text
what concept is duplicated
→ which owner is actually canonical
→ every writer
→ every reader/consumer
→ synchronization/fallback/compatibility paths
→ divergence/failure risk
→ migration/cutover needed to leave one authority
```

Do not resolve duplicated authority by adding another synchronization layer unless a bounded mixed-version transition is itself proven necessary.

## 12. Root clusters, graph and systemic leverage

Cluster dependent findings under highest proven common causes and reason through a dependency/impact graph.

Never prioritize by discovery order, easiest fix, latest commit, file/finding count, first CI failure or last-session topic.

Prefer by material relevance:

`upstream depth → blocking power → canonical/foundation importance → blast radius → user/operational impact → security/data/finance risk → unlock value → cross-surface/journey effect → recurrence → structural-debt multiplier → local cosmetic impact`.

Parallel/duplicate authority that can create divergent writes, states, contracts or decisions receives root-level priority proportional to its blast radius and recurrence risk.

## 13. Competitive deepening

Deepen only candidates that can materially change priority or treatment.

The winning root must be:

```text
PROVEN
AND DEEPENED_ENOUGH_TO_RANK
AND HIGHEST_CURRENT_SYSTEMIC_LEVERAGE
AND EXECUTABLE
AND NO_KNOWN_HIGHER_ROOT_CAN_MATERIALLY_CHANGE_TREATMENT
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

At a true Decision Boundary, batch overlapping questions, remove derivatives and order by unlock value. After a decision, re-diagnose the affected semantic cone before implementation.

## 15. Source-of-fix readiness

Before treating a material root identify:

```text
ROOT_CAUSE_ID
ACTUAL_SOURCE_OF_DEFECT
CANONICAL_TARGET_STATE
CANONICAL_OWNER / WRITE PATH
ACTUAL_IMPLEMENTATION_COMPONENTS
AFFECTED_WRITERS
AFFECTED_READERS
AFFECTED_CONSUMERS
AFFECTED_SURFACES/JOURNEYS
REQUIRED_CONTRACT CHANGES
REQUIRED_DATA/MIGRATION CHANGES
REQUIRED_RUNTIME/CONFIG CHANGES
OBSOLETE IMPLEMENTATION TO REMOVE
REQUIRED VERIFICATION
```

If a root requires source/runtime/data/contract mutation and the actual source of defect is still unknown, it is not executable yet.

## 16. Canonical Target Model

Before a material architectural/semantic/data/contract/state/ownership reconstruction, define enough of the target model to make the treatment non-random and falsifiable.

As applicable establish:

```text
Target Product/Operational Outcome
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
Migration / Backfill / Cutover Sequence
Legacy/Parallel-Truth Removal Condition
Verification That Can Falsify The Target
```

Model only what is material to the proven root; do not create speculative architecture for unrelated areas.

`EXISTING ≠ CANONICAL`, `OLD ≠ DELETE`, and `NEW ≠ BETTER`. Preserve proven value while correcting ownership/context/boundaries.

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
→ RECONSTRUCT THE SHARED OPERATIONAL/OWNERSHIP PARENT
→ RE-DIAGNOSE UPSTREAM
→ PROVE OR DISPROVE A COMMON ROOT
→ RE-RANK
→ TREAT THE ROOT, NOT THE ERROR SEQUENCE
```

A new local fix is allowed only when evidence proves the issue is itself the highest relevant root or a minimal diagnostic blocker.

## 18. JIT execution frontier

Derive only the next coherent treatment frontier from the currently proven root and hard dependencies. Do not build speculative multi-root task forests whose assumptions may disappear after the current root is fixed. After treatment, re-diagnose and derive the next frontier from the new live state.
