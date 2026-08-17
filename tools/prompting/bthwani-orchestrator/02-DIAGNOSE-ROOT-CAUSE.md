# Diagnose, Coverage, Decisions and Root-Cause Protocol

## 1. Purpose

Diagnosis exists to choose and prove the correct treatment, not to generate a report or enumerate every low-level defect before useful execution can begin.

Use:

```text
DISCOVER
→ MODEL
→ HYPOTHESIZE
→ CROSS-CHECK
→ CHALLENGE
→ PROVE / DISPROVE
→ CLUSTER
→ RANK
→ EXECUTE WHEN READY
→ RE-DIAGNOSE
```

## 2. Whole-system semantic descent

For broad/project closure diagnose top-down:

`Mission/Product Outcomes → User/Operator Experience → Domains/Capabilities → Actors/Identities → Authorities/Responsibilities → Journeys → States/Transitions/Preconditions/Decision Rules/Invariants → Handoffs/Cross-Surface Meaning → Canonical Owners/Writers/Readers/Consumers → Contracts/APIs/Events → Data/Persistence/Readback → Services → Surfaces → Runtime/Config/Infrastructure → Code → Tests/CI/Observability`.

For a narrow target, start at the highest material meaning inside that target and expand only where evidence proves relation.

Do not let the first TypeScript/Go error, failing test, API response, migration, table, route or local smell dictate the task before its semantic parent is understood.

## 3. User experience is operational meaning

Treat UX as the full reality lived by an actor:

`entry → understanding → available actions → authorization → decision → state change → feedback → handoff → later readback → failure → recovery → terminal outcome`.

A cross-surface discrepancy is not merely a visual defect if it expresses a different state, authority, responsibility or canonical fact.

## 4. Material coverage ledger

Coverage is a live reasoning model, not a required repository file.

Material nodes progress conceptually through:

`UNKNOWN → DISCOVERED → INSPECTED → MODELED → FINDINGS_MAPPED → ROOTS_PROVEN → FIXED → VERIFIED → CLOSED`

or `N/A_PROVEN`.

Required coverage dimensions when materially applicable:

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
- security/isolation/privacy;
- finance when applicable;
- testing, CI, observability and operational proof;
- repository structure, naming, duplication, dead/stale/legacy paths;
- governance/product/policy consistency.

Missing required coverage remains open. Coverage complete is not closure complete.

## 5. Broad discovery before deep local repair

Start without asking the human for facts that can be discovered. Build the material landscape:

```text
Product outcomes
Actors/identities
Roles/permissions/scopes
Authorities/responsibilities
Domains/capabilities
Surfaces/routes/screens/tabs/actions
Journeys
States/transitions/preconditions/invariants
Handoffs
Canonical writers/readers/consumers
Contracts/APIs/events
Schemas/tables/constraints/migrations/backfills
Jobs/queues/providers/callbacks
Runtime/config/environment/networking
Observability/audit
Security/privacy/isolation
Tests/CI/release/rollback
Structure/ownership/naming/dependencies
Dead/stale/duplicate/legacy/fallback residue
```

For repository-wide scope, a material domain/surface/foundation may be excluded only with current non-impact proof.

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

### Logical analysis

Ask whether actions are legal in the state, preconditions are sufficient, decisions follow business rules, forbidden outcomes are impossible and each step has an operational purpose.

### Causal/root trace

`Observed behavior → immediate cause → canonical owner/writer → higher causal parent → Root Cause → consumers → blast radius → correct target behavior`.

### Forward trace

`Entry → Preconditions → Action → Validation → Decision → State Mutation → Handoff → Outcome/Readback`.

### Reverse trace

`Observed Outcome/Data → Read Path → Writer → Transition/Decision → Preconditions → Initiating Actor/Entry`.

### Temporal trace

`Before → Trigger → During → Pending → Complete/Fail → Retry/Timeout → Restart/Recovery → Later Readback`.

Include stale state, delayed events, mixed timing across surfaces and state changes between display and action.

### Actor/responsibility trace

Prove who initiates, decides, executes, owns truth, may cancel/recover, receives handoff, waits and intervenes operationally.

### Cross-layer vertical trace

`UX/UI → Surface State → Client Logic → Controller/Adapter → Canonical/Generated Contract → API → Auth/AuthZ → Domain/State Machine → Transaction/Data/Event/Provider → Runtime → Persisted Readback → Observable Result`.

### Differential cross-surface trace

For the same canonical entity/state/event compare meaning, available actions, timing and responsibility across every affected surface.

### Invariant analysis

Extract what must never be violated, then try to violate it.

### Counterfactual analysis

Ask what happens if the next actor never responds, action is repeated, event arrives late/out of order, state changes concurrently, process/app restarts, provider returns unknown result or surfaces run mixed versions.

### Negative-space analysis

Search for what should exist but is absent:

`missing journey | state | transition | action | validation | authorization | feedback | handoff | recovery | intervention | consumer | readback | ownership | decision rule`.

### Experimental validation

When capabilities permit:

