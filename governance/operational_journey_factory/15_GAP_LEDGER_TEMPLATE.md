# Gap Ledger Template

<!-- markdownlint-disable MD060 -->

The gap ledger is the unified blocker table used before any journey starts.

| gap_id | source_tool | source_path | type | severity | journey | affected_surface | owner | required_action | decision | verification | status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| generated | generated | generated | generated | generated | generated | generated | generated | generated | generated | generated | generated |

## Gap Types

- `UNBOUND_SCREEN`
- `UNBOUND_ROUTE`
- `UNBOUND_SHARED_CONTROLLER`
- `MISSING_OPENAPI_OPERATION`
- `MISSING_BACKEND_ROUTE`
- `MISSING_DATABASE_TRUTH`
- `MISSING_GENERATED_CLIENT`
- `DIRECT_API_IN_SURFACE`
- `BUSINESS_LOGIC_IN_SURFACE`
- `DUPLICATED_TYPE`
- `DUPLICATED_RUNTIME_TRUTH`
- `DEAD_FILE_CANDIDATE`
- `UNCLASSIFIED_KNIP_ITEM`
- `GRAPHIFY_UNRESOLVED_EDGE`
- `LEANCTX_UNRESOLVED_CONTEXT`
- `MISSING_ICON_HANDLER`
- `MISSING_A11Y_LABEL`
- `MISSING_EMPTY_STATE`
- `MISSING_ERROR_STATE`
- `MISSING_BLOCKED_STATE`
- `MISSING_PERMISSION`
- `MISSING_AUDIT`
- `MISSING_ROLLBACK`
- `DSH_WLT_BOUNDARY_VIOLATION`
- `PARTNER_STORE_CONFLATION`
- `STALE_EVIDENCE`
- `RAW_DIAGNOSTIC_TRACKED`
- `CI_NOT_PROVEN`
- `RUNTIME_NOT_PROVEN`
- `SECURITY_NOT_PROVEN`
- `PERFORMANCE_NOT_PROVEN`
- `OBSERVABILITY_NOT_PROVEN`

Every gap must include `source_tool`, `path`, `reason`, `severity`, `suggested_action`, `verification_command`, and `blocks_journey_start`.
