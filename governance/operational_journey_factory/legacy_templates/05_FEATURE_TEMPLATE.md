# Feature Template

<!-- markdownlint-disable MD060 -->

Every feature must be traceable across business meaning, actors, full-stack bindings, affected surfaces, and cleanup candidates.

## Smart Feature-To-Journey Segmentation

Feature grouping must follow the operational outcome and all affected surfaces. A customer order flow, for example, must include what the client triggers, what partner and captain surfaces must show or do, what control-panel tabs and sections expose, and which backend/API/database/runtime/CI bindings support it. The example is not a limit.

| Field | Required value |
|---|---|
| feature_id | Stable identifier |
| business meaning | What the feature means operationally |
| actors | Client, partner, captain, field, support, operations, admin, system, or external provider |
| owner | Service, surface, platform section, WLT, DSH, or shared owner |
| affected surfaces | All surfaces and tabs affected, including read-only views |
| backend operations | Routes, handlers, services, policies, repositories |
| database truth | Tables, migrations, constraints, indexes |
| OpenAPI operations | operationIds and schemas |
| generated client functions | Typed client paths and functions |
| shared controllers | Shared controller or view-model source |
| frontend screens | Screens, pages, sections, tabs, actions |
| control-panel sections | Platform, operations, support, finance, marketing, or other tab ownership |
| mobile runtime entries | App runtime, deep link, reverse, and environment requirements |
| WLT boundary | Financial truth and mutation boundary |
| permission matrix | Actor/action/state permission mapping |
| state machine | Allowed, forbidden, blocked, retry, rollback, and offline states |
| tests | Unit, integration, guard, contract, runtime, or visual checks relevant to the feature |
| runtime smoke | Required only when runtime behavior is changed or claimed |
| performance/a11y/security relevance | Required relevance or justified exclusion |
| cleanup candidates | Files, exports, helpers, duplicated types, or dead paths |
| required actions | Ordered actions before journey execution |
