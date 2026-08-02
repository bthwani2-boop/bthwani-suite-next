# Operational Gap Ledger (Reconciled)

head_sha: `e56637e750fd3915c19e2b0efc02d9a12c8b42f1`
status: `DISCOVERY_ONLY`

| gap_id | source_tool | path | type | owner | risk_level | required_action | allowed_decision | verification_commands | status | blocks_journey_start |
|---|---|---|---|---|---|---|---|---|---|---:|
| `BUSINESS_LOGIC_IN_SURFACE:services/dsh/frontend/app-field/finance/WltFieldFinanceScreen.tsx` | surface-inventory | `services/dsh/frontend/app-field/finance/WltFieldFinanceScreen.tsx` | BUSINESS_LOGIC_IN_SURFACE | dsh_frontend_field_surface | P1 | move_or_bind_to_shared_or_backend_owner | SPLIT_REFACTOR | `pnpm run diagnostics:operational:surfaces` | OPEN | true |
| `UNBOUND_SHARED_CONTROLLER:services/dsh/SERVICE_BLUEPRINT.md` | journey-inventory | `services/dsh/SERVICE_BLUEPRINT.md` | UNBOUND_SHARED_CONTROLLER | foundation | P1 | classify_missing_source_or_adjust_factory_source | FIX_REQUIRED | `pnpm run diagnostics:operational:inventory` | OPEN | true |