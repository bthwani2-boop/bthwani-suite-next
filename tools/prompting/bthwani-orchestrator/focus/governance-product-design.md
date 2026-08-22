# Focus — Governance, Product Semantics and Product Design

## 1. Governance is a candidate authority, not blind truth

Start from current governance/product/policy roots that materially apply, then verify material claims against the affected live system.

Classify governance claims:

`CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | MISSING_BUT_PROVEN | DECISION_REQUIRED`.

Never apply “governance wins” or “code wins” universally.

## 2. Reconciliation target

Prove intended target truth using available explicit decision, product outcome, actor expectations, operational evidence, contracts, data ownership, runtime behavior, canonical responsibility and authoritative technical/standard evidence where needed; then reconcile affected representations to that truth.

## 3. Product semantics to model

Inspect actors/identities and role boundaries, authorities/responsibilities, capabilities/business rules, journeys/handoffs, states/transitions/preconditions/decision rules/invariants, success/failure/recovery/unknown-result behavior, cross-surface meaning, canonical source/write owner and information-architecture implications.

## 4. Governance drift classes

Look for governance→implementation drift, implementation→governance drift, policy→product contradiction, product→journey contradiction, journey→runtime contradiction, contract→implementation contradiction, data→contract contradiction, cross-surface semantic drift, duplicate governance authorities, materially missing durable truth and stale documents still directing work toward obsolete owners/paths.

## 5. Governance writes require system impact analysis and proven truth

Before a material governance write establish:

`claimed semantic change or clarification → affected actors/journeys/states/owners → implementation/contracts/data/runtime/surfaces evidence → canonical target truth → root/clarity cause → future-understanding impact → blast radius → migration/cutover consequences when any`.

A governance classification such as `STALE`, `WRONG`, `CONFLICTING`, `INCOMPLETE` or `MISSING_BUT_PROVEN` is evidence for investigation, not mutation authority. Before any `UPDATE | CORRECT | ADD | DELETE | MERGE | MOVE | RESTRUCTURE`, prove the affected Canonical Product/System Truth, the reason the current governance conflicts with or materially omits it, the material impact/blast radius, and that no unresolved `DECISION_REQUIRED` or material semantic contradiction can change the write.

```text
UNCERTAINTY = NO GOVERNANCE WRITE
CURRENT CODE ≠ GOVERNANCE UPDATE AUTHORITY
SUSPECTED DRIFT ≠ DELETE/REWRITE AUTHORITY
DISCOVERED ≠ GOVERNANCE WORTHY
```

If proof is incomplete, keep the governance unchanged and classify the affected claim as `EVIDENCE/HOLD` or `DECISION_REQUIRED` through `02` as appropriate.

**NO GOVERNANCE WRITE WITHOUT PROVEN TARGET TRUTH + SYSTEM IMPACT/CLARITY ANALYSIS.**

## 6. System semantic changes require governance impact analysis

If treatment changes actor, authority, responsibility, journey, state, transition, invariant, canonical ownership, API/data ownership or policy semantics, inspect and reconcile affected governance.

**NO SYSTEM SEMANTIC CHANGE WITHOUT GOVERNANCE IMPACT ANALYSIS.**

## 7. Governance cannot substitute for treatment

```text
wrong system + corrected governance = NOT CLOSED
correct system + materially stale governance = NOT CLOSED
correct system + materially missing proven durable governance truth = NOT CLOSED when the gap can mislead future execution
correct system + reconciled governance + required runtime proof = closure candidate
```

Documentation records the fix; it does not constitute the fix.

## 8. Product design

Product design includes whether the right actor understands state, available actions match authority/state, decisions are communicated correctly, responsibility/handoff is clear, recovery preserves intent/canonical truth, information architecture reflects ownership and cross-surface representations preserve the same meaning.

Treat discrepancies through the proven root, not by rewriting labels around incorrect backend/data semantics.

## 9. Engineering-governance value test

Rules, policies, registries, skills, guards, workflows, scripts and routing layers are not valuable merely because they are governance.

For every materially affected engineering-governance/control artifact prove:

```text
Unique Current Responsibility
+ Consumer
+ Trigger
+ Scope
+ Cadence
+ Assurance/Decision Value
+ Canonical Owner
+ Non-duplication with another layer
```

If its value is duplicated, stale, superseded, purely ceremonial or creates more ambiguity/cost than assurance, simplify, merge, retire or delete it only after satisfying the governance-write gate in §5. Do not add a new registry/guard/policy merely to reconcile two existing sources of authority; resolve ownership instead.

## 10. New control-artifact creation gate

Before creating any new engineering-control artifact such as a:

`guard | script | workflow | router | registry | policy | skill | hook | wrapper | adapter | generated control layer | verification layer`,

prove all materially applicable conditions:

