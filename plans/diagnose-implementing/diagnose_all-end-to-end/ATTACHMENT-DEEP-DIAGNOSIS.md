# ATTACHMENT DEEP DIAGNOSIS — SYSTEM-WIDE EVIDENCE LEDGER

Status: `PREPARE / SOURCE-DERIVED / MUST_REPROVE_ON_CURRENT b`

This file captures the material diagnosis contained in the user-provided attachment and makes it impossible for future execution to reduce the package back to finance-only scope. The attachment is evidence and prior diagnosis, not runtime truth.

## 1. System model extracted from the attachment

The intended ownership model is:

- **Identity** — Actor/Auth, credentials, sessions/devices, roles/permissions, trusted identity context.
- **Workforce** — person/provider profile, employer scope, lifecycle, accreditation, suspension/absence, work windows, non-financial readiness.
- **DSH** — Partner, Store, StoreBranch, catalog commercial use, assortment, inventory, geography/service areas, cart/checkout operational context, Order/Fulfillment, fleet affiliation, partner membership, dispatch/presence/assignment/delivery, support/incidents.
- **WLT** — wallet/ledger, PaymentAllocation, Cash-In, collateral, COD exposure, cash custody, debt/receivable, monetary penalty effect, commission, settlement, refund/reversal, payout, reconciliation.
- **Platform Control** — versioned policies, rollout/feature configuration, SLA and controlled platform configuration.
- **Media** — canonical binary/document storage with access/retention/readiness semantics.
- **Providers** — external rails/capabilities only, never internal business truth.
- **All applications** — Views/Execution Surfaces over canonical authorities, never independent sources of truth.

## 2. Material root causes carried forward

The attachment identified or strengthened these roots. They are OPEN until current-code evidence closes them:

### P0 — RC-CANONICAL-AUTHORITY-FRAGMENTATION

The same business meaning can exist across service, table, API, projection, UI and plan layers without one provable canonical writer.

Required closure: one authority/writer per authoritative fact; projections explicitly read-only and source-versioned where needed.

### P0 — RC-PAYMENT-TENDER-EXPOSURE-CUSTODY-SETTLEMENT-CONFLATION

Checkout tender, provider funding rail, COD exposure, collected cash custody and settlement are distinct semantics and must never collapse into one status/field/method label.

### P0 — RC-MONETARY-FACT-OWNERSHIP-SPLIT

Attachment evidence says DSH paths have authored/derived monetary values that WLT later records. Any such live path must be re-proven and removed where WLT is the canonical financial owner.

Targets include discount allocation, partner/platform funding split, settlement inputs, penalties, refund sources, special-request estimated amounts and other caller-authored monetary facts.

### P0 — RC-CAPTAIN-ELIGIBILITY-AUTHORITY-SPLIT

Candidate discovery, capacity, assignment, reassignment, offer/acceptance and financial eligibility must consume one semantic composition:

`Identity + Workforce + Fleet/Membership + Service Area + DSH Presence/Conflict/Capacity + WLT Financial Eligibility`.

Any different subsets across endpoints are defects.

### P0 — RC-GEOGRAPHIC-SCOPE-IDENTITY-COLLAPSE

City, PlatformZone, ServiceArea, Workforce geographic scope and StoreBranch identity have been observed/reported as conflated in prior diagnosis.

Execution must prove separate IDs and relations, especially:

- StoreBranch -> Store + real location
- ServiceArea -> polygon/coverage authority
- PlatformZone -> platform policy/SLA grouping
- City -> broad administrative geography
- Workforce scope -> actor authorization/readiness

No `service_area_code = city_code` or store/scope ID masquerading as branch ID may remain if still live.

### P0 — RC-AUTHORIZATION-TRUTH-DUPLICATION

Control Panel and other surfaces must not duplicate authorization as UI booleans. Every action requires backend permission + object scope + actor provenance; UI only reflects it.

### P0 — RC-IDENTIFIER-SEMANTIC-OVERLOADING

Actor, workforce person, partner, store, branch, membership and courier identifiers require explicit types/names and may not be substituted across boundaries.

### P0/P1 — RC-PLATFORM-CHANGESET-FALSE-COMPLETION

A requested configuration change is not applied merely because the request record is complete. Required semantic states include requested/approved/applied/failed/observed/reconciled or equivalent. Success requires authoritative readback.

### P1 — RC-PROVIDER-DESIRED-CONFIG-VS-OBSERVED-HEALTH

Separate:

- ProviderConfig
- ProviderCredentialsReference
- ProviderMaintenanceState
- ProviderObservedHealth

Operator may configure/disable/maintenance a provider; operator cannot declare runtime health `ACTIVE` as observed truth.

### P1 — RC-MEDIA-BOOTSTRAP-VS-READINESS

Readiness must be read-only. Provisioning/bucket ensure/bootstrap is a separate operation.

