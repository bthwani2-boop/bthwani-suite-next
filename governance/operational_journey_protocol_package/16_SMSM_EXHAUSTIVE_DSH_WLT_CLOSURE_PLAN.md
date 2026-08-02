# الخطة التنفيذية المرجعية ذات التغطية الرقمية لإغلاق DSH وما يرتبط به في WLT

> **الفرع الحاكم:** `smsm`
>
> **حالة الوثيقة:** `DERIVED_SUPPORT_ARTIFACT / EXECUTION_PLAN`
>
> **الحالة التنفيذية عند الإنشاء:** `FIX_REQUIRED`
>
> هذه الوثيقة لا تثبت إغلاق المنصة. الإغلاق لا يصدر إلا من كود حي وعقود وقواعد بيانات وRuntime وأدلة مرتبطة بالـSHA النهائي نفسه.

## 0. مرجع التنفيذ

```yaml
repository: bthwani2-boop/bthwani-suite-next
work_branch: smsm
pinned_head_at_plan_creation: 583377098a8f98943c82ac7613b34b8f30a1d63f
base_branch: master
base_sha_at_plan_creation: d27791729eb8ab21b05ce0e88bb39769c92cc33e
branch_ahead_by_at_plan_creation: 64
branch_behind_by_at_plan_creation: 0
pull_request_at_plan_creation: NONE_FOUND
head_workflow_runs_at_plan_creation: 0
head_combined_statuses_at_plan_creation: 0
force_push: forbidden
history_rewrite: forbidden
automatic_branch: forbidden
automatic_pr: forbidden
merge: forbidden_without_explicit_authorization
release: forbidden_without_explicit_authorization
production: forbidden_without_explicit_authorization
```

يُعاد تثبيت `smsm` قبل التشخيص، وقبل كل دفعة كتابة، وقبل كل Commit، وبعد كل Push، وقبل فتح أو إغلاق أي شريحة أو رحلة، وقبل التحقق النهائي.

## 1. تشخيص المرفقات المدمجة

1. `Pasted text(199).txt` خطة واسعة تحتوي 43 رحلة وشرائح كثيرة، لكنها مثبتة على `ala` ولا ترتبط رقميًا بكل عمليات وعناصر فرع `smsm`.
2. `Pasted text (2)(19).txt` نسخة مطابقة تمامًا للملف السابق؛ الاحتفاظ بهما كمرجعين حاكمين يخلق تكرار سلطة.
3. `Pasted text (3)(3).txt` ملحق للفجوات يعيد استخدام أرقام رحلات `35..41` بمعانٍ مختلفة عن الخطة الأساسية، فينشئ تعارض هوية الرحلات، كما أن حقائقه مثبتة على SHA قديم.
4. `# الخطة النهائية لإغلاق منصة BThwan(2).txt` خطة أقدم على `validclean` وتجمع المنصة في سبع رحلات عريضة لا تكفي لتغطية كل عملية وسطح وتحكم.
5. `BThwani-final-closure-execution-plan(2).md` نسخة مبتورة بنيويًا: تتوقف عند `35.10 Short-lived read URL` وبها سياج Markdown غير مغلق؛ لا تصلح مرجعًا نهائيًا.
6. `BThwani-unified-execution-command-final-authoritative(4).md` أمر تنفيذي عام وقوي، لكنه ليس خطة مستودع مخصصة، ويحتوي مراجع تاريخية مثل `contracts/master.openapi.yaml` الذي لم يعد موجودًا في `smsm`.

القرار: تحفظ المعاني الصحيحة، يدمج التكرار، تزال التعارضات، ولا تعامل أي نسخة مرفقة أو خطة قديمة بوصفها مصدر حالة تنفيذية حيًا.

## 2. الحقيقة الحاكمة

```text
BThwani = Unified Multi-Surface B2B2C Commerce, Fulfillment and Financial Platform.
DSH = المالك الوحيد للحقيقة التشغيلية.
WLT = المالك الوحيد للحقيقة المالية.
Surfaces = عرض وإدخال وتركيب فقط.
Financial access from DSH surfaces = DSH_FACADE_ONLY.
Partner/Store = نطاقات أعمال وصلاحية، وليسا Tenant أو منصة مستقلة.
```

