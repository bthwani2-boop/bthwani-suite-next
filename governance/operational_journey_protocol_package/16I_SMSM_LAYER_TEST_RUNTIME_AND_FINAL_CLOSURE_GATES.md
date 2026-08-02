# 16I — معايير إغلاق الطبقات والاختبارات والتشغيل والإغلاق النهائي

> جزء إلزامي من الخطة الرئيسية. لا يغلق قسم أو رحلة أو المنصة إلا وفق البوابات أدناه وعلى SHA نهائي واحد.

## 1. العقود وOpenAPI

### نطاق الفحص

- `contracts/openapi/index.yaml` وجميع عقود Identity/Workforce/Platform Control/Providers/DSH/WLT.
- كل path/operationId/request/response/error/security/scope/idempotency/header/cursor/webhook.
- bundle composition، registry، generated client provenance، compatibility.

### معيار إغلاق القسم

```yaml
canonical_contract_indexes: 1
duplicate_operation_ids: 0
unowned_schemas: 0
unbound_operations: 0
manual_generated_client_edits: 0
contract_bundle_drift: 0
security_requirement_gaps: 0
error_envelope_drift: 0
contract_lint_bundle_generate: PASS
consumer_typecheck: PASS
```

## 2. DSH Backend

### نطاق الفحص

- server registration، middleware order، routes، handlers، authn/authz، validation، state machines، repositories.
- partner/store/catalog/cart/checkout/order/dispatch/delivery/support/finance facade.
- error translation، correlation، idempotency، transactions، events/outbox، cache/search/media/providers.

### معيار إغلاق القسم

```yaml
registered_routes_without_contract: 0
contract_operations_without_handler: 0
handlers_without_domain_owner: 0
parallel_domain_state_machines: 0
trusted_client_scope_decisions: 0
direct_financial_truth_in_dsh: 0
raw_financial_sensitive_fields_in_dsh: 0
untranslated_internal_errors: 0
required_unit_integration_db_tests: PASS
dsh_runtime_smoke: PASS
```

## 3. WLT Backend

### نطاق الفحص

- payment، accounts/wallets، ledger، COD، commissions، obligations، funding، refunds، settlements، destinations، payouts، reconciliation، reports.
- atomic authorization، service identity، provider adapters/webhooks، unknown result، ledger invariants.

### معيار إغلاق القسم

```yaml
financial_truth_outside_wlt: 0
direct_balance_mutations: 0
unbalanced_journals: 0
mutable_posted_entries: 0
duplicate_money_movement_effects: 0
unauthenticated_service_calls: 0
unsigned_or_replayable_webhooks: 0
unreconciled_unknown_results: 0
financial_unit_integration_db_tests: PASS
wlt_runtime_provider_smoke: PASS
```

## 4. DSH Database

### نطاق الفحص

- partner/store/catalog/assortment/cart/order/fulfillment/dispatch/delivery/support/audit/projections/references.
- ownership FKs، uniqueness، check constraints، versions، indexes، cleanup، retention.
- migrations manifest/checksum/fresh/upgrade/rerun/interruption/restore.

### معيار إغلاق القسم

```yaml
modified_applied_migrations: 0
migration_manifest_collisions: 0
store_without_partner: 0
orphan_catalog_assortment_refs: 0
orphan_order_fulfillment_refs: 0
raw_bank_columns_or_values: 0
dead_writable_tables: 0
missing_critical_constraints_indexes: 0
fresh_upgrade_rerun_restore: PASS
database_contract_tests: PASS
```

## 5. WLT Database

### نطاق الفحص

- accounts/journals/entries/payment/COD/commission/obligation/refund/settlement/payout/reconciliation/provider records.
- immutability، double-entry، source uniqueness، idempotency، encrypted/masked destinations، effective policies.

### معيار إغلاق القسم

```yaml
unbalanced_financial_data: 0
duplicate_source_financial_records: 0
raw_unprotected_destination_data: 0
mutable_ledger_history: 0
orphan_provider_or_reconciliation_refs: 0
historical_migration_rewrite: 0
fresh_upgrade_rerun_restore: PASS
ledger_reconciliation_tests: PASS
```

## 6. Events وJobs وCache وSearch

### معيار إغلاق القسم

```yaml
writes_missing_required_outbox: 0
unversioned_events: 0
unowned_consumers: 0
non_idempotent_consumers: 0
lost_or_stuck_required_jobs: 0
unowned_dlq_messages: 0
cache_or_search_as_writable_truth: 0
cross_scope_cache_keys: 0
replay_rebuild_reconciliation: PASS
failure_recovery_runtime: PASS
```

## 7. Media وProviders وNotifications

### معيار إغلاق القسم

