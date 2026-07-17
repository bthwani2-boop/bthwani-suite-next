# 26 — SDLC Team and Stage Gates

Status: ACTIVE_CANONICAL

## Purpose

Own formal lifecycle state, authority separation, and stage transitions for changes whose risk requires more than CODE_BASED_LEAN verification.

This authority does not replace Product Truth, architecture, security, finance, or release ownership. It composes them into one forward-only stage model.

## Stage state machine

```text
G0_INTAKE
G1_PRODUCT_MODEL_APPROVED
G2_DESIGN_APPROVED
G3_READY_FOR_IMPLEMENTATION
G4_IMPLEMENTATION_VERIFIED
G5_PRODUCT_ACCEPTED
G6_QA_APPROVED
G7_SECURITY_APPROVED
G8_RELEASE_APPROVED
G9_DEPLOYED
G10_PRODUCTION_VERIFIED
CLOSED_WITH_EVIDENCE
FIX_REQUIRED
BLOCKED_EXTERNAL
NEEDS_EVIDENCE
QA_BLOCK
SECURITY_BLOCK
RELEASE_BLOCK
```

A stage transition is valid only when all required inputs, same-commit evidence, and authority decisions for the requested stage exist.

## Authorities

- `SDLC_PROGRAM_AUTHORITY` owns stage state and transition legality.
- `PRODUCT_MANAGER_AUTHORITY` owns the problem, actors, outcome, priority, scope, exclusions, and product-model approval.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns functional behavior, permissions, states, business rules, cross-surface acceptance, implementation readiness, and product acceptance.
- `UX_JOURNEY_AUTHORITY` owns journey coherence when a human-facing flow is affected.
- `ARCHITECTURE_AUTHORITY` owns service boundaries, contracts, data flow, dependency direction, and ADR decisions.
- `ENGINEERING` owns implementation and developer verification.
- `INDEPENDENT_QUALITY_AUTHORITY` owns QA approval and may issue `QA_BLOCK`.
- `APPLICATION_SECURITY_AUTHORITY` owns security approval and may issue `SECURITY_BLOCK`.
- `RELEASE_AUTHORITY` owns release, deployment, rollback, and production verification and may issue `RELEASE_BLOCK`.
- `RISK_ACCEPTANCE_AUTHORITY` owns accepted residual risk and must not be the author of the change.

Product-manager approval and product-owner acceptance are separate decisions. Engineering cannot substitute for either.

## Separation of duties

The author or executor of a high-risk change cannot be its final approver for the same risk. This applies to:

- product-model and product-acceptance decisions;
- authentication, authorization, RBAC, and sessions;
- PII, secrets, privacy, payments, WLT, ledger, settlement, payout, or reconciliation;
- migrations and production data;
- infrastructure, CI, release, rollback, and signing;
- critical or high vulnerabilities;
- final closure.

Agent review is useful evidence but does not fabricate a missing human, regulatory, security, QA, or release approval.

## Required stage outputs

### G0 — Intake

- capability ID;
- Product Truth contract or explicit `product_impact: NONE`;
- problem and evidence state;
- actors;
- affected and excluded services/surfaces;
- risk class and data classification;
- owners and exclusions.

### G1 — Product model approved

- `PRODUCT_MANAGER_AUTHORITY` approval;
- actor and role model;
- required/excluded surfaces;
- observable outcome and primary metric;
- acceptance criteria and negative invariants;
- fixed constraints, variable scope, and appetite.

### G2 — Design approved

- architecture decision and ownership;
- data flow and trust boundaries;
- API/OpenAPI impact;
- database/migration impact;
- UX journey when applicable;
- threat model and rollback plan when applicable.

### G3 — Ready for implementation

- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` approval of functional behavior;
- dependencies and ordered work units;
- target checks and evidence scopes;
- allowed/forbidden paths;
- ownership confirmation.

### G4 — Implementation verified

- code review;
- targeted type, test, build, contract, migration, or guard results;
- no unauthorized scope expansion;
- no fake runtime, commercial, or closure claims.

### G5 — Product accepted

- independent product-owner acceptance result;
- every required surface present and every excluded surface absent;
- actor actions and forbidden actions verified;
- state and error behavior accepted;
- Product Truth contract updated to `PRODUCT_ACCEPTED` or `FIX_REQUIRED`.

### G6 — QA approved

- independent QA result;
- negative tests;
- cross-surface consistency;
- accessibility and RTL when UI is affected;
- no open product-acceptance failure.

### G7 — Security approved

- security verification;
- vulnerability status;
- authentication, privacy, secrets, and isolation checks as applicable.

### G8 — Release approved

- release readiness;
- unresolved blockers and residual-risk decision;
- rollback procedure;
- monitoring and support ownership.

### G9 — Deployed

- deployment evidence for the immutable approved commit.

### G10 — Production verified

- production smoke/readback;
- telemetry and error review;
- rollback readiness confirmation.

## Decisions

All decisions map through `governance/contracts/decision-vocabulary.json`.

Canonical decisions used by this lifecycle are:

```text
PASS
FIX_REQUIRED
BLOCKED_EXTERNAL
NEEDS_EVIDENCE
QA_BLOCK
SECURITY_BLOCK
RELEASE_BLOCK
CLOSED_WITH_EVIDENCE
```

`GATE_PASS` and `HARD_BLOCKED_EXTERNAL_ONLY` are deprecated aliases and must not be introduced in new artifacts.

## Closure rule

`CLOSED_WITH_EVIDENCE` requires:

- all applicable stages passed on the same immutable commit;
- Product Truth approval and product acceptance where applicable;
- runtime evidence where runtime is claimed;
- independent QA and security where required;
- release approval and production verification when release/production is in scope;
- no failed, blocked, pending, stale, or branch-mismatched evidence;
- separation of duties proven.

Documentation-only changes may close only a governance-only journey and may not claim live-code, runtime, release, or production closure.

## Guard runner

```powershell
pnpm run guard:sdlc -- --capability <CAPABILITY_ID> --stage <REQUESTED_STAGE> --affected
```

Optional artifact validation:

```powershell
pnpm run guard:sdlc -- --stage <REQUESTED_STAGE> --artifact <artifact-manifest.json> --impact <change-impact.json>
```

The guard validates all independent validators, aggregates failures, and exits nonzero only after every applicable validator has run. It never mutates stage state or approves release/production by itself.

## Acceptance condition

Accepted only when Product Truth precedes implementation, product acceptance precedes QA, all formal authorities are separated, transitions are forward-only and evidence-bound, validators aggregate failures, and final closure cannot be issued from code-only or stale evidence.