`subscription` و`commission` و`hybrid` نماذج تجارية فقط ولا تنشئ SaaS أو Tenant architecture.

المصدر المركزي للعقود في `smsm` هو:

```text
contracts/openapi/index.yaml
```

ويمنع إحياء `contracts/master.openapi.yaml` كمصدر موازٍ.

## 3. قاعدة التغطية الرقمية COVERAGE-00

لا يمكن ضمان عدم تجاهل زر أو تبويب أو عملية بقائمة يدوية فقط. لذلك تنشأ تغطية آلية على أحدث SHA، ويُسند كل عنصر إلى رحلة وشريحة ومالك وحالة ودليل.

### 3.1 وحدات الجرد الإلزامية

```yaml
coverage_units:
  tracked_files:
  workspace_packages:
  openapi_files:
  openapi_operations:
  generated_clients:
  backend_routes:
  backend_handlers:
  domain_commands:
  domain_queries:
  state_machines:
  database_tables:
  database_columns:
  constraints:
  indexes:
  migrations:
  events:
  outbox_producers:
  consumers:
  jobs:
  queues:
  caches:
  search_indexes:
  providers:
  runtime_profiles:
  environment_variables:
  app_entrypoints:
  pages:
  screens:
  routes:
  navigation_entries:
  tabs:
  buttons:
  icons_with_actions:
  forms:
  modals:
  sheets:
  filters:
  sort_controls:
  pagination_controls:
  visible_states:
  feature_flags:
  tests:
  workflows:
  guards:
```

### 3.2 سجل كل عنصر

```yaml
coverage_item:
  id:
  kind:
  path:
  symbol_or_operation_id:
  semantic_capability:
  canonical_owner:
  journey_id:
  slice_id:
  required_surfaces:
  excluded_surfaces_with_reason:
  write_path:
  readback_path:
  permissions:
  trusted_scope:
  persistence_or_provider_effect:
  positive_test:
  negative_test:
  runtime_test:
  status: UNCLASSIFIED | IN_SCOPE | READ_ONLY | NOT_APPLICABLE_WITH_EVIDENCE | CLOSED
  evidence_sha:
```

### 3.3 بوابة التغطية

```yaml
unclassified_files: 0
unassigned_operations: 0
unassigned_routes: 0
unassigned_handlers: 0
unassigned_database_objects: 0
unassigned_events_jobs: 0
unassigned_screens: 0
unassigned_tabs: 0
unassigned_buttons: 0
unassigned_icons_with_actions: 0
unassigned_forms_modals_sheets: 0
unassigned_visible_states: 0
unassigned_tests: 0
unverified_required_surfaces: 0
```

أي عنصر لم يُقَس لا يسجل صفرًا، وأي اكتشاف قديم يعاد توليده على رأس `smsm` الحالي.

## 4. نموذج التنفيذ

```text
PIN
→ READ AUTHORITY
→ REGENERATE COVERAGE
→ DEFINE JOURNEY
→ OPEN ONE VERTICAL SLICE
→ DIAGNOSE
→ PROVE ROOT CAUSE
→ FIX CANONICAL OWNER
→ MIGRATE DATA AND CONSUMERS
→ COMPLETE CONTRACT/BACKEND/DB/SHARED-BRAIN/SURFACES
→ REMOVE PARALLEL WRITES AND FALLBACKS
→ TARGETED VERIFY
→ NEGATIVE/CONCURRENCY/RECOVERY TESTS
→ RUNTIME READBACK
→ REVIEW DIFF
→ COMMIT
→ PUSH
→ RE-PIN
→ CLOSE SLICE
→ NEXT SLICE
→ SAME-SHA FINAL VERIFICATION
```

لا شريحة تالية قبل إغلاق الحالية، ولا رحلة تالية قبل إغلاق كل شرائح الحالية.

## 5. الشرائح الرأسية الثابتة FS-01..FS-18

