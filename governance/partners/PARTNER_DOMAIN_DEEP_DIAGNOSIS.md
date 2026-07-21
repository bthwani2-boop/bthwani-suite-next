# Partner Domain Deep Diagnosis and Unified Closure Matrix

Status: `FIX_REQUIRED` until all verification gates at the end of this document pass on the resolved `bassam` commit.

## 1. Domain boundary

The word **partner** refers to two deliberately separate surfaces:

1. **Control-panel / Partners section**
   - Internal platform surface.
   - Available only to authorized platform operators and employees.
   - Owns onboarding decisions, documents, activation lifecycle, readiness review, store linkage, internal audit and escalation visibility.
   - It is not a partner-facing web portal.

2. **app-partner**
   - Mobile application for the partner and authorized store team members.
   - Owns store-scoped operational actions: orders, catalog submissions, promotions submissions, team operations, store delivery configuration, pickup and partner-delivery execution.
   - It never receives control-panel operator permissions.

Both surfaces consume the same DSH contracts and persistence truth. They do not duplicate partner state, catalog state, marketing state or financial truth.

## 2. Sovereign ownership matrix

| Capability | Sovereign owner | Allowed surfaces | Required gate |
|---|---|---|---|
| Partner identity and activation | DSH partner domain + Identity actor reference | control-panel, app-partner read-self, app-field readiness | RBAC + lifecycle OCC |
| Store and team membership | DSH store/team domain | app-partner, control-panel read/audit, app-captain membership read | authenticated store scope |
| Catalog source and publication | DSH central catalog | app-partner submit, marketing/catalog review, app-client read | catalog approval + active store |
| Partner offers | DSH marketing | app-partner submit, control-panel marketing review, app-client read | `published` + active date window |
| Loyalty definitions | DSH marketing | control-panel marketing manage, app-client approved read | active status + audit |
| Subscription plan definitions | DSH marketing | control-panel marketing manage, app-client approved read | active status + WLT reference boundary |
| Subscription payment and monetary state | WLT | DSH governed proxy/reference only | verified WLT event; never client assertion |
| Partner delivery | DSH fulfillment/partnerdelivery | app-partner, linked app-captain, operations | fulfillment mode + eligible linked courier |
| Pickup | DSH fulfillment/pickup | app-partner, app-client tracking, operations | pickup lifecycle state machine |
| Client home visibility | DSH discovery/catalog/marketing | app-client | partner + store + catalog + marketing gates |
| Field readiness | DSH field/readiness | app-field, control-panel partners | assignment + evidence + escalation rules |

## 3. Diagnosed critical gaps

### 3.1 False commercial UI

Previous loyalty and subscription screens used in-memory rows, generated local IDs and explicit non-API state. This created a false-positive surface: operators could interact with tabs that did not persist or govern anything.

Closure implemented:

- Persistent loyalty tiers, client loyalty accounts and immutable point ledger.
- Persistent subscription plan definitions and client entitlement references.
- OCC versions on mutable commercial records.
- Explicit WLT reference fields and comments preventing synthetic payment success.
- API-backed control-panel controllers.
- API-backed app-client benefits surface.
- Client benefits return only active tiers, active plans and currently published offers.

### 3.2 Courier record disconnected from captain identity

The store team already supported the `courier` role and partner-delivery assignment already required an active courier team record. The missing link was a safe way for the partner to bind that record to an authenticated captain actor.

Closure implemented:

- Short-lived one-time connection codes.
- Cryptographically random non-ambiguous code alphabet.
- SHA-256 digest persistence; plaintext returned once only.
- Code lifecycle: pending, redeemed, revoked, expired.
- Store-scope and courier-role validation.
- Unique captain identity binding to the sovereign `dsh_store_team_members` row.
- Partner app issue/revoke UI on the courier member record.
- Captain app redemption and membership listing.
- Existing partner-delivery assignment consumes the same linked member record.

### 3.3 Marketing approval and client visibility

Client visibility must not be inferred from the existence of a partner, product, promotion or media record.

Required visibility chain:

```text
partner operationally active
AND store listing enabled/open under governed rules
AND catalog item approved and published
AND marketing asset/offer published when marketing-owned
AND active date/eligibility/channel conditions satisfied
AND no suspension, archive or risk hold
```

The client benefits endpoint now filters commercial records at the server. Draft, review, paused, rejected and archived records are not client-visible.

### 3.4 Control-panel partner detail actions

Still classified `FIX_REQUIRED` until the direct screen/controller patch is present and verified. Required behavior:

- Lifecycle transition returns success/failure and keeps the dialog open on failure.
- Every transition sends the current partner version.
- Rejection, deactivation and client-hide require a reason.
- Document decisions support approve, reject and needs-resubmit.
- Reject/needs-resubmit require a reason.
- Document action errors remain visible.
- Documents, visits, stores, readiness and audit tabs expose retry actions.

A guarded one-time patch workflow exists, but its resulting source commit must be observed before this item can be marked closed.

### 3.5 Runtime route registration and contract generation

Handlers and persistence are not sufficient. Every route must be registered in `NewRouter`, represented in OpenAPI and included in generated clients/binding guards.

Required route set:

```text
GET    /dsh/operator/marketing/loyalty-tiers
POST   /dsh/operator/marketing/loyalty-tiers
PATCH  /dsh/operator/marketing/loyalty-tiers/{tierId}
GET    /dsh/operator/marketing/subscription-plans
POST   /dsh/operator/marketing/subscription-plans
PATCH  /dsh/operator/marketing/subscription-plans/{planId}
GET    /dsh/client/benefits
POST   /dsh/partner/stores/{storeId}/couriers/{memberId}/connection-code
GET    /dsh/partner/stores/{storeId}/courier-connections
POST   /dsh/partner/stores/{storeId}/courier-connections/{connectionId}/revoke
POST   /dsh/captain/partner-fleet/connect
GET    /dsh/captain/partner-fleet/memberships
```

