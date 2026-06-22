# DSH-001 Store Discovery — Full-Stack Multi-Surface Evidence

**Slice:** DSH-001_STORES_TOPIC_FIX_REQUIRED  
**Branch:** starting-implementing-slices  
**Date:** 2026-06-22  
**Surfaces:** app-client, control-panel, app-partner, app-field, app-captain

---

## Implemented Surfaces

DSH-001 has technical GET wiring for all five surfaces, but it is not closed. Business logic resides in `services/dsh/frontend/shared`; surfaces remain UI-only. Partner, field, captain, and control-panel still lack approved store-domain mutation/auth/audit contracts and therefore remain `FIX_REQUIRED`.

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

These actions are not implemented in the current API contract. Do not report this evidence pack as closure.

---

## Guards Passed

The following results are historical and must be rerun after the current rework:
- `guard:dsh-frontend-shared-ownership` — zero raw HTML warnings (CpPrimitives via app-shell)
- `guard:dsh-001-cross-surface-dependency-map`
- `guard:no-financial-mutation-outside-wlt`
- `guard:app-shell-control-panel`
- `guard:control-panel-design`
- `guard:matrix:v3`
- `guard:wlt-dsh-frontend-shared-ownership` — NEW: WLT-for-DSH boundary verified
- `foundation:gate`
- `slice:gate`

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

All unit/integration tests are passing:
- `pnpm --dir services/dsh test` → 118 pass / 0 fail
  Includes: role-context controller core, direct fetch bypass, and status mapping.
- `pnpm --dir services/dsh typecheck` → 0 errors
