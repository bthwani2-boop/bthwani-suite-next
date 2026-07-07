<!-- ALLOW_LOCAL_PATH_EXAMPLE -->
# BThwani Suite Next — أمر تنفيذ جنائي شامل مانع للهروب

**تاريخ التجهيز:** 2026-07-07  
**الغرض:** تسليم أمر واحد قابل للنسخ إلى Gemini / Claude Code / Codex داخل Google Antigravity أو أي وكيل كود، لإجباره على التشخيص ثم تعديل الكود الحي ثم التحقق الرقمي، مع منع الاكتفاء بالتقارير أو ملفات الحوكمة أو diagnostics.

> هذا الملف لا يدّعي أن المستودع مغلق أو خالٍ من الأخطاء. هو أمر تنفيذ مضبوط يفرض أن أي ادعاء إغلاق لا يكون إلا بدليل رقمي قابل للتحقق.

---

## 1) تشخيص المرفقات والريموت

### 1.1 المرفقات النصية

تم دمج فكرتين رئيسيتين من المرفقات:

1. **المرفق الأول** يضبط المشكلة الأصلية: الطلب واسع، ويجب تحويله إلى اكتشاف شامل، gap ledger، تقسيم رحلات، إغلاق حسب الأولوية، file-decision قبل الحذف، full-stack binding chain لكل UI action، وفصل `.diagnostics` عن إعلان الجاهزية.
2. **المرفق الثاني** يضيف العنصر الحاسم: منع `diagnostics-only`، تعريف 100% كأرقام، إجبار loop: اكتشاف → تعديل كود حي → فحص → إعادة اكتشاف، ومنع حذف واجهات قد تكون مطلوبة لكنها غير مربوطة.

### 1.2 حزمة المانح `donor.zip`

المرفق يحتوي على:

```text
BTHWANI_NEXT_FOUNDATION_PACKAGE_20260618.zip
مانح.txt
BTHWANI_NEXT_MASTER_EXECUTION_PLAN_20260618.md
BTHWANI_NEXT_ZERO_NOISE_EXECUTION_PACKAGE_20260618.zip
```

الخلاصة العملية من المانح:

- لا يُنصح بإعادة بناء كاملة عمياء.
- الصحيح هو **Evidence-Gated Extraction** و **Code-First Remediation**.
- `realtest` أو أي مانح قديم = مصدر معرفة وأدلة فقط، وليس مصدر نسخ كامل.
- لا يوجد إغلاق بلا:
  - OpenAPI validation
  - generated clients
  - backend tests
  - frontend typecheck
  - Docker/runtime smoke
  - DB migration/smoke عند دخول القاعدة في النطاق
- WLT هو مالك الحقيقة المالية.
- DSH يعرض أو ينسق فقط ولا يملك financial truth.

### 1.3 GitHub Remote — الحالة المهمة التي يجب البناء عليها

تم فحص `bthwani2-boop/bthwani-suite-next` على ref مباشر `journy`.

الحقائق التنفيذية الأساسية:

- المستودع خاص، والفرع الافتراضي `master`.
- ref `journy` قابل للقراءة من GitHub Remote.
- `journy` أمام `master` بعدد 29 commits وخلفه 0 حسب compare remote.
- `package.json` يحتوي حاليًا على سكربتات تشغيل وحراسة مهمة، منها:
  - `foundation:gate`
  - `journey:gate`
  - `runtime:up/status/smoke`
  - `graphify:code`
  - `diagnostics:operational:*`
  - `guard:operational-journey-factory`
  - `guard:operational-diagnostics-reconciliation`
  - `guard:dsh-order-lifecycle-execution`
  - `diagnostics:knip`
  - `diagnostics:jscpd`
  - `diagnostics:madge`
  - `guard:dsh-order-lifecycle-all`
- `summary.json` على `journy` يثبت:
  - `final_closure = false`
  - `exact_100_percent_claim = false`
  - `gap_count = 169`
  - `cleanup_candidate_count = 30`
- `reconciliation-report.json` يثبت:
  - `gap_count_before = 169`
  - `gap_count_after = 169`
  - `remaining_open_gaps = 146`
  - `fixed_by_code_count = 6`
  - `ui_binding_elements_audited = 1280`
  - `ui_binding_gaps = 0`
  - `finance_boundary_violations = 0`
- `live-product-code-change-report.json` يثبت وجود تعديل كود منتج سابق بعدد `product_files_modified = 14`، لكنه لا يثبت الإغلاق الكامل.
- `15_EXECUTION_GATE.md` يثبت أن DSH Order Lifecycle ما زالت:
  - Backend & Database binding غير مثبت.
  - WLT financial boundary غير مكتمل في ذلك المرور.
  - `guard:dsh-order-lifecycle-all` يفشل عند `diagnostics:knip`.
  - الحالة المعلنة: `PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS`.

### 1.4 الحكم الفني

لا يجوز للوكيل إعلان أي من التالي الآن:

```text
100%
CLOSED
FULL_OPERATIONAL_CLOSURE
READY
PASS عام
EXECUTION_READY
```

السبب الرقمي:

```text
gap_count = 169
remaining_open_gaps = 146
final_closure = false
exact_100_percent_claim = false
automated full journey gate = not passing
backend/database proof = incomplete
WLT boundary proof = incomplete for that journey gate
```

المطلوب ليس تقريرًا جديدًا فقط، بل **سلسلة تنفيذ code-first** مع checklists قبل كل مرحلة، ثم تعديل الكود الحي، ثم إعادة الفحص، ثم تحديث الأدلة.

---

## 2) القرار التنفيذي الصحيح

اعتمد ثلاث غرف منفصلة ولا تخلط بينها:

```text
1. raw diagnostics:
   C:\bthwani-suite-next\.diagnostics\operational-journey-factory\

2. generated journey control room:
   C:\bthwani-suite-next\governance\operational_journey_factory\generated\<journey-id>\

3. execution checklists:
   C:\bthwani-suite-next\tools\checklist\<journey-id>\
```

القواعد:

- `.diagnostics` = raw evidence / inventories / gap ledgers.
- `governance/.../generated` = ملفات رحلة نظيفة، مختصرة، مشتقة من الأدلة، وليست إغلاقًا بحد ذاتها.
- `tools/checklist` = checklist تنفيذ حية قبل كل مرحلة، يتم تحديثها بـ `[x]` فقط بعد دليل.
- لا يتم الإغلاق إذا كانت التغييرات محصورة في:
  - `.diagnostics/**`
  - `governance/**`
  - `tools/**`
  - `*.md`
- يجب وجود تعديل كود منتج حي عندما توجد فجوات داخلية قابلة للإصلاح.

---

## 3) الأمر النهائي للوكيل

انسخ النص التالي كاملًا إلى الوكيل:

```text
@GitHub

نفّذ تشخيصًا جنائيًا عميقًا ثم معالجة وتصحيح كود حي شاملة لكل المتبقي في bthwani-suite-next من GitHub Remote فقط، وفق وضع Code-First / Fix-First / Full-Stack Multi-Surface، مع منع أي هروب إلى تقارير أو Markdown أو diagnostics أو governance-only. المطلوب إغلاق عملي تدريجي بالأدلة الرقمية، وليس وعودًا أو صياغة نظرية.

REPO:
bthwani2-boop/bthwani-suite-next

REF:
journy

LOCAL_PATH:
C:\bthwani-suite-next

TASK:
FULL_OPERATIONAL_LIVE_CODE_REMEDIATION_WITH_MANDATORY_CHECKLISTS_AND_NO_ESCAPE

TASK_MODE:
implementation_or_closure

PRIMARY_SCOPE:
كل النواقص والفجوات والتكرار والتسرب والكود غير الموصول والواجهات غير المربوطة والتبويبات/الأزرار/الأيقونات/الشاشات غير الفعالة ونقص منطق التشغيل ونقص الربط بين frontend/shared/backend/API/database/runtime/WLT/CI داخل bthwani-suite-next.

EXECUTION_STYLE:
- نفّذ بشكل متسلسل.
- قبل كل مرحلة أنشئ checklist.
- أثناء التنفيذ حدّث checklist بوضع [x] فقط بعد الدليل.
- لا تنتقل من بند إلى التالي إذا كان البند الحالي FIX_REQUIRED داخليًا وقابلًا للإصلاح.
- لا تترك أي بند "لاحقًا" إلا إذا كان BLOCKED_EXTERNAL_ONLY بدليل.
- عند إنهاء رحلة كاملة، أوقف التنفيذ واطلب موافقة المستخدم قبل الانتقال للرحلة التالية.
- إذا كانت المهمة رحلة واحدة: أغلقها أو أخرج blockers رقمية.
- إذا كانت المهمة سلسلة رحلات: نفّذ أول رحلة فقط حتى gate نهائي، ثم اطلب الموافقة للرحلة التالية.

STRICT_HONESTY:
لا تعد المستخدم بـ 100%.
لا تعلن 100% إلا إذا سمحت الأرقام بذلك.
إذا بقيت فجوة واحدة، النتيجة ليست 100%.
إذا لم تستطع تشغيل أمر، لا تعتبره PASS.
إذا احتجت توضيحًا يمنع التنفيذ الآمن، ارجع للمستخدم بسؤال محدد جدًا، ولا تكمل بتخمين.
إذا كان الغموض لا يمنع التنفيذ، حوّله إلى gap محدد واستمر.

GOVERNING_PROTOCOLS — اقرأ وطبّق قبل أي تعديل:
- governance/operational_journey_factory/00_FACTORY_INDEX.md
- governance/operational_journey_factory/01_TOTAL_DISCOVERY_PROTOCOL.md
- governance/operational_journey_factory/02_ATOMIC_SCOPE_TEMPLATE.md
- governance/operational_journey_factory/03_ATOMIC_FILE_DECISION_TEMPLATE.md
- governance/operational_journey_factory/04_SURFACE_TEMPLATE.md
- governance/operational_journey_factory/05_FEATURE_TEMPLATE.md
- governance/operational_journey_factory/06_BACKEND_API_DATABASE_TEMPLATE.md
- governance/operational_journey_factory/07_FRONTEND_BINDING_TEMPLATE.md
- governance/operational_journey_factory/08_UI_ICON_COMPONENT_TEMPLATE.md
- governance/operational_journey_factory/09_PERMISSION_STATE_AUDIT_TEMPLATE.md
- governance/operational_journey_factory/10_RUNTIME_DOCKER_ENV_TEMPLATE.md
- governance/operational_journey_factory/11_TOOLCHAIN_EXECUTION_TEMPLATE.md
- governance/operational_journey_factory/12_CLEANUP_MOVE_MERGE_DELETE_TEMPLATE.md
- governance/operational_journey_factory/13_EVIDENCE_AND_CLOSURE_TEMPLATE.md
- governance/operational_journey_factory/14_JOURNEY_TEMPLATE_MASTER.md
- governance/operational_journey_factory/15_GAP_LEDGER_TEMPLATE.md
- governance/operational_journey_factory/16_TEMPLATE_FILLING_RULES.md
- governance/operational_journey_factory/17_GENERATOR_OUTPUT_POLICY.md
- governance/operational_journey_protocol_package/00_INDEX_AND_COVERAGE.md
- governance/operational_journey_protocol_package/01_COMMAND_INPUTS_RESULTS.md
- governance/operational_journey_protocol_package/02_REMOTE_REF_SOURCE_GIT_GATES.md
- governance/operational_journey_protocol_package/03_SCOPE_TOPOLOGY_OWNERSHIP_DONOR.md
- governance/operational_journey_protocol_package/04_MATRICES_PROJECT_SURFACE_CONTROL_BINDING.md
- governance/operational_journey_protocol_package/05_MATRICES_BACKEND_DATABASE_API_SECURITY.md
- governance/operational_journey_protocol_package/06_ORGANIZATION_PERFORMANCE_CLEANUP_SEQUENCE.md
- governance/operational_journey_protocol_package/07_VERIFICATION_RUNTIME_CI_PR.md
- governance/operational_journey_protocol_package/08_IMPLEMENTATION_ANTIGRAVITY_REPORT.md
- governance/operational_journey_protocol_package/09_ACCEPTANCE_QUICK_COMMAND_CLOSE.md
- governance/operational_journey_protocol_package/10_EXECUTION_PLAN_NO_SKIP_GATE.md
- governance/operational_journey_protocol_package/11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md
- governance/operational_journey_protocol_package/LEGACY_SOURCE_TRACE.md
- governance/operational_journey_protocol_package/README.md

NON_NEGOTIABLE_RULES:
1. Resolve REF directly from GitHub Remote.
2. Do not search for similar branches unless direct ref resolution fails.
3. Do not fall back to master/default branch.
4. Do not rely on local memory, README claims, previous reports, or stale diagnostics.
5. Treat work as incomplete until proven by code, command output, runtime smoke, guard, test, or CI.
6. No PASS without command/path/expected/actual evidence.
7. No docs-only closure.
8. No diagnostics-only closure.
9. No governance-only closure.
10. No tools-only closure.
11. No Markdown-only closure.
12. Do not manually zero gap ledgers.
13. Do not hide gaps using KEEP_ACTIVE_WITH_PROOF unless machine proof exists.
14. Do not delete UI files just because they look unused; they may be required but unbound.
15. No destructive delete/move/rename/reset until file-decision proof exists.
16. No dependency or lockfile change unless required, justified, and verified.
17. No direct API/fetch/axios/process.env URL construction inside UI surfaces.
18. No business logic/state machine/permission logic/raw API mapping inside UI surfaces.
19. DSH shared owns DSH logic.
20. WLT shared/dsh owns DSH-visible WLT reference bindings.
21. WLT backend owns financial truth and mutation.
22. DSH must not mutate wallet/payment/refund/settlement/ledger/commission/COD financial truth.
23. generated journey files are control-room outputs only, not closure proof.
24. Checklists are execution control, not closure proof.
25. If any protocol item is skipped without justified exclusion evidence, result = PROTOCOL_VIOLATION.

DEFINITION_OF_100_PERCENT:
لا يجوز إعلان FULL_OPERATIONAL_CLOSURE_NUMERICALLY_VERIFIED إلا إذا كانت كل القيم التالية صفرًا أو PASS بدليل آلي:

gap_count = 0
remaining_open_gaps = 0
blocking_gap_count = 0
unresolved_imports = 0
circular_dependencies = 0
direct_api_in_ui_surface = 0
business_logic_in_ui_surface = 0
raw_api_mapping_in_ui_surface = 0
local_permission_logic_in_surface = 0
unbound_ui_actions = 0
unbound_tabs = 0
unbound_icons = 0
unbound_routes = 0
unbound_states = 0
missing_a11y_labels = 0
missing_test_ids_for_interactive_controls = 0
missing_permission_guards = 0
missing_state_transitions = 0
missing_audit_events = 0
missing_shared_controllers = 0
missing_shared_view_models = 0
missing_backend_api_bindings = 0
missing_openapi_operations = 0
missing_generated_clients = 0
missing_database_truth = 0
wlt_dsh_finance_boundary_violations = 0
partner_store_boundary_violations = 0
store_visibility_gate_bypasses = 0
unsupported_transitions_without_capability = 0
mock_demo_preview_runtime_truth = 0
dead_code_without_proof = 0
duplicate_code_without_reason = 0
wrong_owner_files = 0
wrong_path_files = 0
local_path_leaks = 0
stale_diagnostics = 0
contradictory_claims = 0
failed_required_commands = 0
runtime_smoke_failures = 0
ci_required_but_unproven = 0

إذا بقيت أي قيمة غير صفرية:
final_result = NOT_CLOSED_WITH_EXACT_REMAINING_INTERNAL_OR_EXTERNAL_BLOCKERS

TRUTH_LOCK — نفّذ أولًا:
Set-Location -LiteralPath "C:\bthwani-suite-next"

git fetch origin --prune
git rev-parse --verify origin/journy^{commit}
git log -1 --oneline origin/journy
git branch --show-current
git rev-parse HEAD
git rev-parse origin/journy
git status --short
git --no-pager diff --check

افشل فورًا إذا:
- origin/journy غير قابل للحل كـ commit.
- branch != journy.
- HEAD != origin/journy.
- working tree غير نظيف.
- diff --check يفشل.

إذا فشل ref resolution:
result = BLOCKED_NEEDS_EVIDENCE
reason = "REF journy غير موجود أو غير قابل للحل من GitHub Remote"
stop = true

CONTROL_ROOMS:
أنشئ أو حدّث هذه المسارات حسب الرحلة:

RAW_DIAGNOSTICS_ROOT:
C:\bthwani-suite-next\.diagnostics\operational-journey-factory

GENERATED_ROOT:
C:\bthwani-suite-next\governance\operational_journey_factory\generated

CHECKLIST_ROOT:
C:\bthwani-suite-next\tools\checklist

لكل journey استخدم:
JOURNEY_ID:
<stable-business-outcome-id>

GENERATED_JOURNEY_ROOT:
governance/operational_journey_factory/generated/<JOURNEY_ID>/

CHECKLIST_JOURNEY_ROOT:
tools/checklist/<JOURNEY_ID>/

DIAGNOSTICS_JOURNEY_ROOT:
.diagnostics/operational-journey-factory/<JOURNEY_ID>/

CHECKLIST_RULE:
قبل كل مرحلة أنشئ checklist:
tools/checklist/<JOURNEY_ID>/00_MASTER_CHECKLIST.md
tools/checklist/<JOURNEY_ID>/01_TRUTH_LOCK_CHECKLIST.md
tools/checklist/<JOURNEY_ID>/02_DISCOVERY_CHECKLIST.md
tools/checklist/<JOURNEY_ID>/03_GAP_TRIAGE_CHECKLIST.md
tools/checklist/<JOURNEY_ID>/04_LIVE_CODE_REMEDIATION_CHECKLIST.md
tools/checklist/<JOURNEY_ID>/05_VERIFICATION_CHECKLIST.md
tools/checklist/<JOURNEY_ID>/06_CLOSURE_OR_BLOCK_CHECKLIST.md

كل بند checklist يجب أن يحتوي:
- checkbox
- scope/path
- required_action
- verification_command
- proof_file_or_command_output
- status
- blocker_if_any

ممنوع وضع [x] إلا إذا:
- verification_command نُفذ أو proof machine-readable موجود.
- الدليل مطابق للبند نفسه.
- لا يوجد contradiction مع gap-ledger أو reconciliation أو final-closure-ledger.

إذا اكتشف الوكيل بندًا لم يكن في checklist:
- أضفه فورًا قبل إصلاحه.
- لا تصلحه خارج checklist.
- بعد إصلاحه ضع [x] مع الدليل.

PHASE 0 — Protocol Coverage Matrix:
أنشئ:
tools/checklist/<JOURNEY_ID>/protocol_coverage_matrix.md

يجب أن يربط كل ملف بروتوكول بخطوة تنفيذ.
أي ملف بروتوكول غير مغطى = PROTOCOL_VIOLATION.
أي استبعاد يجب أن يحتوي:
path_or_scope
reason
evidence
verification_command
impact_if_skipped
decision

PHASE 1 — Factory-First Discovery:
نفّذ:

pnpm run diagnostics:operational:toolchain
pnpm run diagnostics:operational:surfaces
pnpm run diagnostics:operational:inventory
pnpm run diagnostics:operational:gaps
pnpm run diagnostics:operational:reconcile
pnpm run guard:operational-journey-factory
pnpm run guard:operational-diagnostics-reconciliation

إذا أمر غير موجود:
- لا تعتبره PASS.
- صنّفه TOOL_MISSING_WITH_EXACT_ACTION.
- أضفه فقط إذا كان مطلوبًا وداخل النطاق.
- وإلا ضع BLOCKED_NEEDS_EVIDENCE بدليل.

PHASE 2 — Total Inventory Classification:
صنّف كل عنصر محتمل داخل:

app-client
app-partner
app-captain
app-field
control-panel
apps/runtime
DSH shared
WLT shared/dsh
backend
database
contracts
generated clients
runtime/Docker/env
CI/guards/tests
workflows
exports/helpers
cleanup candidates

كل عنصر يجب أن يحتوي:
owner
path
classification
required_action
proof_source
verification_command
decision
status
blocker_type_if_blocked

أي عنصر بلا تصنيف = PROTOCOL_VIOLATION.

PHASE 3 — Smart Journey Segmentation:
لا تنشئ رحلة من شاشة واحدة أو تبويب واحد أو زر واحد أو route واحد.
قسّم الرحلات حسب business outcome كامل عبر full-stack.

كل رحلة يجب أن تحتوي affected_surface_inventory:

app_client:
app_partner:
app_captain:
app_field:
control_panel:
apps_runtime:
dsh_shared:
wlt_shared_dsh:
backend:
database:
contracts:
generated_clients:
runtime:
ci_guards_tests:

القيمة لكل عنصر:
IN_SCOPE
READ_ONLY
FORBIDDEN
NOT_AFFECTED_WITH_REASON

أي NOT_AFFECTED بلا سبب تقني ودليل = PROTOCOL_VIOLATION.

PHASE 4 — Priority Ordering:
رتب الفجوات:

P0 — لا تنتقل قبل تصفيرها أو إثباتها خارجية:
UNRESOLVED_IMPORT
CIRCULAR_DEPENDENCY
DIRECT_API_IN_SURFACE
RAW_API_MAPPING_IN_SURFACE
BUSINESS_LOGIC_IN_SURFACE
LOCAL_PERMISSION_LOGIC_IN_SURFACE
STATE_MACHINE_IN_SURFACE
UNBOUND_UI_ACTION
UNBOUND_TAB
UNBOUND_ICON
UNBOUND_ROUTE
UNBOUND_STATE
MISSING_SHARED_CONTROLLER
MISSING_PERMISSION_GUARD
MISSING_BACKEND_API_BINDING
MISSING_DATABASE_TRUTH_FOR_ACTIVE_FLOW
WLT_DSH_FINANCE_BOUNDARY_VIOLATION
PARTNER_STORE_BOUNDARY_VIOLATION
STORE_VISIBILITY_GATE_BYPASS
LOCAL_PATH_LEAK
CONTRADICTORY_GATE_CLAIM
FAILED_REQUIRED_COMMAND

P1:
OpenAPI/generated client/backend drift
missing backend route/handler/service/repository binding
missing audit/status event
missing runtime smoke
unsupported transition without capability
missing tests
unused file in product path that may hide broken binding
unused dependency that affects runtime
CI not proven

P2:
unused export with proof path
duplicate code
optional tool warning
naming/structure cleanup
performance/reporting improvements

PHASE 5 — Live Product Code Remediation Loop:
while internal_gaps_exist:
  1. اختر أعلى gap حسب P0 ثم P1 ثم P2.
  2. أضف بندًا له في checklist إن لم يكن موجودًا.
  3. افحص الجذر عبر:
     - rg
     - git grep
     - imports/exports
     - route registry
     - navigation registry
     - screen registry
     - runtime map
     - service manifest
     - OpenAPI
     - generated clients
     - backend route/handler/service/repository
     - database migrations/schema
     - Graphify
     - Knip
     - JSCPD
     - Madge
     - tests/guards/CI
  4. عدّل الكود الحي في مالكه الصحيح.
  5. شغّل تحققًا مستهدفًا.
  6. أعد diagnostics/reconcile المتأثر.
  7. حدّث checklist بوضع [x] فقط بعد الدليل.
  8. إذا بقي سبب خارجي فقط، صنّفه BLOCKED_EXTERNAL_ONLY مع:
     - exact blocker
     - required external action
     - verification command after unblock
  9. انتقل للفجوة التالية.

لا تتوقف بعد أول دفعة.
لا تضع حدًا مثل 25 أو 50 فجوة.
استمر حتى:
- كل الفجوات الداخلية = 0
أو
- لا يبقى إلا BLOCKED_EXTERNAL_ONLY مثبت بدليل.

ممنوع:
LEAVE_OPEN
BLOCKED_INTERNAL_WITHOUT_ATTEMPT
ACCEPTED_RISK_WITHOUT_PROOF
MANUAL_ZEROING
REPORT_ONLY_FIX

PHASE 6 — UI Binding Rules:
لكل screen/page/tab/button/icon/form/modal/list/card/CTA/state:
استخرج:
component
route
registry binding
screen registry
onPress/onSubmit/onChange
shared controller/view-model
permission/capability
state source
backend/API binding عند الحاجة
a11y label/testID عند الحاجة
runtime behavior

اختر واحدًا فقط:
BOUND_TO_SHARED_CONTROLLER
BOUND_TO_SHARED_VIEW_MODEL
MOVED_TO_SHARED_POLICY
MOVED_TO_SHARED_STATE_MAPPER
BOUND_TO_BACKEND_API
DISABLED_BY_CAPABILITY
READ_ONLY_WITH_MACHINE_REASON
REMOVED_DEAD_WITH_PROOF

ممنوع ترك:
handler بلا shared owner
icon بلا contract عند الحاجة
tab بلا route/action/proof
state بلا source
direct API داخل surface
business logic داخل surface
mock/demo/preview runtime truth

PHASE 7 — Shared Brain Before UI:
افحص وعدّل حسب الحاجة:

services/dsh/frontend/shared/orders/**
services/dsh/frontend/shared/checkout/**
services/dsh/frontend/shared/cart/**
services/dsh/frontend/shared/partner/**
services/dsh/frontend/shared/dispatch/**
services/dsh/frontend/shared/runtime/**
services/dsh/frontend/shared/identity-access/**
services/wlt/frontend/shared/dsh/**

كل shared controller/view-model/policy يجب أن:
- يملك actions.
- يملك permissions/capabilities.
- يملك state mapping.
- يملك error/loading/success/disabled states.
- يربط adapter/transport.
- لا يكسر WLT boundary.
- لا يعتمد على mock/demo/preview.
- يكون مستخدمًا فعليًا من UI.

PHASE 8 — Backend/API/Database Binding:
لكل operation فعّال أو مطلوب داخل الرحلة تحقق من:

OpenAPI operationId
method/path
generated client type
frontend adapter/controller usage
Go route
Go handler
service/domain policy
repository
database schema/migration/table عند الحاجة
permission guard
audit/status event
test/smoke

إذا نقص شيء داخليًا:
- أصلحه في الكود.
- لا تكتفِ بإثبات Markdown.
- أعد توليد clients إذا تغير OpenAPI.
- شغّل الحراسات.

DSH Order Lifecycle minimum operations:
Client:
- cart read/update
- checkout intent create/get/cancel/list
- order create/list/get/tracking

Partner/Store:
- partner/store order list
- accept
- reject
- preparing
- ready
- issue/alert/chat handoff

Captain:
- assignment list
- accept
- decline
- status transitions
- location/status update
- proof of delivery

Control Panel:
- live orders
- operations queue
- cancellation
- rescue
- dispatch assignment
- escalation
- captain operations

PHASE 9 — Partner vs Store Boundary:
Partner != Store.

Partner owns:
legal/commercial identity
documents
owner data
onboarding status
approval/rejection
activation lifecycle
audit trail
operational readiness

Store owns:
customer-facing display
branch/location
catalog
opening hours
serviceability
marketing visibility
client visibility
order linkage

Rules:
- app-field creates Partner draft and captures first Store data.
- app-field does not activate Partner.
- app-field does not publish Store.
- control-panel owns Partner approval and Store publish/hide.
- app-partner sees onboarding and manages Store only after permission.
- app-client never sees Partner; it sees Store only.
- أي route/schema/type/status/label يخلط Partner lifecycle مع Store publication = FIX_REQUIRED.

PHASE 10 — Store Client Visibility Gates:
كل endpoint يعرض Store للعميل يجب أن يفرض نفس policy:

partner readiness
partner active/approved
store publication status
store client visibility
catalog/content readiness
serviceability
marketing visibility
permissions
not deleted
not suspended

افحص:
list stores
get store by id
home discovery
catalog visibility
search/category/store collections

إذا bypass موجود:
- وحّد policy في backend/shared owner.
- أضف negative/positive tests.
- أعد smoke إن كان runtime داخل النطاق.

PHASE 11 — DSH/WLT Financial Boundary:
افحص:
payment
COD
refund
settlement
commission
ledger
wallet
payout
reconciliation
finance reports

قاعدة:
WLT هو مالك الحقيقة المالية والـ mutation.
DSH may display/request/read references only.

Forbidden in DSH:
payment mutation
wallet mutation
refund finalization
settlement posting
commission truth
COD financial truth
ledger mutation
reconciliation
direct provider access
financial report truth

إذا وجدت finance truth داخل DSH:
- انقلها إلى WLT أو WLT shared/dsh حسب الطبقة.
- أضف adapter boundary.
- عدّل UI/shared/backend المتأثر.
- أضف proof.
- شغّل guard:wlt-financial-boundary.

PHASE 12 — Cleanup / Move / Merge / Delete Gate:
قبل حذف/نقل/إعادة تسمية/دمج أي ملف:
أثبت no unresolved dependency عبر:

imports
exports
barrels
routes
navigation
screen registry
runtime map
service manifest
Graphify edges
OpenAPI generated consumers
tests
guards
CI
package scripts
workspace refs

كل ملف يجب أن يأخذ قرارًا واحدًا:
KEEP_ACTIVE
REFACTOR_SPLIT
MERGE_DUPLICATE
RETIRE_DEAD
MOVE_TO_OWNER
FIX_REQUIRED
BLOCKED_NEEDS_EVIDENCE

إذا proof ناقص:
decision = BLOCKED_NEEDS_EVIDENCE
do_not_delete = true

PHASE 13 — Anti-Escape Guard:
أنشئ أو قوّي:
tools/guards/live-product-code-remediation-gate.mjs

الحارس يجب أن يفشل إذا:
1. التعديلات محصورة في:
   .diagnostics/**
   governance/**
   tools/**
   *.md

2. لا توجد تغييرات في كود المنتج الحي رغم وجود فجوات داخلية.

3. لا توجد تغييرات في UI surface رغم وجود UI gaps.

4. لا توجد تغييرات في shared controller/policy/view-model رغم وجود local logic أو unbound handlers/states.

5. final report يعلن إغلاقًا دون product code diff.

6. أي C:\Users أو .gemini أو file:/// داخل governance/tools/diagnostics.

7. summary/gap-ledger/reconciliation/final-closure-ledger فيها تناقض رقمي.

8. أي checkbox [x] بلا proof machine-readable.

9. generated journey يدعي closure بدون:
   product_files_modified > 0 عند وجود gaps داخلية
   gap_count = 0
   remaining_open_gaps = 0
   failed_required_commands = 0

أضف إلى package.json:
"guard:live-product-code-remediation": "node tools/guards/live-product-code-remediation-gate.mjs"

وأدخله في:
"guard:dsh-order-lifecycle-all"
وأي gate شامل مناسب.

PHASE 14 — Generated Journey Files:
لكل journey أنشئ أو حدّث:

governance/operational_journey_factory/generated/<JOURNEY_ID>/
  00_EXECUTION_INDEX.md
  01_SCOPE_SURFACE_INVENTORY.md
  02_CURRENT_GAP_LEDGER.md
  03_UI_BINDING_MATRIX.md
  04_BACKEND_API_DATABASE_MATRIX.md
  05_WLT_DSH_FINANCE_BOUNDARY_MATRIX.md
  06_RUNTIME_VERIFICATION_MATRIX.md
  07_FILE_DECISION_MATRIX.md
  08_LIVE_CODE_PATCH_LEDGER.md
  09_TOOLCHAIN_RESULTS.md
  10_FINAL_CLOSURE_GATE.md
  final-closure-ledger.json

لكن:
- لا تضع raw diagnostics هنا.
- لا تضع logs خام.
- لا تضع JSON ضخم.
- لا تعتبر generated proof وحده.
- كل claim يجب أن يشير إلى كود حي أو command proof.
- إذا تغيرت الأدلة، حدّث generated من الأدلة لا من الرأي.

PHASE 15 — Required Commands:
استخدم الموجود قبل إنشاء الجديد.

نفّذ عند البداية/النهاية أو حسب التأثر:

pnpm install --frozen-lockfile

pnpm run graphify:code
pnpm run diagnostics:knip
pnpm run diagnostics:jscpd
pnpm run diagnostics:madge

pnpm run diagnostics:operational:toolchain
pnpm run diagnostics:operational:surfaces
pnpm run diagnostics:operational:inventory
pnpm run diagnostics:operational:gaps
pnpm run diagnostics:operational:reconcile

pnpm run guard:live-product-code-remediation
pnpm run guard:operational-journey-factory
pnpm run guard:operational-diagnostics-reconciliation
pnpm run guard:dsh-order-lifecycle-execution
pnpm run guard:dsh-order-lifecycle-all

pnpm run guard:frontend-feature-binding
pnpm run guard:backend-api-binding
pnpm run guard:go-routes-ci
pnpm run guard:dependency-graph
pnpm run guard:logic-all
pnpm run diagnostics:ui-kit
pnpm run guard:icon-contract
pnpm run guard:a11y
pnpm run guard:design-tokens
pnpm run guard:wlt-financial-boundary

pnpm run typecheck
pnpm run test

git --no-pager diff --check
git status --short

إذا DSH backend تغيّر:
Push-Location "services\dsh\backend"
go test ./...
go build ./...
Pop-Location

إذا WLT backend تغيّر:
Push-Location "services\wlt\backend"
go test ./...
go build ./...
Pop-Location

إذا Identity backend تغيّر:
Push-Location "core\identity\backend"
go test ./...
go build ./...
Pop-Location

إذا runtime تغيّر أو تم ادعاء runtime readiness:
pnpm run runtime:status
pnpm run runtime:up
pnpm run runtime:smoke
pnpm run reverse

ممنوع تشغيل destructive reset إلا بأمر منفصل وصريح:
pnpm run runtime:reset

PHASE 16 — Runtime / Ports:
استخدم منافذ المشروع الحالية فقط:

DSH API: 58080
Identity API: 58082
WLT API: 58083
Media/MinIO: 59000
app-client: 18101
app-partner: 18102
app-captain: 18103
app-field: 18104
control-panel: 13000

ممنوع إدخال المنافذ القديمة:
8080
8081
8082
8083
8084
3000

إذا وجدتها:
- صنّفها RUNTIME_ENV_PORT_GAP.
- أصلحها أو ضع blocker بدليل.
- لا تعلن runtime pass.

PHASE 17 — Final Closure Ledger:
بعد تعديل الكود الحي فقط، أنشئ/حدّث:

.diagnostics/operational-journey-factory/<JOURNEY_ID>/final-closure-ledger.json

ويجب أن يحتوي:

{
  "journey_id": "...",
  "current_head_sha": "...",
  "gap_count": 0,
  "remaining_open_gaps": 0,
  "blocking_gap_count": 0,
  "unresolved_imports": 0,
  "circular_dependencies": 0,
  "direct_api_in_ui_surface": 0,
  "business_logic_in_ui_surface": 0,
  "raw_api_mapping_in_ui_surface": 0,
  "local_permission_logic_in_surface": 0,
  "unbound_ui_actions": 0,
  "unbound_tabs": 0,
  "unbound_icons": 0,
  "unbound_routes": 0,
  "unbound_states": 0,
  "missing_a11y_labels": 0,
  "missing_test_ids_for_interactive_controls": 0,
  "missing_permission_guards": 0,
  "missing_state_transitions": 0,
  "missing_audit_events": 0,
  "missing_shared_controllers": 0,
  "missing_shared_view_models": 0,
  "missing_backend_api_bindings": 0,
  "missing_openapi_operations": 0,
  "missing_generated_clients": 0,
  "missing_database_truth": 0,
  "wlt_dsh_finance_boundary_violations": 0,
  "partner_store_boundary_violations": 0,
  "store_visibility_gate_bypasses": 0,
  "unsupported_transitions_without_capability": 0,
  "mock_demo_preview_runtime_truth": 0,
  "dead_code_without_proof": 0,
  "duplicate_code_without_reason": 0,
  "wrong_owner_files": 0,
  "wrong_path_files": 0,
  "local_path_leaks": 0,
  "stale_diagnostics": 0,
  "contradictory_claims": 0,
  "failed_required_commands": 0,
  "runtime_smoke_failures": 0,
  "ci_required_but_unproven": 0,
  "product_files_modified": 0,
  "ui_surface_files_modified": 0,
  "shared_controller_files_modified": 0,
  "backend_files_modified": 0,
  "contract_files_modified": 0,
  "checklist_items_total": 0,
  "checklist_items_checked_with_proof": 0,
  "remaining_internal_gaps": 0,
  "remaining_external_blockers": 0,
  "final_result": "..."
}

final_result يكون:
FULL_OPERATIONAL_CLOSURE_NUMERICALLY_VERIFIED

فقط إذا:
- كل أرقام الفجوات = 0.
- كل required commands PASS.
- كل checklists مكتملة بالدليل.
- product_files_modified > 0 عند وجود gaps داخلية.
- generated/checklist/diagnostics متطابقة رقميًا.
- لا يوجد closure claim بلا proof.

وإلا:
NOT_CLOSED_WITH_EXACT_REMAINING_INTERNAL_OR_EXTERNAL_BLOCKERS

PHASE 18 — Updating Governance After Code:
بعد الكود فقط حدّث:
governance/operational_journey_factory/generated/<JOURNEY_ID>/10_FINAL_CLOSURE_GATE.md

القواعد:
- لا تضع [x] إلا إذا final-closure-ledger يثبتها.
- لا تستخدم أرقام قديمة.
- إذا gap_count > 0:
  state = PARTIAL_EXECUTION_PACKAGE_WITH_OPEN_BLOCKERS
- إذا gap_count = 0 وكل required commands PASS:
  state = EXECUTION_READY_NUMERICALLY_VERIFIED
- لا تستخدم CLOSED أو 100% إلا إذا runtime/test/CI proof موجود وكل الأرقام صفر.

PHASE 19 — Commit Policy:
إذا تم تعديل كود المنتج:
commit message:
fix(app): remediate operational product gaps end to end

إذا لم يتم تعديل كود المنتج وأضيفت حراسة فقط:
commit message:
chore(governance): enforce operational closure gates without closure claim

إذا بقيت فجوات:
commit message:
fix(app): continue operational live-code remediation

ممنوع استخدام:
close
final
100
closed
ready

في commit إذا بقيت أي فجوة أو أمر فاشل.

PHASE 20 — Journey Handoff:
إذا الرحلة الحالية انتهت:
- إذا final_result = FULL_OPERATIONAL_CLOSURE_NUMERICALLY_VERIFIED:
  أخرج تقريرًا مختصرًا واطلب موافقة المستخدم للانتقال للرحلة التالية.
- إذا final_result = NOT_CLOSED_WITH_EXACT_REMAINING_INTERNAL_OR_EXTERNAL_BLOCKERS:
  لا تنتقل للرحلة التالية.
  أخرج blockers الرقمية فقط.
- إذا blockers خارجية فقط:
  اذكر required_external_action + verification command after unblock.
- إذا blockers داخلية:
  لا تطلب موافقة للانتقال؛ استمر في إصلاحها إذا كانت داخل الريبو.

FINAL_RESPONSE_SCHEMA:
اخرج بهذا الشكل فقط:

result:
repository:
ref:
current_head_sha:
journey_id:
task_mode:
product_files_modified:
ui_surface_files_modified:
shared_controller_files_modified:
backend_files_modified:
contract_files_modified:
gap_count_before:
gap_count_after:
remaining_open_gaps:
remaining_internal_gaps:
remaining_external_blockers:
failed_required_commands:
runtime_smoke_failures:
checklist_items_total:
checklist_items_checked_with_proof:
whether_100_claim_allowed:
fixed_blockers:
  - path:
    problem:
    root_cause:
    action_taken:
    verification_command:
    status:
remaining_blockers:
  - path:
    problem:
    root_cause:
    why_not_fixed:
    blocker_type:
    required_action:
    verification_command_after_unblock:
commands_run:
  - command:
    expected:
    actual:
    status:
files_changed_summary:
  - path:
    decision:
    reason:
    proof:
next_required_action:
approval_request_for_next_journey:
```