This item remains `FIX_REQUIRED` until source inspection confirms registration and contract lint/generated-client guards pass.

## 4. Unified operational journeys

### 4.1 Partner onboarding

```text
field or operator creates draft
-> identity/store/document minimums
-> field evidence and readiness
-> operator review
-> activation decision with OCC
-> store linkage
-> catalog onboarding
-> marketing/publication gates
-> client visibility
```

Field employees provide evidence and readiness signals. They do not make final commercial activation or client-publication decisions.

### 4.2 Partner promotion

```text
partner submits offer
-> status inbound/review
-> marketing validates target, margin risk, eligibility and date window
-> marketing publishes or rejects with reason
-> client API returns published and currently active offers only
-> archive/ pause removes visibility without deleting audit history
```

### 4.3 Store courier connection

```text
partner creates or selects team member with courier role
-> partner issues one-time code
-> digest stored, plaintext shown once
-> courier signs in to app-captain
-> authenticated captain redeems code
-> identity actor bound to store team member
-> store-courier mode becomes eligible
-> partner may assign partner-delivery task
-> backend revalidates store, role, status and fulfillment mode
```

### 4.4 Subscription

```text
marketing defines draft plan in DSH
-> operator approves active plan
-> client sees active plan
-> payment initiation/collection occurs under WLT authority
-> verified WLT event creates or updates entitlement reference
-> DSH client benefits exposes only verified active entitlement
```

No DSH route may mark a subscription paid based only on client input.

## 5. Donor repository findings

The donor repository is useful for business terminology, surface ideas and prior journey coverage, but it is not copied blindly because it contains older architectural assumptions. Only concepts that preserve the new repository's sovereign DSH/WLT boundaries, role separation, remote runtime contracts and fail-closed behavior are admissible.

Admissible donor lessons:

- explicit partner onboarding stages;
- store-scoped team operations;
- catalog and marketing review separation;
- pickup and store-delivery presentation;
- fail-closed actor and runtime identity rules.

Rejected donor patterns:

- local or static runtime truth;
- fake actor/store identifiers;
- UI-only success;
- direct frontend-to-finance provider calls;
- duplicated local catalog or promotion ownership;
- implicit client visibility.

## 6. External platform patterns selected for this repository

The following patterns are suitable when implemented inside the existing architecture rather than imported as a new platform:

- Channel/store-scoped catalog, price, stock, shipping and promotion constraints.
- Promotion rules evaluated against cart, item, customer/segment, channel and delivery conditions.
- Store self-delivery as an explicit fulfillment type with radius/zone, courier identity, status and proof.
- Pickup as a distinct fulfillment lifecycle with readiness, customer notification, verification and no-show handling.
- Loyalty as immutable ledger events plus derived balance/tier, not an editable points number.
- Subscription entitlement separated from payment authority.
- Operator permissions separated from seller/partner permissions.

## 7. Verification gates

No `100%` or final closure claim is allowed unless the same resolved commit passes all gates:

1. `go test ./...` in `services/dsh/backend`.
2. Database migration apply from a clean PostgreSQL state.
3. `pnpm run contracts:lint`.
4. `pnpm run openapi:generate:dsh` with no generated drift.
5. `pnpm run guard:backend-api-binding`.
6. `pnpm run guard:api-binding`.
7. `pnpm run guard:frontend-feature-binding`.
8. `pnpm run guard:no-broken-imports`.
9. workspace `pnpm run typecheck`.
10. targeted mobile rendering checks for app-partner, app-captain and app-client.
11. integration test: issue code -> redeem -> assign partner delivery -> progress -> proof.
12. integration test: draft offer/plan/tier never appears to client; published/active record appears; pause removes it.
13. OCC conflict tests for partner lifecycle, loyalty tier, subscription plan and code revocation.
14. permission tests proving partner cannot access operator routes and operator surface is not exposed through app-partner.

## 8. Current implementation evidence

Key commits introduced during this closure include:

- `84cb3b99be1b457bf88d7c654351c79e5e55922e` — commercial persistence.
- `f4b54e1567133884b45ceb3fd5decdc00b705a4f` — commercial service layer.
- `fca574650e76c368e2ba2f5ad92b3777ed6e4d69` — protected commercial handlers.
- `e4e2c1e0c0b1d231f4424a8e9340d5cced97e205` — courier connection migration.
- `af072405fc1932e530a60eff5d641d670829ce29` — secure courier binding service.
- `3640159095cd0745f7c8d54f1dcc82e924d78753` — protected partner/captain fleet handlers.
- `935a6578d052c801d5af2daef70e0652c8979927` — API-backed loyalty/subscription controllers.
- `36a316e5e8a9b02a6f9ab2cc88de11cce603061a` — restored API-backed client benefits screen.
- `7312d3abc45f9c32d50076367a67df1743288ca2` — shared fleet API adapter.
- `d26b754977c6c80646ae22b83fa938b93a54724f` — partner courier code UI.
- `c675e3ab8f840c874cb2a0289b8db237d51f846a` — captain redemption UI merged with current appearance settings.
- `dbed906717df0b00592494d23ba7e4891de99d93` — commercial validation tests.
- `bfbe09080892e3364f911ee078c871b1c0cfda70` — secure code primitive tests.

Because the branch is receiving concurrent commits, the final resolved commit must be recorded again immediately before verification.
