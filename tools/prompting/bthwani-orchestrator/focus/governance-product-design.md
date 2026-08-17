# Focus — Governance, Product Semantics and Product Design

## 1. Governance is a candidate authority, not blind truth

Start from current governance/product/policy roots that materially apply, but verify every material claim against the affected live system.

Classify material governance claims as:

`CONFIRMED | STALE | WRONG | CONFLICTING | INCOMPLETE | DECISION_REQUIRED`.

Never apply “governance wins” or “code wins” as a universal rule.

## 2. Reconciliation target

Prove intended target truth using materially available:

`explicit current human decision + product outcome + actor expectations + operational evidence + contracts + data ownership + runtime behavior + canonical responsibility`.

Then reconcile all affected representations to that truth.

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
- product design and information-architecture implications.

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
- duplicate/parallel governance authorities;
- a stale document still directing operators/developers toward an obsolete owner/path.

A material semantic mismatch is a real finding even when one representation is “only documentation”.

## 5. Governance writes require system impact analysis

Never change a policy/product declaration merely because wording seems wrong.

Before a material governance write establish:

`claimed semantic change → affected actors/journeys/states/owners → implementation/contracts/data/runtime/surfaces impact → target truth → migration/cutover consequences`.

> **NO GOVERNANCE WRITE WITHOUT SYSTEM IMPACT ANALYSIS.**

## 6. System semantic changes require governance impact analysis

If treatment changes actor, authority, responsibility, journey, state, transition, invariant, canonical ownership, API/data ownership or policy semantics, inspect and reconcile the affected governance representation.

> **NO SYSTEM SEMANTIC CHANGE WITHOUT GOVERNANCE IMPACT ANALYSIS.**

## 7. Governance cannot substitute for treatment

```text
wrong system + corrected governance = NOT CLOSED
correct system + materially stale governance = NOT CLOSED
correct system + reconciled governance + required runtime proof = closure candidate
```

Documentation records the fix; it does not constitute the fix.

## 8. Product design

Product design covers more than visual UI:

- whether the correct actor understands the state;
- whether available actions match authority/state;
- whether decision outcomes are communicated correctly;
- whether responsibility/handoff is clear;
- whether errors/recovery preserve user intent and canonical truth;
- whether information architecture reflects product ownership/capabilities;
- whether multiple surfaces present consistent meaning for the same canonical fact;
- whether operator/control-panel intervention is available and correctly bounded where the journey requires it.

Treat discrepancies through the proven root, not by rewriting labels around incorrect backend/data semantics.

## 9. Parallel governance truth

If the same material semantic concept is declared differently in multiple governance representations, prove one canonical representation/owner and reconcile or retire others as appropriate.

Do not create a new authority registry merely to avoid resolving existing ownership.

## 10. Historical/derived representations

Old plans, old branch documents, previous journey registries, reports and comments may inform diagnosis but cannot override current proven truth automatically.

`PAST INSTRUCTION ≠ CURRENT AUTHORITY`.

Revalidate any inherited decision/state before using it as current execution authority.

## 11. Decision boundary

If evidence proves only that multiple product/operational behaviors remain valid but cannot determine which is intended, raise `DECISION_REQUIRED` using the canonical decision format in `02-DIAGNOSE-ROOT-CAUSE.md`.

Do not convert a product preference into an engineering guess.

## 12. Closure for governance/product focus

A material semantic root is not closed until every materially affected representation of the same truth is reconciled across governance, contracts/data, implementation, runtime and required consuming surfaces, and no parallel/stale authority remains capable of misleading future execution.