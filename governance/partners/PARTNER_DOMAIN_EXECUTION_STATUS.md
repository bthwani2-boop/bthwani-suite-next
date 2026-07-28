# Partner Domain Execution Status

Branch: `bassam`

Classification: `FIX_REQUIRED`

This status is intentionally fail-closed. Source implementation is not called
"100% complete" until the same resolved remote commit passes the required
backend, database, contract, frontend and end-to-end verification gates.

## Implemented and source-verified

### Internal control-panel Partners section

- Internal operator surface remains separate from the mobile partner app.
- Partner lifecycle actions use optimistic concurrency.
- Rejection, deactivation and client-hide decisions require reasons.
- Failed transitions do not close the operator decision UI.
- Document review supports approve, reject and needs-resubmit.
- Reject and needs-resubmit require a reason.
- Documents, visits, stores, readiness and audit expose retry/error states.
- The route barrel now resolves the partner detail page to the fail-closed
  operational screen.

### Partner commercial programs

- Persistent loyalty tiers, client loyalty accounts and immutable point ledger.
- Persistent subscription plan definitions and client entitlement references.
- DSH owns definitions and eligibility; WLT remains monetary authority.
- Commercial mutations use version fields.
- Active commercial terms cannot be edited before pausing.
- A creator cannot self-approve a loyalty tier or subscription plan.
- Subscription activation requires a WLT product reference.
- Operator APIs and the app-client benefits API are registered.
- Loyalty/subscription control-panel controllers use the API instead of local
  registries or generated rows.
- Client benefits expose active tiers/plans and currently published offers only.

### Partner courier and app-captain connection

- Partner team courier is the sovereign operational record.
- Partner can issue a short-lived one-time code for an eligible courier member.
- Plaintext is returned once; only SHA-256 digest and last four are persisted.
- Code lifecycle supports pending, redeemed, revoked and expired.
- Captain redemption binds the authenticated captain actor to the same store
  team member consumed by partner-delivery assignment.
- Partner app can issue/revoke codes from the courier team record.
- Captain app can redeem the code and list linked store memberships.
- Store-scoped routes and UI receive the concrete active store ID.

### Partner delivery and pickup

- Existing partner-delivery assignment validates fulfillment mode, order state,
  store ownership and eligible active courier membership.
- Existing pickup and partner-delivery state machines remain the operational
  owners; the new captain connection does not create a parallel delivery model.

### Marketing approval and app-client visibility

- Client home store queries now require the parent partner to be
  `client_visible` in addition to store, readiness, catalog and marketing gates.
- Home banners/promos now carry publication status, approval actor/time,
  publication window and version.
- Client queries return only published, approved and currently in-window home
  content.
- Store/category targets are revalidated before a banner or promo reaches the
  client.
- Home marketing governance is represented by an active OpenAPI contract shard.

### Coupons fail closed

- A marketing card with `offer_type = coupon` is not treated as a working
  checkout coupon.
- Existing published coupon cards are paused.
- Database constraints prevent publishing coupon offers or showing store coupon
  badges until a real checkout redemption engine is introduced.

## Contract and governance artifacts

Active contract shards:

- `services/dsh/contracts/dsh.marketing-commercial.openapi.yaml`
- `services/dsh/contracts/dsh.partner-fleet.openapi.yaml`
- `services/dsh/contracts/dsh.home-marketing-governance.openapi.yaml`

Primary diagnosis:

- `governance/partners/PARTNER_DOMAIN_DEEP_DIAGNOSIS.md`

Verification workflow:

- `.github/workflows/partner-domain-verification.yml`

## Remaining FIX_REQUIRED work

### 1. Coupon checkout and redemption engine

Required before removing DSH-061 fail-closed constraints:

- normalized coupon-code entity and secure code handling;
- marketing approval and effective date window;
- cart/store/product/client/channel eligibility;
- minimum basket and maximum discount rules;
- global, per-client and per-order usage limits;
- authoritative checkout pricing application;
- immutable pricing snapshot carried to payment and order;
- idempotent redemption reservation/commit/release ledger;
- cancellation/refund reversal rules;
- abuse/risk controls and operator audit.

### 2. Loyalty accrual and redemption runtime

The data model and management APIs exist, but automatic points posting is not
considered closed until verified order/payment events:

- accrue points only from eligible completed orders;
- use idempotency keys per order event;
- reverse points on refund/cancellation according to policy;
- redeem through checkout pricing, not by directly editing balance;
- prove concurrency and insufficient-balance behavior.

Until then, the client may read persisted account state and approved tiers, but
no claim is made that every order automatically earns or redeems points.

### 3. Subscription purchase and WLT entitlement activation

Plan definitions and entitlement references exist. Full closure still requires:

- governed DSH -> WLT purchase/session handoff;
- verified WLT webhook/internal event;
- idempotent activation, renewal, pause, expiry and payment-failed handling;
- entitlement snapshot consumed by checkout/delivery benefits;
- refund/cancellation and reconciliation rules.

No DSH/client input may directly mark an entitlement paid or active.

### 4. End-to-end verification evidence

The following must pass on one fixed `resolved_commit_sha` before final closure:

1. apply every DSH migration to a clean PostgreSQL database;
2. `go test ./...` under `services/dsh/backend`;
3. `pnpm run contracts:lint`;
4. generated-client drift check;
5. `pnpm run guard:backend-api-binding`;
6. `pnpm run guard:api-binding`;
7. `pnpm run guard:frontend-feature-binding`;
8. `pnpm run guard:no-broken-imports`;
9. workspace `pnpm run typecheck`;
10. app-partner/captain/client/control-panel rendering checks;
11. issue code -> redeem -> assign partner delivery -> progress -> proof;
12. draft/paused/rejected marketing content never reaches app-client;
13. partner/control-panel/captain permission-negative tests;
14. OCC conflict tests across partner lifecycle, commercial programs and code
    revocation.

GitHub Actions/status results were not observable through the current connector,
so the existence of verification workflows is not recorded as a passing result.

## Donor repository decision

The donor repository is used for business terminology and journey coverage only.
Accepted concepts include staged onboarding, store-scoped team operations,
catalog/marketing review separation, pickup/store-delivery presentation and
fail-closed actor rules. Local/static truth, fake IDs, UI-only success, direct
frontend finance calls, duplicated catalog ownership and implicit client
visibility are rejected.
