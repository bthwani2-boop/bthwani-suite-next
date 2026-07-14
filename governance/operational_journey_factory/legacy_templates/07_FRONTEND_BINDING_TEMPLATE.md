# Frontend Binding Template

<!-- markdownlint-disable MD060 -->

Every frontend item must bind through the shared and generated API path unless the journey proves a justified exclusion.

| Field | Required value |
|---|---|
| screen/page | Surface screen, page, section, tab, or route |
| route/navigation | Route, navigation binding, deep link, tab, section |
| app runtime entry | App runtime entry and environment path |
| shared controller/view-model | Shared brain path and owner |
| generated client/API adapter | Generated client or adapter path |
| states | empty, loading, error, success, blocked, retry, offline, disabled, degraded |
| permissions | Actor visibility and action rights |
| actor visibility | Which actor sees or cannot see the UI |
| UI component source | ui-kit, surface component, or justified owner |
| icon source | Icon import and semantic action |
| labels/strings | Label source and localization owner when applicable |
| error messages | Error mapping source |
| no direct API | Evidence no surface bypasses shared binding |
| no local business logic | Evidence domain logic is shared or backend-owned |
| no duplicated domain type | Evidence type is generated or shared |
| no raw API mapping | Evidence mapping belongs to adapter/view-model |
| no process.env misuse | Runtime config access is not UI business logic |
| no storage operational logic | Local storage is not source of operational truth |
| live test steps | Runtime test steps required later, without current live-readiness claim |