```text
UNIQUE CURRENT NEED
AND NO EXISTING CANONICAL OWNER CAN ABSORB THE RESPONSIBILITY CLEANLY
AND NO SIMPLER DESIGN CAN PROVIDE THE SAME REQUIRED ASSURANCE/DECISION VALUE
AND A REAL CONSUMER EXISTS
AND A REAL TRIGGER/EXECUTION POINT EXISTS
AND THE SCOPE/BOUNDARY IS CLEAR
AND OWNERSHIP/LIFECYCLE/RETIREMENT CONDITION ARE CLEAR
AND THE NEW LAYER DOES NOT DUPLICATE EXISTING AUTHORITY OR ASSURANCE
```

If these conditions are not proven, **DO NOT CREATE THE ARTIFACT**. Prefer removal, consolidation, routing simplification or strengthening the canonical owner.

A new control layer is not an acceptable way to make conflicting old layers coexist indefinitely.

## 11. Historical/derived representations

Old plans, prompts, branch documents, journey registries, reports and comments may inform diagnosis but cannot override current proven truth automatically.

`PAST INSTRUCTION ≠ CURRENT AUTHORITY`.

## 12. External research boundary

External official/primary sources may establish technical, platform, security, standards or tool behavior and may inform design alternatives. They do not define BThwani product semantics.

If multiple materially valid product/operational choices remain after evidence and research, use the decision boundary in `02` rather than importing an external convention as product truth.

## 13. Decision boundary

If multiple materially valid product/operational behaviors remain and evidence cannot choose, raise `DECISION_REQUIRED` using `02-DIAGNOSE-ROOT-CAUSE.md`. Do not convert product preference into an engineering guess.

## 14. Closure for governance/product focus

A semantic/governance root is not closed until materially affected representations are reconciled across governance, contracts/data, implementation, runtime and consuming surfaces, and no stale/parallel authority or material durable-truth clarity gap remains capable of misleading future execution.

## 15. Progressive governance clarification and durable project memory

Governance is progressively clarified by proven work; it is not populated by every observation.

Classify newly exposed material knowledge as:

```text
EPHEMERAL_IMPLEMENTATION_FACT
CURRENT_RUNTIME_FACT
TASK_LOCAL_FACT
DURABLE_PROJECT_TRUTH
DURABLE_POLICY_INVARIANT
DECISION_REQUIRED
```

A `DURABLE_PROJECT_TRUTH` or `DURABLE_POLICY_INVARIANT` becomes a governance-write candidate only when all materially applicable conditions are proven:

```text
PROVEN
AND DURABLE ACROSS EXPECTED IMPLEMENTATION CHANGE
AND MATERIAL TO PRODUCT / OPERATIONS / OWNERSHIP / BOUNDARIES / POLICY
AND REUSABLE ACROSS OBJECTIVES / AGENTS / SESSIONS
AND ITS ABSENCE OR AMBIGUITY CAN MATERIALLY MISLEAD FUTURE UNDERSTANDING OR EXECUTION
AND AN EXISTING CANONICAL GOVERNANCE HOME CAN REPRESENT IT CLEANLY OR A NEW HOME IS UNIQUELY JUSTIFIED
AND NO UNRESOLVED CONTRADICTION / DECISION_REQUIRED CAN CHANGE IT
```

Typical governance-worthy facts include proven platform/surface identity, durable actors/role boundaries, authorities/responsibilities, canonical owners, domain/service boundaries, durable journeys/handoffs, material state/invariant semantics, security/financial boundaries and durable product policy.

Do not promote function names, SHAs, temporary paths, task status, bug/finding lists, transient runtime facts, replaceable implementation details, temporary rollout state or evidence bookkeeping into durable governance merely to make the model appear complete.

Route the truth to the smallest existing canonical home:

```text
platform-wide meaning / surfaces / actors / durable ownership
→ governance/product/PRD.md

compact stable orientation model
→ governance/product/platform-model.yaml

capability/journey-specific Product Truth
→ governance/product/contracts/*.product-truth.json

durable engineering/security/delivery policy
→ governance/policies/**
```

Prefer `ENRICH EXISTING CANONICAL OWNER` before `CREATE NEW GOVERNANCE ARTIFACT`.

### Bootstrap governance audit

When a bootstrap/reconciliation audit is materially required, compare current governance with proven live project truth and classify each material area as:

`CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | MISSING_BUT_PROVEN | DECISION_REQUIRED`.

Correct/enrich only `STALE | WRONG | CONFLICTING | INCOMPLETE | MISSING_BUT_PROVEN` items whose target truth is sufficiently proven and whose write passes §5. Do not manufacture completeness for unresolved areas.

The goal is compounding clarity: future objectives should begin from a more precise durable platform model than prior objectives, without turning governance into a copy of code or a historical execution ledger.
