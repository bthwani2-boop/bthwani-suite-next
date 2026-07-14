# Atomic Scope Template

<!-- markdownlint-disable MD060 -->

Every atomic item inside a journey scope must be represented. Missing buttons, icons, tabs, handlers, exports, helpers, states, routes, API operations, database truths, or runtime entries are blocking defects.

| Field | Required value |
|---|---|
| atomic_id | Stable generated or journey-scoped identifier |
| type | `APP`, `SURFACE`, `SCREEN`, `PAGE`, `ROUTE`, `NAVIGATION`, `COMPONENT`, `ICON`, `HOOK`, `CONTROLLER`, `VIEW_MODEL`, `ADAPTER`, `API_OPERATION`, `BACKEND_ROUTE`, `HANDLER`, `SERVICE`, `POLICY`, `REPOSITORY`, `TABLE`, `MIGRATION`, `GENERATED_CLIENT`, `TEST`, `GUARD`, `SCRIPT`, `WORKFLOW`, `DOCKER_SERVICE`, `ENV_VAR`, `FEATURE`, `STATE`, `PERMISSION`, `LABEL`, `ERROR_MESSAGE`, `EVIDENCE`, or `CONFIG` |
| path | Repo-relative path or external blocker reference |
| owner | Owning app, service, surface, or team boundary |
| consumers | Files, routes, surfaces, or services consuming it |
| producers | Files, services, APIs, or runtime entries producing it |
| imported_by | Import or reference evidence |
| imports | Dependencies and upstream truth |
| runtime_entry | Runtime path, command, port, or service when relevant |
| journey_ids | Journeys affected by the item |
| current_status | `DISCOVERED`, `UNCLASSIFIED`, `BOUND`, `ORPHANED`, `DUPLICATED`, `BLOCKED_NEEDS_EVIDENCE`, or `FIX_REQUIRED` |
| required_action | `bind`, `move`, `merge`, `split`, `delete_after_proof`, `clean`, `implement`, `test`, `document_external_blocker`, or `keep_with_proof` |
| proof_source | Tool output, source path, or command proving classification |
| verification_command | Smallest command proving the decision |
| final_decision | Decision from file, surface, feature, or closure template |
| blocker | Blocker type, or `none_with_proof` |
