# 26 — SDLC Team and Stage Gates

Status: ACTIVE_CANONICAL

## Purpose

Own formal lifecycle state, authority separation, and stage transitions for changes whose risk requires more than `CODE_BASED_LEAN` verification.

This authority composes Product Truth, architecture, governance, CI, engineering review, quality, security, risk, and release decisions. It does not allow one role, agent, adapter, guard, or workflow to manufacture another authority's approval.

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

A stage transition is valid only when all required inputs, same-commit evidence, and independent authority decisions for the requested stage exist.

## Authorities

- `SDLC_PROGRAM_AUTHORITY` owns stage state and transition legality.
- `PRODUCT_MANAGER_AUTHORITY` owns the problem, actors, outcome, priority, scope, exclusions, and product-model approval.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` owns functional behavior, permissions, states, business rules, cross-surface allocation, implementation readiness, and product acceptance.
- `UX_JOURNEY_AUTHORITY` owns journey coherence when a human-facing flow is affected.
- `ARCHITECTURE_AUTHORITY` owns service boundaries, contracts, data flow, dependency direction, and ADR decisions.
- `GOVERNANCE_CONTRACT_AUTHORITY` owns authority precedence, decision vocabulary, agent and skill contracts, guard registration, and SDLC control-plane integrity.
- `CI_WORKFLOW_AUTHORITY` owns workflow triggers, permissions, immutable action references, verification-only behavior, fail-late topology, and result aggregation.
- `ENGINEERING` owns implementation and developer verification.
- `ENGINEERING_REVIEWER` owns independent code, scope, and developer-evidence review for G4.
- `INDEPENDENT_QUALITY_AUTHORITY` owns QA approval and may issue `QA_BLOCK`.
- `APPLICATION_SECURITY_AUTHORITY` owns security approval and may issue `SECURITY_BLOCK`.
- `RELEASE_AUTHORITY` owns release, deployment, rollback, and production verification and may issue `RELEASE_BLOCK`.
- `RISK_ACCEPTANCE_AUTHORITY` owns accepted residual risk and must not be the author of the change.

Product-manager approval and product-owner acceptance are separate decisions. Governance-contract approval and CI-workflow approval are also separate decisions when both domains are affected. Engineering cannot substitute for any of them.

## Separation of duties

The author or executor of a protected change cannot be its approving authority for the same risk. This applies to:

- product-model and product-acceptance decisions;
- governance contracts and authority precedence;
- GitHub Actions, CI permissions, action pinning, and required-check topology;
- independent engineering review for high-risk implementation;
- authentication, authorization, RBAC, and sessions;
- PII, secrets, privacy, payments, WLT, ledger, settlement, payout, or reconciliation;
- migrations and production data;
- infrastructure, release, rollback, signing, and production verification;
- critical or high vulnerabilities;
- final closure.

When one change affects both governance and CI, `GOVERNANCE_CONTRACT_AUTHORITY` and `CI_WORKFLOW_AUTHORITY` must be represented by different approving owners. Agent review is useful evidence but does not fabricate a missing human, regulatory, security, QA, or release approval.

## Required stage outputs

### G0 — Intake

- capability ID;
- Product Truth contract or explicit `product_impact: NONE`;
- problem and evidence state;
- actors;
- affected and excluded services and surfaces;
- risk class and data classification;
- change-impact flags, including `governance` and `ci`;
- owners and exclusions.

### G1 — Product model approved

- `PRODUCT_MANAGER_AUTHORITY` approval;
- actor and role model;
- required and excluded surfaces;
- observable outcome and primary metric;
- acceptance criteria and negative invariants;
- fixed constraints, variable scope, and appetite.

### G2 — Design approved

- architecture decision and ownership;
- data flow and trust boundaries;
- API/OpenAPI impact;
- database and migration impact;
- UX journey when applicable;
- threat model and rollback plan when applicable.

### G3 — Ready for implementation

- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY` approval of functional behavior;
- dependencies and ordered work units;
- target checks and evidence scopes;
- allowed and forbidden paths;
- ownership confirmation.

### G4 — Implementation verified

- `ENGINEERING_REVIEWER` approval on the immutable commit;
- targeted type, test, build, contract, migration, or guard results;
- no unauthorized scope expansion;
- no fake runtime, commercial, or closure claims;
- `GOVERNANCE_CONTRACT_AUTHORITY` approval when `impacts.governance=true`;
- `CI_WORKFLOW_AUTHORITY` approval when `impacts.ci=true`;
- different governance and CI approvers when both impacts are true.

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

- production smoke and readback;
- telemetry and error review;
- rollback readiness confirmation.

## Decisions

All decisions map through `governance/contracts/decision-vocabulary.json`.

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

Scope-specific terms such as `STATIC_BINDING`, `ANTI_STUB_PASS`, `RUNTIME_SMOKE_PASS`, or `WORKFLOW_LINT_PASS` describe evidence only. They do not equal `CLOSED_WITH_EVIDENCE`.

## Closure rule

`CLOSED_WITH_EVIDENCE` requires:

- every applicable stage passed on the same immutable commit;
- every `requiredApproval` represented by a `PASS` approval on that commit;
- Product Truth approval and product acceptance where applicable;
- governance and CI approvals where their impact flags are true;
- runtime evidence where runtime is claimed;
- independent QA and security where required;
- release approval and production verification when release or production is in scope;
- no failed, blocked, pending, stale, branch-mismatched, or self-approved evidence;
- separation of duties proven.

Documentation-only or governance-only changes may close only their explicitly bounded journey. They may not claim live-code behavior, runtime, release, production, financial, or SaaS activation closure.

## Guard runner

```powershell
pnpm run guard:sdlc -- --capability <CAPABILITY_ID> --stage <REQUESTED_STAGE> --affected --artifact <artifact-manifest.json> --impact <change-impact.json>
```

Structural package validation without a journey artifact is permitted for repository integrity checks, but it cannot approve a stage transition.

The guard runs all independent validators, aggregates failures, exits nonzero after every applicable validator has run, and never mutates stage state or approves release or production by itself.

## Acceptance condition

Accepted only when Product Truth precedes implementation, product acceptance precedes QA, governance and CI approvals are impact-driven and independent, every required approval is same-commit and non-self-approved, transitions are forward-only, validators aggregate failures, and final closure cannot be issued from static code, a declaration, a prior run, or stale evidence.
