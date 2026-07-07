# DSH Order Lifecycle Journey Index

journey_id: `dsh-order-lifecycle-journey`
status: `DISCOVERY_PACKAGE_ONLY`
implementation_started: `false`
head_sha: `ce1f24bef08d52a089dbd1df0833382ec0bb4988`

## Business Outcome

Customer creates an order, partner receives and processes it, captain receives dispatch and delivery work, control-panel operations monitors and intervenes, backend/API/database own operational truth, and WLT remains the finance truth boundary when payment, settlement, commission, refund, or COD truth is involved.

## Why This Is The First Journey

Discovery found order lifecycle evidence across client checkout and orders, partner order intake and action panels, captain order and dispatch surfaces, control-panel order and dispatch operations, DSH backend checkout/order/dispatch handlers, DSH OpenAPI operations, generated clients, and shared order lifecycle code.

## Start Rules

- Do not implement behavior from this package creation step.
- Do not start execution until every blocker in this package is classified.
- Do not claim live-readiness from this package.
- Do not delete, move, merge, or split any file without proof in the cleanup file decisions.
- Do not exclude any surface without direct proof and a verification command.

## Package Files

- `01_DISCOVERY_SOURCES.md`
- `02_SCOPE_AND_SURFACES.md`
- `03_BACKEND_API_DATABASE_BINDING.md`
- `04_FRONTEND_BINDING.md`
- `05_UI_ACTIONS_ICONS_STATES.md`
- `06_PERMISSION_STATE_AUDIT.md`
- `07_CLEANUP_FILE_DECISIONS.md`
- `08_GAP_LEDGER.md`
- `09_EXECUTION_PLAN.md`
- `10_VERIFICATION_PLAN.md`
- `11_NON_CLAIMS_AND_BLOCKERS.md`