Required semantics:

- optional + disabled -> `N/A`
- required + unconfigured -> `NOT_READY`
- configured + inaccessible -> `NOT_READY`
- configured + healthy -> `READY`

### P1 — RC-RATING-MODERATION-VS-PUBLIC-AGGREGATION

Moderation status must govern public aggregation. Pending/rejected/disputed ratings must not affect the public summary merely because another `active` flag remains true.

### P1 — RC-CONSENT-AS-PREFERENCE

Marketing/notification consent requires provenance beyond booleans:

- policy/version
- acceptedAt
- revokedAt
- source
- surface
- legal basis/jurisdiction when applicable
- audit provenance

Best-effort ignored audit writes are not sufficient for legal/consent truth.

### P1 — RC-CACHE-ALLOW-OVERRIDES-CANONICAL-DENY

Store/user/content suspension/deletion/permission denial must win over stale search/index/cache. Cache may lag positive availability; it must not resurrect canonically denied state.

## 3. Proven incomplete / HOLD cones from the attachment

These must remain visible until exhaustively inventoried:

| Cone | Mandatory unresolved inventory |
|---|---|
| Inventory | reserve/release/TTL/return/restart/concurrency/oversell/reconciliation writers |
| Returns | item quantity constraints, logistics, restock, WLT refund E2E, partial/retry/duplicate |
| WLT | all ledger/payment/COD/payout/penalty/commercial/reconciliation writers |
| Identity | all RBAC writers and session derivation paths |
| Workforce | final scope ownership/proxy semantics |
| Field | assignment, Scan/RETURNING or equivalent state consistency, visit/evidence/location |
| Notifications | all producers, consent/legal matrix, dedupe/retry/delivery state |
| Media | ACL/download/retention/redaction/orphan/deleted-target/readiness |
| Reels/public content | visibility, expiry, moderation, deleted/suspended target |
| Contact proxy | PII/privacy masking and authorization boundary |
| Control Panel | every action × permission × object scope × reason × audit/readback |
| OpenAPI | live routes vs OpenAPI vs generated clients vs bindings |
| app-client | every Screen/CTA/controller/API/cache/offline/persistence path |
| app-partner | every Store/Branch/Catalog/Order/Fleet/Finance/Support/Notification path |
| app-captain | every Assignment/Proof/COD/Offline/Mode/Wallet/Settlement path |
| app-field | every Visit/Readiness/Scope/Evidence/Partner onboarding path |
| DB | every table/column/writer/FK/check/duplicate truth/invariant |
| Migrations | fresh + supported upgrade + mixed-version/cutover compatibility |
| Jobs/outbox | retry/DLQ/restart/idempotency/ordering/reconciliation |
| Runtime | env/secrets/dev fallback/prod reachability/readiness |
| Observability | logs/metrics/traces/alerts/correlation/PII safety |
| CI | architecture/binding/contract/security/runtime regression guards |
| Actor provenance | prior implementation remained unproven/failed downstream verification |
| Historical finance | re-prove against current branch; do not inherit old DONE claims |

## 4. Product/system decisions carried as recommended defaults subject to authority reconciliation

The attachment repeatedly recommended the following. They are valid implementation direction when not contradicted by current Product Truth or a later explicit decision:

1. **Feature flags** — server-authoritative capability flag; frontend env cannot enable a forbidden capability.
2. **Provider outage** — critical financial/identity dependencies fail closed; noncritical discovery enhancements may degrade explicitly, never via local parallel truth.
3. **Search/cache during suspension** — canonical deny wins immediately.
4. **Catalog deletion** — preserve historical order snapshots; retire commercial item rather than cascading historical deletion.
5. **Negative inventory** — forbidden except explicit reconciliation/adjustment workflow.
6. **Partner suspension** — blocks derived Store visibility but does not rewrite Store publication lifecycle state.
7. **Platform policies** — material policies versioned/effective-dated/audited.
8. **Actor multi-role** — one canonical Actor may hold multiple roles/memberships rather than one person per surface.
9. **Offline Captain/Field** — bounded local evidence queue is acceptable; authoritative business state commits only after server ACK unless a specific canonical contract says otherwise.
10. **Store visibility** — one composite canonical gate shared by list/get/home/search/catalog endpoints.

## 5. Store visibility gate to re-prove

Candidate canonical inputs from the attachment:

- Partner approved/active/readiness
- Store published/client-visible
- real Branch active where branch semantics apply
- catalog/content ready
- serviceable in current geography
- not suspended
- not deleted
- policy/permission constraints

Execution must compare this candidate set to current Product Truth, then use one backend/shared policy. No endpoint-specific subset.

## 6. Catalog/inventory model to re-prove

Prior diagnosis direction:

