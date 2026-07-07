# DSH Order Lifecycle — Live Code Remediation Checklist (Iteration 2026-07-07)

- journey_id: dsh-order-lifecycle-journey
- head_sha_at_start: a44aa80ef66ac838c83141b6e793a90f0dd343d0
- gap_count_before: 32
- gap_count_after_iteration_1: 30
- gap_count_after_iteration_2: 27
- head_sha_iteration_2: 0fe91251c693f9bec0f8ba4f01397469dee68c4d

## Completed items (proof-backed)

- [x] TRUTH_LOCK — branch=journy, HEAD==origin/journy, clean tree
  - verification_command: `git rev-parse HEAD; git rev-parse origin/journy; git status --short`
  - proof: both = a44aa80ef66ac838c83141b6e793a90f0dd343d0, empty status
- [x] STALE_DIAGNOSTICS — deleted obsolete untracked snapshot `.diagnostics/operational-journey-factory/canonical-reference/` (head_sha 682aec7e, superseded)
  - proof: dedup audit (sha256 + head_sha comparison); dir absent; `guard:operational-diagnostics-reconciliation` PASS after delete
- [x] RAW_REPORT_TRACKED_IN_GIT — untracked `command-results.json` + `knip-current.json` (git rm --cached) and added explicit .gitignore rules
  - verification_command: `pnpm run guard:operational-diagnostics-reconciliation`
  - proof: gate PASS (was FAIL with RAW_REPORT_TRACKED_IN_GIT before fix)
- [x] CONTRADICTORY_CLAIMS — reconciliation-report.json carried stale burndown counters (remaining_open_gaps=146 vs gap_count_after=32)
  - fix: `tools/scripts/reconcile-operational-diagnostics.mjs` now computes fixed/keep/false-positive/blocked/remaining counts from the current reconciled ledger statuses instead of copying `gap-burndown-report.json`
  - proof: report now shows remaining_open_gaps == open ledger gaps (32 at fix time, 30 after remediation)
- [x] UNUSED_EXPORT — `services/dsh/frontend/control-panel/dashboard/ControlPanelDshClosureDashboardScreen.tsx` (`ControlPanelDshClosureHubScreen`)
  - root_cause: double export (named + default); consumer `apps/control-panel/runtime/src/app/dsh/dashboard/page.tsx` imports default only
  - action: removed redundant named export from screen + barrel
  - verification_command: `pnpm run typecheck && pnpm run guard:operational-diagnostics-reconciliation`
  - proof: typecheck PASS, gap removed from ledger (32→30 includes this)
- [x] UNUSED_EXPORT — `services/dsh/frontend/control-panel/hr/ControlPanelHrScreen.tsx` (`ControlPanelHrScreen`)
  - root_cause: double export (named + default); consumer `apps/control-panel/runtime/src/app/dsh/hr/page.tsx` imports default only
  - action: removed redundant named export from screen + barrel
  - proof: same commands as above, PASS
- [x] MISSING_ROUTE_BINDING — client Support flow was fully implemented (`SupportTicketScreen`, `TicketDetailScreen`, `useSupportTicketController`, `useTicketDetailController`, `SUPPORT_CLIENT_CATEGORIES`) but never mounted from `DshClientSurface.tsx`
  - action: added `support` subroute under the `profile` tab in `MySpaceScreen` (`onOpenSupport` prop + menu row), wired `DshClientSurface` to render `SupportTicketScreen`/`TicketDetailScreen` with ticket-selection state, made ticket list rows `Pressable` with a11y label + `testID`
  - verification_command: `pnpm run typecheck && pnpm run guard:operational-diagnostics-reconciliation`
  - proof: typecheck PASS; gap_count 30→27 (5 knip gaps closed: 2 screen exports + `useSupportTicketController`, `useTicketDetailController`, `SUPPORT_CLIENT_CATEGORIES`)
