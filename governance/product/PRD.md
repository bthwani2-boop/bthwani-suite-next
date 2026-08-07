# BThwani Product Requirements Document

Status: ACTIVE_CANONICAL

## 1. Product definition

BThwani is one unified multi-surface B2B2C commerce, fulfillment, operations, workforce, and financial platform. It is not a collection of independent applications. The client, partner, captain, field, and control-panel surfaces are different operating views over shared governed domain truth.

The platform supports multi-vertical commerce including restaurants, groceries, pharmacy, electronics, gifts/flowers, desserts/juices, fruits/vegetables, and other catalog-governed verticals added through the same contracts.

## 2. Required surfaces

The standard product surfaces are:

- `app-client`: customer discovery, cart, checkout, orders, support, tracking, and bounded financial readback.
- `app-partner`: partner/store/catalog/order/team and authorized financial readback.
- `app-captain`: assignment, delivery lifecycle, proof/exception handling, and authorized earnings readback.
- `app-field`: assigned field onboarding, verification, readiness, and workforce-linked operational tasks.
- `control-panel`: governed operator administration and operational control.
- backend/domain services and their service-owned databases.
- shared generated clients, controllers, adapters, UI primitives, events/jobs, and runtime infrastructure required by the above surfaces.

A capability may exclude a surface only when the capability Product Truth explicitly records the exclusion reason.

## 3. Actors and trust model

Primary actors are customer, partner, captain, field worker, and operator. Authentication identity, business scope, workforce affiliation, operational ownership, and financial ownership are separate concepts and must not be conflated.

### Platform context

- Platform Context is the platform isolation boundary.
- Operator Context is trusted operational/data context within the platform boundary.
- Partner Organization and Store are business authorization scopes, not platform-isolation contexts.
- Trusted platform/operator context is server-derived from authenticated identity or governed server-side delegation.
- A client header, query parameter, request body, cached local value, or UI selection cannot grant or override trusted context.

## 4. Domain ownership

Every durable fact has exactly one authoritative owner.

- Identity owns actors, credentials, authentication, sessions, activation, roles/permissions, and trusted identity context.
- Workforce owns employment/workforce profiles, status, supervisor/shift/affiliation and workforce-specific evidence.
- DSH owns commerce, stores, catalog consumption, checkout/order operational truth, partner operational state, dispatch, delivery, serviceability, special requests, support/rescue, and application-facing bounded projections defined by current contracts.
- WLT exclusively owns authoritative financial truth: wallet, ledger, payment, refund, settlement, payout, commission, reconciliation, and provider financial mutation.
- Platform Control owns platform-wide governed configuration/rollout state assigned to it by current contracts.
- Providers own provider registration/capabilities/connection policy while provider secrets remain in approved runtime secret storage.
- Media owns governed binary/document media where a current contract assigns media ownership.

A consumer may keep a cache or projection only when the owner contract permits it. A projection is never a second truth owner.

## 5. Core product requirements

### Central catalog

Canonical category, product, taxonomy, visibility, and commercial catalog identity must come from the central catalog owner. No application may maintain a competing runtime catalog, hardcoded category list, demo product truth, or surface-local publication truth.

### Discovery and serviceability

Home and store discovery use canonical DSH/product data under trusted context and current serviceability/publication gates. Ranking or personalization may reorder eligible results but may not make an ineligible store/product visible. Cached discovery may not authorize checkout/order creation after a current canonical denial.

### Partner and store model

One partner may own/manage multiple stores according to current contracts. A store has one canonical operational owner unless an explicit transfer capability governs reassignment. Partner onboarding, store readiness, publication, team access, documents/evidence, and payout references must converge on canonical DSH/Identity/Workforce/WLT ownership rather than surface-local state.

### Checkout and orders

Checkout validates canonical cart/item snapshots, owned address, serviceability, fulfillment mode, promotion/commercial eligibility, and required WLT references. One canonical checkout/idempotency scope creates at most one order. Order commercial/address/item snapshots required by the contract are immutable after creation except through an explicit legal transition.

