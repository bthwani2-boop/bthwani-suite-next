# Scope Surface Inventory

## app-field (`services/dsh/frontend/app-field`)

19 `.tsx` files. All 12 route kinds in `dsh-field.routes.ts` are registered in `DshFieldRouteRenderer.tsx`.

| Route kind | Screen | Reachable in running app? |
|---|---|---|
| `stores` (default) | `DshFieldPartnersScreen.tsx` | Yes — app root / bottom nav "المهام" |
| `onboarding` | `DshFieldOnboardingScreen.tsx` | Yes — FAB "إضافة", partner card (draft status) |
| `partner-progress` | `DshFieldPartnerProgressScreen.tsx` | Yes — partner card (non-draft status) |
| `products-upload` | `DshFieldPartnerProductsScreen.tsx` | Yes — fixed this session (was accepted as prop, never rendered) |
| `account` | `DshFieldProfileHomeScreen.tsx` | Yes — bottom nav "حسابي" |
| `profile` | `DshFieldProfileScreen.tsx` | Yes — account menu item |
| `history` | `DshFieldStoresHistoryScreen.tsx` | Yes — bottom nav "السجل" + account menu (data source bug fixed this session) |
| `finance` | `DshFieldFinanceScreen.tsx` | Yes — bottom nav "المالية" + account menu |
| `verification` | `DshFieldStoreVerificationScreen.tsx` | **Fixed this session** — was fully unreachable, now wired via account menu "التحقق الميداني من المتجر" |
| `visit` | `DshFieldVisitScreen.tsx` | **No** — see disclosed gap in [02_GAP_LEDGER.md](02_GAP_LEDGER.md) |
| `checklist` | `DshFieldReadinessChecklistScreen.tsx` | **No** — only reachable from `visit`, itself unreachable |
| `escalation` | `DshFieldEscalationScreen.tsx` | **No** — see disclosed gap |

Non-screen components (all confirmed used, not orphaned): `DshFieldPartnerCard.tsx` (used by
`DshFieldPartnersScreen`), `DshFieldRouteRenderer.tsx`/`DshFieldSurface.tsx` (router/entry, used by
`apps/app-field/runtime/src/App.tsx`), `Onboarding{Basics,Location,Evidence,Agreement,BankAccount}Section.tsx`
(wizard steps, all rendered by `DshFieldOnboardingScreen.tsx`).

## control-panel (relevant subset)

- `services/dsh/frontend/control-panel/partners/{PartnerDetailScreen,PartnersReviewQueueScreen,PartnerListScreen}.tsx`
  — real, backend-wired (not mock). Bank-account masking + approval transitions added/verified this session.
- `services/dsh/frontend/control-panel/partners/stores/StoreGovernanceActions.tsx` — real 6-dimension store
  governance form (lifecycle/visibility/serviceability/partner-readiness/catalog-approval/marketing-visibility).
- `services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx` — real, backend-wired
  (zones/SLA/capacity + new store-onboarding-fee section this session). Sibling file `DshPlatformWorkspaces.tsx`
  in the same directory contains **mock, local-`useState`-only** scaffolds (canary flags, health, rollback) —
  deliberately not extended with the fee policy, to avoid presenting a fake control as real policy management.
- `services/dsh/frontend/control-panel/finance/FinanceDashboardScreen.tsx` — real, DSH-proxy-only WLT finance
  read surface (verified in the finance-WLT-runtime journey).

## app-partner (relevant subset)

- `services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx` — real onboarding-status gate
  (`usePartnerSelfController` + `isDshPartnerActivationComplete`), already implemented, confirmed by code read.
- `services/dsh/frontend/app-partner/account/{OperationScreens.tsx,PartnerOnboardingActionPanel.tsx}` — fee
  policy reference wired this session into `OnboardingActionScreen`.

## app-client

Negative-proof only: zero references to bank fields, fee-policy fields, or any `DshPartner`-shaped type anywhere
under `services/dsh/frontend/app-client` (grep-verified in every sub-journey).

## Backend (Go)

- `services/dsh/backend/internal/partner/{model.go,repository.go,handler.go}` — Partner bank fields (Journey 2)
  + `TransitionStatus` bug fix (this session, see [02_GAP_LEDGER.md](02_GAP_LEDGER.md) / patch ledger).
- `services/dsh/backend/internal/platformpolicies/platformpolicies.go` + `internal/http/platformpolicies.go`
  + `internal/http/server.go` — new store-onboarding-fee-policy singleton + 3 routes.
- `services/dsh/backend/internal/store/{repository.go,handler.go}` — read-only, confirmed already correct
  (6-gate public visibility enforcement), no changes needed.
