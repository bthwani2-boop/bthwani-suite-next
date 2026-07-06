# Journey Template Master

This master template is used later to create real journey packages. It must not be manually filled before generated inventories and the gap ledger exist.

## Required Imports

- Atomic scope: `02_ATOMIC_SCOPE_TEMPLATE.md`
- File decisions: `03_ATOMIC_FILE_DECISION_TEMPLATE.md`
- Surface inventory: `04_SURFACE_TEMPLATE.md`
- Feature inventory: `05_FEATURE_TEMPLATE.md`
- Backend/API/database: `06_BACKEND_API_DATABASE_TEMPLATE.md`
- Frontend binding: `07_FRONTEND_BINDING_TEMPLATE.md`
- UI/icon/component: `08_UI_ICON_COMPONENT_TEMPLATE.md`
- Permission/state/audit: `09_PERMISSION_STATE_AUDIT_TEMPLATE.md`
- Runtime/docker/env: `10_RUNTIME_DOCKER_ENV_TEMPLATE.md`
- Toolchain: `11_TOOLCHAIN_EXECUTION_TEMPLATE.md`
- Cleanup: `12_CLEANUP_MOVE_MERGE_DELETE_TEMPLATE.md`
- Evidence/closure: `13_EVIDENCE_AND_CLOSURE_TEMPLATE.md`
- Gap ledger: `15_GAP_LEDGER_TEMPLATE.md`

## Journey Start Gate

A journey may start only when all affected surfaces, tabs, routes, buttons, icons, states, permissions, API operations, backend handlers, database truths, generated clients, shared controllers, runtime entries, exports, helpers, tests, guards, workflows, and cleanup decisions are classified.

## Smart Journey Segmentation

The journey unit is a complete business outcome across the unified full-stack multi-surface system. Do not create journeys from a single screen, API operation, route, tab, or file when the real operational outcome crosses client, partner, captain, field, control-panel sections, backend, API, database, runtime, and CI. Split only when the outcome, owner boundary, state machine, WLT financial truth boundary, runtime proof path, or CI proof path differs. Merge when findings belong to the same outcome and state chain.

Single-surface journeys are blocked unless all other surfaces include verified exclusion evidence and verification commands.

## Full-Stack Binding Chain

UI item -> shared controller or view-model -> generated client or API adapter -> OpenAPI operation -> backend route -> handler -> service -> repository or database/config truth -> audit and rollback when relevant.