---

## 4) نسخة مختصرة جدًا للالتصاق إذا كان الوكيل يختصر السياق

```text
@GitHub

نفّذ على:
REPO=bthwani2-boop/bthwani-suite-next
REF=journy
LOCAL_PATH=C:\bthwani-suite-next

الوضع:
Code-First / Fix-First / Full-Stack Multi-Surface / No Escape.

اقرأ وطبّق كامل:
governance/operational_journey_factory/**
governance/operational_journey_protocol_package/**

أنشئ قبل التنفيذ:
tools/checklist/<journey-id>/00_MASTER_CHECKLIST.md
وchecklist لكل مرحلة. لا تضع [x] إلا بدليل command أو machine-readable proof.

الغرف:
.diagnostics/operational-journey-factory/ = raw diagnostics
governance/operational_journey_factory/generated/<journey-id>/ = control room فقط
tools/checklist/<journey-id>/ = execution checklist

Truth Lock:
git fetch origin --prune
git rev-parse --verify origin/journy^{commit}
git branch --show-current
git rev-parse HEAD
git rev-parse origin/journy
git status --short
git --no-pager diff --check

افشل إذا ref غير محلول، الفرع ليس journy، HEAD لا يساوي origin/journy، working tree غير نظيف، أو diff --check يفشل.

لا تقبل إغلاقًا إذا التعديلات فقط في .diagnostics أو governance أو tools أو md.
إذا توجد فجوات داخلية، يجب تعديل كود المنتج الحي.

شغّل:
pnpm run diagnostics:operational:toolchain
pnpm run diagnostics:operational:surfaces
pnpm run diagnostics:operational:inventory
pnpm run diagnostics:operational:gaps
pnpm run diagnostics:operational:reconcile
pnpm run graphify:code
pnpm run diagnostics:knip
pnpm run diagnostics:jscpd
pnpm run diagnostics:madge

أصلح live code بالتسلسل:
P0 ثم P1 ثم P2.
لا تنتقل إذا P0 داخلي قابل للإصلاح.

لكل UI/tab/button/icon/state:
UI → shared controller/view-model → API/generated client → OpenAPI → backend route → handler → service → repository/database → permission/audit/state → runtime smoke عند الحاجة.

ممنوع:
docs-only closure
diagnostics-only closure
governance-only closure
manual zeroing
direct API inside UI
business logic inside UI
financial mutation outside WLT
delete without file-decision proof
PASS بلا دليل
100% بلا أرقام صفرية

أضف/قوّي:
tools/guards/live-product-code-remediation-gate.mjs
وسكربت:
"guard:live-product-code-remediation": "node tools/guards/live-product-code-remediation-gate.mjs"

الإغلاق:
final_result = FULL_OPERATIONAL_CLOSURE_NUMERICALLY_VERIFIED
فقط إذا:
gap_count=0
remaining_open_gaps=0
failed_required_commands=0
runtime_smoke_failures=0
كل checklists مكتملة بالدليل
كل claims تطابق final-closure-ledger
product code modified عند وجود gaps داخلية

وإلا:
final_result = NOT_CLOSED_WITH_EXACT_REMAINING_INTERNAL_OR_EXTERNAL_BLOCKERS

عند إنهاء الرحلة:
لا تنتقل للرحلة التالية إلا بعد موافقة المستخدم.
```

---

## 5) ملاحظة تشغيلية نهائية

أفضل استخدام لهذا الملف:

1. افتح Google Antigravity.
2. افتح الريبو `C:\bthwani-suite-next`.
3. انسخ **الأمر النهائي للوكيل** من القسم 3.
4. بعد انتهاء أول رحلة، لا تسمح له بالانتقال تلقائيًا؛ راجع:
   - `tools/checklist/<journey-id>/`
   - `governance/operational_journey_factory/generated/<journey-id>/`
   - `.diagnostics/operational-journey-factory/<journey-id>/final-closure-ledger.json`
   - `git diff`
   - نتائج الأوامر.
5. إذا لم تظهر تعديلات كود منتج حي مع وجود gaps داخلية، فالتنفيذ فاشل حتى لو كانت التقارير جميلة.