- [x] RETIRE_DEAD_WITH_PROOF — 6 zero-consumer wrapper functions in captain domain (all confirmed via `git grep`, zero hits outside their own definition file and dead barrel)
  - `services/dsh/frontend/shared/delivery/delivery.policy.ts`: `getCaptainRouteForLifecycle`, `isCaptainInboxVisibleForMode`, `getCaptainActionableHandoffs`
  - `services/dsh/frontend/shared/delivery/captain.cod.ts`: `buildCaptainCodEntry`
  - `services/dsh/frontend/shared/support/support.captain-escalation.ts`: `getCaptainEscalationContext`
  - `services/dsh/frontend/shared/media/captain-pod-downstream.ts`: `DSH_CAPTAIN_POD_DOWNSTREAM` (whole file deleted, was 100% dead — its only importer was the dead barrel below)
  - `services/dsh/frontend/app-captain/dsh-captain.navigation-bridge.ts`: deleted (barrel had zero importers anywhere in the repo)
  - verification_command: `git grep -n "<symbol>" services apps` (pre-delete, zero non-definition hits) + `pnpm run typecheck` (post-delete PASS)

## Open triage (evidence gathered, decision requires product/routing owner — not closed here)

- [ ] UNBOUND_SCREEN — `services/dsh/frontend/app-client/catalog/PublishedCatalogScreen.tsx`
  - evidence: same props shape as the live `StoreDetailRoute(storeId, onBack)`; appears to be a parallel/legacy catalog implementation using local `app-client/shared/ui/*` components (FilterRail, FloatingActionCircle, HeroCover, MetricChip, ProductCard, ServiceModeSegment, StatusBadge) instead of the live path's `@bthwani/ui-kit` ProductCard
  - required_decision: BOUND_TO_ROUTE (replaces or supplements StoreDetailShell) vs RETIRE_DEAD_WITH_PROOF — this changes customer-facing store browsing UX and should not be guessed; needs a product owner call
- [ ] UNBOUND_SCREEN — `services/dsh/frontend/control-panel/support/SupportHubScreen.tsx`
  - evidence: `/support` page binds `SupportDashboardScreen` instead; `SupportHubScreen` has full ticket+incident controller wiring but zero route consumer; registries (`dsh-operational-registry.ts`, `dsh-cross-surface-closure-map.ts`, `dsh-flow-registry.ts`) cite a nonexistent `SupportHubScreens.tsx` (plural) as evidence — stale registry string needs correcting once the real binding decision is made
- [ ] UNBOUND_SCREEN — `services/dsh/frontend/control-panel/partners/PartnerListScreen.tsx`
  - evidence: has its own `usePartnerAdminController` + `onSelectPartner`/`onCreatePartner` props (175 lines, not a stub); `/dsh/partners` page binds `PartnersReviewQueueScreen` (approval queue) instead — these appear to be two distinct partner-admin views (full list+create vs. review queue) with only one routed
- [ ] UNBOUND_SCREEN — `services/dsh/frontend/control-panel/partners/field-readiness/FieldReadinessQueueScreen.tsx`
  - evidence: wired to real `useFieldEscalationController`; zero route or nav-item references anywhere under `apps/control-panel/runtime/src/app/dsh/**` — a real feature with no route
- [ ] UNBOUND_COMPONENT — `services/dsh/frontend/control-panel/shared/ControlPanelDshActionQueue.tsx` — typed props, zero non-barrel consumers
- [ ] UNBOUND_COMPONENT — `services/dsh/frontend/app-partner/Catalog/PartnerCatalogReadinessPanel.tsx` — typed props, zero non-barrel consumers
- [ ] Remaining UNUSED_EXPORT symbols in shared controllers/policies/types (partner, cart, orders, finance-wlt-link) not yet triaged — see `.diagnostics/operational-journey-factory/gap-ledger.json`

## Rules honored

- No deletion of any UI file without file-decision proof (rule 14/15).
- All [x] items carry command + machine-readable proof.
- Diagnostics refreshed at current HEAD before and after code changes.