| الشريحة | النطاق الإلزامي |
|---|---|
| FS-01 | Product Truth، Actors، النتيجة، الحالات، الأفعال المسموحة والممنوعة |
| FS-02 | Identity، Session، Device، Service Identity |
| FS-03 | Roles، Permissions، Assignments، Platform/Operator/Partner/Store/Object Authorization |
| FS-04 | Routes، Pages، Screens، Tabs، Buttons، Icons، Navigation |
| FS-05 | Controllers، Hooks، View Models، Validation، Error/Offline/Unknown Result |
| FS-06 | OpenAPI، Request/Response/Error، Auth، Scope، Idempotency، Compatibility |
| FS-07 | Generated clients/types، Drift، منع التعديل اليدوي |
| FS-08 | Backend route، Handler، Validation، Correlation، Error translation |
| FS-09 | Domain state machine، transitions، concurrency، audit |
| FS-10 | Repository، tables، constraints، indexes، transaction، migrations، backfill |
| FS-11 | Events، Outbox/Inbox، Consumers، Jobs، Retry، Replay، DLQ |
| FS-12 | DSH/WLT أو Provider handoff، Service auth، Unknown Result، Reconciliation |
| FS-13 | Cache، Search، Media، Providers، Invalidation، Retention |
| FS-14 | Runtime، Docker، Env، Entrypoints، Health/Readiness، Expo/EAS/BFF |
| FS-15 | Readback في جميع الأسطح المطلوبة |
| FS-16 | Negative، IDOR، Replay، Race، Partial failure، Offline، Recovery |
| FS-17 | Security، Privacy، Audit، Observability، Accessibility، RTL، Performance |
| FS-18 | إزالة Legacy/Mocks/Fallbacks/Duplicates، Zero gates، Same-SHA evidence |

## 6. FOUNDATION-00

1. **السلطة والمرجع:** قراءة `AGENTS.md`، سجل ترتيب السلطة، Product Truth، platform model، سجل الرحلات والقاموس.
2. **تقارب الفرع:** مقارنة `smsm` بـ`master`، مراجعة 64 Commit الحالية، منع out-of-scope diff.
3. **Workspaces:** package names، workspace paths، dependencies، cycles، tsconfig، lockfile، unused/orphan packages.
4. **OpenAPI:** فهرس واحد، operation IDs فريدة، schema ownership، bundle/lint/provenance، semantic binding.
5. **Generated clients:** توليد حتمي، Drift صفر، لا تعديل يدوي، كل مستهلك مربوط.
6. **Migration history:** لا تعديل Migration مطبقة، Manifest/Checksum، Fresh/Upgrade/Rerun/Interrupted/Restore.
7. **App entrypoints:** app-client/partner/captain/field وControl Panel؛ Metro/Expo/Next startup وdeep links.
8. **Architecture boundaries:** لا imports ممنوعة، لا business truth في Surface، لا direct WLT calls.
9. **DSH-WLT transport:** نقل حاكم واحد، Service identity، DSH facade only، لا public WLT URLs.
10. **Idempotency/Correlation:** stable key، payload fingerprint، same-key conflict، result lookup.
11. **Atomic authorization:** فحص الملكية والحالة والإصدار والدفتر داخل معاملة WLT لمنع TOCTOU.
12. **Errors:** لا raw DB/provider/internal errors، public error envelope + correlation ID.
13. **Runtime baseline:** Identity/Workforce/DSH/WLT/Providers/Media/Notifications/DB وجميع الأسطح.
14. **CI:** guard/workflow registry، immutable diff، fail-closed aggregate، لا skipped بسبب فشل سابق.
15. **Evidence provenance:** Head-SHA proof وmerge-compatibility proof منفصلان.
16. **Journey registry:** ربط J001..J107 بجميع عناصر COVERAGE-00 الحية.

بوابة الخروج:

```yaml
coverage_baseline: PASS
authority_pin: PASS
workspace_architecture: PASS
canonical_openapi: PASS
generated_clients: PASS
migration_history: PASS
application_entrypoints: PASS
dsh_wlt_boundary: PASS
idempotency_correlation: PASS
atomic_financial_authorization: PASS
error_boundary: PASS
runtime_baseline: PASS
required_ci: PASS
journey_registry_mapping: PASS
same_sha_evidence: PASS
```