- central/master catalog is canonical product/taxonomy truth;
- store assortment is per-store commercial availability/price/stock/local allowed override;
- proposals are workflow input, not customer-visible truth;
- manual-request verticals are not forced through normal master-product semantics;
- historical orders use immutable snapshots;
- client visibility composes Store + catalog node/product + assortment + media + policy gates;
- old store-local category/product authority must be removed after migration.

This direction must be reconciled with the current branch implementation before code changes.

## 7. Surface-specific deep audit obligations

### app-client

Inventory every:

- tab, screen, route, deep link
- CTA/button/icon/form/dialog
- loading/empty/error/retry/offline/disabled/success state
- controller/view-model
- API/cache/local persistence
- permission/visibility decision

Every action must trace through canonical backend/data/readback.

### app-partner

Audit:

- onboarding
- Stores/Branches
- catalog/products/inventory/prices
- orders/preparation/handoff/delivery mode
- fleet/team/courier invites/assignments
- cash custody and settlement readback
- support/notifications/profile/security/permissions

Store and Branch must never be interchangeable.

### app-captain

Personal actor surface with clear `BTHWANI | PARTNER` execution mode and no simultaneous primary affiliation.

Audit:

- assignment lifecycle
- accept/decline
- navigation
- pickup/delivery proof
- exceptions
- cash collection evidence
- wallet/collateral/settlement readback
- location
- offline/reconnect
- human-readable identity; internal IDs are not display names

### app-field

Purpose is assigned work, Partner onboarding evidence, Store verification, visits, location/proof and Workforce readiness. It must not become a miniature control panel with Partner approval, Store publication or financial decision authority.

### control-panel

Separate authority sections at least by Platform, Operations, Finance, Partners, Workforce/HR, Support, Catalog, Security/Administration and Analytics.

Every sensitive action proves:

`permission + object scope + precondition + reason/evidence + maker/checker where policy requires + audit + authoritative readback`.

## 8. Shared frontend brain audit

Every shared module under DSH/WLT must be classified as one of:

- transport adapter
- generated-client wrapper
- controller
- view-model
- state mapper
- presentation policy
- domain type
- state machine
- runtime binding

Shared code is not automatically correct. It must not own business truth that belongs to backend/Product Truth.

Forbidden in UI surfaces and ungoverned shared paths:

- direct ad-hoc fetch/axios
- process.env endpoint construction
- raw API mapping duplicated per screen
- authoritative business logic/state transitions
- permission authority
- duplicate domain types/state machines
- financial calculation/mutation
- local storage/cache as operational truth

## 9. Provider semantics

A provider registry/configuration may store desired state such as enabled/maintenance/secret reference/timeout/retry. Observed health is separate runtime evidence such as healthy/degraded/unknown/last check. Control Panel writes desired state only.

Provider rail does not become internal tender/business state.

## 10. Media semantics

Audit:

- provision/bootstrap operation
- readiness operation
- ACL/download authorization
- public/private visibility
- metadata
- orphan/deleted-target cleanup
- retention/redaction
- generated URLs/tokens and expiry

Readiness must never mutate/provision infrastructure as a side effect.

## 11. Rating semantics

Prove the public aggregate filters by canonical moderation/publication eligibility, not merely an unrelated active flag. Historical/moderation records remain auditable.

## 12. Consent/privacy/retention

Do not invent legal retention durations. Mechanism must support separate retention classes for:

- high-frequency GPS history
- delivery/incident evidence
- Partner/Workforce documents
- account deletion/anonymization with legally required retained financial/legal records
- consent/audit/security logs

The concrete periods remain external-policy/product decisions unless already present in canonical Product Truth/legal authority.

## 13. Subscription/loyalty and adjacent financial semantics

The attachment raised additional financial-domain decisions that must not be conflated with order checkout:

- subscription payment semantics are a separate product decision from order checkout;
- loyalty may be non-cash promotional points owned by Marketing/DSH rules with WLT only owning monetary redemption effect, or cash-equivalent value owned financially by WLT; current Product Truth must decide;
- customer general wallet cash-out should not be inferred from captain/partner payout capability;
- payout destination changes require governed verification and must not retroactively mutate an already-fixed payout intent.

If current Product Truth does not resolve any of these, create stable `DECISION_REQUIRED` entries before implementation crosses the boundary.

## 14. Runtime and configuration

Use current repository runtime authority, not historical ports from plans. Execution must discover current canonical service endpoints/ports from live config and prove:

- startup validation
- no forbidden legacy URL fallback
- correct profile/dependency composition
- meaningful health/readiness
- migrations/bootstrap deterministic
- secrets not leaked
- production cannot use debug/test identities or mock provider truth

## 15. Closure consequence

The package cannot be declared system-wide prepared/closed merely because finance, dispatch or selected UI tests pass. Every HOLD cone above must be either:

- fully inventoried and closed;
- `NOT_APPLICABLE_WITH_PROOF`; or
- explicit external/decision blocker with exact unblock path.

No silent omission is allowed.
