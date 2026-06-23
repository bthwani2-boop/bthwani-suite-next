# DSH-001 Store Discovery — Full-Stack Multi-Surface Evidence

**Slice:** DSH-001_STORES_TOPIC_FIX_REQUIRED  
**Branch:** starting-implementing-slices  
**Date:** 2026-06-23  
**Surfaces:** app-client, control-panel, app-partner, app-field, app-captain

---

## Implemented Surfaces

DSH-001 has full bounded store-role implementation for all five surfaces, but it is not closed. Business logic resides in `services/dsh/frontend/shared`; surfaces remain UI-only. Authenticated partner, field, captain, and operator actions were exercised against the live identity and DSH runtimes with scoped stores and persisted audit events.

1. **app-client**: Client store discovery, feeds, and details.
2. **control-panel**: Store admin governance dashboard.
3. **app-partner**: Role-scoped partner store readiness UI.
4. **app-field**: Role-scoped field verification UI.
5. **app-captain**: Role-scoped captain pickup context UI.

---

## Evidence Files Included

The following verification files have been recorded in the evidence directory:

- **git-status.txt**: Verified status of the branch.
- **git-diff-check.txt**: Git diff formatting & syntax checks.
- **remote-head.txt**: Current commit hash and branch verification.
- **runtime-status.txt**: Docker compose health status for API, PostgreSQL, and MinIO.
- **api-health.txt**: Canonical `/dsh/health` status.
- **api-readiness.txt**: Canonical `/dsh/readiness` status.
- **api-stores.txt**: Canonical `/dsh/stores` list response.
- **control-panel-url.txt**: Control panel store governance page route.
- **app-client-reverify.txt**: Re-verification details for client app.
- **app-partner-store-context.txt**: Partner store readiness UI verification logs.
- **app-field-store-verification.txt**: Field verification UI logs.
- **app-captain-store-pickup-context.txt**: Captain store pickup UI logs.
- **guard-results.txt**: Logs for all repository policy guards.
- **typecheck-results.txt**: TypeScript compiler checks.
- **test-results.txt**: Full test runner output.
- **nx-results.txt**: Nx project graph status.
- **graphify-results.txt**: Graphify dependency update status.
- **ci-status.txt**: CI status log (declared as `CI_NOT_CONFIGURED_FOR_THIS_BRANCH`).

---

## Existing Screenshots

The following screenshots are historical partial evidence only. They do not close the Topic:

- `screenshots/app-client-store-discovery-reverify.png`
- `screenshots/control-panel-stores-admin-success.png`
- `screenshots/control-panel-store-detail-panel.png`
- `screenshots/control-panel-error-or-service-unavailable.png`
- `screenshots/app-partner-store-context.png`
- `screenshots/app-field-store-verification.png`
- `screenshots/app-captain-store-pickup-context.png`

## Required Real-Experience Evidence

DSH-001 now treats all five actor surfaces as required. Closure requires 25 state screenshots: loading, success, empty, error, and permission-denied for control-panel, partner, field, and captain; app-client uses service-unavailable instead of permission-denied because its read endpoint is public.

The role surfaces also require real authenticated actions:

- partner: own-store operating/settings update;
- field: assigned-store verification submission;
- captain: assigned pickup-point readiness report;
- control-panel: activation, suspension, visibility, and serviceability governance.

These actions are implemented and runtime-verified. Do not report this evidence pack as closure until the visual-state gate has all required screenshots.

---

## Guards Passed

The following results were rerun on 2026-06-23:
- `guard:dsh-frontend-shared-ownership` — zero raw HTML warnings (CpPrimitives via app-shell)
- `guard:dsh-001-cross-surface-dependency-map` — FAIL: 15 required visual-state screenshots missing
- `guard:no-financial-mutation-outside-wlt`
- `guard:app-shell-control-panel`
- `guard:control-panel-design`
- `guard:matrix:v3`
- `guard:wlt-dsh-frontend-shared-ownership` — NEW: WLT-for-DSH boundary verified
- `foundation:gate` — PASS (`FOUNDATION-GATE-20260623-041826`)
- `slice:gate` — FAIL (`SLICE-GATE-20260623-043525`) because visual-state coverage is incomplete

## CI Status

```
CI_NOT_CONFIGURED_FOR_THIS_BRANCH
CI_NOT_BLOCKING_BY_POLICY
```

CI/GitHub Actions is not configured for this branch. This is non-blocking by policy:
all slice gates, guards, typecheck, tests, and runtime evidence are verified locally
and pushed to GitHub Remote as the source of truth for this slice closure.

## app-client Surface

The services launcher ("الخدمات") in `apps/app-client/runtime/src/App.tsx` now opens
`StoreDiscoveryRoute` directly, making DSH-001 Store Discovery browsable alongside
`HomeDiscoveryRoute` without requiring a separate navigation slot.

## Historical Role Surface Injection

`PartnerStoreScreen`, `FieldStoreVerificationScreen`, and `CaptainStorePickupContextScreen`
now accept an optional `storeId` prop. Each app's `App.tsx` injects
`EXPO_PUBLIC_DEV_STORE_ID` when set, enabling concrete store context in dev/CI.
When unset, the fallback to first-store from API remains a dev-only fallback and is not acceptable authorization or closure proof.

## WLT-for-DSH Boundary

`services/wlt/frontend/dsh/shared` is established as the read-only financial reference
boundary for DSH surfaces. WLT runtime remains `CONTRACT_ONLY`; no backend, database,
or financial mutation is active.

---

## Test Verification

All targeted unit/integration tests are passing:
- `pnpm --dir services/dsh test` → 120 pass / 0 fail
  Includes expected-role enforcement, role-context controller core, and status mapping.
- `pnpm --dir services/dsh typecheck` → 0 errors
- `pnpm --dir core/identity test` → PASS
- `pnpm --dir core/identity typecheck` → 0 errors

## Runtime Action Proof

- partner `own` store `store-1001` → `partner.settings.update`
- field `assigned` store `store-1002` → `field.verification.submit`
- captain `assigned` store `store-1005` → `captain.pickup-readiness.report`
- identity and DSH runtime smoke → PASS
- DSH API returned 6 real database stores

The attached success captures show the current partner, field, captain, and control-panel success experiences. They do not replace the missing loading/empty/error/permission state captures required by the gate.
