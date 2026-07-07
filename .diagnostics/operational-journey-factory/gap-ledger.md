# Operational Gap Ledger

head_sha: `ddb054583f42e454bca6f680823e8339ffca0785`
status: `DISCOVERY_ONLY`

| gap_id | source_tool | path | type | owner | risk_level | required_action | allowed_decision | verification_commands | status | blocks_journey_start |
|---|---|---|---|---|---|---|---|---|---|---:|
| `DIRECT_API_IN_SHARED_UNCLASSIFIED:services/dsh/frontend/shared/orders/dsh-order-lifecycle.controller.ts` | surface-inventory | `services/dsh/frontend/shared/orders/dsh-order-lifecycle.controller.ts` | DIRECT_API_IN_SHARED_UNCLASSIFIED | shared_brain | P2 | rename_or_move_to_shared_adapter_or_kernel | KEEP_WITH_PROOF_OR_RENAME | `pnpm run diagnostics:operational:surfaces` | OPEN | false |