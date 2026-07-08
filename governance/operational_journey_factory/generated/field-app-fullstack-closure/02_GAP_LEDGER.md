# Gap Ledger

## Fixed during this engagement (see [09_LIVE_CODE_PATCH_LEDGER.md](09_LIVE_CODE_PATCH_LEDGER.md) for full diffs)

1. **Products section never rendered** — `onOpenProducts` accepted as a prop by `DshFieldOnboardingScreen` and
   `DshFieldPartnerProgressScreen` but never called from any button. Fixed: persistent "قسم المنتجات" card in
   onboarding + buttons in both screens.
2. **Bank account section missing from onboarding** — implemented end-to-end (types, validation, wizard step,
   backend, OpenAPI, control-panel masking). See journey 03.
3. **`TransitionStatus` (Go) dropped bank fields from every transition response** — found via live authenticated
   trace, not by inspection. DB data was never at risk (confirmed via direct `psql`); only the HTTP response was
   incomplete. Fixed by extending the `RETURNING`/`Scan` clause.
4. **`DshFieldStoresHistoryScreen.tsx` and `DshFieldProfileScreen.tsx` called the operator-only
   `usePartnerAdminController`** (`GET /dsh/operator/partners`) from a field-role session — confirmed live
   `403 FORBIDDEN`. This means the "History" bottom-nav tab (always visible, primary navigation) was silently
   broken for every real field agent. Fixed by swapping to the field-scoped `useFieldPartnerDraftsController`
   (the same fix already applied to `DshFieldFinanceScreen.tsx` in the prior finance-WLT-runtime session).
5. **`DshFieldStoreVerificationScreen` fully unreachable** — real, functional screen (own controller, submit
   actions, full UI) with zero navigation path. Wired via a new "التحقق الميداني من المتجر" item in the account
   menu; the route's dead `storeId` parameter (the screen self-resolves via actor scope, never read it) was
   removed from the type.
6. **Stale guard-manifest paths** in `tools/guards/frontend-feature-binding-gate.mjs` pointed at renamed files
   (`FieldPartnerOnboardingScreen.tsx`/`store/FieldStoreVerificationScreen.tsx` that no longer exist) — guard was
   reporting `SCREEN_MISSING` for functionality that actually exists under
   `onboarding/DshFieldOnboardingScreen.tsx` / `stores/DshFieldStoreVerificationScreen.tsx`. Corrected; segment D
   now passes 4/4.
7. **OpenAPI boundary self-check** — first draft of the platform-fee-policy contract text used the phrase "WLT
   ledger entry", which literally matched `services/dsh/tests/catalog-contract.test.mjs`'s repo-wide
   `assert.doesNotMatch(contract, /\bledger entry\b|\brefund finalization\b/i)` safeguard. Caught by the test
   suite itself, reworded, verified.

## Disclosed, deliberately NOT fixed

**`visit` / `checklist` / `escalation` routes have no UI entry point.**

- All three are real: backend routes exist and are contract-documented (`POST /dsh/field/stores/{storeId}/visits`,
  `PUT/GET /dsh/field/visits/{visitId}/checks`, `POST /dsh/field/stores/{storeId}/escalations`), and the screens
  (`DshFieldVisitScreen`, `DshFieldReadinessChecklistScreen`, `DshFieldEscalationScreen`) are fully built against
  real controllers (`shared/field-readiness`), not stubs.
- The only navigation path to them is `DshFieldNavigationCommand` (`field.surface-model.ts:resolveCommandRoute`),
  which is supplied via the `command` prop on `DshFieldSurface`. `apps/app-field/runtime/src/App.tsx` renders
  `<DshFieldSurface />` with **no props at all** — the command-injection mechanism is 100% dead in the current
  build, for any of its five external targets (`visit`, `checklist`, `escalation`, plus `onboarding`/
  `products-upload`, which — unlike these three — are also reachable through independent internal `pushRoute`
  calls, so only these three are actually stranded).
- This is architecturally consistent with a **push-notification deep-link** pattern ("زيارة مطلوبة لمتجر X" →
  tap → opens app-field pre-routed to the visit) that has not been wired up at the notification/App.tsx layer.
  `DshFieldPartnersScreen` (the only "stores" list in circulation) is scoped to draft partners
  (`activationStatus !== 'client_visible'`), not already-active stores needing periodic readiness visits — so
  there is no existing store-browsing surface to attach a "start visit" button to without inventing one.
- **Why not fixed**: adding a fabricated entry point (e.g., a generic "زياراتي الميدانية" button with no real
  store-selection data source) would mean inventing UX/business logic not requested by any of the five journeys
  in this engagement's actual scope, and risks masking the real missing piece (notification/deep-link wiring)
  behind a decoy button. Per governance, disclosure is the correct action here, not silent omission or
  unauthorized invention.
- **What would close it**: a decision on the real trigger source (push notification payload schema, or a new
  "زياراتي الميدانية" browsing screen backed by `GET /dsh/field/stores` — no such endpoint currently exists) is
  needed before this can be wired correctly. Flagged for explicit user decision, not attempted blind.

## Known pre-existing, out-of-scope gaps (not introduced or touched by this engagement)

- `control-panel/operations/OrderQueueScreen.tsx`, `control-panel/support/SupportHubScreen.tsx` —
  `guard:frontend-feature-binding` `SCREEN_MISSING`, unrelated to app-field/bank-account/finance/platform-fee/
  multi-surface-binding scope.
- `services/dsh/tests/catalog-contract.test.mjs` "catalog UI roots delegate runtime logic to shared" — fails on
  a missing file `app-client/catalog/PublishedCatalogScreen.tsx`, deleted in commit `c8625cb` before this
  engagement began.
- `pnpm run typecheck` (monorepo-wide) fails early at `apps/app-client/runtime` on pre-existing missing exports
  in `shared/ui/{FilterRail,FloatingActionCircle,HeroCover,MetricChip,ProductCard,ServiceModeSegment,StatusBadge}`,
  and separately at `frontend/app-partner/index.ts` on stale export names — both predate this engagement and
  were worked around by typechecking `@bthwani/dsh` directly, which reaches every file this engagement touched.
- Six `tools/registry/runs/FOUNDATION-GATE-*/evidence.json` files were found deleted from the working tree at
  session start, with no traceable command in this engagement's history responsible. Left as-is, flagged (first
  disclosed in the finance-WLT-runtime journey).
