# JRN-001 — Partner onboarding and store publication evidence

- Branch: `sambassam`
- Evidence base: `9348ee4734eff211c4d4ed4d94afde700712dfad`
- Tracking status: `READY_FOR_REVIEW`
- Decision: `READY_FOR_REVIEW`
- Closure claim: `CLOSED_WITH_EVIDENCE` is not claimed.

## Scope completed

The eighteen mandatory full-stack slices were executed in sequence: Product Truth; RBAC and surface scope; state policy; DSH/WLT ownership; database integrity; OpenAPI contracts; governed backend routes and logic; durable outbox and reconciliation; Shared Brain; required surfaces and navigation; visible runtime states and recovery; cross-surface read-after-write; security/privacy/audit; Arabic/RTL/accessibility/weak-network quality; SLOs, alerts and support runbook; cleanup and canonical ownership; comprehensive verification; and evidence/rollback/open-gap registration.

The functional journey includes field creation of an owned partner draft, legal identity and contact details, first-store profile and service area, governed media and documents, field visits and readiness evidence, operator document review, partner/store state transitions, store and scope binding, partner team invitations and membership operations, publication/hide/suspend/reactivate controls, audit history, and partner self-readback.

## Verification

The final evidence workflow reruns all `JRN-001` Node tests and journey guards, Go tests for partner and partner-WLT outbox packages, governed route registration tests, app-field TypeScript verification, WLT financial-boundary verification, repository hygiene, and the FS-18 evidence guard on one commit. The authoritative proof is the successful commit status contexts:

- `journeys/jrn-001/fs-17-comprehensive`
- `journeys/jrn-001/fs-18-evidence`

Earlier targeted successful runs are retained in `JRN-001_PARTNER_ONBOARDING_EVIDENCE.json` for FS-10 through FS-17.

## Rollback

Use `governance/runbooks/JRN-001_PARTNER_ONBOARDING_SUPPORT.md`. Prefer disabling the affected mutation or publication transition while preserving reads, activation events, document reviews, visits, audit records, outbox rows and reconciliation cases. Never compensate a WLT-owned financial mutation by writing a financial ledger entry in DSH.

## Remaining evidence and approvals

The code and targeted verification are ready for independent review. Product acceptance, independent QA, independent Security, independent Release approval, device-level visual and weak-network runtime evidence, and production rollout/observation evidence remain pending. Therefore the journey is not marked `CLOSED_WITH_EVIDENCE`.
