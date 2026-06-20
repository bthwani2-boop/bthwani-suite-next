# Machine-Readable Audit — DSH-001

Audited: 2026-06-20

## File Decisions

| File | Size | Decision | Reason |
|---|---|---|---|
| `slice_execution_master_matrix_v3.csv` | 3.07 MB | KEEP_ACTIVE | Primary source of truth for all slice rows; guard-matrix-v3 validates against it; contains DSH-001 rows (V3-00019 to V3-00028+) |
| `slice_execution_master_matrix.csv` | 2.79 MB | KEEP_EVIDENCE_ONLY | Older v2 matrix; guard-matrix-v3 supersedes; retained for traceability only |
| `dsh_wlt_logic_coverage_matrix.csv` | 478 KB | KEEP_ACTIVE | DSH/WLT boundary rules; referenced by guard-matrix-v3 financial violation check |
| `screen_state_coverage_matrix.csv` | 181 KB | KEEP_ACTIVE | UI state machine rows for all screens; guard validates `screen_journey_ui_loc` rows |
| `extraction_matrix.csv` | 485 KB | KEEP_ACTIVE | Source extraction records; traceable to V3 rows via fragment IDs |
| `control_panel_coverage_matrix.csv` | 72 KB | KEEP_EVIDENCE_ONLY | Control panel is out of scope for DSH-001; relevant to DSH-001B or later |
| `donor_control_panel_alias_matrix.csv` | 1.7 KB | KEEP_EVIDENCE_ONLY | Donor alias mapping; reference only, not executable in DSH-001 |
| `mobile_ux_journey_matrix.csv` | 67 KB | KEEP_ACTIVE | Mobile UX journeys referenced by guard-matrix-v3 `screen_journey_ui_loc` check |

## DSH-001 Rows Verified in Master Matrix v3

Matrix rows V3-00019 to V3-00028+ cover DSH-001. Verified rows:

| Row | target_path | status | blocker_code | decision |
|---|---|---|---|---|
| V3-00019 | `services/dsh/service.manifest.ts` | BLOCKED_NEEDS_API_CONTRACT | MISSING_API_CONTRACT | REWRITE_FROM_SPEC |
| V3-00020 | `services/dsh/domain/store-discovery/store-discovery.types.ts` | BLOCKED_NEEDS_API_CONTRACT | MISSING_API_CONTRACT | REWRITE_FROM_SPEC |
| V3-00021 | `services/dsh/contracts/dsh.openapi.yaml` | BLOCKED_NEEDS_API_CONTRACT | MISSING_API_CONTRACT | REWRITE_FROM_SPEC |
| V3-00022 | `services/dsh/database/migrations/dsh-001_store_discovery.sql` | BLOCKED_NEEDS_API_CONTRACT | MISSING_API_CONTRACT | REWRITE_FROM_SPEC |
| V3-00023 | `services/dsh/backend/store-discovery` | BLOCKED_NEEDS_API_CONTRACT | MISSING_API_CONTRACT | REWRITE_FROM_SPEC |

All DSH-001 rows blocked pending OpenAPI contract — resolved in this slice.

## Findings

- No `preview/demo/mock` content found in any machine-readable file (data is system metadata, not runtime).
- No fake actor IDs in machine-readable CSV files.
- No contradiction with `service.manifest.ts`, `capability-map.ts`, or `surface-map.ts`.
- `slice_execution_master_matrix.csv` (v2) is redundant with v3 but retained for audit trail.
- `control_panel_coverage_matrix.csv` must not be used as DSH-001 implementation input.

## Conclusion

machine-readable is valid as-is for DSH-001. No FIX_REQUIRED_NOW items found.
