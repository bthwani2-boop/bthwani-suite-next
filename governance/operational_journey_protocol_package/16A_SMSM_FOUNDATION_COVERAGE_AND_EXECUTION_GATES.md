# 16A — FOUNDATION والتغطية الرقمية ومعايير الإغلاق

> **الصفة:** جزء إلزامي من `16_SMSM_EXHAUSTIVE_DSH_WLT_CLOSURE_PLAN.md`، ولا يمثل سلطة مستقلة.
>
> **الحالة الابتدائية:** `FIX_REQUIRED`.

## 1. الغرض

إنشاء خط أساس هندسي وتشغيلي يمنع بدء أي رحلة فوق مستودع غير متقارب، وتحويل مطلب عدم تجاهل أي ملف أو عملية أو شاشة أو زر أو تبويب إلى جرد رقمي قابل للقياس والتدقيق.

## 2. COVERAGE-00 — التغطية الرقمية الكاملة

### 2.1 عناصر الجرد

يُعاد توليد الجرد من أحدث SHA للفرع `smsm` ويشمل:

- ملفات Git المتتبعة، الحزم، Workspaces، tsconfig، project.json، package scripts والاعتماديات.
- OpenAPI files وpaths وoperations وschemas وerrors وsecurity requirements.
- generated bundles/clients/types ومصادر التوليد وhashes.
- backend routes/handlers/middleware/domain commands/queries/state machines/repositories.
- database tables/columns/types/constraints/indexes/triggers/views/functions/migrations/seeds.
- events/outbox/inbox/consumers/jobs/queues/retry/replay/DLQ.
- cache/search/media/provider adapters/webhooks.
- runtime profiles/containers/ports/env/health/readiness/startup/shutdown.
- app entrypoints/pages/screens/routes/deep links/navigation registries.
- tabs/buttons/action icons/forms/modals/sheets/filters/sort/pagination.
- loading/empty/error/blocked/forbidden/offline/conflict/partial/unknown-result.
- tests/workflows/guards/scripts/runbooks/evidence producers.

### 2.2 سجل العنصر

```yaml
coverage_item:
  id: stable_identifier
  kind: file | package | operation | route | handler | domain | db_object | event | job | runtime | screen | control | state | test | workflow | guard
  path:
  symbol_or_operation_id:
  semantic_capability:
  canonical_owner: identity | workforce | platform-control | providers | dsh | wlt | media | notifications | shared-ui
  journey_id:
  slice_ids: []
  required_surfaces: []
  excluded_surfaces:
    - surface:
      reason:
      evidence:
  actor_or_service_identity:
  permissions: []
  trusted_scope: platform | operator | partner | store | area | actor | object
  canonical_write_path:
  canonical_readback_path:
  persistence_or_provider_effect:
  event_or_job_effect:
  positive_test:
  negative_tests: []
  runtime_proof:
  status: UNCLASSIFIED | CLASSIFIED | IN_PROGRESS | NOT_APPLICABLE_WITH_EVIDENCE | CLOSED
  evidence_sha:
```

### 2.3 سجل التحكم المرئي

```yaml
ui_control:
  control_id:
  surface:
  route:
  screen:
  tab_or_section:
  label_or_accessibility_name:
  control_type: button | icon | tab | link | form | modal | sheet | filter | sort | pagination
  visibility_permission:
  enablement_condition:
  confirmation_required:
  command_or_query:
  generated_client_operation:
  backend_handler:
  canonical_owner:
  success_readback:
  error_states: []
  offline_behavior:
  duplicate_click_behavior:
  audit_event:
  positive_test:
  forbidden_test:
  evidence_sha:
```

التحكم بلا أثر حقيقي يصنف `DEAD_CONTROL` ويزال. التحكم الذي يكتب دون عقد وhandler وحقيقة محفوظة يصنف `FALSE_CAPABILITY` ويمنع الإغلاق.

### 2.4 بوابة التغطية

```yaml
unclassified_files: 0
unclassified_packages: 0
unassigned_openapi_operations: 0
unassigned_routes_handlers: 0
unassigned_domain_commands_queries: 0
unassigned_database_objects: 0
unassigned_events_jobs_queues: 0
unassigned_runtime_profiles_env: 0
unassigned_pages_screens_routes: 0
unassigned_tabs_buttons_icons: 0
unassigned_forms_modals_sheets: 0
unassigned_filters_sort_pagination: 0
unassigned_visible_states: 0
unassigned_tests_workflows_guards: 0
controls_without_real_effect: 0
operations_without_consumers_or_verified_internal_use: 0
screens_without_navigation_or_verified_deep_link: 0
required_surfaces_without_readback: 0
```

العنصر غير المقاس لا يسجل صفرًا.