```yaml
unscanned_active_media: 0
orphan_media_files_or_links: 0
public_permanent_sensitive_urls: 0
provider_credentials_in_source_or_client: 0
unbounded_provider_calls: 0
unsigned_webhooks: 0
notification_cross_actor_leakage: 0
notification_duplicate_delivery_effects: 0
provider_media_notification_failure_recovery: PASS
```

## 8. Runtime وDocker وExpo وNext/BFF

### النطاق

- Identity/Workforce/DSH/WLT/Providers/Media/Notifications/DB ومحاكيات المزودين المنطبقة.
- app-client/app-partner/app-captain/app-field/control-panel.
- compose profiles، ports، env validation، startup dependencies، health/readiness، graceful shutdown، restart، persistence.
- Expo/Metro export/dev-client/deep links وNext BFF/session/cookies/CSRF.

### معيار إغلاق القسم

```yaml
required_services_started: PASS
health_readiness: PASS
migration_bootstrap: PASS
cross_service_smoke: PASS
all_runtime_shells_started: PASS
mobile_export_and_entrypoints: PASS
control_panel_routes_bff_session: PASS
hidden_local_dependencies: 0
unsafe_default_secrets_outside_local: 0
port_or_profile_conflicts: 0
```

## 9. الأمن والخصوصية والعزل

### مصفوفة الاختبار الإلزامية

- unauthenticated وexpired/revoked session.
- role/permission denial.
- cross-operator/partner/store/area/actor/object IDOR.
- SQL/command/template injection، SSRF، path traversal، file abuse.
- rate limit/brute force/replay/idempotency abuse.
- secret/PII exposure في responses/logs/traces/exports/cache.
- encryption/masking/retention/delete/consent.
- service identity least privilege وTOCTOU.

### معيار إغلاق القسم

```yaml
open_p0_security_findings: 0
open_p1_security_findings: 0
authentication_bypasses: 0
authorization_isolation_failures: 0
secrets_or_pii_leaks: 0
unsafe_file_or_ssrf_paths: 0
service_identity_overprivilege: 0
privacy_retention_delete_tests: PASS
negative_security_matrix: PASS
```

## 10. الوصولية وRTL والأداء

### معيار إغلاق القسم

```yaml
interactive_controls_without_accessible_name: 0
critical_keyboard_focus_failures: 0
critical_contrast_failures: 0
untranslated_user_visible_strings: 0
rtl_layout_navigation_failures: 0
large_text_blocking_failures: 0
critical_performance_budget_failures: 0
slow_network_recovery_failures: 0
required_visual_and_device_checks: PASS
```

## 11. مصفوفة الاختبارات حسب نوع التغيير

| نوع التغيير | الاختبارات الدنيا |
|---|---|
| Product/state | Product Truth + transition table + positive/negative allowedActions |
| Contract | compose + lint + registry + generate + handler/consumer binding |
| Backend | unit + integration + authz/isolation + error/correlation |
| Database | fresh + upgrade + rerun + interruption + restore + constraint/concurrency |
| Financial | ledger invariants + idempotency + provider unknown-result + reconciliation + independent evidence |
| Event/job | duplicate + order + crash/retry + replay + DLQ |
| Surface | route/navigation + every control + visible states + runtime readback + a11y/RTL |
| Runtime | cold start + health/readiness + dependency loss/recovery + restart/persistence |
| Security/privacy | threat-specific negative tests + leak scans + retention/delete |
| Cleanup | reference search + consumer migration + runtime reachability + zero residue |

نجاح Typecheck أو Build وحده لا يغلق أي نوع.

## 12. سيناريو التكامل الإيجابي النهائي

```text
1. Provision actor and workforce profile.
2. Activate/login/session/device.
3. Create partner and complete onboarding.
4. Create store, service area, readiness and publication.
5. Assign partner users, field agents and captains.
6. Create taxonomy/master product/media.
7. Submit/review catalog proposal.
8. Activate assortment, price and availability.
9. Customer profile/address/serviceability/discovery.
10. Cart, pricing, promotion and checkout.
11. Electronic payment or COD session through DSH facade.
12. Idempotent order creation and cross-surface readback.
13. Partner accept and prepare; handle issue/substitution if selected.
14. Dispatch eligibility, offer, assignment and pickup.
15. Live tracking, delivery attempt and proof.
16. WLT payment/COD/ledger/commission/obligation.
17. Settlement, payout and reconciliation where eligible.
18. Support/notification/audit/analytics readback.
19. Verify every required surface reflects the same canonical state.
```

### معيار إغلاق السيناريو

- كل خطوة مرتبطة بـcorrelation واحد أو lineage مثبت.
- كل mutation قابلة لإعادة الطلب دون أثر مكرر.
- كل Surface مطلوب يعرض الحالة المحفوظة نفسها.
- DSH/WLT boundaries مثبتة بالشبكة والبيانات.
- لا fixture/mock/manual DB edit.

