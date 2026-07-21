# Lian DSH/WLT Closure Diagnosis — 2026-07-19

## Pinned remote truth

- Repository: `bthwani2-boop/bthwani-suite-next`
- Target branch: `lian`
- Inspected commit before this diagnostic write: `80186110307fd9b7c836f3a42d5d7eca556d260a`
- Repository mode: `REMOTE_ONLY`
- Canonical decision: `FIX_REQUIRED`
- Closure target: `CLOSED_WITH_EVIDENCE`

This diagnosis supersedes the stale implementation claims in the attached conversation extracts. It does not override live code, contracts, migrations, runtime evidence, GitHub configuration, or independent approvals.

## Claims from the attachments that are no longer accurate

### Client address book is not absent

The branch now contains:

- Active authenticated OpenAPI contract: `services/dsh/contracts/dsh.client-address.openapi.yaml`.
- PostgreSQL ownership, default-address uniqueness, soft deletion, optimistic versioning, idempotency, and audit events in `dsh-056_client_addresses.sql`.
- Checkout address reference migration in `dsh-057_checkout_address_reference.sql`.
- Protected client HTTP handlers for list/create/update/delete/set-default.
- Client frontend address CRUD and checkout selection.
- SQL and backend tests plus a dedicated address/checkout workflow.

The remaining address work is no longer “build the address book”. It is:

- Prove clean and upgrade migrations on the same immutable commit.
- Prove CRUD, ownership isolation, retry, timeout, restart, serviceability, checkout, and order-snapshot readback in runtime.
- Integrate a governed map-provider boundary for search, reverse geocoding, coordinate-to-service-area validation, provider fallback, secret management, and accuracy policy.
- Complete Product Truth for PII retention, deletion, masking, audit, and support access.

### DSH-to-WLT mutation headers are implemented

The branch now contains a fail-closed shared mutation-header helper and tests covering deterministic idempotency and required correlation/idempotency headers for delivery completion, field commissions, actor finance, settlements, commercial products, promotion funding, and subscriptions.

The remaining finance work is:

- Execute all Go tests and guards on the same immutable commit.
- Prove duplicate, replay, retry, timeout, out-of-order, and partial-failure behavior against the integrated runtime.
- Prove COD, refund, commission, settlement, payout, and reconciliation readback across DSH, WLT, actor applications, and control panel.
- Keep production provider mutations blocked until real provider credentials, webhook verification, reconciliation evidence, rollback, and independent finance/security/release approvals exist.

### Partner support is not wholly unimplemented

The branch now contains:

- Partner support routes and surface navigation.
- Client, partner, captain, and operator governed support operations registered in the DSH capability registry.
- Protected server-side actor/permission checks.
- Ticket ownership checks, messages, operator transitions, idempotency/correlation requirements, and ticket-event audit readback.

The remaining support work is:

- Same-commit contract, Go, TypeScript, build, database, and runtime proof.
- Verify partner/client/captain submission and conversation on real authenticated sessions.
- Verify operator queue, assignment, status transitions, internal notes, and audit readback.
- Implement governed Media evidence attachments and retention if they are part of the approved Product Truth.
- Define and enforce SLA policies through the policy/platform owner instead of local UI values.

## Current repository truth

### Implemented but not closed with evidence

- Central DSH capability and contract registries.
- Address book and checkout address reference.
- Client cart/serviceability/checkout cleanup.
- Partner team idempotency protections.
- Governed support operations.
- Field offline queue and payout retry persistence.
- DSH-to-WLT mutation correlation and idempotency helper/tests.
- Platform Control database-backed configuration, health, rollout, audit, and rollback implementation.
- Dedicated `lian` workflows and fail-closed guard aggregators.

### Explicitly still not closed

The canonical DSH manifest still states:

- `runtimeState: PARTIALLY_BOUND`
- `closureState: FIX_REQUIRED`
- `generatedClientReady: false`
- `screensReady: false`
- `technicalRuntimeReady: false`
- `realExperienceReady: false`
- Platform Control: `VERIFICATION_REQUIRED`

Every canonical DSH capability remains `FIX_REQUIRED`, including system readiness, stores, discovery, catalog, cart, checkout, orders, dispatch, field readiness, finance, support, analytics, notifications, marketing, policies, administration, and partner activation.

## Blocking gaps that remain

### P0 — Same-commit CI and guard evidence

The available connector did not expose authoritative successful push-run jobs for the pinned commit. Empty legacy commit statuses are not proof of failure or success, and the connector workflow endpoint exposes pull-request-triggered runs only.

Required evidence:

- Governance and authority guards.
- Foundation and multi-surface boundary guards.
- Workflow lint/security/action pinning.
- Generated-client drift checks.
- TypeScript typecheck, build, and tests.
- Go formatting, vet, tests, and builds for DSH, WLT, Identity, Workforce, Platform Control, and Providers.
- Security workflow results.

### P0 — Live GitHub enforcement

Repository declarations do not prove live settings. Still required:

- Branch protection or ruleset for `lian` or the approved protected integration branch.
- Required checks matching the actual workflow job names.
- Stale approval dismissal and merge blocking on failure.
- At least one independent reviewer identity or team.
- Separation of implementation, finance, security, quality, and release approvals.

### P1 — Database migration and recovery evidence

Required on the same source revision:

- DSH migrations from a clean PostgreSQL database.
- WLT migrations from a clean PostgreSQL database.
- Supported upgrade from a real baseline snapshot.
- Constraint, concurrency, transaction, outbox, retry, dead-letter, and partial-failure assertions.
- Backup/restore and forward-fix or rollback procedure.
- PII retention/deletion verification.

### P1 — Generated-client and contract congruence

Required:

- Parse every active OpenAPI contract.
- Verify every shard operation exists in the primary contract where required.
- Regenerate and byte-compare DSH, WLT, Identity, Workforce, Platform Control, Providers, and catalog clients.
- Verify every manual adapter has a registered route and a real consumer.
- Eliminate orphan operations, duplicate operations, and undocumented compatibility handlers.

### P1 — Multi-surface runtime journeys

Required end-to-end journeys without mocks or local success:

1. Client sign-in → discovery → store → product → cart → address → serviceability → checkout → COD/WLT → order → tracking.
2. Partner receive → accept/reject → prepare → ready → inventory/substitution → team permissions → finance/support readback.
3. Dispatch → captain assignment race → accept/decline → location → arrival → pickup → proof → delivery exception → COD collect/remit → payout.
4. Field workforce gate → work queue → visit → evidence → readiness checks → escalation → offline restart/sync → commission → payout.
5. Cancellation/refund → WLT ledger → DSH projection → customer/partner/captain/control-panel readback.
6. Settlement → payout → reconciliation → exception handling → audit.
7. Special requests including Awnak and SHEIN: quote, approval, payment handoff, assignment, tracking, proof, cancellation/refund, SLA, and notifications.

For every journey, verify authorization, scope isolation, stale version, duplicate request, timeout after server commit, network interruption, restart, replay, out-of-order events, and cross-surface readback.

### P1 — Map provider and address governance

Still missing or unproven:

- Search and place selection.
- Reverse geocoding.
- Coordinate-to-service-area validation.
- Provider fallback and health.
- Provider secrets governed by Providers and Platform Control.
- Accuracy thresholds and mock-location policy.
- PII retention, deletion, masking, audit, and access policy.

### P1 — Notifications

Still requires real push-provider and runtime proof for:

- Device-token lifecycle and logout/device unlink.
- Preferences and unread counts.
- Deduplication, retry, templates, localization, and deep links.
- Order, payment, delivery, refund, settlement, support, and workforce events.

### P1 — Surface-by-surface UI/action audit

Still required for all five surfaces:

- Inventory of every screen, tab, button, icon, filter, search, bulk action, modal, and navigation target.
- Server-side permission enforcement for every exposed action.
- No local commercial, identity, workforce, operational, platform, or financial truth.
- No production mock, fixed KPI, fake timeline, dead control, swallowed error, or premature success toast.
- Loading, empty, error, offline, disabled, conflict, and retry states.
- Arabic/RTL, accessibility, responsiveness, and design-system conformance.

### P2 — Production financial activation

This is intentionally blocked until external evidence exists:

- Real provider selection and contract.
- Credentials/certificates and secret rotation.
- Signed webhook verification and replay defense.
- Provider settlement and reconciliation.
- Failure/retry/duplicate callback tests.
- Production rollback and incident procedure.
- Independent finance, security, risk, QA, and release approval.

## Required execution order

1. Re-pin the latest `lian` head after this diagnostic commit.
2. Obtain the exact GitHub Actions run IDs and logs for that immutable head; fix every failure.
3. Run clean and upgrade migration gates for DSH, WLT, Platform Control, Identity, and Workforce.
4. Close generated-client and manual-adapter congruence.
5. Integrate map-provider and address PII governance.
6. Execute the client commerce journey through delivery and control-panel readback.
7. Execute partner, captain, and field journeys, including negative and restart paths.
8. Execute COD/refund/commission/settlement/payout/reconciliation journeys.
9. Close notifications and support evidence/SLA integration.
10. Complete the full UI/action binding inventory across all surfaces.
11. Verify live branch protection, required checks, and independent approvals.
12. Re-pin one final immutable SHA and generate the final same-commit evidence bundle.

## Closure rule

Do not issue `CLOSED_WITH_EVIDENCE`, `FULLSTACK_UNIFIED_MULTI_SURFACE_CLOSED`, or any 100% claim until all of the following are zero on one immutable final SHA:

- blocking gaps
- known gaps
- contract mismatches
- disconnected surfaces
- unbound UI actions
- production mocks/local truth
- duplicate truth sources
- orphan APIs/screens/handlers
- failed required tests/guards
- unverified required journeys
- unassigned owners

Current decision: `FIX_REQUIRED`.
