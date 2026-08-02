# الخطة التنفيذية الشاملة والمفصلة لإغلاق DSH وما يرتبط به في WLT

> **المستودع:** `bthwani2-boop/bthwani-suite-next`
>
> **فرع التنفيذ:** `smsm`
>
> **الصفة:** `DERIVED_SUPPORT_ARTIFACT / EXECUTION_PLAN_PACKAGE`
>
> **الحالة التنفيذية:** `FIX_REQUIRED`
>
> **قاعدة الادعاء:** اكتمال هذه الوثائق لا يعني إغلاق المنصة. الإغلاق لا يصدر إلا بعد تنفيذها على الكود الحي ونجاح جميع الأدلة المنطبقة على SHA نهائي واحد.

## 1. سبب إعادة البناء

النسخة الأولى من هذه الخطة كانت تحتوي فهرسًا من `J001..J107`، لكنها لم تقدم لكل رحلة تفاصيل الهدف والمالك والحالات والأسطح والبيانات والعقود والاختبارات ومعيار الإغلاق. أُعيد بناء الخطة كحزمة واحدة مترابطة، بحيث لا تبقى رحلة أو طبقة أو Surface عنوانًا مجردًا.

الخطة الحالية:

- تفصل FOUNDATION عن الرحلات.
- تعرّف تغطية رقمية لكل ملف وعملية وتحكم مرئي.
- تفصل كل رحلة إلى هدف وملكية وحالات وأسـطح وبيانات واختبارات وبوابة خروج.
- تضيف معيار إغلاق لكل Surface ولكل طبقة هندسية.
- تضيف السيناريو الإيجابي والسيناريوهات السلبية والتعافي.
- تمنع اعتبار Build أو Typecheck أو قائمة عناوين دليل إغلاق.

## 2. حالة المرجع

```yaml
repository: bthwani2-boop/bthwani-suite-next
work_branch: smsm
base_branch: master
pinned_head_before_master_plan_rewrite: 315f9ae15674cccf660e6f5eb5a958e165a8af09
force_push: forbidden
history_rewrite: forbidden
automatic_branch: forbidden
automatic_pr: forbidden
merge: forbidden_without_explicit_authorization
release: forbidden_without_explicit_authorization
production: forbidden_without_explicit_authorization
current_decision: FIX_REQUIRED
```

يُعاد تثبيت رأس `smsm`:

1. قبل التشخيص.
2. قبل كل دفعة كتابة.
3. قبل كل Commit.
4. بعد كل Push.
5. قبل فتح أو إغلاق أي شريحة أو رحلة أو قسم.
6. قبل التحقق النهائي والقرار.

## 3. وحدة الخطة وسلطتها

هذه الملفات تمثل **خطة واحدة** ولا يجوز تنفيذ ملف وترك بقية الملفات:

1. `16_SMSM_EXHAUSTIVE_DSH_WLT_CLOSURE_PLAN.md` — الفهرس الحاكم وترتيب التنفيذ.
2. `16A_SMSM_FOUNDATION_COVERAGE_AND_EXECUTION_GATES.md` — التغطية الرقمية وFOUNDATION ومعيار إغلاق كل شريحة ورحلة.
3. `16B_SMSM_J001_J019_IDENTITY_WORKFORCE_PLATFORM_PROVIDERS.md` — الهوية والجلسات والموارد البشرية والسياسات والمزودون.
4. `16C_SMSM_J020_J040_PARTNER_STORE_CATALOG_MARKETING.md` — الشريك والمتجر والكتالوج والتسويق.
5. `16D_SMSM_J041_J055_CUSTOMER_CART_CHECKOUT_ORDER.md` — العميل والعناوين والاكتشاف والسلة وCheckout والطلب.
6. `16E_SMSM_J056_J078_FULFILLMENT_DELIVERY_SUPPORT.md` — التجهيز والإسناد والتوصيل والدعم والإشعارات والتحليلات.
7. `16F_SMSM_J079_J094_FINANCIAL_CLOSURE.md` — DSH Finance Facade وWLT والدفع والدفتر وCOD والعمولات والتسويات والصرف والمصالحة.
8. `16G_SMSM_J095_J107_CROSS_CUTTING_FINAL_CLOSURE.md` — idempotency والأحداث والوظائف وoffline والأمن والتشغيل والاستعادة والحوكمة.
9. `16H_SMSM_SURFACE_CONTROL_AND_STATE_CLOSURE_MATRIX.md` — كل Surface وصفحة وشاشة وتبويب وزر وأيقونة وحالة مرئية.
10. `16I_SMSM_LAYER_TEST_RUNTIME_AND_FINAL_CLOSURE_GATES.md` — معايير إغلاق العقود والباك إند وقواعد البيانات والـRuntime والاختبارات والتنظيف والقرار النهائي.

