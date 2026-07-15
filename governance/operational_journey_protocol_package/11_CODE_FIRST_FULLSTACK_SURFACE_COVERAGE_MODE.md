# 11 — Code-First / Fix-First / Full-Stack Multi-Surface Coverage Mode

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** 11 of 12
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**Amendment date:** `2026-07-06`
**Scope:** Amendment إلزامي يقيّد التنفيذ بوضع Code-First / Fix-First / Minimal Evidence / Full-Stack Multi-Surface.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة الآن من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` وهذا الملف.

---

## 36) قواعد التغطية المتكاملة والتحيز للكود الحي (Code-First & Fix-First)

* **Assumption of Gaps and Defects (افتراض النقص والعيوب):**
  يجب افتراض أن النواقص، العيوب، التكرار، التسرب، الازدواجية، نقص المنطق، وكل شيء ما زال موجودًا وغير مكتمل في الكود والربط، حتى يثبت العكس تمامًا وبدليل عملي قاطع. لا يجوز إعلان PASS بناءً على افتراضات نظرية أو اكتمال سطحي.

* **Code First:**
  الأولوية دائمًا للكود الحي: تعديل، تصحيح، تنظيف، تنظيم، نقل، دمج، حذف، إضافة، ثم تحقق مختصر وحاسم. ممنوع تحويل التنفيذ إلى كتابة أدلة وتقارير طويلة.

* **Fix First:**
  عند `TASK=implementation_or_closure`، أي blocker قابل للإصلاح داخل الريبو يتحول فورًا إلى تنفيذ. لا يجوز إخراج `FIX_REQUIRED` أو `BLOCKED_NEEDS_EVIDENCE` قبل محاولة الإصلاح فعليًا. التوقف مسموح فقط عند مانع خارجي حقيقي: صلاحية، سر، جهاز، خدمة، أو بيئة غير متاحة.

* **Minimal Sufficient Evidence:**
  لكل ادعاء إغلاق يكفي دليل حاسم واحد: diff، command output، guard result، test result، runtime smoke، أو CI result. ممنوع إنشاء ملفات evidence كثيرة أو تكرار نفس الدليل في README/status/matrix/report.

* **Compact Closure Ledger:**
  استخدم سجل إغلاق مختصر واحد بدل مصفوفات طويلة عند عدم وجود خطر عالٍ:
  `resolved_commit_sha`, `topic`, `affected_surface_inventory`, `code_changes`, `fixed_blockers`, `verification_commands_run`, `remaining_external_blockers_only`, `final_result`.

* **Full-Stack Multi-Surface Coverage:**
  كل Feature/Topic يجب أن يغطي بعمق ما يتأثر به من:
  backend, database, migrations, OpenAPI/API contracts, API clients, shared brains, runtime, permissions, states, tests, guards, apps, screens, pages, routes, control-panel sections, features, cross-surface flows.
  ممنوع إغلاق أي Feature إذا بقي عنصر داخل النطاق غير مفحوص أو غير موصول أو غير مثبت.

* **Unbound Components and Files Gate (بوابة الكود غير الموصول):**
  يجب فحص كافة الملفات والشاشات والصفحات والكود الموجود فعليًا لتحديد أي أجزاء غير موصولة أو غير مربوطة بعد (سواء في الواجهة الأمامية أو الخلفية أو غيرها). يُحظر تجاهل أي فجوة منطقية أو تشغيلية أو نقص كودي في هذا الجانب، ويجب القيام بتنفيذ الربط والتوصيل كشرط أساسي لإغلاق الرحلات التشغيلية والتأكد من معالجة كافة الفجوات الكبيرة والنواقص.

* **No Forgotten Surface Rule:**
  قبل التنفيذ أنشئ `affected_surface_inventory` مختصرًا لكل تطبيق/سطح/صفحة/screen/route/control-panel section/feature محتمل التأثر.
  القرار لكل عنصر واحد فقط:
  `IN_SCOPE`, `READ_ONLY`, `FORBIDDEN`, `NOT_AFFECTED_WITH_REASON`.
  أي عنصر داخل النطاق غير مذكور = `PROTOCOL_VIOLATION`.
  أي `NOT_AFFECTED` بلا سبب تقني واضح = `PROTOCOL_VIOLATION`.

* **Shared Brain Before UI:**
  DSH shared هو عقل DSH، وDSH surfaces UI فقط.
  WLT shared/dsh هو عقل WLT المرتبط بـ DSH، وWLT هو مالك الحقيقة المالية الوحيد.
  إذا ظهر business logic أو direct API أو permission logic أو state machine أو raw API mapping داخل surface، يجب نقله فورًا إلى shared المناسب والتحقق منه.

* **No Inline CSS Styles (منع التنسيقات السطرية inline CSS):**
  يُحظر تمامًا استخدام التنسيقات السطرية (inline CSS styles) داخل المكونات وشاشات واجهات المستخدم (UI surfaces) في كامل المشروع لضمان الحفاظ على الهوية البصرية وتسهيل الصيانة.
  * **الأسلوب الممنوع (Forbidden):**
    ```tsx
    // ممنوع كتابة التنسيقات والألوان والأبعاد مباشرة في وسم المكون
    <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 16 }}>
    ```
  * **الأسلوب البديل الصحيح (Correct):**
    1. استخدام المكونات الجاهزة وتمرير الإعدادات المعتمدة من `@bthwani/ui-kit`.
    2. أو تعريف التنسيقات خارجيًا أسفل الملف عبر `StyleSheet.create` (أو `WebStyleSheet.create` للويب):
    ```tsx
    <View style={styles.container}>

    // أسفل الملف:
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: colorRoles.surfaceBase,
        padding: spacing[4],
      },
    });
    ```

* **Affected-Only Verification:**
  ابدأ بالفحوصات المتأثرة فقط حسب المسارات التي تغيرت.
  لا تشغّل full-suite إلا إذا تغيّر shared brain أو API/database/migration/runtime، أو فشل affected check، أو كانت المنطقة multi-surface عالية الخطورة.

* **No Docs-Only Closure:**
  ممنوع اعتبار docs أو README أو report أو matrix دليل إغلاق. الإغلاق لا يكون إلا بتغيير/تحقق في الكود الحي أو إثبات مباشر أن الكود الحي غير متأثر.

* **No Restatement Rule:**
  ممنوع إعادة سرد الحزمة في التقارير. الحزمة imported contract. التقرير النهائي يذكر فقط: ما تغير في الكود، ما تم إصلاحه، ما تحقق، وما بقي خارجيًا إن وجد.


## Frontend–Backend Non-Separation Gate

الفرونت إند والباك إند ليسا مشروعين مستقلين داخل الرحلة الواحدة.

كل ميزة تعتبر وحدة رأسية واحدة تبدأ من نية المستخدم وتنتهي في الحقيقة
السيادية والقراءة الراجعة.

يُحظر تنفيذ frontend-first feature غير مربوط.
يُحظر تنفيذ backend-first endpoint بلا عقد ومستهلك.
يُحظر إنشاء نوع يدوي في الواجهة عند وجود نوع مولد.
يُحظر تفسير statuses أو errors داخل surfaces تفسيرًا مستقلًا.
يُحظر نجاح الواجهة قبل نجاح العملية الخلفية الحقيقي.
يُحظر نجاح الخلفية دون تحديث الأسطح المستهلكة.

أي فصل بين الطبقتين يعتبر P0 Systemic Disconnection.

```yaml
frontend_backend_integrity_gate:
  initial_status: FIX_REQUIRED

  required_chain:
    - ui_control
    - route_or_navigation
    - surface_adapter
    - shared_controller
    - generated_api_client
    - openapi_operation
    - authentication
    - authorization
    - backend_route
    - backend_handler
    - validation
    - domain_service
    - repository
    - database_transaction
    - event_or_outbox
    - state_readback
    - affected_surface_refresh
    - runtime_proof

  zero_tolerance_conditions:
    unbound_ui_controls: 0
    frontend_only_features: 0
    backend_only_features: 0
    missing_backend_routes: 0
    unused_backend_routes: 0
    contract_client_drift: 0
    request_schema_mismatches: 0
    response_schema_mismatches: 0
    enum_status_mismatches: 0
    nullable_optional_mismatches: 0
    permission_mismatches: 0
    error_mapping_mismatches: 0
    local_surface_business_logic: 0
    raw_surface_api_calls: 0
    ui_success_without_backend_effect: 0
    backend_effect_without_ui_readback: 0
    database_fields_without_contract_binding: 0
    contract_fields_without_backend_binding: 0
    runtime_journeys_unverified: 0

  result_if_failed: FIX_REQUIRED
```

## النتيجة الحاكمة

كل عنصر UI
+ مرتبط بعقل مشترك
+ يستخدم عميلًا مطابقًا للعقد
+ يصل إلى route وhandler حقيقيين
+ يطبق الصلاحية نفسها
+ يقرأ ويكتب الحقول نفسها
+ يستخدم الحالات والأخطاء نفسها
+ يحدث قاعدة البيانات الصحيحة
+ يعيد الحالة إلى جميع الأسطح
+ مثبت برحلة Runtime فعلية

دون ذلك تكون النتيجة:
FIX_REQUIRED

وليست IMPLEMENTATION_PASS، حتى لو نجح typecheck وbuild وكل اختبارات الواجهة والباك إند المنفصلة.

> نجاح Workflow لا يعوض غياب تعديل الكود عند وجود فجوة قابلة للإصلاح.