## 7. فهرس الرحلات J001..J107

كل رحلة تبدأ `NOT_ASSESSED`، وتُفتح على SHA مثبت، وتنفذ فيها الشرائح `FS-01..FS-18` المنطبقة، ويمنع الإغلاق قبل ربط جميع عناصر COVERAGE-00 التابعة لها.

- **J001 — صحة الهوية وجاهزيتها**
- **J002 — تزويد Actor والبحث والقراءة**
- **J003 — دورة حياة Actor**
- **J004 — إصدار التفعيل وإلغاؤه وقراءته**
- **J005 — استهلاك التفعيل وتسجيل الدخول**
- **J006 — الجلسات والتحديث والخروج**
- **J007 — الأجهزة وPush tokens**
- **J008 — الأدوار والصلاحيات وحزم الوصول**
- **J009 — السياق الموثوق وObject Authorization**
- **J010 — الأشخاص والملف المهني**
- **J011 — التزويد الإداري والموارد البشرية**
- **J012 — جاهزية الكابتن**
- **J013 — جاهزية الميداني**
- **J014 — التكليفات والورديات والنطاقات**
- **J015 — Platform Change Sets**
- **J016 — Progressive Rollout وKill Switch**
- **J017 — السياسات التشغيلية وسياسات المنصة**
- **J018 — سجل المزودين والقدرات والصحة**
- **J019 — اعتمادات المزود والمهل وCircuit Breaker**
- **J020 — إنشاء الشريك وبدء Onboarding**
- **J021 — مراجعة الشريك والتحقق ودورة الحياة**
- **J022 — ملف الشريك وإدارته الذاتية والفريق**
- **J023 — النموذج التجاري للشريك**
- **J024 — إنشاء المتجر وملكيته**
- **J025 — جاهزية المتجر والنشر والتعليق**
- **J026 — مناطق الخدمة والحدود الجغرافية**
- **J027 — أسطول الشريك وعضوية الكباتن**
- **J028 — إعدادات التوصيل وتسعيره التشغيلي**
- **J029 — Taxonomy والتصنيفات والوحدات والعلامات**
- **J030 — المنتجات المركزية والمتغيرات والباركود**
- **J031 — وسائط المنتج وأصول الكتالوج**
- **J032 — اقتراحات المنتجات والتصحيحات**
- **J033 — مراجعة الكتالوج والتعارض والدمج**
- **J034 — Store Assortment**
- **J035 — المخزون والتوفر وحدود الطلب**
- **J036 — السعر ووقت التحضير وسياسة التغيير**
- **J037 — Reels ومحتوى المنتجات المرئي**
- **J038 — Home Discovery ومحتوى الواجهة الرئيسية**
- **J039 — الحملات والعروض والكوبونات والمزادات**
- **J040 — الولاء والمزايا**
- **J041 — ملف العميل وتفضيلاته**
- **J042 — عناوين العميل وخصوصيتها**
- **J043 — الخرائط والترميز الجغرافي**
- **J044 — اكتشاف المتاجر والبحث والترشيح**
- **J045 — تفاصيل المتجر وقراءة الكتالوج**
- **J046 — Serviceability وETA**
- **J047 — إنشاء السلة وقراءتها وتعديلها**
- **J048 — تزامن السلة واستعادتها**
- **J049 — التسعير والرسوم والضرائب والتقريب**
- **J050 — Checkout والتحقق والمعاينة**
- **J051 — اختيار Fulfillment Mode**
- **J052 — اختيار الدفع وPayment Session الأولية**
- **J053 — إنشاء الطلب وIdempotency**
- **J054 — حقيقة الطلب والجدول الزمني والقراءة**
- **J055 — Workboards والتدخل التشغيلي والطلبات المساعدة**
- **J056 — صندوق طلبات الشريك والتنبيهات**
- **J057 — قبول الطلب ورفضه**
- **J058 — التجهيز والتقديرات والمشكلات والاستبدال**
- **J059 — الطلبات الخاصة**
- **J060 — Customer Pickup**
- **J061 — توفر وسعة Dispatch**
- **J062 — إسناد Dispatch وعروض الكابتن**
- **J063 — الإسناد اليدوي وإعادة الإسناد**
- **J064 — التتبع الحي وسلامة الموقع**
- **J065 — تسليم المتجر للكابتن وPickup**
- **J066 — تنفيذ الكابتن وأثناء التوصيل**
- **J067 — إكمال إثبات التسليم**
- **J068 — وسائط إثبات التسليم**
- **J069 — استثناءات وفشل التوصيل**
- **J070 — Rescue والإنقاذ وإعادة الإسناد**
- **J071 — إلغاء الطلب**
- **J072 — المرتجعات وطلب الاسترداد التشغيلي**
- **J073 — الدعم والتذاكر والمحادثات**
- **J074 — دعم الشريك**
- **J075 — الحوادث والتصعيدات**
- **J076 — الإشعارات والقوالب والتفضيلات والتسليم**
- **J077 — التقييمات وتقييم المزود والطلب**
- **J078 — التحليلات التشغيلية وSLA والتنبيهات**
- **J079 — DSH Finance Facade والنقل المالي**
- **J080 — المدفوعات الإلكترونية وحقيقة المزود**
- **J081 — المحافظ والحسابات والأرصدة المقروءة**
- **J082 — Ledger والقيود والانعكاس**
- **J083 — سجلات COD**
- **J084 — حيازة COD والتحصيل والتسليم**
- **J085 — الأهلية المالية للكابتن والميداني والممثل**
- **J086 — العمولات وسياساتها واحتسابها**
- **J087 — الاشتراك المالي والالتزامات وديون الشريك**
- **J088 — تمويل العروض والكوبونات**
- **J089 — الاستردادات**
- **J090 — التسويات**
- **J091 — وجهات الصرف**
- **J092 — طلبات الصرف والفشل وإعادة المحاولة**
- **J093 — المصالحة المالية وحالات الفروقات**
- **J094 — التقارير المالية والملخص التجاري**
- **J095 — Idempotency وCorrelation وUnknown Result**
- **J096 — التفويض الذري وTOCTOU وهوية الخدمات**
- **J097 — Events وOutbox وInbox وReplay**
- **J098 — Jobs وQueues وRetry وDead Letters**
- **J099 — Cache وSearch وInvalidation**
- **J100 — دورة حياة الوسائط والملفات**
- **J101 — Offline وإعادة الاتصال والتعارض**
- **J102 — Observability والتدقيق والتشخيص**
- **J103 — الأمن والخصوصية والحماية السلبية**
- **J104 — Runtime وDocker والمداخل وBFF والبناء المحمول**
- **J105 — الوصولية وRTL والترجمة والأداء والاعتمادية**
- **J106 — النسخ والاستعادة والاحتفاظ والتصدير والتوافق والإصدار**
- **J107 — الحوكمة وCI والأدلة والتنظيف والإغلاق النهائي**

