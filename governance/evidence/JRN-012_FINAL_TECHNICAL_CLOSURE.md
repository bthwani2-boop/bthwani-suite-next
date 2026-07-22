# JRN-012 — Final Technical Closure and Independent Approval Handoff

Status: `READY_FOR_REVIEW`

Decision: `READY_FOR_REVIEW`

Code closure: `CLOSED_WITH_SAME_COMMIT_CI_EVIDENCE`

Approval tracking: GitHub issue `#103`

## Scope

This record covers `JRN-012 — قبول الطلب وتحضيره وجاهزيته` across the required surfaces:

- `app-partner`
- `app-client`
- `app-captain`
- `control-panel`
- DSH backend and PostgreSQL persistence
- DSH/WLT ownership boundary

`app-field`, `webapp`, and `website` are explicitly excluded by Product Truth because they do not own an operational step in this journey.

## Technical closure

All canonical slices `FS-01..FS-18` are code-closed. The implementation includes:

- server-authoritative order workboard and `allowedActions`;
- accept, reject, preparation start, estimate revision, and readiness transitions;
- immutable order-item binding for shortages, quality issues, and substitutions;
- client-owned substitution approval or rejection with optimistic concurrency;
- atomic prevention of readiness while any preparation issue remains open;
- durable `due_soon`, `overdue`, and `customer_decision_pending` alerts;
- partner, client, captain, and operator readback from the same DSH truth;
- auditable events, outbox records, idempotency, and version checks;
- preserved WLT ownership of balances, capture, refund, settlement, and ledger truth;
- removal of the legacy partner-order compatibility projection.

## Automated evidence

Governed status context: `jrn-012/order-preparation`

Last fully successful closure run before this handoff:

- commit: `281e3fc547957244f6bb3a706cc9690235fa9f9f`
- workflow run: `29880510629`

Covered automated scopes:

- canonical slice/source assertions;
- Go formatting and targeted lifecycle/authorization tests;
- PostgreSQL migrations, constraints, indexes, and finance-boundary invariants;
- OpenAPI composition and generated-client proof;
- TypeScript checks for the shared brain and all required surfaces;
- WLT financial-ownership guard;
- publication of the governed commit status.

The final repository commit carrying this handoff must also receive a successful `jrn-012/order-preparation` status. A successful status on an older commit is not promoted to the final commit.

## Open code gaps

`[]`

There is no known repository change remaining inside the declared journey scope.

## Independent approvals

The following are intentionally not self-approved by the implementation agent:

1. Product Owner acceptance of value, behavior, and acceptance criteria.
2. QA/device/accessibility verification on real devices, Arabic RTL, screen reader, and weak-network paths.
3. Independent security review of RBAC, store isolation, client ownership, captain assignment scope, and audit trails.
4. Independent finance-boundary review confirming that DSH does not own financial truth.
5. Release and production approval, including rollout, monitoring, rollback, and post-deployment verification.

These approvals are tracked in issue `#103`. Until they are recorded, the canonical decision remains `READY_FOR_REVIEW`; it must not be changed to `CLOSED_WITH_EVIDENCE`.

## Rollback

- Disable the preparation-alert scan UI and operator routes first if alerting causes operational noise.
- Preserve append-only issue, decision, alert, outbox, and lifecycle history.
- Never roll back by deleting operational history or moving financial truth into DSH.
- Revert surface exposure independently from persistence when a client release must be withdrawn.

## Canonical references

- `governance/product/contracts/jrn-012-order-preparation-readiness.product-truth.json`
- `services/dsh/contracts/jrn-012-slice-closure.json`
- `.github/workflows/jrn-012-order-preparation-verify.yml`
- `services/dsh/tests/jrn-012-order-preparation-closure.test.mjs`
- `services/dsh/tests/jrn-012-slice-closure.test.mjs`
- GitHub issue `#103`
