# Journey Execution Gate

This document evaluates the gating rules to declare the DSH Order Lifecycle journey as execution-ready.

## Gating Checklist

- [x] **Typecheck & Lint Passed**: `tsc -p services/dsh/tsconfig.json --noEmit` exits 0. `tsc -p apps/control-panel/runtime/tsconfig.json --noEmit` exits 0. `guard:fullstack-boundary` PASS. (verified 2026-07-07)
- [x] **Shared Order Layer Split**: Decoupled transport, adapter, types, policies, view-model, and controller.
- [x] **Broken export regressions fixed**: 12 exports silently stripped from `shared/delivery`, `shared/media`, `shared/support`, `shared/analytics`, `shared/cart`, `shared/checkout`, `shared/orders`, `shared/partner`, `shared/notifications`, `shared/operations` (consumed by real screens/bridges) restored and re-verified against `tsc`.
- [x] **UI Surfaces Wired**: All 5 real, backend-bound, unregistered screens resolved:
  - `CartActivityScreen` + `CheckoutActivityScreen` → wired as `carts`/`checkout` subgroups under `control-panel/operations` command-center.
  - `PlatformNotificationConfigScreen` → wired as a `notifications` tab in `control-panel/platform`.
  - `AnalyticsDashboardScreen` → wired as a new top-level nav section (`/dsh/analytics`, added to `DSH_NAV_ITEMS`).
  - `PartnerDetailPanel` → not a duplicate; its unique "field visits" tab and decision-command UX were ported into the live `PartnerDetailScreen.tsx` (new `usePartnerVisitsController` backed by the real, pre-existing, previously-unexported admin endpoint wrapper `GET /dsh/operator/partners/{partnerId}/field-visits`). `PartnerDetailPanel.tsx` deleted — fully redundant after the port, confirmed zero remaining importers.
  - `OrderQueueScreen` — deleted. Confirmed superseded: `LiveOrdersScreen` (live, under `live-orders` group) already covers order listing via a newer real-time endpoint (`dsh-operational-runtime-adapter.ts`); `OrderQueueScreen` called an older/different endpoint and had zero importers.
- [ ] **Database & Route Binding Proven**: Mapped all 22 operations to Go handlers and SQL schemas. Not attempted this pass — backend Go/SQL audit is out of scope of the frontend remediation done here.
- [ ] **WLT Financial Boundary Defined**: WLT boundary interfaces and refund handshakes verified. Not attempted this pass.
- [ ] **Automated Verification Passed**: `guard:dsh-order-lifecycle-all` still fails at the `diagnostics:knip` step — `knip` exits non-zero whenever it finds ANY issue anywhere in the monorepo (by design of the CLI), independent of severity. Last full run: 0 `unresolved`/`unlisted` findings (no broken imports/deps anywhere in the monorepo), remaining findings are `exports`/`duplicates`/`unusedFiles` across the whole repo (not journey-scoped), none of which are functional breaks. This gate needs either a knip exit-code policy change (e.g. `--no-exit-code` or per-severity gating) or a full repo-wide dead-code pass, both outside this journey's scope.

## Resolution Evidence (this pass)

| Item | Resolution | Verified by |
|---|---|---|
| 12 stripped exports | `export` keyword restored at source + barrel re-exports fixed | `tsc --noEmit` (0 errors, twice) |
| `CartActivityScreen`, `CheckoutActivityScreen` | registered in `operations-registry.ts` + `OperationsHubScreen.tsx` | `tsc --noEmit`, boundary lint |
| `PlatformNotificationConfigScreen` | registered as `platform-registry.ts` tab + `PlatformDashboardScreen.tsx` render branch | `tsc --noEmit`, boundary lint |
| `AnalyticsDashboardScreen` | new `/dsh/analytics` route + nav item | `tsc --noEmit` on both `services/dsh` and `apps/control-panel/runtime` |
| `PartnerDetailPanel` → `PartnerDetailScreen` visits tab | new `usePartnerVisitsController` + `fetchPartnerFieldVisits` (export restored, real backend endpoint confirmed in `services/dsh/backend/internal/partner/handler.go`) | `tsc --noEmit`, backend route confirmed in `server.go:181` |
| `OrderQueueScreen` deletion | confirmed zero importers + confirmed functional supersession by `LiveOrdersScreen` before deletion | `git grep` zero-consumer check, `tsc --noEmit` post-delete |
| `PartnerDetailPanel` deletion | confirmed zero importers after visits-tab port | `git grep` zero-consumer check, `tsc --noEmit` post-delete |

## Declaration
We hereby declare the **DSH Order Lifecycle Journey** frontend-wiring scope as **CONCLUDED**; the journey overall remains **PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS** pending backend/database binding proof and WLT boundary verification, which are outside frontend remediation.
- **Execution State**: `PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS` (frontend UI-wiring sub-scope: `RESOLVED`)
- **Verification Hash**: `cc04e7671fee480da83800e51222635c4db9e649`
- **Next Required Action**: backend Go/SQL route-to-operation mapping audit; WLT boundary interface verification; repo-wide knip dead-code decision (separate from this journey).