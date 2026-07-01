# 16 — Master Matrix V3 Business Rules

Status: CANONICAL
Stage: MASTER_MATRIX_V3_BUSINESS_RULES_AND_OPERATIONAL_CLOSURE

---

## Purpose

Defines the complete business rules, domain ownership boundaries, and operational
constraints that govern `machine-readable/journey_execution_master_matrix_v3.csv`
and all future journey execution decisions.

This document is the authoritative reference for anyone executing a journey.
No journey may begin without all relevant rows in this document passing their gate.

---

## Canonical Source of Truth

Machine-readable source exists **only** in:

```
C:\bthwani-suite-next\machine-readable\
```

Donor reference paths (read-only comparison only):

- `C:\bthwani-suite\wlt`
- `C:\bthwani-suite\dsh`
- `C:\bthwani-suite\tools`
- `C:\bthwani-suite\tools\guards`

Forbidden donor paths (do not exist — never read):

- `C:\bthwani-suite\machine-readable`
- `C:\bthwani-suite\services`
- `C:\bthwani-suite\packages`

Excel files in `machine-readable/` are display artifacts only. CSVs are canonical.

---

## Allowed Service Owners

| Value | Scope |
| --- | --- |
| `dsh` | Delivery/order operational domain |
| `wlt` | Wallet/financial domain |
| `core` | Platform identity and infrastructure |
| `shared-ui-kit` | UI kit and design tokens |
| `shared-app-shell` | App shell and navigation |
| `reserved` | Reserved inventory, not yet scoped |

**Forbidden in `service` column:**
`dsh-wlt`, `platform`, `control-panel`, `app-client`, `app-partner`,
`app-captain`, `app-field`

`dsh-wlt` is permitted only in: `journey_id`, `integration_infrastructure`,
`wlt_dependency`, `notes`.

---

## Allowed Surface Values

`app-client`, `app-partner`, `app-captain`, `app-field`, `control-panel`,
`webapp`, `website`, `shared`, `all-surfaces`, `system`, `N/A`

**Forbidden in `surface` column:** `backend`, `infra`, `evidence`, `reference`
(move these to `execution_domain` instead).

---

## Allowed Status Values

`INVENTORY_ONLY`, `BLOCKED_NEEDS_API_CONTRACT`, `BLOCKED_NEEDS_DOMAIN_MODEL`,
`BLOCKED_NEEDS_DB_SHAPE`, `BLOCKED_NEEDS_WLT`, `BLOCKED_NEEDS_PROVIDER_DECISION`,
`BLOCKED_NEEDS_VISUAL_EVIDENCE`, `BLOCKED_NEEDS_EVIDENCE`, `RESERVED_INVENTORY`,
`REJECTED`

**Forbidden status values:** `READY_FOR_JOURNEY`, `VERIFIED`

No row may carry `READY_FOR_JOURNEY` or `VERIFIED` before a journey-specific gate
is explicitly declared and approved.

---

## Allowed Decision Values

`ADOPT_AS_IS`, `ADAPT_NORMALIZE`, `REWRITE_FROM_SPEC`, `REFERENCE_ONLY`,
`REJECT`, `BLOCKED_NEEDS_EVIDENCE`, `BLOCKED_NEEDS_API_CONTRACT`,
`BLOCKED_NEEDS_WLT`, `BLOCKED_NEEDS_DOMAIN_MODEL`, `BLOCKED_NEEDS_DB_SHAPE`,
`BLOCKED_NEEDS_PROVIDER_DECISION`, `BLOCKED_NEEDS_VISUAL_EVIDENCE`

Descriptive text in the `decision` column is forbidden. Move to `notes`.

---

## WLT Owns Financial Truth

WLT is the **sole authority** over:

- Payment sessions, authorization holds, capture, settlement, reconciliation
- Refunds (full, partial, reversal)
- COD caps, driver liability, deposits, COD reconciliation
- Commission, platform fee, driver earnings, settlement cycle
- Ledger, audit, reconciliation
- All monetary state mutations

DSH may **only** store: `quoteId`, `paymentSessionId`, `paymentStatus`,
`financialReference` — opaque references owned by WLT.

DSH must **not** calculate final collectible amount, capture, settle, payout,
commission, COD financial truth, ledger, or reconciliation.

Any DSH row that violates this rule must be:

- `decision = REJECT`
- `blocker_code = FINANCIAL_OWNERSHIP_VIOLATION`

---

## DSH Owns Operational Fulfillment Only

DSH owns:

- Order state machine (pending → delivered / cancelled states)
- Dispatch logic (radial search, priority routing, auto-reject, batching, manual escalation)
- Geofencing (active polygon, inactive zone, store radius, stale zone version)
- Cart, checkout-intent, serviceability
- Partner orders and catalog
- Captain tasks
- Support intake
- Marketing readiness

At financial-relevant transitions (checkout, delivery), DSH **triggers** WLT events
but does not process them.

---

## DSH Order State Machine

Valid order states:

`pending` → `store-accepted` → `preparing` → `ready-for-pickup` →
`dispatching` → `driver-assigned` → `driver-arrived-store` → `picked-up` →
`arrived-customer` → `delivered`

Terminal cancellation states:
`cancelled-by-client`, `cancelled-by-store`, `cancelled-no-driver`,
`failed-payment`, `failed-dispatch`

Rules:

- Invalid transition → no state mutation → audited rejection
- Duplicate transition → idempotent no-op by `correlation_id`
- DSH DB is authoritative for operational state
- WLT triggered only at payment-relevant transitions

---

## WLT Financial State Machine

Valid payment states:

`payment-initiated` → `authorization-hold` → `authorized` →
`capture-in-progress` → `captured` → `settlement-in-progress` → `settled`

Refund branch:
`refund-requested` → `refund-in-progress` → `refund-completed` / `refund-failed`

Reversal branch:
`reversal-requested` → `reversal-completed`

Terminal failure states: `failed`, `expired`

Rules:

- All transitions idempotent by `payment_session_id + idempotency_key`
- WLT callback duplicate → idempotent no-op
- Provider timeout → query provider status before retry
- Partial refund → recalculate commission/tax/settlement through WLT
- Dispatch failure after authorization → release authorization hold

---

## Dispatch Policy

Canonical dispatch rules (all require domain model spec before execution):

1. **Radial search**: expand radius if no driver found within configurable timeout
2. **Priority routing**: online → nearest → highest rating → manual escalation
3. **Auto-reject**: reject if captain does not accept within configurable window
4. **Batching**: batch to same captain if same zone and within time window
5. **Manual escalation**: operator assigns from control panel if auto fails
6. **Geofencing**: active polygon only; stale zone version blocked
7. **Partner blacklist**: check partner status before dispatch

All dispatch rows: `status = BLOCKED_NEEDS_EVIDENCE` until dispatch domain model approved.

---

## Pricing Policy

All pricing calculations owned by WLT. DSH displays quote only.

1. **Base fare**: store category + distance + time
2. **Surge multiplier**: configurable per zone, applied during high demand
3. **Delivery fee**: base + distance tier + surge; WLT calculates final
4. **Service fee**: fixed percentage of order subtotal; WLT ledger entry
5. **Discount/coupon**: WLT validates and recalculates before charge
6. **Minimum order**: enforced at checkout; DSH serviceability check only

All pricing rows: `status = BLOCKED_NEEDS_WLT`.

---

## COD (Cash on Delivery) Policy

1. **Driver liability**: captain collects COD; auto-deducted from settlements
2. **Auto-block dispatch**: captain with unreconciled COD above cap is blocked
3. **Deposit reconciliation**: captain deposits at collection point; WLT marks settled
4. **Cap enforcement**: max COD per captain per day; configurable by zone
5. **Daily reconciliation**: discrepancies trigger manual review

All COD rows: `status = BLOCKED_NEEDS_WLT`.

---

## Notification Policy

All notifications use abstract `NotificationProvider` — no provider named in code or matrix.

Canonical triggers (minimum 22):

`order.created`, `payment.pending`, `payment.failed`, `store.accepted`,
`order.preparing`, `order.ready-for-pickup`, `order.dispatching`,
`captain.assigned`, `captain.arrived-store`, `order.picked-up`,
`captain.arrived-customer`, `order.delivered`, `order.cancelled-by-client`,
`order.cancelled-by-store`, `order.cancelled-no-driver`, `refund.pending`,
`refund.completed`, `partner.activation`, `partner.document-review`,
`auth.otp`, `support.ticket-created`, `support.ticket-updated`,
`commission.settlement`

Rules:

- Notifications idempotent by `event_id`
- Failure is non-blocking; retry with exponential backoff
- Dead-letter after 3 attempts
- No hardcoded notification content; translation keys only

---

## Provider Abstraction Rule

No external provider may be named in any matrix row, code, or spec.

Use abstract contracts:

- Maps: `abstract-maps-provider`
- SMS/OTP: `abstract-sms-provider`
- Push: `abstract-NotificationProvider`
- Payment: `abstract-payment-gateway`
- Storage: `abstract-storage-provider`
- Email: `abstract-email-provider`
- Geolocation: `abstract-geolocation-provider`
- Analytics: `abstract-analytics-provider`

Every `external_dependencies` cell must have `provider_decision = TBD_CONFIG_REQUIRED:provider-not-decided-use-abstract-contract`.

**BLOCKED_NEEDS_PROVIDER_DECISION** is a valid status when the abstract contract
has not been defined yet.

---

## UI / Localization Rules

For every screen, screen-state, mobile-ux-journey, and control-panel-page:

- RTL required
- Translation keys only — no hardcoded user-facing strings
- Arabic typography through ui-kit tokens
- Localized number, date, and currency formatting
- Public ui-kit only — no direct Tamagui imports
- Brand tokens only — no raw hex colors
- Error messages via translation keys

---

## Build Target Policy

