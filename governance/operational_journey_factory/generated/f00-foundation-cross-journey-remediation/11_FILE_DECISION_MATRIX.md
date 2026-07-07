# 11 File Decision Matrix

status: `DECIDED`

Every active file, helper, adapter, route, screen, generated client, or type has been assigned exactly one status decision:

| Candidate File Path | Owner | Assigned Decision | Proof Evidence / Rationale |
|---|---|---|---|
| `services/dsh/clients/generated/dsh-api.ts` | `api-contracts` | `KEEP_ACTIVE` | Generated OpenAPI contract client for DSH operations. |
| `services/wlt/clients/generated/wlt-api.ts` | `api-contracts` | `KEEP_ACTIVE` | Generated OpenAPI contract client for WLT operations. |
| `core/identity/clients/generated/identity-api.ts` | `api-contracts` | `KEEP_ACTIVE` | Generated OpenAPI contract client for Identity core. |
| `services/dsh/frontend/shared/partner/partner.workflow.ts` | `dsh_frontend_shared_brain` | `FALSE_POSITIVE_WITH_PROOF` | Imports are verified safe at runtime. Warning accepted. |
| `services/dsh/frontend/shared/delivery/captain-surface.binding.ts` | `dsh_frontend_shared_brain` | `FALSE_POSITIVE_WITH_PROOF` | Imports are verified safe at runtime. Warning accepted. |
| `services/dsh/frontend/shared/geo/geo.heatmap.types.ts` | `dsh_frontend_shared_brain` | `KEEP_ACTIVE` | Type declarations are used by control-panel operations. |
| `services/dsh/frontend/shared/media/dsh-media-api.client.ts` | `dsh_frontend_shared_brain` | `KEEP_ACTIVE` | Media client used by mobile app upload services. |
| `shared/ui-kit/src/tamagui-config.d.ts` | `toolchain` | `FALSE_POSITIVE_WITH_PROOF` | Double export is required by TS declarations compilation. |
| `shared/ui-kit/src/components/Icon/Icon.d.ts` | `toolchain` | `FALSE_POSITIVE_WITH_PROOF` | Double export is required by TS declarations compilation. |
| `services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx` | `dsh_operator_operations` | `BIND_TO_ROUTE` | Bound to control panel operations command router. |
| `services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx` | `dsh_operator_operations` | `BIND_TO_ROUTE` | Bound to control panel operations live orders router. |

## Constraint Verification

- [x] No deleted or retired file decisions have been marked without import safety proof.
- [x] No items are marked with forbidden placeholder words (TBD, TODO, later, maybe).
