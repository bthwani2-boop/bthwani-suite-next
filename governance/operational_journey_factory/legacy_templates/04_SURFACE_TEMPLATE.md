# Surface Template

<!-- markdownlint-disable MD060 -->

Every journey is full-stack and multi-surface by default. A surface can be excluded only with source proof and a verification command.

## Required Surfaces

- `app-client`
- `app-partner`
- `app-captain`
- `app-field`
- `control-panel`
- `control-panel/platform`
- `DSH shared`
- `WLT shared/dsh`
- `backend`
- `database`
- `runtime`
- `CI`

## Required Fields Per Surface

| Field | Required value |
|---|---|
| path | Surface root and entry files |
| entry files | Runtime or route entry files |
| routes | Page, route, backend, and deep-link bindings |
| screens/pages | All screens, pages, panels, tabs, sections, and drawers |
| sections | Control-panel sections and tab ownership |
| owned features | Features the surface owns |
| read-only features | Features the surface consumes without mutation |
| forbidden features | Features the surface must not own |
| shared brain required | Shared controller, view-model, adapter, or domain owner |
| direct API forbidden check | Evidence that surface does not bypass shared binding |
| local business logic forbidden check | Evidence that operational business logic is not local-only |
| state coverage | empty, loading, error, success, blocked, retry, offline, disabled, and degraded |
| permission coverage | actor visibility and backend enforcement |
| icon/component coverage | every icon, button, CTA, form, list, table, card, modal, nav item, and handler |
| verification commands | Smallest commands proving this surface |
| gap decisions | Ledger entries blocking or allowing journey start |

## Order Journey Example Rule

An order journey must classify what happens in app-client, app-partner, app-captain, control-panel operational sections and tabs, backend routing, API contracts, database truth, runtime services, and CI guards. This example is not exhaustive.