بالنسبة لتخطيط إغلاق DSH/WLT على `smsm`، تمثل الحزمة `16 + 16A..16I` المرجع التنفيذي الحالي. الخطتان `14_FULL_SURFACE_CLOSURE_PLAN.md` و`15_AUTHORITATIVE_DSH_WLT_FULLSTACK_CLOSURE_PLAN.md` مراجع تخطيط تاريخية ولا تثبتان الحالة الحالية ولا تستخدمان بالتوازي مع هذه الحزمة.

## 4. الحقيقة الحاكمة للمنصة

```text
BThwani = Unified Multi-Surface B2B2C Commerce, Fulfillment and Financial Platform.
DSH = المالك الوحيد للحقيقة التشغيلية.
WLT = المالك الوحيد للحقيقة المالية.
Identity = المالك الوحيد للمصادقة والجلسات والأدوار والصلاحيات وهوية الخدمات.
Workforce = المالك الوحيد للملف المهني والتكليف والجاهزية.
Platform Control = المالك الوحيد للتغييرات السيادية والسياسات والـRollout.
Providers = المالك الوحيد لسجل المزودين وسياسات الاتصال ومراجع الأسرار.
Media = المالك الوحيد للملفات وmetadata والمسح والاحتفاظ.
Surfaces = عرض وإدخال وتركيب؛ لا تملك حقيقة تشغيلية أو مالية أو صلاحيات.
```

القواعد غير القابلة للتجاوز:

- Partner وStore نطاقات أعمال وصلاحية، وليسا Tenant أو منصة مستقلة.
- `COMMISSION | SUBSCRIPTION | HYBRID | OPERATOR_MANAGED` نماذج تجارية ولا تنشئ SaaS.
- كل Store يتبع Partner واحدًا.
- IDs القادمة من العميل محددات موارد وليست مصدر سلطة.
- كل Surface مالي يستخدم DSH facade فقط؛ لا استدعاء WLT مباشر.
- DSH لا يحتفظ برصيد أو Ledger أو عمولة أو تسوية أو تفاصيل بنكية خام.
- المصدر المركزي للعقود هو `contracts/openapi/index.yaml`؛ يمنع إحياء index موازٍ.

## 5. نطاق المستودع الملزم

يشمل النطاق كل ما يثبت ارتباطه بـDSH أو بحدوده مع WLT، وبالأخص:

```text
AGENTS.md
governance/authority
governance/product
governance/policies
governance/contracts
governance/guards
governance/github
governance/operational_journey_protocol_package
contracts/openapi
core/identity
core/workforce
core/platform-control
core/providers
services/dsh/backend
services/dsh/contracts
services/dsh/database
services/dsh/frontend/shared
services/dsh/frontend/app-client
services/dsh/frontend/app-partner
services/dsh/frontend/app-captain
services/dsh/frontend/app-field
services/dsh/frontend/control-panel
services/wlt/backend
services/wlt/contracts
services/wlt/database
services/wlt/frontend/shared/dsh
apps/app-client/runtime
apps/app-partner/runtime
apps/app-captain/runtime
apps/app-field/runtime
apps/control-panel/runtime
apps/mobile
shared/ui-kit
infra/docker
tools/scripts
tools/guards
.github/workflows
```

لا يعني ذلك فحصًا عشوائيًا لكل المستودع؛ يبدأ العمل بالرحلة المفتوحة ويتوسع إلى كل مالك ومستهلك واعتماد يحتاجه إغلاقها، بينما يستخدم `COVERAGE-00` لمنع بقاء عنصر غير مصنف.

## 6. التغطية الرقمية بدل الذاكرة

تفاصيل `COVERAGE-00` موجودة في `16A`. الحد الأدنى للحكم:

