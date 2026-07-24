# 26 — SDLC Team and Stage Gates

Status: ACTIVE_CANONICAL

## Purpose

Own formal lifecycle state, evidence scopes, authority separation, stage exclusions, and forward-only transitions for changes whose risk requires more than targeted `CODE_BASED_LEAN` verification.

This authority composes Product Truth, architecture, governance, CI, engineering review, quality, security, finance, release, production, and residual-risk decisions. No role, agent, adapter, guard, workflow, or executor may manufacture another authority’s approval.

## Lifecycle

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
```

Unresolved decisions are `FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, `RELEASE_BLOCK`, and `PROTOCOL_VIOLATION`.

A transition is valid only when its schemas, same-commit evidence, impact-derived scopes, stage requirements, and independent approvals pass.

## Stage exclusions

A stage may be skipped only when all of the following hold:

1. the artifact lists it in `notApplicableStages`;
2. a matching `stageExclusions` entry records a non-empty reason and evidence;
3. the change-impact document does not make that stage mandatory;
4. every skipped stage between the current and requested stage is accounted for;
5. the transition remains forward-only.

An excluded stage is not a passed stage. `CLOSED_WITH_EVIDENCE` requires the latest applicable stage plus evidence-backed exclusions for every skipped stage.

## Evidence scopes

The artifact declares `applicableEvidenceScopes` and `passedEvidenceScopes` using:

```text
static
product
runtime
visual
qa
security
finance
isolation
governance
ci
release
production
```

`static` is always applicable. Other scopes are derived from change impact. A scope-specific `PASS` never upgrades another scope. Final closure requires every applicable scope to pass on the same immutable commit.

## Authorities

- `SDLC_PROGRAM_AUTHORITY`: stage state and transition legality.
- `PRODUCT_MANAGER_AUTHORITY`: problem, actors, outcome, scope, priority, exclusions, and product-model approval.
- `PRODUCT_OWNER_ACCEPTANCE_AUTHORITY`: functional behavior, permissions, states, implementation readiness, and product acceptance.
- `UX_JOURNEY_AUTHORITY`: human-facing journey coherence and accessibility intent.
- `ARCHITECTURE_AUTHORITY`: service boundaries, contracts, data flow, dependency direction, and ADR decisions.
- `GOVERNANCE_CONTRACT_AUTHORITY`: authority precedence, decision vocabulary, agent and skill contracts, guard registration, and SDLC control plane.
- `CI_WORKFLOW_AUTHORITY`: workflow triggers, permissions, immutable pins, verification-only behavior, aggregation, and check topology.
- `ENGINEERING`: implementation and developer verification.
- `INDEPENDENT_REVIEWER`: independent implementation, scope, and developer-evidence review.
- `INDEPENDENT_QUALITY_AUTHORITY`: QA, negative tests, cross-surface quality, accessibility acceptance, and `QA_BLOCK`.
- `APPLICATION_SECURITY_AUTHORITY`: security, privacy, authorization, vulnerability, isolation-security acceptance, and `SECURITY_BLOCK`.
- `FINANCIAL_CONTROL_AUTHORITY`: WLT financial truth, payment, COD, commission, refund, settlement, payout, wallet, ledger, reconciliation, and finance approval.
- `RELEASE_AUTHORITY`: release, deployment, rollback, production verification, and `RELEASE_BLOCK`.
- `RISK_ACCEPTANCE_AUTHORITY`: accepted residual risk and never the change author.

## Separation of duties

By default, the author or executor of a change cannot approve the same risk. Default separation applies to product model and acceptance, governance, CI, independent review, security, finance, migrations, production data, release, deployment, critical vulnerabilities, residual risk, and final closure. The sole-owner exception below narrows only its explicitly eligible approval domains.

Without the active sole-owner exception, governance and CI approving identities must differ. A skill or agent may route evidence but cannot fabricate a missing person, team, regulator, provider, QA, security, finance, release, or production approval.

### Sole-owner exception

When `governance/authority/single-owner-mode.json` is active and matches the repository, its recorded owner may fulfill multiple eligible human approval roles for non-protected work. Product, architecture, governance, CI, implementation-review, and QA authority domains remain logically separate and retain their distinct owner skills and evidence, but they do not require a second human identity.

