# 26 — SDLC Team and Stage Gates

Status: CANONICAL

## Purpose

This file owns the governed SDLC authority for changes that need formal lifecycle control.

It does not replace CODE_BASED_LEAN. It applies only when the change risk requires stage gates, independent QA, security approval, release approval, or recorded risk acceptance.

## Stage State Machine

Allowed stages:

```text
G0_INTAKE
G1_REQUIREMENTS_APPROVED
G2_DESIGN_APPROVED
G3_READY_FOR_IMPLEMENTATION
G4_IMPLEMENTATION_VERIFIED
G5_QA_APPROVED
G6_SECURITY_APPROVED
G7_RELEASE_APPROVED
G8_DEPLOYED
G9_PRODUCTION_VERIFIED
CLOSED_WITH_EVIDENCE
FIX_REQUIRED
HARD_BLOCKED_EXTERNAL_ONLY
```

Transitions must move forward only when the required evidence and approvals for the requested stage exist.

The machine-readable support package lives at:

```text
governance/operational_journey_protocol_package/sdlc
```

Those files are derived support artifacts. They validate and route stage-gate execution but do not override this canonical authority.

## Authorities

- SDLC Program Authority owns stage state and prevents unauthorized transition.
- Product and Requirements Owner owns business scope and functional acceptance.
- Architecture Authority owns service boundaries, contracts, data flow, and ADR decisions.
- Engineering owns implementation and developer verification.
- Independent Quality Authority owns QA approval and may issue `QA_BLOCK`.
- Application Security Authority owns security approval and may issue `SECURITY_BLOCK`.
- Release Authority owns release, deployment, rollback, and production verification.
- Risk Acceptance Authority owns accepted residual risk; this cannot be the author of the change.

## Separation of Duties

The author of a high-risk change cannot be the final approver for that same risk.

This applies to:

- authentication, authorization, RBAC, and sessions
- tenant isolation and delegated tenant access
- PII, secrets, payments, WLT, ledger, settlement, payout, or reconciliation
- migrations and production data changes
- infrastructure, CI, release, rollback, and signing
- critical or high vulnerabilities

## Required Stage Outputs

- G0: capability ID, scope, exclusions, risk class, affected services/surfaces, data classification, owners.
- G1: requirements, acceptance criteria, failure states, permissions, audit needs, quality profile, security requirements.
- G2: architecture decision, data flow, API/OpenAPI impact, database/migration impact, threat model when applicable, rollback plan.
- G3: implementation readiness, dependencies, target checks, ownership confirmation.
- G4: code review, targeted type/test/build/contract checks, no unauthorized scope expansion.
- G5: independent QA result for applicable journeys, negative tests, cross-surface consistency, accessibility/RTL when UI is affected.
- G6: security verification, vulnerability status, tenant isolation verification when applicable.
- G7: release readiness, unresolved blockers, rollback procedure, monitoring and support owner.
- G8: deployment evidence when deployment is in scope.
- G9: production smoke/readback/telemetry review when production verification is in scope.

## Decisions

Allowed decisions:

```text
GATE_PASS
FIX_REQUIRED
QA_BLOCK
SECURITY_BLOCK
RELEASE_BLOCK
HARD_BLOCKED_EXTERNAL_ONLY
CLOSED_WITH_EVIDENCE
```

`CLOSED_WITH_EVIDENCE` requires all applicable gates to pass. It cannot be based on documentation-only changes unless the journey itself is governance-only and no live code claim is made.

## Guard Runner

The SDLC support package is checked by:

```powershell
pnpm run guard:sdlc -- --capability <CAPABILITY_ID> --stage <REQUESTED_STAGE> --affected
```

The guard validates support-file completeness, known stage vocabulary, role separation, traceability schema, quality profile, and security profile. It does not mutate stage state and does not approve production by itself.

Optional manifest validation:

```powershell
pnpm run guard:sdlc -- --stage <REQUESTED_STAGE> --artifact <artifact-manifest.json> --impact <change-impact.json>
```

These JSON files must match the schemas in `governance/operational_journey_protocol_package/sdlc`.

## Acceptance condition

Accepted only when stage transitions, authorities, evidence, separation of duties, and residual-risk ownership are explicit for every governed journey.