```yaml
unclassified_files: 0
unassigned_openapi_operations: 0
unassigned_routes_handlers: 0
unassigned_database_objects: 0
unassigned_events_jobs_queues: 0
unassigned_runtime_profiles_env: 0
unassigned_pages_screens_routes: 0
unassigned_tabs_buttons_icons: 0
unassigned_forms_modals_sheets: 0
unassigned_visible_states: 0
unassigned_tests_workflows_guards: 0
controls_without_real_effect: 0
required_surfaces_without_readback: 0
```

لا تسجل قيمة صفر لعنصر لم يُقَس على SHA النهائي.

## 7. الشرائح الرأسية الإلزامية داخل كل رحلة

كل رحلة تنفذ حسب `FS-01..FS-18` المفصلة في `16A`:

```text
FS-01 Product Truth and invariants
FS-02 Identity/session/device/service identity
FS-03 Permissions/trusted scope/object authorization
FS-04 Routes/screens/tabs/buttons/icons/navigation
FS-05 Controllers/view-models/visible states/offline
FS-06 OpenAPI contract
FS-07 Generated clients
FS-08 Backend handler/middleware/errors
FS-09 Domain state machine
FS-10 Database/transaction/migration
FS-11 Events/outbox/jobs
FS-12 DSH-WLT/provider handoff
FS-13 Cache/search/media/providers
FS-14 Runtime/Docker/entrypoints
FS-15 Cross-surface readback
FS-16 Negative/concurrency/recovery
FS-17 Security/privacy/a11y/RTL/performance/observability
FS-18 Cleanup/zero residue/same-SHA evidence
```

لا تنتقل شريحة قبل إغلاق سابقتها، ولا تنتقل رحلة قبل إغلاق كل شرائحها المنطبقة.

## 8. ترتيب التنفيذ الإلزامي

### المرحلة 0 — COVERAGE-00 وFOUNDATION-00

تنفذ الأقسام `F00-01..F00-16` في `16A`. يمنع بدء رحلة مجال قبل نجاح بوابة FOUNDATION، باستثناء الإصلاحات اللازمة لجعل FOUNDATION خضراء.

### المرحلة 1 — الهوية والموارد والسياسات والمزودون

`J001..J019` وفق `16B`.

### المرحلة 2 — الشريك والمتجر والكتالوج والتسويق

`J020..J040` وفق `16C`.

### المرحلة 3 — العميل والسلة وCheckout والطلب

`J041..J055` وفق `16D`.

### المرحلة 4 — التجهيز والإسناد والتوصيل والدعم

`J056..J078` وفق `16E`.

### المرحلة 5 — الماليات

`J079..J094` وفق `16F`، مع تطبيق استقلال الأدلة المالية وعدم السماح لـDSH أو الأسطح بامتلاك الحقيقة.

### المرحلة 6 — الموثوقية والأمن والتشغيل والإغلاق

`J095..J107` وفق `16G`، بالتوازي كتطبيق عرضي على الرحلات السابقة ثم كإغلاق نهائي.

### المرحلة 7 — إغلاق الأسطح والطبقات والسيناريو المتكامل

`16H` ثم `16I`، مع إعادة توليد الجرد على SHA النهائي وتشغيل السيناريوهات الإيجابية والسلبية والتعافي.

## 9. معيار إغلاق كل رحلة

كل رحلة في `16B..16G` تحتوي معيارها الخاص، ويضاف إليه المعيار العام:

```yaml
product_truth: PASS
mapped_coverage_items: ALL
required_slices: PASS
unclassified_items: 0
canonical_write_paths: 1
parallel_truth_sources: 0
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
```

القرارات المسموحة:

```text
CLOSED_WITH_EVIDENCE
READY_FOR_REVIEW
NEEDS_EVIDENCE
BLOCKED_EXTERNAL
FIX_REQUIRED
PROTOCOL_VIOLATION
```

## 10. معيار إغلاق كل Surface

يطبق `16H` على:

- app-client.
- app-partner.
- app-captain.
- app-field.
- Control Panel.
- DSH Shared Brain.
- WLT frontend/shared/dsh.
- Runtime shells.
- shared/ui-kit.
- أي webapp/website/mobile path يصنف Active.