## 8. الأسطح والنطاقات غير القابلة للتجاهل

```text
apps/app-client/runtime
apps/app-partner/runtime
apps/app-captain/runtime
apps/app-field/runtime
apps/control-panel/runtime
services/dsh/frontend/app-client
services/dsh/frontend/app-partner
services/dsh/frontend/app-captain
services/dsh/frontend/app-field
services/dsh/frontend/control-panel
services/dsh/frontend/shared
services/wlt/frontend/shared/dsh
shared/ui-kit
```

كل Surface يسجل كل Route/Screen/Tab/Button/Icon/Form/Modal/Sheet/Filter/Sort/Pagination/Visible State. كل عنصر مرئي يثبت:
`visibility → permission → trusted scope → controller → client → contract → handler → domain → DB/provider effect → readback → negative/runtime proof`.

`webapp` و`website` يصنفان فقط إلى `ACTIVE_SURFACE | FUTURE_DECLARED_SURFACE | DUPLICATE_SURFACE | DEAD_SCAFFOLD | ABSENT` وفق الكود الحالي، ولا يعاد إنشاؤهما اعتمادًا على وثيقة قديمة.

## 9. حدود DSH وWLT

```yaml
dsh_owns:
  - partner_store_catalog_assortment
  - serviceability_cart_checkout_order
  - fulfillment_dispatch_delivery_support
  - immutable_operational_evidence

wlt_owns:
  - payments_wallets_accounts_ledger
  - cod_financial_custody
  - commissions_obligations_debts
  - refunds_settlements_payouts_reconciliation

surfaces_must_not:
  - call_wlt_directly
  - calculate_financial_truth
  - own_permissions_or_state_machines
  - trust_client_scope_identifiers
```

