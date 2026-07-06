# UI Icon Component Template

<!-- markdownlint-disable MD060 -->

Every visible and interactive UI item in a journey must be classified. A missing button, handler, icon, state, tab, or label is a blocking gap.

| Item | Required evidence |
|---|---|
| every icon | Source, semantic meaning, handler or read-only reason |
| every button | Handler, permission, disabled state, and backend/shared binding |
| every action | Actor, state, API/backend path, audit when relevant |
| every disabled state | Reason, permission, blocked state, and label |
| every loading indicator | Trigger and completion condition |
| every empty state | Data source and action availability |
| every error state | Error mapping and retry path |
| every CTA | Handler and journey outcome |
| every form field | Validation, owner, API schema, and state |
| every validation message | Backend/frontend consistency |
| every card/list/table | Data source, sorting/filtering owner, empty/error behavior |
| every modal/dialog/sheet | Open/close handler and blocked states |
| every nav item/tab/bottom bar item | Route binding and actor visibility |
| source component | ui-kit or justified local owner |
| handler binding | Shared controller, view-model, adapter, backend route |
| accessibility label | Label, role, and a11y guard relevance |
| permission/state visibility | Matrix evidence |
| visual consistency | Design token and UI provider relevance |
| remove/merge/move/keep decision | Cleanup template decision |