## 13. السيناريوهات السلبية والتعافي النهائية

يجب تشغيل ما ينطبق من:

1. invalid/expired/revoked identity and session.
2. cross-partner/store/actor/object attempts.
3. duplicate clicks/retries/events/webhooks/jobs.
4. stale version and concurrent decisions.
5. store/product/price/availability changes during checkout.
6. payment/provider timeout ثم late success.
7. DB commit قبل فقد الاستجابة وresult lookup.
8. partner timeout/rejection/preparation issue.
9. no captain/offer expiry/reassignment race.
10. location spoof/offline execution/proof upload interruption.
11. cancellation/refund/return races.
12. COD mismatch/custody break.
13. settlement/payout unknown result.
14. cache/search stale or unavailable.
15. media/provider/notification failure.
16. service restart، queue replay، DB restore.

### معيار الإغلاق

```yaml
negative_scenarios_executed: ALL_APPLICABLE
unexpected_successes: 0
duplicate_persisted_effects: 0
silent_data_loss: 0
silent_fallbacks: 0
unrecoverable_unknown_results: 0
cross_scope_exposure: 0
recovery_readback: PASS
```

## 14. التنظيف الجذري

### التصنيف قبل الحذف

`KEEP | MERGE | MOVE | REBUILD | MIGRATE_THEN_DELETE | DELETE_DEAD | BLOCKED_NEEDS_EVIDENCE`.

### يشمل البحث

- duplicate plans/authorities/contracts/types/enums/clients/transports/controllers/state machines.
- legacy routes/handlers/tables/migrations compatibility/fallbacks.
- mocks/fixtures/seeds reachable in runtime.
- dead screens/buttons/tabs/navigation/pages.
- unused packages/scripts/guards/workflows/diagnostics.
- SaaS/tenant residues مع الحفاظ على subscription/commission التجارية الصحيحة.

### معيار إغلاق القسم

```yaml
parallel_truth_sources: 0
parallel_writable_sources: 0
legacy_runtime_routes: 0
legacy_read_write_fallbacks: 0
runtime_reachable_mocks_fixtures: 0
dead_controls_navigation: 0
orphan_files_packages_tables: 0
duplicate_active_governance_plans: 0
unclassified_cleanup_candidates: 0
post_cleanup_contract_build_runtime_checks: PASS
```

## 15. استراتيجية التنفيذ والـGit

```text
PIN → DIAGNOSE → FIX OWNER → VERIFY UNIT → REVIEW DIFF
→ COMMIT ATOMICALLY → PUSH → RE-PIN → CONTINUE
```

- commit واحد لكل وحدة منطقية مكتملة.
- push بعد كل Commit متحقق وفق طلب المستخدم الحالي.
- لا `git add .` ولا خلط إصلاحات مستقلة.
- لا force push/reset/merge/release/production.
- إذا تحرك الفرع، توقف الكتابة وأعد التثبيت والمقارنة.

## 16. دليل إغلاق كل قسم

```yaml
section_evidence:
  section_id:
  initial_sha:
  final_sha:
  inventory_counts_before:
  inventory_counts_after:
  findings_and_root_causes:
  changed_paths:
  contracts_and_clients:
  database_migrations_and_backfill:
  backend_and_runtime_effect:
  affected_surfaces_and_controls:
  positive_negative_recovery_tests:
  commands_exit_codes:
  workflow_runs_artifact_digests:
  zero_counters:
  approvals:
  remaining_items:
  decision:
```

## 17. بوابة الإغلاق النهائية

```yaml
coverage_00: PASS
foundation_00_sections_closed: 16
journeys_registered: 107
journeys_closed_with_evidence: 107
open_journeys: 0
open_slices: 0
unmapped_coverage_items: 0
unmapped_surface_controls_states: 0
all_layer_gates: PASS
all_required_surfaces_runtime_readback: PASS
dsh_operational_truth_single_owner: PASS
wlt_financial_truth_single_owner: PASS
dsh_facade_only: PASS
fresh_upgrade_rerun_restore: PASS
positive_integrated_scenario: PASS
negative_recovery_scenarios: PASS
security_privacy_isolation: PASS
accessibility_rtl_performance: PASS
zero_residue_cleanup: PASS
required_ci_workflows: PASS
head_sha_evidence: PASS
merge_compatibility_evidence: PASS
required_independent_approvals: PASS
remaining_internal_findings: 0
remaining_unproven_required_items: 0
out_of_scope_diff: 0
final_verification_mutated_source: false
```

القرار الوحيد عند نجاح جميع الحقول هو `CLOSED_WITH_EVIDENCE`. أي فشل داخلي ينتج `FIX_REQUIRED`، وأي دليل مفقود ينتج `NEEDS_EVIDENCE`، وأي مانع خارجي مثبت ينتج `BLOCKED_EXTERNAL`.