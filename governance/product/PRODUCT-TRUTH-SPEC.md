# BThwani Product Truth Specification

Status: ACTIVE_CANONICAL
Representation: `PRODUCT_TRUTH_V1`
Structural schema: `PRODUCT-TRUTH.schema.json`

## Purpose

A Product Truth record owns durable capability/journey meaning that must survive refactors, framework changes, route/file renames, generated-client changes and replacement of execution tooling. It defines what the capability means, who may act, who owns each truth boundary, what states/outcomes are legal, what must never happen and what canonical readback must prove.

Product Truth is not an implementation registry, execution plan, test plan, task ledger or current-code snapshot.

## Canonical active representation

Every active `*.product-truth.json` uses one representation grammar:

```text
schemaVersion: 1
capabilityId
problem
actors[]
surfaces[]
outcome
acceptance
invariants
owners
```

Optional semantic extensions such as `preconditions`, `stateModel`, `transitions`, `relationships`, `capabilities` or domain-specific matrices are allowed when they express durable meaning and do not create a second grammar.

`PRODUCT-TRUTH.schema.json` validates representation structure only. Schema PASS does **not** prove that Product semantics are correct.

## Identity and filenames

- `capabilityId` is a stable uppercase-snake semantic identity, not a task/campaign name.
- filenames use lowercase kebab-case and end in `.product-truth.json`.
- branch names, PR numbers, current bugs, dates of a repair campaign, `fix/rescue/closure` workstream names and temporary implementation identifiers are forbidden as capability identity.
- one material capability/journey has one durable Product Truth identity.

Two records may share actors/owners only when their outcomes and authority boundaries are genuinely distinct. If two active records govern the same decision/state transition, explicitly resolve one owner and merge/split/re-scope rather than relying on synchronization.

## Required semantic envelope

A materially complete Product Truth expresses, when applicable:

1. problem/outcome and affected actors;
2. actor responsibilities, permitted actions and forbidden actions;
3. canonical semantic owners and cross-domain boundaries;
4. required surfaces/consumers and explicit exclusions with reasons;
5. preconditions and trusted context/object-scope requirements;
6. durable states, legal transitions and forbidden transitions;
7. business and negative invariants;
8. canonical mutation intent/authority and committed readback semantics;
9. cross-surface/service handoffs and durable event/contract meaning;
10. canonical data ownership and material persistence/migration implications;
11. idempotency/concurrency/retry/replay semantics where material;
12. external-provider unknown-result/reconciliation/recovery semantics where material;
13. security/privacy/financial restrictions where material;
14. user-visible loading/empty/offline/forbidden/conflict/partial/error/recovery semantics where material;
15. acceptance criteria and failure states;
16. any bounded unresolved durable decision that truly requires authorization.

Do not manufacture irrelevant fields simply to satisfy symmetry.

## Actor model

Every `actors[]` entry states:

- `id` — stable actor identity within the capability;
- `role` — responsibility in this capability;
- `permittedActions` — actions the actor may intentionally initiate/consume;
- `forbiddenActions` — authority the actor must never gain through this capability.

Actor permissions in Product Truth express durable Product responsibility. Concrete endpoint authorization remains enforced by the owning executable system and security policy.

## Surface model

Every `surfaces[]` entry states at minimum `id`, `required`, `actors`, `states`, and `actions`. An excluded surface uses `required: false` plus `exclusionReason` when misunderstanding the exclusion could materially misdirect implementation.

Fields such as `routesOrScreens`, `operationIds`, table names or current component names are permitted only as **derived non-normative traceability**. Their presence does not make them Product authority, and changing them does not require a Product semantic change when capability meaning remains identical.

Implementation-specific correctness requirements such as generated-client mechanics, file placement, framework patterns or test commands belong to engineering policy/executable contracts, not Product acceptance criteria.

## Owners and stewardship

`owners` identifies semantic/domain truth owners and may also carry named stewardship labels for discoverability. Keys such as `productManager`, `productOwner` and `uxJourneyOwner` are stewardship roles only; they do not override explicit domain truth owners such as `IDENTITY`, `WORKFORCE`, `DSH`, `WLT`, `PLATFORM_CONTROL`, `PROVIDERS` or `MEDIA`.

When a capability spans domains, state exactly which owner owns which durable fact. `both systems keep it in sync` is not ownership.

## State, mutation, readback and recovery

Happy-path acceptance is incomplete when retries, concurrency, authorization, offline behavior, provider uncertainty, partial failure or recovery can change the business result.

A Product Truth must not allow a surface-local state machine, optimistic UI state, cache, projection or external-provider response to become canonical persisted success unless the owning semantics explicitly define it.

Unknown external financial/provider outcomes remain unknown/reconcilable until authoritative evidence resolves them.

## Product Truth changes

A Product Truth changes only for a proven/authorized durable semantic reason, not because implementation moved. A semantic change must account for affected actors, surfaces, owners, contracts, data/migrations, readbacks and superseded authority.

A representation-only migration must preserve every still-valid semantic statement. Any intentionally removed statement needs an explicit reason in the change review; formatting cleanup is not permission to drop meaning.

## Acceptance and evidence boundary

Product Truth states what outcome/invariant must be proven. Engineering, security and delivery governance determine the evidence class required for the affected claim. Static, runtime, visual, accessibility, security, financial, data-migration and release evidence are not interchangeable.

No workflow, agent, prompt, scanner or schema can declare Product Truth semantically correct merely because its own validation passed.
