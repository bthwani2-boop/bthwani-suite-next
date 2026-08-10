# Global diagnosis — app-client bounded full stack

## Rebaseline finding

The prior package was internally coherent but stale. Its manifest targeted `abbas` at `49bb4723f969c7275445d0c2ea96a4ee8fb8e2fa`, while the requested branch resolves to `BB`. The final pre-write pin for this reconciliation is `efbe5fae065dcc66b9bdcf0872deeed2bca61cf1`, 310 commits ahead of the old package pin. The intervening changes are materially client-related: app-client runtime/tests, shared mobile transport/bootstrap, Identity sessions, DSH cart/checkout/order/store/service-area/support/ratings, WLT finance rules, runtime smoke scripts and CI/guards all changed. Therefore changing only branch metadata would be unsafe; the package required current-head re-diagnosis.

## Concurrent branch movement reconciliation

During diagnosis, `BB` moved twice. First, it moved from `a93586e91d1850b1db77a5514be65472056ec655` to `0916eb2500a0f6d83c47ed44124c02665f9cd0f9`. That delta included an app-partner package rebaseline, migration guards, and a **client-relevant** shared `apps/mobile/mobile-lan.ps1` correction with PowerShell execution tests. Because the mobile change overlaps U001's dependency boundary, it was read at the new head rather than treated as disjoint. The current source avoids reserved automatic-variable parameter collisions and includes executable regression coverage, so U001 plans re-verification instead of recreating that fix.

Immediately before ref update, `BB` moved again from `0916eb2500a0f6d83c47ed44124c02665f9cd0f9` to `efbe5fae065dcc66b9bdcf0872deeed2bca61cf1`. GitHub comparison showed changes to captain/control-panel planning packages, migration amendments and `governance-schema-gate.mjs`, but **no app-client package path and no app-client product/runtime path**. This second movement was classified as disjoint to the package content and reconciled by re-pinning and rebuilding the candidate on the new tree rather than overwriting concurrent work.

## Canonical boundary

The current PRD defines BThwani as one multi-surface platform. `app-client` is the customer view over Identity, DSH and bounded WLT truth, not an isolated application. Current `apps/app-client/runtime/src/App.tsx` binds native SecureStore/device identity, Identity session gating, push registration, rating gating and `DshClientSurface`. `DshClientSurface` exposes account/address, discovery/store, cart/checkout, orders/tracking/pickup, wallet, notifications, support and sovereign special requests. The package boundary is therefore a vertical slice: surface interaction → shared controller/adapter → generated contract → authoritative backend/domain rule → transaction/database/event/provider effect → committed readback → client and any directly affected consumer.

Other applications do not enter as whole products. They enter only at the exact writer/readback needed for the client state: field/partner/control publication evidence and store gates; partner/captain/control order transitions; operator serviceability/support/rescue actions; and finance-operator reconciliation that changes a client payment/refund outcome. Their independent workforce, fleet, finance, HR or administration remains excluded.

## Root-cause classes to close

1. **Identity/native lifecycle drift.** Identity Product Truth is still `DISCOVERY`; static `IdentitySessionGate` wiring is not proof of activation/session rotation, surface binding, logout/relogin data invalidation, device restart recovery, push-token lifecycle, trusted-context isolation or offline failure behavior.
2. **Publication/discovery convergence.** Client discovery must expose only central-catalog/store truth that passed all current publication, marketing and serviceability gates. Field/partner/control operations are relevant only where they feed those gates. No local/demo catalog, hardcoded category/product/publication truth or optimistic visibility may survive.
3. **Address/serviceability/checkout split truth.** Address/geofence implementation is code-closed pending independent review, while zone/SLA/capacity/delivery-mode Product Truth remains `DISCOVERY`. Cart and checkout must consume one current DSH decision and cannot proceed on cached/local eligibility after canonical denial.
4. **Exactly-once order creation and immutable snapshots.** A valid checkout intent may create at most one DSH order under retry/concurrency. Item/price/currency/address/fulfillment snapshots remain stable and financial state remains WLT-owned.
5. **Fulfillment cross-surface state machine.** Partner, captain and operator actions can change the order a client reads. Legal transitions, version/idempotency, custody/pickup/proof/location privacy, cancellation/return/exception/reassignment and canonical client readback must converge without another surface becoming a second truth owner.
6. **Financial ownership and unknown outcomes.** Client wallet/ledger, funding/payment allocation/refund effects are WLT truth. DSH is an authenticated facade/orchestrator only. Client claims or optimistic success cannot create financial truth; unresolved external outcomes must reconcile before a duplicate path is attempted.
7. **Support/rating/notification closure.** Support/rescue Product Truth remains `DISCOVERY`; support must be owner-scoped with internal-note redaction and retry-safe transitions. Ratings require server-owned eligibility/idempotency. Notification registration/preferences/deep links must be actor/object scoped and re-authorize the destination; delivery success is not business-state success.
8. **Evidence drift.** The repository has real app-client tests and runtime scripts, but static/source tests do not prove PostgreSQL, concurrency, physical-device lifecycle, provider failure, cross-surface convergence, RTL/accessibility or exact-candidate runtime. Verification is therefore layered and claim-bounded.

## Scope challenge and exclusions

The package validator requires coverage records for all five product surfaces and every current DSH/WLT control-panel section. Those records are assessments, not permission to modify the entire section. `administration`, `analytics`, `dashboard`, `hr` and DSH operator `login` are explicitly excluded because no current client trace requires their independent behavior. `catalogs`, `marketing`, `partners`, `platform`, `operations`, `support` and bounded WLT `finance` are included only for exact client-affecting writes/readbacks. `app-field` is bounded to upstream store-publication evidence only; Workforce/HR tasks stay out.

## Execution discipline

No patch-only symptom suppression is acceptable. Each unit fixes the canonical owner and invariant first, removes proven obsolete fallback, and proves the committed readback. Never weaken authorization, guards, schema checks or financial controls to obtain green output. Never treat one broad `go test ./...`, one frontend test suite or one CI run as proof of all runtime claims. Re-resolve `BB` before every logical write batch, classify concurrent branch movement, reconcile overlap, then use fast-forward/non-force writes only.

This environment can read/write GitHub and inspect live branch data but cannot run repository shell/Node/PostgreSQL/device commands. Consequently this package records those commands as required future evidence and does **not** claim strict-validator, runtime, database, physical-device, visual, QA, security or finance-control PASS.
