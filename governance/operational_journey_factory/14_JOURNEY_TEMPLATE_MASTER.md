# Journey Template Master

This master template is used later to create real journey packages. It must not be manually filled before generated inventories and the gap ledger exist.

## Execution Ledger Sections

All legacy sections (Atomic scope, Surface inventory, Feature inventory, Frontend binding, Backend/API, Runtime, Cleanup, etc.) must now be imported directly into `01_EXECUTION_LEDGER.yaml` as sections. Do not create one file per section.

Journey output owns the files. Each surface is a section inside the journey ledger. Maximum 3 files for the scope.

## Journey Start Gate

A journey may start only when all affected surfaces, tabs, routes, buttons, icons, states, permissions, API operations, backend handlers, database truths, generated clients, shared controllers, runtime entries, exports, helpers, tests, guards, workflows, and cleanup decisions are classified.

## Smart Journey Segmentation

The journey unit is a complete business outcome across the unified full-stack multi-surface system. Do not create journeys from a single screen, API operation, route, tab, or file when the real operational outcome crosses client, partner, captain, field, control-panel sections, backend, API, database, runtime, and CI. Split only when the outcome, owner boundary, state machine, WLT financial truth boundary, runtime proof path, or CI proof path differs. Merge when findings belong to the same outcome and state chain.

Single-surface journeys are blocked unless all other surfaces include verified exclusion evidence and verification commands.

## Full-Stack Binding Chain

UI item -> shared controller or view-model -> generated client or API adapter -> OpenAPI operation -> backend route -> handler -> service -> repository or database/config truth -> audit and rollback when relevant.
