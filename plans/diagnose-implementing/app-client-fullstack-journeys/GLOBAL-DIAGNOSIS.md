# Global diagnosis — app-client bounded full stack

## Diagnosis basis

The customer runtime is not a standalone UI. `apps/app-client/runtime/src/App.tsx` composes an Identity session gate, device/session storage, push registration, rating gate and the sovereign `DshClientSurface`. The DSH surface then composes discovery, stores, cart/checkout, orders/tracking/pickup, account/address/identity/benefits/preferences, notifications, support and sovereign special-request routes. The customer account also consumes the WLT-owned `ActorWalletPanel`.

This means the correct implementation boundary is a vertical-slice boundary rather than a folder boundary. DSH owns operational store, cart, checkout, order, fulfillment, address/serviceability, support and related readback. WLT remains the sole financial truth owner. Identity remains the authentication/session owner. Partner, Captain and control-panel code enters scope only when an authorized action there changes the exact canonical state that the customer must later read.

## Root risks found

1. Static route composition is broad, but static presence cannot prove actor/object isolation, idempotency, database constraints, legal state transitions, offline recovery or same-state cross-surface convergence.
2. `order-creation-truth.product-truth.json` requires exactly one order from one valid checkout intent, immutable creation snapshots and WLT-only financial ownership. The client path therefore must be verified through contracts, backend and PostgreSQL, not only through `GovernedCheckoutScreen`.
3. `zones-sla-capacity-delivery-modes.product-truth.json` is still in DISCOVERY and explicitly says client cart/checkout must consume one canonical policy decision. Any local serviceability/fulfillment assumption is a critical defect.
4. `maps-service-area-address-privacy.product-truth.json` requires DSH-mediated provider resolution, active-geofence binding and strict PII isolation. Address UI correctness cannot be inferred from visual behavior alone.
5. WLT representative-wallet Product Truth requires actor and operator-context isolation and forbids DSH/frontend balance mutation. The current MySpace integration follows the intended ownership direction, but backend/database/runtime proof is still required.
6. Support Product Truth is also DISCOVERY and requires owner-scoped tickets, redacted internal notes, retry-safe transitions and no WLT mutation from rescue.
7. Customer-visible fulfillment spans other surfaces. Partner/Captain/operator internals are not generally in scope; only the transition or evidence that changes the client's order/support truth is.
8. `docs/architecture.drawio` is empty at `49bb4723f969c7275445d0c2ea96a4ee8fb8e2fa`. It cannot be used to justify dependencies or omissions.

## Derived journey registry usage

`plans/smsm-dsh-wlt-journeys/04-JOURNEY-REGISTRY.yaml` is used only as a completeness index. Its J041..J055 customer cart/checkout/order block is not treated as the entire customer scope because customer-visible consequences continue through fulfillment/support and WLT finance. The registry and ledger schema never override Product Truth or pinned source.

## Required implementation discipline

For every unit: map UI control/query to generated or shared contract operation, backend handler/service, persistence/provider effect, authorization context, idempotency/version behavior and canonical readback. State-changing work must prove positive, forbidden, duplicate/retry, stale/conflict and cross-actor cases as applicable. Every client-visible success must come from committed canonical readback, not local optimistic final truth.

The package deliberately excludes unrelated administration, analytics, dashboard, HR and operator-login sections. It also excludes independent app-field behavior and independent partner/captain finance/workforce. These exclusions reopen only when current Product Truth or implementation proves a mandatory client dependency.