## 3. FOUNDATION-00 — الأقسام ومعايير الإغلاق

### F00-01 — السلطة والمرجع

**التنفيذ:** تثبيت repository/branch/head/base/merge-base وقراءة `authority-precedence.json` و`AGENTS.md` وProduct Truth وplatform model وسجل الرحلات، وتصنيف كل وثيقة إلى authority أو derived support أو historical.

**معيار الإغلاق:** مصدر سلطة واحد لكل قرار؛ صفر تعارض غير محسوم؛ كل Claim مرتبط بالـSHA الحالي؛ الخطط السابقة لا تدعي الإغلاق الحالي.

### F00-02 — تقارب الفرع والـDiff

**التنفيذ:** حصر كل Commit وملف مختلف عن `master`، تصنيف الإضافات والحذف والنقل، إثبات ترحيل المستهلكين، ومنع diagnostic artifacts من العمل كحقيقة حية.

**معيار الإغلاق:** `out_of_scope_diff=0`, `unexplained_deletions=0`, `unmigrated_consumers=0`, `stale_generated_evidence=0`.

### F00-03 — Workspaces والاعتماديات

**التنفيذ:** فحص package names وworkspace globs وexports وproject roots وtsconfig references والدوائر والحزم اليتيمة والاستيرادات الداخلية الممنوعة.

**معيار الإغلاق:** صفر cycle محظور؛ صفر package حي بلا مالك أو مستهلك؛ صفر import عابر للحدود دون contract؛ lockfile متقارب.

### F00-04 — OpenAPI المركزي

**التنفيذ:** تثبيت `contracts/openapi/index.yaml` فهرسًا واحدًا، والتحقق من uniqueness وownership وsecurity وerror envelopes وربط كل operation بhandler ومستهلك أو استخدام داخلي مثبت.

**معيار الإغلاق:** bundle/lint/provenance PASS؛ `duplicate_operation_ids=0`; `unbound_operations=0`; `parallel_contract_indexes=0`.

### F00-05 — العملاء والأنواع المولدة

**التنفيذ:** إعادة التوليد الحتمي، منع التعديل اليدوي، وترحيل المستهلكين إلى generated clients أو adapters مبررة.

**معيار الإغلاق:** generated drift صفر؛ manual generated edits صفر؛ typecheck للمستهلكين PASS؛ provenance مربوط بالمدخلات.

### F00-06 — تاريخ قاعدة البيانات

**التنفيذ:** منع تعديل migration مطبقة، اعتماد forward-only repair، وفحص manifest/checksum/order/collision وتشغيل fresh/upgrade/rerun/interrupted/backup-restore.

**معيار الإغلاق:** جميع مسارات migration PASS؛ collisions صفر؛ schema residue صفر؛ القيود والفهارس توافق invariants؛ rollback/recovery موثق.

### F00-07 — مداخل التطبيقات

**التنفيذ:** تشغيل app-client/app-partner/app-captain/app-field/control-panel، وفحص Metro/Expo/Next/BFF/deep links/navigation registries.

**معيار الإغلاق:** startup وauthenticated-entry وroute-smoke وdeep-link PASS لكل سطح مطلوب؛ unreachable screens صفر؛ stubs-as-proof صفر.

### F00-08 — الحدود المعمارية

**التنفيذ:** تثبيت DSH للتشغيل وWLT للماليات، ومنع business truth وpermission authority داخل surfaces ومنع direct WLT access.

**معيار الإغلاق:** boundary guards PASS؛ browser/mobile network proof يثبت صفر WLT calls؛ local operational/financial/permission truths صفر.

### F00-09 — نقل DSH↔WLT

**التنفيذ:** تحديد facade operations وservice identity وscopes وtimeouts وretry وcorrelation وidempotency وresult lookup والمصالحة.

**معيار الإغلاق:** mutation/readback/timeout/duplicate/unknown-result tests PASS؛ raw provider errors صفر؛ write path واحد.

### F00-10 — Idempotency وCorrelation

**التنفيذ:** stable key وpayload fingerprint وsame-key conflict وcorrelation من السطح حتى DB/provider/event.

**معيار الإغلاق:** replay/concurrency/lookup PASS؛ duplicate persisted effects صفر؛ correlation gaps صفر.

### F00-11 — التفويض الذري

**التنفيذ:** اشتقاق scope من session/service identity، وفحص ownership/state/version داخل transaction في العمليات الحساسة.

**معيار الإغلاق:** cross-partner/store/actor/object وTOCTOU/race tests PASS؛ trusted-client-scope decisions صفر.

### F00-12 — حدود الأخطاء

**التنفيذ:** envelope موحد، mapping صحيح لـHTTP statuses، redaction للـPII/secrets/SQL/provider data.

