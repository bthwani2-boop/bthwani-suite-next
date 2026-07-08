# 11 — Code-First / Fix-First / Full-Stack Multi-Surface Coverage Mode

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `11/11 amendment`
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
