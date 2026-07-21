# JRN-001 — Partner onboarding and store publication evidence

- Branch: `sambassam`
- Latest successful same-commit proof: `cf5a0dbd08a3cb322d0ad3ad69895cb9b16624b3`
- FS-12 workflow run: `29850740692`
- FS-17/FS-18 workflow run: `29850741316`
- Tracking status: `READY_FOR_REVIEW`
- Decision: `READY_FOR_REVIEW`
- Closure claim: `CLOSED_WITH_EVIDENCE` is not claimed.

## Scope completed

The eighteen mandatory full-stack slices were executed in sequence: Product Truth; RBAC and surface scope; state policy; DSH/WLT ownership; database integrity; OpenAPI contracts; governed backend routes and logic; durable outbox and reconciliation; Shared Brain; required surfaces and navigation; visible runtime states and recovery; cross-surface read-after-write; security/privacy/audit; Arabic/RTL/accessibility/weak-network quality; SLOs, alerts and support runbook; cleanup and canonical ownership; comprehensive verification; and evidence/rollback/open-gap registration.

The functional journey includes field creation of an owned partner draft, legal identity and contact details, first-store profile and service area, governed media and documents, field visits and readiness evidence, operator document review, partner/store state transitions, store and scope binding, partner team invitations and membership operations, publication/hide/suspend/reactivate controls, audit history, and partner self-readback.

The closure repair also bound field activation to the governed `field` actor type, removed the runtime developer bypass and hardcoded credentials, added a regression test prohibiting their return, aligned the shared `TextField` contract with the six-digit activation constraint, and replaced stale workflow references with the canonical onboarding contract.

## Verification

The canonical JRN-001 DSH contract is `services/dsh/contracts/dsh.partner-onboarding.openapi.yaml`. The verification workflows cover JRN-001 registries, Node tests and guards, Go partner and partner-WLT outbox packages, governed route registration, scoped TypeScript consumers for `app-field`, `app-partner`, and `control-panel`, the WLT financial-boundary guard, and repository hygiene.

The authoritative same-commit proof on `cf5a0dbd08a3cb322d0ad3ad69895cb9b16624b3` is:

- `journeys/jrn-001/fs-12-cross-surface-truth` — success, run `29850740692`
- `journeys/jrn-001/fs-17-comprehensive` — success, run `29850741316`
- `journeys/jrn-001/fs-18-evidence` — success, run `29850741316`

## Rollback

Use `governance/runbooks/JRN-001_PARTNER_ONBOARDING_SUPPORT.md`. Prefer disabling the affected mutation or publication transition while preserving reads, activation events, document reviews, visits, audit records, outbox rows and reconciliation cases. Never compensate a WLT-owned financial mutation by writing a financial ledger entry in DSH.

## Remaining evidence and approvals

The code and targeted verification are ready for independent review. Product acceptance, independent QA, independent Security, independent Release approval, device-level visual and weak-network runtime evidence, and production rollout/observation evidence remain pending. Therefore the journey is not marked `CLOSED_WITH_EVIDENCE`.
