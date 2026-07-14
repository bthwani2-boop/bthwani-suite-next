# Atomic File Decision Template

<!-- markdownlint-disable MD060 -->

Every file, export, helper, route module, generated binding, and shared utility related to a journey must receive a decision before implementation or cleanup.

| Field | Required value |
|---|---|
| file_path | Repo-relative file path |
| file_type | Source, contract, generated client, test, config, guard, script, workflow, migration, or document |
| owner | Service, surface, platform section, WLT, DSH, shared, or CI owner |
| related_journey | Journey identifier or proposed journey |
| imports | Import list and proof source |
| imported_by | Reverse references and proof source |
| exports | Exported symbols and consumers |
| route_binding | Bound route or proof of no route relevance |
| navigation_binding | Navigation entry, tab, section, or proof of no navigation relevance |
| manifest_binding | service manifest evidence |
| runtime_map_binding | runtime map evidence |
| capability_map_binding | capability map evidence |
| OpenAPI_binding | operationId or schema evidence |
| generated_client_binding | generated client function or type |
| test_binding | direct or affected test evidence |
| CI_guard_binding | guard or workflow evidence |
| Graphify_result | dependency and ownership result when used |
| Knip_result | unused export/file result when used |
| duplication_result | duplication result when used |
| direct_api_result | direct API usage result |
| business_logic_location_result | surface-local logic or shared owner result |
| WLT_boundary_result | WLT/DSH ownership result |
| decision | `KEEP_ACTIVE`, `BIND_TO_ROUTE`, `BIND_TO_SHARED`, `MOVE_TO_OWNER`, `MERGE_DUPLICATE`, `SPLIT_REFACTOR`, `RETIRE_DEAD`, `DELETE_AFTER_PROOF`, `FALSE_POSITIVE_WITH_PROOF`, `BLOCKED_NEEDS_EVIDENCE`, or `FIX_REQUIRED` |
| required_action | Concrete next action |
| delete_allowed | `true` only after required delete proof is complete |
| delete_proof_required | Imports, exports, routes, navigation, runtime-map, service.manifest, capability-map, generated clients, tests, and CI/guards |
| verification_command | Smallest command proving the decision |
