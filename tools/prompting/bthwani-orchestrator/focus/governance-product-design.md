# Focus — Governance, Product Semantics and Product Design

## 1. Governance is a candidate authority, not blind truth

Start from known roots such as `governance/**`, especially `governance/product/**` and `governance/policies/**`, but verify every material claim against the affected live system.

Classify material governance claims as:

`CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | DECISION_REQUIRED`.

Never apply “governance wins” or “code wins” as a universal rule.

## 2. Reconciliation target

Prove the intended target truth using materially available:

`explicit human decision + product outcome + actor expectations + operational evidence + contracts + data ownership + runtime behavior + canonical responsibility`.

Then reconcile all representations to that truth.

## 3. Product semantics to model

Inspect where applicable:

- actors/identities and role boundaries;
- authorities, responsibilities and ownership;
- capabilities and business rules;
- journeys and handoffs;
- states, transitions, preconditions and decision rules;
- invariants and forbidden outcomes;
- success/failure/recovery/unknown-result behavior;
- cross-surface meaning;
- canonical source/write owner;
- product design/information architecture implications.

## 4. Governance drift classes

Look for:

- governance/document > implementation drift;
- implementation > governance drift;
- policy > product contradiction;
- product > journey contradiction;
- journey > runtime contradiction;
- contract > implementation contradiction;
- database/data > contract contradiction;
- cross-surface semantic drift;
- duplicate/parallel governance authorities.

Do not dismiss these as “just docs”. A material semantic mismatch is a real finding.

## 5. Governance writes require system impact analysis

Never change a policy/product truth merely because its wording seems wrong.

Before a material governance write establish:

`claimed semantic change → affected actors/journeys/states/owners → implementation/contracts/data/runtime/surfaces impact → target truth → migration/cutover consequences`.

Law:

> **NO GOVERNANCE WRITE WITHOUT SYSTEM IMPACT ANALYSIS.**

## 6. System semantic changes require governance impact analysis

If implementation treatment changes actor, authority, responsibility, journey, state, transition, invariant, canonical ownership, API/data ownership or policy semantics, inspect and update the affected governance representation.

Law:

> **NO SYSTEM SEMANTIC CHANGE WITHOUT GOVERNANCE IMPACT ANALYSIS.**

## 7. Governance cannot substitute for treatment

```text
wrong code + corrected governance = NOT CLOSED
correct code + stale/wrong governance = NOT CLOSED when governance is materially affected
correct system + reconciled governance + required runtime proof = closure candidate
```

Documentation records the fix; it does not constitute the fix.

## 8. Product design

Product design covers more than visual UI:

- whether the correct actor can understand the state;
- whether available actions match authority/state;
- whether decision outcomes are communicated correctly;
- whether responsibility/handoff is clear;
- whether errors/recovery preserve user intent and truth;
- whether information architecture reflects product ownership/capabilities;
- whether multiple surfaces present consistent meaning for the same canonical fact.

Treat discrepancies through the proven root, not by rewriting labels around incorrect backend/data semantics.

## 9. Parallel governance truth

If the same material semantic concept is declared differently in multiple governance files/registries, prove one canonical representation/owner and reconcile or retire the others as appropriate.

Do not create a new “authority registry” merely to avoid resolving existing ownership.

## 10. Historical governance and plans

Old plans, old branch governance, previous journey registries and historical reports may inform diagnosis but cannot override current proven truth automatically.

`PAST INSTRUCTION ≠ CURRENT AUTHORITY`.

## 11. Closure for governance/product focus

A material semantic root is not closed until all materially affected representations of the same truth are reconciled across governance, contracts/data, implementation, runtime and required consuming surfaces.