| Surface | Build target |
| --- | --- |
| `app-client`, `app-partner`, `app-captain`, `app-field` | `expo-dev-client; store-submission reserved until PRE_STORE_READINESS_GATE` |
| `control-panel` | `local web/control-panel runtime; production deploy reserved` |
| `shared`, `system`, `N/A` | `not-applicable` |

No row may advance to store submission before `PRE_STORE_READINESS_GATE` is explicitly declared.

---

## RBAC Rules

| Actor | Rule |
| --- | --- |
| client | own data only; deny cross-tenant without object existence leak |
| partner | own store only; deny cross-tenant without object existence leak |
| captain | assigned tasks only; deny cross-tenant without object existence leak |
| field | assigned visits only; deny cross-tenant without object existence leak |
| operator | role-scoped and audited |
| support | operational read only without payment card data |

Deny cross-tenant access without object existence leak (never expose 404 vs 403 difference).

---

## Audit / Privacy Rules

Every write, financial, order-state, and support row must include:

```
audit actor_id, actor_role, object_id, action, from_state, to_state,
correlation_id, timestamp
```

Masking rules:

- Mask phone and location in logs
- Never log payment secrets
- Mask provider references (API keys, tokens)
- Never log notification content with PII — log `event_id` and `correlation_id` only

---

## Rollback / Compensation Rules

| Scenario | Compensation |
| --- | --- |
| Dispatch failure after authorization | Release authorization hold |
| DSH DB transition failure | Do not call WLT settlement |
| WLT callback duplicate | Idempotent no-op |
| Provider timeout | Query provider status before retry |
| Partial refund | Recalculate commission/tax/settlement through WLT |
| Invalid state transition | No state mutation; audited rejection |
| COD reconciliation failure | Quarantine to manual review; do not auto-release |
| Notification failure | Retry queue; non-blocking |

---

## Service Manifest Policy

Real services use `service.manifest.ts` as the active machine-readable contract.

- `SERVICE_BLUEPRINT.md` is allowed **only** in `services/_template` as template
- Existing real-service `SERVICE_BLUEPRINT.md` is legacy reference until migrated to `service.manifest.ts` and governance docs
- No new real-service `SERVICE_BLUEPRINT.md` may be created
- WLT service manifest (`services/wlt/service.manifest.ts`) must exist before any WLT Payment Sessions or DSH-WLT execution

---

## Donor Alias Normalization

All 11 donor aliases must be represented in V3:

| Donor alias | Target | Service | Journey |
| --- | --- | --- | --- |
| dashboard | shell-overview | shared-app-shell | PLATFORM-001 |
| operations | operations | dsh | operations-room |
| finance | wallet-finance | wlt | WLT Payment Sessions |
| catalogs | catalog | dsh | Home Discovery |
| community-services | RESERVED\_INVENTORY | reserved | RESERVED-001 |
| support | support | dsh | Administration |
| partners | partners | dsh | Order Fulfillment |
| marketing | marketing | dsh | marketing |
| platform | platform | core | PLATFORM-001 |
| administration | platform | core | PLATFORM-001 |
| hr | RESERVED\_INVENTORY | reserved | RESERVED-002 |

---

## OpenAPI Endpoint Policy

No endpoint may be created until its API contract is explicitly approved.

Blocked endpoints (minimum — all at `status = BLOCKED_NEEDS_API_CONTRACT`):

- `GET /dsh/stores`
- `GET /dsh/stores/{storeId}`
- `GET /dsh/stores/{storeId}/catalog`
- `POST /dsh/carts`
- `POST /dsh/checkout-intents`
- `GET /dsh/orders/{orderId}`
- `POST /wlt/payment-sessions`
- `GET /wlt/payment-sessions/{paymentSessionId}`
- `GET /wlt/refunds/{refundId}`
- `GET /wlt/settlements/{settlementId}`

---

## Guard Commands

```bash
# V2 validation
node tools/guards/guard-journey-operating-model.mjs

# V3 validation
node tools/guards/guard-journey-operating-model.mjs

# Set evidence root
$env:BTH_EVIDENCE_ROOT = "tools/registry/runs/<SESSION_ID>"
node tools/guards/guard-journey-operating-model.mjs
node tools/guards/guard-journey-operating-model.mjs
```

Both must exit 0 before any journey execution begins.

---

## Evidence Requirements

Before declaring this phase complete:

- `matrix-v2-audit-before.json` — V2 state before repair
- `matrix-v2-audit-after.json` — V2 state after repair
- `matrix-v3-audit.json` — V3 validation results
- `donor-wlt-dsh-inventory.json` — donor reference inventory
- `donor-guard-inventory.json` — donor guard migration review
- `guard-v2-output.txt` — V2 guard result
- `guard-v3-output.txt` — V3 guard result
- `_HANDOFF.zip` — compressed evidence archive

---

## Next Allowed Action

```text
Store Discovery_CONTRACT_AND_DOMAIN_READINESS
```

This is the only permitted next step after this closure phase.
No journey execution, no backend handler, no frontend screen, no route,
no migration, no endpoint may be created until Store Discovery contract readiness
is declared.
