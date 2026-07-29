# 17 — مصفوفة الإغلاق النهائي

## قاعدة الادعاء

لا تُكتب `100%` أو `CLOSED_WITH_EVIDENCE` بناءً على نجاح أمر واحد أو عداد Gap يدوي. يجب أن تكون جميع الخانات أدناه صفرًا أو ناجحة على SHA واحد.

## هوية الدليل

```yaml
candidate_sha:
branch:
ci_run_ids: []
runtime_environment:
database_snapshots:
generated_artifact_digests: []
started_at:
completed_at:
```

أي دليل من SHA آخر يرفض.

## 1. الملكية ومصادر الحقيقة

```yaml
unknown_file_ownership: 0
parallel_writable_sources: 0
duplicate_truth_owners: 0
canonical_operation_id_collisions: 0
manual_entry_contract_copies: 0
parallel_state_registries: 0
unbounded_legacy_fallbacks: 0
```

## 2. الهوية والأمن والعزل

```yaml
universal_codes_or_bypass_tokens: 0
sessions_without_valid_authentication: 0
client_supplied_trusted_scope_paths: 0
role_fallback_authorizations: 0
cross_tenant_actor_reuse_paths: 0
unrevoked_sessions_after_suspension: 0
missing_negative_authorization_tests: 0
secret_material_in_git: 0
```

اختبارات إلزامية:

```text
wrong actor
wrong organization
wrong store
wrong tenant when SaaS active
wrong role
missing permission
expired/revoked challenge
replayed code
revoked device/session
```

## 3. العقود والعملاء

```yaml
master_openapi_count: 1
service_entries_missing: 0
openapi_owner_missing: 0
openapi_state_missing: 0
dangling_refs: 0
route_without_contract: 0
contract_without_route: 0
client_without_contract: 0
contract_without_client: 0
manual_generated_clients: 0
generated_provenance_missing: 0
generation_diff: 0
```

## 4. قاعدة البيانات والترحيلات

```yaml
migration_manifest_missing: 0
unregistered_migrations: 0
historical_checksum_drift: 0
new_prefix_collisions: 0
fresh_database_failures: 0
upgrade_database_failures: 0
replay_mutations: 0
partial_failure_ledger_leaks: 0
unknown_backfill_rows: 0
missing_constraints_or_indexes: 0
```

## 5. WLT والماليات

```yaml
financial_mutations_outside_wlt: 0
direct_balance_writes: 0
unbalanced_ledger_transactions: 0
idempotency_failures: 0
duplicate_effects: 0
unknown_provider_results_without_reconciliation: 0
refund_state_drift: 0
settlement_state_drift: 0
payout_state_drift: 0
cod_custody_drift: 0
success_without_financial_readback: 0
```

## 6. DSH والتشغيل

```yaml
parallel_catalog_sources: 0
parallel_order_state_machines: 0
legacy_routes_reachable: 0
unowned_store_or_partner_records: 0
outbox_delivery_gaps: 0
fulfillment_mode_ambiguity: 0
delivery_without_proof_or_exception: 0
success_without_operational_readback: 0
```

## 7. Workforce والإدارة

```yaml
identity_workforce_data_duplication: 0
providers_without_actor_reference: 0
actors_without_required_profile: 0
assignments_without_scope: 0
activation_outside_owning_department: 0
missing_manager_department_employee_journeys: 0
```

## 8. الواجهات والأسطح

```yaml
orphan_screens: 0
orphan_routes_or_tabs: 0
raw_api_calls_in_screens: 0
local_business_rules: 0
local_permission_enums: 0
missing_loading_empty_error_states: 0
missing_offline_or_unknown_result_states: 0
surface_contract_drift: 0
surface_runtime_drift: 0
```

## 9. Runtime والبنية

```yaml
runtime_alias_groups: 0
false_readiness_successes: 0
restart_wrappers_hiding_failure: 0
manual_machine_specific_steps: 0
absolute_runtime_paths: 0
unowned_infrastructure_components: 0
clean_environment_startup_failures: 0
smoke_failures: 0
recovery_failures: 0
```

## 10. الحوكمة والحراس والأدوات

```yaml
validclean_package_state_conflicts: 0
canonical_governance_outside_index: 0
broken_authority_references: 0
conflicting_active_governance_states: 0
unregistered_skills: 0
active_archives: 0
guards_with_parallel_truth: 0
critical_guards_without_mutation_tests: 0
workflows_with_source_write: 0
unpinned_actions: 0
unregistered_tools: 0
one_time_codemods_in_active_tree: 0
```

## 11. الضجيج

```yaml
placeholder_services: 0
unknown_empty_namespaces: 0
stale_root_reports: 0
machine_local_paths_in_docs_or_code: 0
unproven_generated_files: 0
unproven_build_outputs: 0
unowned_script_aliases: 0
files_marked_delete_ready_but_present: 0
```

## 12. رحلة الإغلاق

يجب نجاح رحلات رأسية على البيئة نفسها:

1. إنشاء موظف/مستقل وتفعيله ومنع غير المصرح.
2. إنشاء Partner/Store ونشر Catalog وظهوره للعميل.
3. Checkout وإنشاء طلب وFulfillment حتى Proof/Exception.
4. Payment أو COD ثم Commission/Settlement/Payout/Reconciliation.
5. Suspension/revocation وإثبات منع الوصول.
6. Fresh DB وUpgrade DB وReplay.
7. Clean checkout وRuntime startup وSmoke.

## حالات النهاية

### غير مسموح

```text
READY_FOR_REVIEW
MOSTLY_COMPLETE
PASS_WITH_KNOWN_GAPS
100% EXCEPT CI
```

### مسموح

```text
CLOSED_WITH_EVIDENCE
```

فقط عندما تكون المصفوفة كلها صفرًا، ولا يوجد `BLOCKED` أو `NEEDS_EVIDENCE` يخالف الادعاء.