DSH يحتفظ بمراجع WLT وحقول masked فقط، ولا يحتفظ بتفاصيل مصرفية خام أو رصيد أو Ledger أو عمولة أو تسوية موازية.

## 10. الاختبارات المطلوبة

- Unit، integration، database، contract، generated-client، authorization، isolation.
- Fresh/upgrade/rerun/interrupted migration وbackup/restore.
- Idempotency، replay، concurrency، TOCTOU، partial failure، unknown result.
- Webhook signatures، provider timeout/failure/reconciliation.
- Event duplication/order/replay/DLQ.
- Network proof: صفر طلبات من المتصفح أو الهاتف إلى WLT.
- Mobile entry/export/native requirements وControl Panel routes/BFF/session.
- Positive/negative end-to-end journeys.
- Accessibility، RTL، العربية، responsive، weak network، performance، SLA.
- Security: auth bypass، IDOR، cross-partner/store/actor، injection، SSRF، path traversal، file abuse، secrets/PII.
- Runtime readback عبر كل Surface مطلوبة.

## 11. بوابة البقايا الصفرية

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
legacy_read_fallbacks: 0
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

## 12. سيناريو التكامل النهائي

```text
Actor/session/device
→ partner onboarding/activation
→ store/service area/readiness/publication
→ partner user assignment
→ taxonomy/product/proposal/approval
→ assortment/price/availability
→ customer/address/serviceability/discovery
→ cart/pricing/checkout/payment-or-COD
→ order/readback
→ partner accept/prepare
→ dispatch/assignment/pickup/tracking/proof
→ payment/COD/ledger/commission/debt/settlement/payout
→ reconciliation/support/notification/audit
→ readback on every required surface
```

ثم تشغل السيناريوهات السلبية والتزامن والـUnknown Result والتعافي المقابلة.

## 13. دليل كل شريحة

```yaml
slice_evidence:
  journey_id:
  slice_id:
  initial_sha:
  final_sha:
  root_cause:
  canonical_owner:
  coverage_item_ids:
  changed_paths:
  migrations:
  contracts:
  generated_clients:
  backend_and_database_effect:
  wlt_effect:
  required_surfaces:
  negative_tests:
  runtime_readback:
  commands_and_exit_codes:
  workflow_runs_and_artifact_digests:
  zero_gate:
  commit_sha:
  decision:
```

## 14. استراتيجية Git

```yaml
commit: ATOMIC_LOGICAL_UNITS
push: AFTER_EACH_VERIFIED_COMMIT
force_push: false
merge_to_master: false
auto_merge: false
release: false
production: false
```

## 15. القرار النهائي

```yaml
required_for_closed_with_evidence:
  coverage_00: PASS
  foundation_00: PASS
  journeys_registered: 107
  journeys_closed: 107
  open_journeys: 0
  open_slices: 0
  all_required_surfaces: PASS
  dsh_operational_truth: PASS
  wlt_financial_truth: PASS
  dsh_facade_only: PASS
  database_fresh_upgrade_rerun_restore: PASS
  contracts_and_generated_clients: PASS
  security_privacy_isolation: PASS
  runtime_mobile_control_panel: PASS
  positive_negative_recovery_scenarios: PASS
  zero_residue_matrix: PASS
  head_sha_evidence: PASS
  merge_compatibility_evidence: PASS
  remaining_internal_findings: 0
  remaining_unproven_required_items: 0
```

الحالة الحالية:

```yaml
decision: FIX_REQUIRED
reason:
  - this plan is created but not executed
  - current discovery artifacts are stale and DISCOVERY_ONLY
  - live registry has no named J001..J107 mappings yet
  - current pinned head has no CI or runtime evidence
```