**معيار الإغلاق:** contract/negative/log-redaction PASS؛ raw internal errors صفر؛ كل خطأ يحمل correlation وretryability صحيحة.

### F00-13 — Runtime baseline

**التنفيذ:** تشغيل identity/workforce/dsh/wlt/providers/media/notifications/databases والمحاكيات المنطبقة، وفحص health/readiness/restart/persistence.

**معيار الإغلاق:** runtime smoke وcross-service readback PASS على SHA نفسه؛ unhealthy required dependency صفر؛ hidden fallback صفر.

### F00-14 — CI والحوكمة التنفيذية

**التنفيذ:** reconcile workflow/guard registries، aggregate fail-closed، immutable diff، generated artifacts clean، وعدم تخطي checks بسبب upstream failure.

**معيار الإغلاق:** required workflows PASS أو `NEEDS_EVIDENCE` صريح؛ skipped-required صفر؛ registry drift صفر؛ CI source mutation صفر.

### F00-15 — Evidence provenance

**التنفيذ:** فصل head-SHA evidence عن merge-compatibility evidence وتسجيل command/exit code/SHA/artifact digest والتحقق النهائي read-only.

**معيار الإغلاق:** stale evidence صفر؛ evidence without SHA صفر؛ final verification لا يغير الملفات.

### F00-16 — سجل الرحلات

**التنفيذ:** ربط J001..J107 بجميع عناصر COVERAGE-00 والأسطح المطلوبة والمستبعدة بالدليل.

**معيار الإغلاق:** `registered_journeys=107`; `unmapped_coverage_items=0`; `journeys_without_surface_decision=0`; كل رحلة تبدأ `NOT_ASSESSED` حتى تنفيذها.

## 4. الشرائح FS-01..FS-18 — معيار إغلاق كل شريحة

لكل رحلة، لا تغلق الشريحة إلا عند تحقق التالي:

1. `FS-01`: Product Truth وactors وpreconditions وoutcome وinvariants معتمدة ومختبرة.
2. `FS-02`: session/device/service identity claims صحيحة ولا يوجد trust للعميل.
3. `FS-03`: permissions/object authorization/scopes واختبارات المنع PASS.
4. `FS-04`: كل route/screen/tab/button/icon/deep-link مسجل ومربوط أو مستبعد بالدليل.
5. `FS-05`: controller/view-model/validation وجميع الحالات المرئية والتعافي مكتملة.
6. `FS-06`: OpenAPI request/response/error/auth/scope/idempotency متقاربة.
7. `FS-07`: generated client/types/provenance بلا drift.
8. `FS-08`: handler/middleware/correlation/error translation مثبتة.
9. `FS-09`: state machine/transitions/guards/versioning/audit واختبارات الانتقالات PASS.
10. `FS-10`: repository/schema/transaction/migration/backfill واختبارات DB PASS.
11. `FS-11`: event/outbox/inbox/job/retry/replay/DLQ واختبارات التكرار والترتيب PASS.
12. `FS-12`: cross-service/provider handoff وunknown-result/reconciliation PASS.
13. `FS-13`: cache/search/media/provider lifecycle وinvalidation/retention PASS.
14. `FS-14`: runtime/docker/env/entrypoints/health/readiness PASS.
15. `FS-15`: readback من كل سطح مطلوب يعكس الحقيقة المحفوظة نفسها.
16. `FS-16`: IDOR/replay/race/partial-failure/offline/recovery PASS.
17. `FS-17`: security/privacy/audit/observability/a11y/RTL/performance gates PASS.
18. `FS-18`: legacy/mocks/fallbacks/duplicates صفر، والأدلة من final SHA.

## 5. معيار إغلاق أي رحلة

```yaml
journey_closure:
  product_truth: PASS
  mapped_coverage_items: ALL
  required_slices: PASS
  unclassified_items: 0
  canonical_write_paths: 1
  parallel_truths: 0
  required_surfaces: PASS
  excluded_surfaces_with_evidence: COMPLETE
  positive_paths: PASS
  negative_authorization_and_isolation: PASS
  concurrency_and_idempotency: PASS
  offline_unknown_result_recovery: PASS
  database_and_migration_when_applicable: PASS
  cross_service_finance_when_applicable: PASS
  runtime_readback: PASS
  observability_and_audit: PASS
  legacy_residue: 0
  failed_required_checks: 0
  evidence_sha: FINAL_SHA
  decision: CLOSED_WITH_EVIDENCE | READY_FOR_REVIEW | NEEDS_EVIDENCE | FIX_REQUIRED | BLOCKED_EXTERNAL
```

لا يسمح بـ`CLOSED_WITH_EVIDENCE` إذا كان أي حقل غير مقاس أو غير منطبق بلا سبب مثبت.