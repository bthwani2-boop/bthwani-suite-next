# Full-Stack Multi-Surface Journey Registry

Status: DERIVED_SUPPORT
Registry ID: `BTHWANI-FULLSTACK-JOURNEYS`

This file is a planning/discovery registry only. It does not create Product Truth, service ownership, API/database truth, execution status, approval, or closure. Current authority is resolved through `governance/authority/authority-precedence.json`; implementation/runtime claims require current code/contracts/migrations/tests and same-commit evidence.

## Purpose

Provide a compact index for named operational journeys that cross one or more BThwani surfaces/domains, without storing branch history, CI results, gap-ledger snapshots, historical SHAs, or implementation evidence in the registry itself.

## What belongs here

For each journey that is intentionally named and opened, record only stable planning metadata:

| Field | Meaning |
| --- | --- |
| `ID` | stable planning identifier |
| `Journey` | outcome-oriented journey name |
| `Primary owner` | canonical domain responsible for the main write/truth |
| `Required surfaces` | surfaces that must participate for the declared outcome |
| `Dependencies` | other journey/foundation prerequisites proven by current analysis |
| `Product Truth` | current capability/product contract reference when applicable |
| `Tracking state` | planning state only |

Do **not** store evidence SHA, workflow run, runtime PASS, approval or closure in this registry. Those belong to the task/package/CI/evidence system that produced them.

## Tracking states

Planning-only states:

```text
NOT_ASSESSED
IN_PROGRESS
READY_FOR_REVIEW
PAUSED
MERGED_INTO
RETIRED
```

These are not substitutes for `governance/contracts/decision-vocabulary.json`.

## Journey discovery rule

Do not assume a fixed number of journeys. Discover them from current Product Truth, contracts, service manifests, routes, migrations, surfaces, state machines, events/jobs and runtime behavior. A code-only, registry-only, duplicate, stale or undocumented journey must be classified explicitly when encountered.

Opening a journey requires pinning the exact repository/branch/SHA and identifying at least:

```text
actor/outcome
canonical truth owner
canonical write path
required readback/consumer surfaces
trusted scopes and authorization boundary
predecessors/foundation dependencies
state machine and failure/recovery expectations
required evidence scopes
```

## Full-stack coverage lenses

The following are **review lenses**, not a fixed schema and not automatically applicable to every journey:

1. Product problem/outcome/actors/acceptance.
2. Roles, permissions, trusted scopes, required/excluded surfaces.
3. States/transitions/allowed actions/negative invariants.
4. Domain truth ownership and cross-service boundaries.
5. Database/migrations/constraints/indexes/concurrency/retention.
6. Contracts/OpenAPI/generated-client provenance.
7. Backend routes/domain validation/authz/idempotency/concurrency.
8. Events/outbox/jobs/retry/readback/reconciliation.
9. Shared controllers/adapters/view-models without parallel truth.
10. Required surface routes/screens/controls/navigation.
11. Loading/empty/offline/forbidden/conflict/partial/error/recovery states.
12. Cross-surface persisted readback and removal of local/mock truth.
13. Security/privacy/PII/isolation/RBAC/secrets/audit.
14. Accessibility/RTL/localization/performance/device/network resilience.
15. Observability/SLO/alerts/operational support.
16. Legacy/duplication/noise/retirement cleanup.
17. Affected static/product/runtime/visual/QA/security/finance/isolation/governance/CI/release/production evidence.
18. Same-commit evidence, required approvals, rollback/roll-forward and remaining risk.

Use only the lenses supported by the journey's actual change impact.

## Current named journeys

The registry intentionally starts empty until a journey is opened and reconciled against the current repository. Raw operation inventories or historical counts are discovery inputs, not named journeys.

| ID | Journey | Primary owner | Required surfaces | Dependencies | Product Truth | Tracking state |
| --- | --- | --- | --- | --- | --- | --- |

## Update rule

- Add/update a row only from a pinned current analysis.
- Do not mark a journey complete here; completion is an evidence decision elsewhere.
- Do not retain historical branch names, commit snapshots or tool-run counts in this file.
- Do not delete an identity merely to hide history; use `MERGED_INTO` or `RETIRED` when the identity remains useful, otherwise Git history is the archive.
- `tools/plans/smsm-dsh-wlt-journeys/` is a separate derived plan package and does not gain authority through this registry.
