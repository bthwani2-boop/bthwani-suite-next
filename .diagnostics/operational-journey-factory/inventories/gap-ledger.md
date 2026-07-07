# Operational Gap Ledger (Reconciled)

head_sha: `a10f04911786c1478a2f286d73c4b6110d82ed16`
status: `DISCOVERY_ONLY`

| gap_id | source_tool | path | type | owner | risk_level | required_action | allowed_decision | verification_commands | status | blocks_journey_start |
|---|---|---|---|---|---|---|---|---|---|---:|
| `DIRECT_API_IN_SURFACE:services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx` | surface-inventory | `services/dsh/frontend/app-partner/DshPartnerRouteRenderer.tsx` | DIRECT_API_IN_SURFACE | dsh_frontend_partner_surface | P1 | bind_to_shared_controller_or_adapter | BIND_TO_ADAPTER | `pnpm run diagnostics:operational:surfaces` | OPEN | true |