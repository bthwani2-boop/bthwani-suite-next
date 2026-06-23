# DSH-007 Dispatch & Captain Delivery Lifecycle Evidence

Status: TECHNICAL_AND_API_RUNTIME_VERIFIED_WITH_BLOCKING_VISUAL_GAPS

Verified on: 2026-06-24

Scope covered:
- `dsh-007_dispatch.sql` migration applied to runtime DB.
- Local DSH API built from the working tree on port `58081`.
- Operator creates dispatch assignment for a ready-for-pickup order.
- Captain lists own assignment, accepts it, advances delivery lifecycle, and submits PoD.
- Client reads own order tracking before and after delivered state.
- WLT financial boundary preserved: no earnings, COD collection, settlement, refund, ledger mutation, or payment truth implemented in DSH.

Runtime API smoke:
- `DSH-007 API smoke: PASS order=044652ba-6d26-4ea4-a6d5-5412a9468737 assignment=deee33cd-ca16-44b6-a978-a7f909c0ffc0 statuses=driver_assigned>driver_arrived_store>picked_up>arrived_customer>delivered`

Validation commands:
- `pnpm --dir services/dsh build` PASS
- `pnpm --dir services/dsh typecheck` PASS
- `pnpm --dir services/dsh test` PASS, 147/147
- `go test ./...` PASS
- `go build ./...` PASS
- `pnpm --filter @bthwani/app-client-runtime typecheck` PASS
- `pnpm --filter @bthwani/app-captain-runtime typecheck` PASS
- `pnpm --filter @bthwani/control-panel typecheck` PASS
- `pnpm run contracts:lint` PASS
- `pnpm run guard:dsh-frontend-shared-ownership` PASS
- `pnpm run guard:no-financial-mutation-outside-wlt` PASS
- `pnpm run guard:matrix:v3` PASS
- `git diff --check` PASS
- `pnpm run runtime:migrate` PASS including `dsh-007_dispatch.sql`
- `pnpm run runtime:status` PASS after Docker escalation
- `pnpm run runtime:smoke` PASS for existing DSH foundation smoke

Blocking gaps before CLOSED/100%:
- Required app-captain visual states are not screenshot-verified: loading, success, no_active_order, error, pickup_in_progress, delivery_in_progress, pod_submitted.
- Required app-client visual states are not screenshot-verified: loading, tracking_active, delivered, error.
- Required control-panel visual states are not screenshot-verified: loading, dispatch_room, live_orders, error.
- Manual navigation evidence for app-captain, app-client tracking, and control-panel dispatch room is not captured.
- DSH-006 remains not CLOSED under REAL_EXPERIENCE_CLOSURE_v2, so the registry dependency blocker is not fully cleared.
