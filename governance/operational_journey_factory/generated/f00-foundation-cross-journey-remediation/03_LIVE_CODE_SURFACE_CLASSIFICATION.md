# 03 Live Code Surface Classification

status: `CLASSIFIED`

## Surface Sovereignty Matrix

This document maps all active codebase surfaces to their respective architectural classification, role, and business domain owners.

| Surface Path | Classification | Role | Domain Owner |
|---|---|---|---|
| `apps/app-client/runtime` | UI Consumer | Client Mobile Application | `dsh_frontend_client_surface` |
| `apps/app-partner/runtime` | UI Consumer | Partner Mobile Application | `dsh_frontend_partner_surface` |
| `apps/app-captain/runtime` | UI Consumer | Captain Mobile Application | `dsh_frontend_captain_surface` |
| `apps/app-field/runtime` | UI Consumer | Field Agent Mobile Application | `dsh_frontend_field_surface` |
| `apps/control-panel/runtime`| UI Consumer | Back-Office Operator Portal | `dsh_operator_operations` |
| `services/dsh/frontend/app-client` | UI Consumer | Client screens & components | `dsh_frontend_client_surface` |
| `services/dsh/frontend/app-partner`| UI Consumer | Partner screens & components | `dsh_frontend_partner_surface` |
| `services/dsh/frontend/app-captain`| UI Consumer | Captain screens & components | `dsh_frontend_captain_surface` |
| `services/dsh/frontend/app-field` | UI Consumer | Field Agent screens & components | `dsh_frontend_field_surface` |
| `services/dsh/frontend/control-panel` | UI Consumer | Back-Office workspaces & frames | `dsh_operator_operations` |
| `services/dsh/frontend/shared` | Shared Brain | DSH frontend adapters & clients | `dsh_frontend_shared_brain` |
| `services/wlt/frontend/shared` | Shared Brain | WLT frontend adapters & client stubs| `wlt_frontend_surface` |
| `shared/ui-kit` | Shared Surface | Core UI Design System Components | `toolchain` |
| `shared/app-shell` | Shared Surface | Common shell routing wrappers | `toolchain` |
| `shared/config` | Shared Surface | Build time variables & env configuration| `toolchain` |
| `services/dsh` | Backend Service | Delivery Services Hub (DSH) Backend | `dsh_operator_operations` |
| `services/wlt` | Backend Service | Wallet Services Hub (WLT) Backend | `dsh_wlt_finance_boundary` |
| `core/identity` | Core Identity | Authentication and Session Core | `dsh_admin_roles_governance` |

## Control Panel Ownership Classifications

For the `services/dsh/frontend/control-panel/` pages and screens:
- **administration/**: `dsh_admin_roles_governance`
- **catalogs/**: `dsh_catalog_governance`
- **finance/**: `dsh_finance_read_proxy_consumer`
- **hr/**: `dsh_hr_governance`
- **operations/**: `dsh_operator_operations`
- **partners/**: `dsh_partner_governance`
- **platform/**: `dsh_platform_configuration`
- **support/**: `dsh_support_incident_operations`

## Sovereignty Constraints

- App surfaces are consumers of platform configurations and shared adapters. Direct API calls are strictly forbidden in screens/pages.
- WLT holds exclusive sovereignty over financial truth. DSH has no mutation rights on WLT data. DSH must only display read-only projections of financial stubs.