The exception applies only when the exact scope is recorded in GitHub, the current task explicitly authorizes the decision, and every required same-commit automated check passes. Outcome acceptance additionally requires the exact implementation commit. A blanket future authorization is implementation authority, not advance acceptance of an unseen result.

Execution agents cannot impersonate the owner, issue owner approval, waive failed checks, or bypass repository protection. Authentication, authorization, sessions, PII, privacy, secrets, credentials, tenant isolation, security approval, WLT and finance, migrations and production data, critical or high vulnerability acceptance, residual risk, release, deployment, production verification, and final closure remain protected and require independent or external evidence. If that evidence is unavailable, the applicable scope remains unclosed.

## Stage outputs

### G0 — Intake

Capability ID, Product Truth or explicit product impact, actors, affected and excluded paths and surfaces, risk, data class, impact flags, owners, applicable evidence scopes, and initial gates.

### G1 — Product model approved

Product Manager approval, actor and role model, outcome and metric, acceptance and negative invariants, fixed constraints, variable scope, and appetite.

### G2 — Design approved

Architecture decision, data and trust flow, API and database impact, journey design, threat model, and rollback plan as applicable.

### G3 — Ready for implementation

Product Owner implementation-readiness approval, functional behavior, permissions, dependencies, ordered work units, allowed and forbidden paths, target gates, and ownership confirmation.

### G4 — Implementation verified

Independent review or recorded sole-owner review for eligible non-protected work, targeted checks, diff scope, no fake runtime or commercial truth, Governance Contract approval when governance is impacted, CI Workflow approval when CI is impacted, and independent Financial Control approval when WLT finance is impacted.

### G5 — Product accepted

Independent Product Owner acceptance or exact-commit sole-owner acceptance for eligible non-protected work, required surfaces present, excluded surfaces absent, actor actions and forbidden actions verified, state and failure behavior accepted, and Product Truth updated.

### G6 — QA approved

Independent QA, negative tests, cross-surface consistency, accessibility and RTL where applicable, and no open product-acceptance failure.

### G7 — Security approved

Independent security evidence, vulnerability state, authentication, privacy, secrets, authorization, and isolation-security evidence as applicable.

### G8 — Release approved

Release readiness, residual-risk decision, rollback, monitoring, support ownership, and no unresolved release blocker.

### G9 — Deployed

Deployment evidence for the immutable approved commit.

### G10 — Production verified

Production smoke and readback, telemetry and error review, and rollback readiness.

## Closure

`CLOSED_WITH_EVIDENCE` requires:

- every applicable evidence scope passed;
- every required gate and approval passed on the resolved commit;
- every skipped stage justified by exclusion evidence;
- Product Truth and acceptance where product impact exists;
- governance, CI, finance, security, QA, release, and production approval where their impact exists;
- runtime and persistence evidence where behavior is claimed;
- no failed, blocked, pending, stale, branch-mismatched, unauthorized self-approved, or merge-ref-only evidence;
- separation of duties and current GitHub enforcement proven for protected high-risk closure; sole-owner mode cannot satisfy protected closure.

A bounded governance-only change may close without runtime or production only when those stages and scopes are demonstrably not applicable. It cannot claim application, financial, runtime, release, production, or SaaS activation closure.

## Guard runner

```powershell
pnpm run guard:sdlc -- --capability <CAPABILITY_ID> --stage <REQUESTED_STAGE> --affected --artifact <artifact.json> --impact <change-impact.json>
```

Structural validation without an artifact may verify package integrity only. It cannot approve a stage or final closure.

## Acceptance condition

Accepted only when Product Truth precedes implementation, product acceptance precedes QA, finance has an independent owner, all applicable scopes are declared, stage exclusions are evidence-backed, sole-owner approvals are exact-scope and exact-commit where required, protected approvals remain independent, transitions are forward-only, validators aggregate failures, and final closure cannot be issued from static code, declarations, stale runs, sole-owner authorization, or incomplete GitHub enforcement.
