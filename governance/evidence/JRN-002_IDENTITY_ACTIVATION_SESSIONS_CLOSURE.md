# JRN-002 — Identity, Activation, and Sessions Closure Evidence

- Repository mode: `REMOTE_ONLY`
- Repository: `bthwani2-boop/bthwani-suite-next`
- Target ref: `sambassam`
- Journey owner: `core/identity`
- Internal slice status: `FS-01..FS-18 COMPLETE`
- Journey decision: `READY_FOR_REVIEW`
- Evidence commit resolution: the exact commit containing `core/identity/tests/jrn-002-final-evidence-marker.test.mjs` and three successful permanent status contexts listed below.

## Slice ledger

| Slice | Closure evidence | Status |
|---|---|---|
| FS-01 | `governance/product-truth/JRN-002_IDENTITY_ACTIVATION_SESSIONS.md` | COMPLETE |
| FS-02 | `core/identity/contracts/jrn-002-access-matrix.json` | COMPLETE |
| FS-03 | `core/identity/contracts/jrn-002-state-machine.json` | COMPLETE |
| FS-04 | `core/identity/contracts/jrn-002-boundary-manifest.json` | COMPLETE |
| FS-05 | `identity-005_jrn_002_governance.sql`, `identity-006_deletion_outbox_delivery.sql` | COMPLETE |
| FS-06 | OpenAPI, operation registry, TypeScript client, Workforce client | COMPLETE |
| FS-07 | governed HTTP request middleware, strict handlers, idempotency and concurrency paths | COMPLETE |
| FS-08 | account-deletion outbox event key, retry scheduling and reconciliation indexes | COMPLETE |
| FS-09 | `identity-session-policy.ts`, sovereign store/hook/client | COMPLETE |
| FS-10 | five-surface registry and protected runtime entries | COMPLETE |
| FS-11 | loading, unconfigured, signed-out, authenticating, forbidden, conflict, unavailable and recovery presentation | COMPLETE |
| FS-12 | read-after-write and no-local-truth consistency policy | COMPLETE |
| FS-13 | security/PII/CORS/service-auth/token policy and implementation | COMPLETE |
| FS-14 | Arabic/RTL, labeled controls, weak-network recovery and bounded server timeouts | COMPLETE |
| FS-15 | `governance/runbooks/JRN-002_IDENTITY_OPERATIONS.md` | COMPLETE |
| FS-16 | cleanup registry and permanent stale-artifact guards | COMPLETE |
| FS-17 | permanent static, TypeScript, Go, PostgreSQL and HTTP runtime gates | COMPLETE |
| FS-18 | this same-commit ledger, rollback policy, gaps and approval boundary | COMPLETE_INTERNAL |

## Functional capability closure

- Health and readiness.
- Actor provisioning, internal search and actor readback.
- Public OTP request and typed actor-bound activation issuance.
- Latest activation readback and revocation of pending activations.
- Activation consumption and username/password login.
- Access/refresh issuance, single-use refresh rotation and current-session recovery.
- Token introspection, own-session listing and own-session revocation.
- Logout and password change.
- Actor deactivation/reactivation with session and activation invalidation.
- Account anonymization/deletion and durable deletion outbox.
- Role, permission, surface and tenant isolation without actor leakage.

## Permanent evidence gates

- `journeys/jrn-002/fullstack-slices`
- `journeys/jrn-002/runtime-proof`
- `journeys/jrn-001-010/targeted-verification`

All three must succeed on the evidence-marker commit. A later final head is acceptable only when it is a linear descendant and every intervening file is outside JRN-002 implementation scope or is evidence-only documentation.

## Rollback

Rollback targets the latest commit where all permanent JRN-002 statuses succeeded. Database changes are forward-only: corrective migrations must preserve actor, session, activation and outbox audit history.

## Remaining external approvals

The implementation agent cannot self-approve the following independent scopes:

- Security review for authentication, token handling, PII and CORS.
- QA/device validation on Android and the control-panel browser.
- Product Owner acceptance of Arabic wording and account-deletion UX.
- Release/production evidence.

These approval boundaries do not leave an implementation slice open. They keep the journey-level decision at `READY_FOR_REVIEW` rather than `CLOSED_WITH_EVIDENCE` until independent reviewers sign off.

## Known implementation gaps

`none`