### Fulfillment and dispatch

Dispatch, assignment, custody/handoff, delivery progression, proof, cancellation/reassignment, and delivery exceptions remain DSH operational truth. Workforce eligibility may be consumed from Workforce but must not become a parallel assignment owner. Financial effects caused by fulfillment remain WLT truth.

### Financial access

Applications access financial state only through the current governed application-facing boundary. DSH may orchestrate or store bounded WLT-backed references/projections but cannot become ledger, wallet, payment, refund, settlement, payout, commission, or reconciliation truth.

Every financial mutation is server-side, authenticated, idempotent, correlated, auditable, and reconciled against WLT/provider authority. Unknown outcomes remain unknown/reconcilable; they are never converted into fabricated success.

### Promotions and funding

Every promotion has stable identity/version, eligibility, scope, validity window and explicit funding model. Client-supplied totals/discounts are untrusted. Checkout/order captures the commercial snapshot required to reproduce the accepted transaction. WLT owns the authoritative financial consequences, reimbursement, settlement and refund effects.

### Platform variables and provider health

Cross-surface platform variables have a canonical server-side owner, type/schema, validation, version, audit/reason, rollout and readback semantics. Provider health comes from current runtime/provider evidence; a configured endpoint or `enabled=true` flag is not health evidence. Secrets never become product configuration or client-visible variables.

### Operational analytics

Analytics are read models, not truth owners. Every metric identifies its source owner, aggregation/window, time basis, unit/currency, freshness behavior and allowed dimensions. Missing/stale/partial data is explicit and is not silently rendered as zero. Financial analytics derive from WLT-owned facts or governed WLT-backed projections.

## 6. Multi-surface capability contract

Every Product Truth capability must define, at minimum:

1. problem/outcome and affected actors;
2. authoritative owner(s) and cross-domain boundaries;
3. required and explicitly excluded surfaces;
4. states, legal transitions and forbidden transitions;
5. canonical write path and readback path;
6. authorization/object-scope requirements;
7. idempotency/concurrency/retry/reconciliation behavior where applicable;
8. database/event/job/integration effects where applicable;
9. loading, empty, offline, forbidden, conflict, partial, error and recovery states where applicable;
10. acceptance criteria, negative invariants and required evidence scopes.

Feature-specific rules belong in `governance/product/contracts/*.product-truth.json`, not in new top-level governance policy or decision documents.

## 7. Unified full-stack implementation rule

A product outcome is implemented vertically through the complete affected path:

`surface interaction → shared controller/adapter → generated contract client → backend/domain rule → persistence/events/integration → canonical readback → affected consumers`

Work must not be declared complete when only one horizontal layer succeeds. When one user action changes state consumed by another surface, both the write and the affected readbacks belong to the same outcome verification.

## 8. UX and accessibility baseline

All required surfaces must provide truthful, actionable state. No toast/local optimistic state may stand in for committed readback where server truth is required.

Applicable surfaces must support RTL/Arabic, localization, accessibility semantics, keyboard/focus behavior on web, large text/device constraints on mobile, and recovery from weak/offline network conditions. Visual polish cannot override correctness, ownership, authorization, or persisted state.

## 9. Data and privacy baseline

PII is minimized, scoped, redacted and retained according to current policy. Secrets, credentials, tokens, payment instruments and private provider payloads are never product telemetry or general audit content. Audit/evidence must use stable identifiers and correlation metadata sufficient for investigation without copying unnecessary sensitive data.

## 10. Acceptance model

A capability is accepted only against its current Product Truth and the exact candidate implementation. Static success proves only static claims. Runtime, visual, QA, security, finance, isolation, CI, release and production claims require their own applicable evidence.

Product acceptance does not authorize merge, release or production by itself, and implementation agents cannot self-grant protected approvals.