لا يغلق السطح قبل ربط كل Route/Screen/Tab/Button/Icon/Form/Modal/Sheet/Filter/Sort/Pagination وحالاته المرئية بالرحلة والعقد والأثر والـreadback.

## 11. معيار إغلاق كل طبقة

يطبق `16I` على:

- العقود والعملاء المولدين.
- DSH Backend وDatabase.
- WLT Backend وDatabase.
- Events/Jobs/Cache/Search.
- Media/Providers/Notifications.
- Runtime/Docker/Expo/Next/BFF.
- Security/Privacy/Isolation.
- Accessibility/RTL/Performance.
- Tests/Cleanup/Evidence.

نجاح فحص ساكن واحد لا يغلق الطبقة.

## 12. قاعدة المعالجة الجذرية

لكل Finding:

1. إثبات الحقيقة الخاطئة أو المفقودة.
2. تحديد مالك الحقيقة القانوني.
3. تتبع كل writers/readers/consumers.
4. تحديد السبب الجذري لا العرض.
5. إصلاح المالك الحاكم.
6. ترحيل البيانات والمستهلكين.
7. إيقاف الكتابات المتوازية.
8. إزالة fallback/legacy/residue بعد إثبات الانتقال.
9. إضافة اختبار يمنع رجوع السبب.
10. إثبات Runtime/readback.

يسمح بإعادة البناء أو النقل أو الدمج أو الحذف عندما يكون التصميم الأساسي فاسدًا، لكن لا يحذف عنصر قبل تحليل استخدامه واعتمادياته وترحيله.

## 13. الحلقة التنفيذية

```text
PIN
→ READ AUTHORITY
→ REGENERATE COVERAGE
→ OPEN ONE JOURNEY AND ONE SLICE
→ DIAGNOSE ROOT CAUSE
→ FIX CANONICAL OWNER
→ COMPLETE CONTRACT/BACKEND/DB/SHARED-BRAIN/SURFACES
→ MIGRATE DATA AND CONSUMERS
→ REMOVE PARALLEL WRITES AND FALLBACKS
→ RUN TARGETED AND NEGATIVE TESTS
→ RUN RUNTIME READBACK
→ REVIEW DIFF
→ COMMIT ATOMICALLY
→ PUSH
→ RE-PIN
→ CLOSE SLICE
→ CONTINUE
→ READ-ONLY FINAL VERIFICATION
```

## 14. استراتيجية Git

```yaml
commit: ATOMIC_LOGICAL_UNITS
push: AFTER_EACH_VERIFIED_COMMIT
force_push: false
reset_over_newer_work: false
automatic_branch: false
automatic_pr: false
merge_to_master: false
release: false
production: false
```

إذا تحرك الفرع، توقف الكتابة وأعد التثبيت والمقارنة والمزامنة بأمان.

## 15. بوابة البقايا الصفرية

```yaml
parallel_truth_sources: 0
parallel_writable_sources: 0
duplicate_contract_indexes: 0
duplicate_active_operations: 0
duplicate_domain_enums: 0
manual_generated_types: 0
local_permission_authorities: 0
local_financial_calculations: 0
local_catalog_truths: 0
raw_surface_api_calls: 0
direct_surface_wlt_calls: 0
public_wlt_environment_variables: 0
silent_scope_or_context_fallbacks: 0
runtime_reachable_mocks: 0
runtime_fixtures_as_truth: 0
legacy_runtime_paths: 0
legacy_read_write_fallbacks: 0
modified_applied_migrations: 0
unmanifested_migration_collisions: 0
unclassified_coverage_items: 0
unassigned_controls: 0
open_slices: 0
open_journeys: 0
failed_required_checks: 0
skipped_due_to_upstream_failure: 0
unproven_required_behavior: 0
out_of_scope_diff: 0
```

## 16. بوابة الإغلاق النهائية

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

## 17. الحالة الحالية

```yaml
plan_package_rebuilt: true
foundation_executed: false
journeys_executed: false
surfaces_runtime_verified: false
layer_gates_executed: false
ci_evidence_on_final_plan_sha: pending
current_decision: FIX_REQUIRED
```

هذه الحزمة أمر إغلاق تفصيلي، وليست إعلانًا بأن الإغلاق نُفذ.