`form falsifiable hypothesis → run smallest real check → observe runtime/persisted readback → compare to expected semantic model → refine/reject hypothesis`.

Never claim runtime/E2E/visual evidence that was not actually obtained.

### Adversarial diagnosis

Assume the current explanation is wrong and deliberately search for contradictions, hidden writers/readers, silent fallback, stale state, race, partial transaction, permission leak, contract/data drift, legacy path, missing consumer, wrong owner/handoff or unhandled failure/recovery.

## 8. Full-stack operation trace

A material operation should be traceable, where applicable, through:

`Product Truth → Actor/Service Identity → Session/Device → Trusted Scope → Role/Permission/Object Authorization → Surface/Route/Control → Shared Controller/Binding → Canonical/Generated Contract → API → Domain/State Machine → Validation/Transformation → Transaction/Database → Cache/Idempotency → Events/Jobs/Providers → Network/Response → Persisted Canonical Readback → Every Required Consumer/Surface → Audit/Observability/Runtime Evidence`.

A successful screen, endpoint, build or unit test is never by itself End-to-End proof.

## 9. Findings ledger

Every material finding must be addressable and remain accounted for. Record at least:

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

Useful statuses:

`OPEN | EVIDENCE/HOLD | FIXED_PENDING_VERIFY | PROVEN_CLOSED | NOT_APPLICABLE_WITH_PROOF`.

A finding does not disappear because it no longer appears in the latest log.

## 10. Findings are evidence until promoted

Every early technical finding starts as `EVIDENCE/HOLD`.

Promote only after proving enough of:

`operational parent + semantic meaning + causal chain + highest proven root + affected graph + comparative priority`.

The only exception is a proven diagnostic blocker that prevents acquiring truth; change it minimally and return immediately to higher diagnosis.

## 11. Root-cause proof

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

A root may remain unproven only with explicit missing evidence or a proven exclusion.

## 12. Root clusters, graph and systemic leverage

Cluster dependent findings under their highest proven common causes and reason through a dependency/impact graph.

Do not prioritize by:

`first discovered | easiest fix | latest commit | largest file/finding count | first CI failure | last session topic`.

Prefer, by material relevance:

`upstream depth → blocking power → canonical/foundation importance → blast radius → user/operational impact → security/data/finance risk → unlock value → cross-surface/journey effect → recurrence → structural-debt multiplier → local cosmetic impact`.

## 13. Competitive deepening and progressive narrowing

Start broad enough to identify roots capable of materially outranking one another. Deepen only candidates that can change priority or invalidate the treatment.

Before execution the winning root must satisfy:

```text
PROVEN
AND DEEPENED_ENOUGH_TO_RANK
AND HIGHEST_CURRENT_SYSTEMIC_LEVERAGE
AND EXECUTABLE
AND NO_KNOWN_HIGHER_ROOT_CAN_MATERIALLY_CHANGE_TREATMENT
```

Then execute. Do not keep wandering through low-value details that cannot alter the next correct action.

## 14. Decision taxonomy

Classify unknowns:

```text
DERIVABLE_FACT
= evidence/code/contracts/data/runtime can resolve it; resolve it yourself.

TRUE_DECISION_GAP
= materially different product/business/semantic/architectural behaviors remain valid and evidence cannot choose; ask the human.

EXTERNAL_EVIDENCE_GAP
= correctness requires an unavailable environment/provider/capability; keep the claim open with exact acquisition/unblock path.
```

Do not turn discoverable facts into questions.

## 15. True Decision Boundary

Do not ask after every finding. Continue until a material group of journeys/states/handoffs cannot be diagnosed or treated correctly without a non-derivable choice.

Before asking, summarize:

`what was inspected → what is proven → current operational truth → gaps/contradictions → what evidence resolved automatically → what cannot be resolved and why`.

Batch overlapping questions, remove derivatives and order by unlock value.

Each true decision request contains:

```text
Decision ID
Affected Journey/Actor/Surface/State
Exact decision required
Why evidence cannot decide
Options with materially distinct behavior
Recommendation
Reason
Impact/tradeoffs per option
Affected roots/journeys/surfaces/contracts/data
```

## 16. Re-diagnosis after decisions

After human decisions:

```text
propagate decision
→ rebuild affected actor/responsibility map
→ rebuild affected state/transition/invariant model
→ recheck actions/preconditions/authorization
→ recheck handoffs/cross-surface meaning
→ recheck cross-layer meaning
→ recheck success/failure/recovery/temporal behavior
→ re-run negative-space/adversarial checks on affected cone
→ update roots/ranking
```

Never jump directly from an answer to implementation when the answer changes the semantic model.

## 17. Source-of-fix readiness

Before treating a material root, be able to identify:

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

If the root requires source/runtime/data/contract mutation and the actual source of defect is still unknown, it is not executable yet.

## 18. JIT execution frontier

Derive only the next coherent treatment frontier from the currently proven root and hard dependencies.

Do not build speculative multi-root task forests whose assumptions may disappear after the current root is fixed.

After each treatment, re-diagnose and derive the next frontier from the new live state.