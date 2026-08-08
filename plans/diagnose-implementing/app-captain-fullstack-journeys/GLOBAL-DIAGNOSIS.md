# Global diagnosis — App Captain

## Pinned evidence

Repository `bthwani-suite-next`, target branch `abbas`, final reconciled pinned SHA `319f47ce41aaca136fa9f25fa0db4e3587681886`. Diagnosis began at `e93bf885963b2caa0f39c587436ecc2dc57a41ed`. During construction, `abbas` first advanced to `519577aae52e9e565aaa3d955726f89dc3982659` with `feat(wlt): implement daily finance close and settlement batch`; that movement changed WLT finance-close/batch/operator paths and skipped two Identity tests but did not change the applicable Captain Product Truth or `WltDshCaptainBridge.tsx`. It then advanced to `319f47ce41aaca136fa9f25fa0db4e3587681886` with only `apps/app-field/runtime/package.json` changed. The second movement is outside this Captain-bounded scope and does not alter any Captain dependency. Both movements were compared before finalization. The requested `docs/architecture.drawio` is zero bytes on this lineage, so the package derives architecture from `AGENTS.md`, applicable Product Truth records and exact implementation paths. `plans/smsm-dsh-wlt-journeys/04-JOURNEY-REGISTRY.yaml` is used only as a discovery/closure checklist.

## Current architecture

`apps/app-captain/runtime/src/App.tsx` composes secure session/device state, Identity role/surface gating, Workforce readiness and mobile push registration before mounting `DshCaptainSurface`. The sovereign Captain surface is under `services/dsh/frontend/app-captain`; its model delegates to `services/dsh/frontend/shared/delivery/captain-surface.binding.ts`, which composes shared lifecycle, dispatch, PoD, chat, availability, GPS/navigation, profile/service mode and active-order runtime. This is the intended frontend brain and no surface-local operational truth should replace it.

Dispatch calls are centralized in `services/dsh/frontend/shared/dispatch/dispatch.api.ts`. Product Truth `captain-dispatch` (journey 102) requires one governed assignment, server-owned eligibility/capacity, expiry, authenticated Captain accept/decline, atomic reassignment, operator readback and client tracking. Its current Product Truth decision is implemented-pending-verification, so this package treats missing same-candidate runtime/database/isolation evidence as open verification work rather than claiming closure.

Store↔Captain custody Product Truth (journey 105) requires app-partner, app-captain and control-panel with app-client readback, and explicitly excludes app-field. Pickup must not precede bilateral custody completion; handoff shortage/mismatch must persist as a governed DSH exception, survive restart and be released only by legal resolution. Partner-fleet Product Truth separately requires one-time code redemption, Captain-owned membership list/disconnect, partner lifecycle visibility and redacted operator readback from one versioned DSH fleet truth.

Captain support/order-rescue Product Truth is still in discovery. Captain support must be limited to assigned orders, internal notes must remain operator-only, incident/rescue transitions must be idempotent/conflict-aware/audited and DSH rescue must never mutate WLT financial truth.

## Financial diagnosis

At the reconciled SHA, the WLT daily finance close/settlement-batch implementation must be preserved and verified as an operator-owned financial workflow. `WltDshCaptainBridge.tsx` remains unchanged and correctly describes COD liability as WLT-owned and reads it through a governed Captain-scoped DSH proxy. However the same screen explicitly says aggregate Captain earnings are unavailable and that settlement is partnerId-oriented. This conflicts with `SETTLEMENTS_COMMISSIONS` Product Truth to the extent that Product Truth requires app-captain to read the Captain's own commission lifecycle (`pending`, `confirmed`, `settled`, `rejected`, `reversed`) and adjustment reasons from canonical WLT truth.

The target is **not** a new Captain settlement mutation. Captain remains read-only. WLT must own policy, calculation, commission lifecycle, wallet/ledger and adjustments; DSH may expose only bounded authorized references/proxies. The implementation unit must provide the missing Captain-scoped commission readback required by Product Truth and preserve COD reconciliation/isolation plus the newly added daily-close/batch controls.

## Bounded cross-surface scope

Directly related control-panel areas are: HR for Captain create/detail/readiness/fleet state; Operations for dispatch, proof, exceptions and rescue; Partners for partner-fleet operator readback; Support for Captain support queue; Administration only for Captain role/access approvals; Platform only where service-area/capacity configuration directly gates Captain dispatch; WLT Finance for Captain COD/commission lifecycle. Generic analytics, dashboard, catalogs, login and marketing are excluded until a direct Captain dependency is proven.

`app-client` is included only for tracking/order-state readback affected by Captain execution. `app-partner` is included only for partner-fleet, store↔Captain custody/return and related readback. `app-field` is explicitly assessed and excluded: shared commission infrastructure does not make the field actor's independent commission lifecycle a Captain change.

## Main implementation risks

1. Static wiring may conceal backend/data/contract drift; generated-consumer and route registration parity must be checked before edits.
2. Assignment/custody transitions are concurrency- and idempotency-sensitive; frontend success cannot prove legal state.
3. Foreground-only Captain location is visible in current code. Do not add background tracking without explicit Product Truth; instead verify OS lifecycle, privacy, retry queue and tracking freshness.
4. Support/rescue is discovery state and therefore requires stronger ownership/conflict/audit tests.
5. Finance changes are high risk: preserve the current daily-close/settlement-batch/manual-evidence lifecycle; no caller-supplied amount, frontend calculation, DSH ledger mutation or cross-Captain read is allowed.
6. Closure requires candidate-bound runtime, cross-surface, PostgreSQL, isolation, QA/security/finance and CI evidence as applicable; this planning package alone proves none of them.
