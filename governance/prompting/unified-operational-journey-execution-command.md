# أمر التنفيذ الموحد الحاكم للرحلات التشغيلية

## Code-First / Fix-First / Full-Stack Unified Multi-Surface / Slice-by-Slice Closure

@GitHub

نفّذ الرحلات التشغيلية المحددة أدناه تنفيذًا حقيقيًا داخل الكود الحي، **رحلةً واحدة بعد رحلة، وشريحةً رأسيةً واحدة بعد شريحة**، حتى إغلاق جميع الفجوات الداخلية القابلة للإصلاح داخل النطاق المصرح به.

هذا أمر **تنفيذ وتصحيح وتنظيف وربط واختبار وCommit وPush إلى الفرع المستهدف**، وليس أمر تشخيص نظري أو إعداد خطط وتقارير ووثائق فقط.

القاعدة التنفيذية الحاكمة:

```text
لا شريحة تالية قبل إغلاق الشريحة الحالية.
لا رحلة تالية قبل إغلاق جميع شرائح الرحلة الحالية.
لا إغلاق للرحلة قبل نجاح التكامل الكامل وبوابات الصفر.
```

---

## 1. مدخلات التنفيذ الثابتة

```yaml
repository_mode: REMOTE_ONLY
repository: bthwani2-boop/bthwani-suite-next
target_ref: sambassam
base_ref: master

journey_registry:
  governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md

governing_protocol:
  governance/operational_journey_protocol_package

journey_selection:
  <ضع Journey ID واحدًا أو نطاقًا مصرحًا به، مثل JRN-001..JRN-005>

task_mode: implementation_or_closure
execution_mode: CODE_FIRST_FIX_FIRST
surface_mode: FULLSTACK_UNIFIED_MULTI_SURFACE
closure_mode: SEQUENTIAL_SLICE_BY_SLICE

write_authorization:
  modify_target_ref: true
  commit_to_target_ref: true
  push_to_target_ref: true
  force_push: false

forbidden_without_separate_authorization:
  - create_pull_request
  - merge_pull_request
  - change_base_branch
  - create_tag
  - create_release
  - deploy_production
  - activate_commercial_saas
  - delete_target_branch

journey_transition:
  mode: AUTO_WITHIN_AUTHORIZED_SELECTION
  execute_one_journey_at_a_time: true
  execute_one_vertical_slice_at_a_time: true
  require_slice_closure_before_next_slice: true
  require_journey_closure_before_next_journey: true
  stop_after_authorized_selection: true
```

لا تستخدم أسماء أو أرقام رحلات محفوظة في الذاكرة. استخرج الاسم والنطاق والمالك والشرائح من سجل الرحلات الحي في الـcommit المثبت.

عند إعطاء نطاق مثل `JRN-005..JRN-010`، يكون هذا تفويضًا بتنفيذ هذه الرحلات فقط، بترتيبها، ولا يلزم طلب موافقة جديدة بين رحلة وأخرى داخل النطاق نفسه.

لا تبدأ أي رحلة خارج `journey_selection`.

---

## 2. ترتيب السلطات الحاكم

قبل أي تحليل أو كتابة، طبّق ترتيب السلطات التالي:

1. تعليمات المهمة الحالية.
2. `governance/authority/authority-precedence.json`.
3. `AGENTS.md`.
4. الحوكمة النشطة ذات الصلة.
5. Product Truth المطبق على الرحلة.
6. العقود والسجلات والـmanifests والـschemas الحاكمة.
7. سياسات الأمن والمالية وDSH وWLT وSaaS عند انطباقها.
8. حزمة البروتوكول التشغيلي بوصفها دعمًا مشتقًا.
9. المصادر التاريخية والمانح بوصفها مراجع اكتشاف فقط.

أي تعارض يجب حله وفق هذا الترتيب، لا بتجاهل أحد المرجعين.

لا تسمح لحزمة البروتوكول أو ملف تاريخي أو تقرير قديم أو Workflow سابق بتجاوز:

* الكود الحي.
* قاعدة البيانات والمهاجرات.
* OpenAPI.
* العقود المولدة.
* الـservice manifests.
* Product Truth.
* الحقيقة التشغيلية المثبتة على الـcommit نفسه.

---

## 3. تثبيت حقيقة GitHub Remote

قبل تنفيذ أي شيء:

1. حلّ `target_ref` حرفيًا من GitHub Remote.
2. ثبّت وسجّل:

   * `repository`.
   * `target_ref`.
   * `resolved_commit_sha`.
   * `base_ref`.
   * وقت التثبيت.
3. اقرأ واكتب وتحقق من الفرع المستهدف نفسه فقط.
4. لا تستخدم:

   * نسخة محلية.
   * فرعًا افتراضيًا بدل الفرع المحدد.
   * فرعًا مشابه الاسم.
   * ذاكرة سابقة.
   * تقريرًا قديمًا.
   * نتائج Workflow من commit مختلف.
5. بعد كل عملية Push، أعد حل الفرع وثبّت الرأس الجديد.
6. قبل القرار النهائي لكل شريحة، أعد تثبيت الرأس عند وجود Push.
7. قبل القرار النهائي لكل رحلة، أعد حل الفرع مرة أخرى.
8. قبل التقرير النهائي للنطاق الكامل، ثبّت الرأس النهائي للمرة الأخيرة.
9. يجب أن تنتمي جميع نتائج الإغلاق إلى الرأس النهائي نفسه.

عند تحرك الفرع Remote بصورة غير متوقعة:

* توقف عن الكتابة مؤقتًا.
* أعد تثبيت الرأس.
* افحص التغييرات الجديدة.
* حافظ على جميع الإنجازات الموجودة.
* ادمج التغييرات بأمان.
* أعد التحقق من الملفات المشتركة.
* لا تستخدم Force Push.
* لا تستبدل فرعًا كاملًا بفرع آخر.
* لا تسقط أي إنجاز موجود.

تعذر الوصول الحقيقي إلى المستودع أو المرجع تكون نتيجته:

```text
BLOCKED_EXTERNAL
```

استبدال المرجع أو استخدام فرع آخر تكون نتيجته:

```text
PROTOCOL_VIOLATION
```

---

## 4. تحديد الرحلات المصرح بها

افتح:

```text
governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md
```

ثم:

1. استخرج الرحلات المحددة في `journey_selection`.
2. استخرج الاسم الرسمي لكل رحلة.
3. استخرج المالك الرئيسي والخدمات ذات العلاقة.
4. استخرج الشرائح الوظيفية الخاصة بكل رحلة.
5. طبّق الشرائح الثابتة `FS-01` إلى `FS-18`.
6. افحص سجل التنفيذ السابق، لكن لا تعتبره دليل اكتمال.
7. حدد ترتيب الرحلات وفق الاعتماد التشغيلي.
8. لا تفتح أكثر من رحلة تنفيذية واحدة في الوقت نفسه.
9. حدّث السجل عند اكتشاف:

   * Feature غير مسجلة.
   * عقد غير مسجل.
   * operation غير مسجلة.
   * migration غير مسجلة.
   * route غير مسجل.
   * شاشة أو تبويب غير مسجل.
   * انتقال حالة غير مسجل.
   * سطح متأثر غير مسجل.
   * علاقة DSH/WLT غير ممثلة.
   * شريحة وظيفية ضرورية غير موجودة.

لا تحذف الرحلات التاريخية من السجل. استخدم الحالات الحاكمة المناسبة مثل:

```text
MERGED_INTO
RETIRED
OUT_OF_SCOPE_FOR_THIS_JOURNEY
```

مع السبب والمرجع.

أي قدرة جديدة اكتُشفت أثناء التنفيذ وغير ممثلة في سجل الرحلات تعد فجوة سجل، ويجب إضافتها قبل إنهاء الرحلة.

---

## 5. بوابة الرحلة السابقة

قبل بدء كل رحلة:

1. افحص الرحلة السابقة المباشرة في التسلسل.
2. تحقق من عدم وجود فجوة سابقة تكسر الرحلة الحالية.
3. افحص بصورة مستهدفة:

   * العقود المشتركة.
   * الحالات والانتقالات.
   * قاعدة البيانات.
   * الصلاحيات.
   * المكونات المشتركة.
   * الـgenerated clients.
   * الأحداث والـoutbox.
   * القراءة الراجعة بين الأسطح.
   * حدود DSH وWLT عند الانطباق.
4. لا تعتمد على كلمة «مكتملة» أو تقرير سابق.
5. لا تعِد فحص الرحلة السابقة كاملة بلا سبب؛ افحص فقط ما تعتمد عليه الرحلة الحالية أو ما يلزم لإثبات عدم وجود كسر.

عند العثور على فجوة سابقة تؤثر مباشرة في الرحلة الحالية:

* صنفها باعتبارها `cross_journey_dependency_repair`.
* أصلحها داخل النطاق الضروري فقط.
* لا تفتح ميزات غير مرتبطة.
* أعد التحقق من الرحلة السابقة في الجزء المتأثر.
* لا تبدأ الشريحة الحالية قبل إزالة الكسر.

عندما تكون الفجوة السابقة خارج النطاق ولا تؤثر في الرحلة الحالية:

* سجّلها بوضوح.
* لا تحتسبها ضمن إغلاق الرحلة الحالية.
* لا تستخدمها مبررًا لتوسيع النطاق دون ضرورة.

---

## 6. تعريف الرحلة قبل تنفيذها

لكل رحلة، أنشئ تعريفًا تنفيذيًا مختصرًا داخل سجل العمل يتضمن:

```yaml
journey_id:
journey_name:
operational_problem:
target_outcome:
actors:
roles:
required_surfaces:
excluded_surfaces_with_reason:
truth_owner:
services:
shared_brain_owner:
entities:
states:
state_transitions:
allowed_actions:
forbidden_actions:
negative_invariants:
database_scope:
api_contract_scope:
backend_scope:
frontend_scope:
runtime_scope:
security_scope:
financial_scope:
saas_scope:
acceptance_conditions:
```

أي تغيير ظاهر للمستخدم أو حساس للدور أو متعدد الأسطح أو تجاري أو تشغيلي يجب ربطه بـProduct Truth صالح.

لا يجوز للمنفذ اعتماد Product Truth الذي أنشأه بنفسه اعتمادًا نهائيًا.

عند الحاجة إلى موافقة مستقلة:

* أكمل النموذج والأدلة الممكنة.
* نفّذ جميع الإصلاحات الداخلية الممكنة.
* سجّل الموافقة المتبقية.
* لا تدّعِ `CLOSED_WITH_EVIDENCE` قبل الحصول عليها.

---

## 7. جرد الأسطح والعناصر المتأثرة

قبل التعديل، أنشئ `affected_surface_inventory` مختصرًا يغطي كل عنصر محتمل التأثر:

* `app-client`.
* `app-partner`.
* `app-captain`.
* `app-field`.
* `control-panel`.
* `webapp`.
* `website`.
* DSH shared brain.
* WLT-for-DSH shared brain.
* Backend modules.
* Database and migrations.
* OpenAPI and contracts.
* Generated clients.
* Runtime and Docker.
* Events and outbox.
* Notifications and providers.
* Tests, guards and targeted CI.

قرار كل عنصر يجب أن يكون واحدًا فقط:

```text
IN_SCOPE
READ_ONLY
FORBIDDEN
NOT_AFFECTED_WITH_REASON
```

أي عنصر متأثر وغير مذكور يعد:

```text
PROTOCOL_VIOLATION
```

ويشمل الجرد داخل كل سطح:

* الصفحات والشاشات.
* routes والتنقل.
* التبويبات.
* الأزرار والأيقونات.
* النوافذ والأدراج.
* الحقول والنماذج.
* البحث والترشيح والترتيب والترقيم.
* التأكيد والإلغاء وإعادة المحاولة.
* الإشعارات والتغذية الراجعة.
* صلاحيات الظهور والتنفيذ.
* loading.
* empty.
* error.
* success.
* offline.
* forbidden.
* conflict.
* blocked.
* disabled.
* partial state.
* recovery state.

أي `NOT_AFFECTED_WITH_REASON` يجب أن يتضمن سببًا تقنيًا مثبتًا، لا افتراضًا عامًا.

---

## 8. استخراج شرائح الرحلة وترتيبها

قبل فتح أول شريحة داخل الرحلة:

1. استخرج الشرائح الوظيفية المسجلة للرحلة.
2. طبّق الشرائح الثابتة `FS-01` إلى `FS-18`.
3. استخرج أي شرائح إضافية تفرضها:

   * العقود.
   * migrations.
   * routes.
   * الشاشات.
   * الحالات.
   * الأحداث.
   * التكاملات.
4. رتّب الشرائح وفق الاعتماد التشغيلي.
5. حدد لكل شريحة:

   * الهدف.
   * النطاق.
   * الملفات.
   * المالك.
   * الطبقات المتأثرة.
   * الأسطح المتأثرة.
   * شروط القبول.
   * الفحوص المطلوبة.
6. لا تفتح جميع الشرائح للتنفيذ دفعة واحدة.
7. افتح شريحة تنفيذية واحدة فقط.

يجب أن تكون كل شريحة:

* صغيرة بما يكفي للتنفيذ والتحقق بصورة مركزة.
* رأسية لا أفقية.
* مكتملة من نية المستخدم إلى الحقيقة التشغيلية.
* مستقلة قدر الإمكان.
* محددة بحدود ملفات ومالك واضحين.
* قابلة للإغلاق بدليل مستهدف.

يمنع تقسيم الرحلة إلى شرائح من نوع:

```text
نفذ كل الواجهة أولًا
ثم نفذ كل الباك إند
ثم نفذ كل قاعدة البيانات
```

التقسيم الصحيح هو:

```text
Feature أو حالة استخدام واحدة
→ جميع طبقاتها المتأثرة
→ جميع أسطحها المتأثرة
→ تحققها
→ إغلاقها
```

---

## 9. الإغلاق المتسلسل داخل كل رحلة

يجب تنفيذ كل رحلة من الداخل **شريحةً بعد شريحة**، ولا يجوز التعامل معها كوحدة واحدة كبيرة أو تنفيذ شرائحها كلها دفعة واحدة.

التسلسل الإلزامي هو:

```text
تثبيت نطاق الرحلة
→ استخراج جميع شرائح الرحلة
→ ترتيب الشرائح حسب الاعتماد التشغيلي
→ فتح شريحة واحدة فقط
→ تشخيص فجوات الشريحة
→ تحديد السبب الجذري
→ تحديد مالك الحقيقة الصحيح
→ تنفيذ التصحيح الفعلي في الكود
→ إكمال ربط الشريحة عبر جميع الطبقات والأسطح المتأثرة
→ تنظيف القديم والتكرار والضجيج المرتبط بالشريحة
→ تشغيل التحقق المستهدف للشريحة
→ معالجة جميع نتائج الفشل
→ إعادة التحقق بعد آخر تعديل
→ إثبات إغلاق الشريحة
→ Commit وPush عند اكتمال الوحدة المنطقية
→ إعادة تثبيت رأس الفرع
→ الانتقال إلى الشريحة التالية
→ تكرار العملية حتى إغلاق آخر شريحة
→ تنفيذ تحقق تكاملي نهائي للرحلة كاملة
→ تطبيق بوابات الصفر الخاصة بالرحلة
→ إصدار قرار الرحلة
→ الانتقال إلى الرحلة التالية فقط
```

### 9.1 بوابة فتح الشريحة

قبل فتح أي شريحة، يجب أن تكون الشريحة السابقة:

* منفذة فعليًا.
* متحققة بعد آخر تعديل.
* خالية من الفجوات الداخلية القابلة للإصلاح.
* غير معتمدة على mock أو fallback إنتاجي.
* مدمجة منطقيًا مع Shared Brain والعقود والباك إند.
* مرفوعة إلى الفرع عند اكتمال وحدتها المنطقية.
* مسجلة بنتيجة واضحة.

لا يجوز إبقاء شريحتين تنفيذيتين مفتوحتين في الوقت نفسه.

### 9.2 خطوات تنفيذ كل شريحة

لكل شريحة:

1. اثبت فجوة حقيقية.
2. حدد السبب الجذري.
3. حدد مالك الحقيقة الصحيح.
4. حدد الملفات المسموح بتعديلها.
5. حدد الملفات المقروءة فقط.
6. نفّذ التغيير في الكود الحي.
7. أكمل الربط عبر الطبقات والأسطح المتأثرة.
8. نظف القديم المرتبط بالشريحة.
9. نفّذ أصغر تحقق كافٍ.
10. عالج الفشل فورًا.
11. أعد التحقق بعد آخر تعديل.
12. راجع Diff الشريحة.
13. أنشئ Commit واضحًا عند اكتمال الوحدة المنطقية.
14. Push إلى `target_ref`.
15. أعد تثبيت `resolved_commit_sha`.
16. سجل نتيجة الشريحة.
17. افتح الشريحة التالية فقط بعد نجاح البوابة.

التنفيذ المقبول يشمل حسب الحاجة:

```text
ADD
MODIFY
MOVE
MERGE
DELETE
REGENERATE
REFACTOR
REWIRE
```

### 9.3 بوابات الصفر الخاصة بالشريحة

لا يجوز فتح الشريحة التالية حتى تصبح القيم المنطبقة التالية صفرًا:

```yaml
slice_internal_gaps: 0
slice_unbound_controls: 0
slice_unbound_components_or_files: 0
slice_frontend_backend_disconnections: 0
slice_frontend_only_features: 0
slice_backend_only_features: 0
slice_contract_mismatches: 0
slice_request_response_mismatches: 0
slice_status_mismatches: 0
slice_permission_mismatches: 0
slice_error_mapping_mismatches: 0
slice_duplicate_truth_owners: 0
slice_local_surface_business_logic: 0
slice_raw_surface_api_calls: 0
slice_runtime_mock_truths: 0
slice_obsolete_code: 0
slice_failed_required_checks: 0
slice_unverified_required_behavior: 0
```

ويجب أن تكون الشريحة:

* منفذة فعليًا في الكود الحي.
* مكتملة عبر الطبقات المنطبقة.
* خالية من الأزرار والصفحات والمسارات والعمليات غير المربوطة.
* خالية من المنطق المحلي والتكرار.
* خالية من البيانات التشغيلية الوهمية.
* متحققة بفحص مستهدف بعد آخر تعديل ذي علاقة.
* مرفوعة إلى الفرع المستهدف عند اكتمال وحدتها المنطقية.

إذا فشل تحقق الشريحة:

* تبقى الشريحة نفسها مفتوحة.
* أصلح الفشل فورًا.
* أعد التحقق.
* لا تؤجل الفجوة إلى شريحة لاحقة.
* لا تؤجلها إلى رحلة لاحقة.
* لا تسجلها كتحسين مستقبلي ما دامت قابلة للإصلاح داخل النطاق.

### 9.4 بوابة إغلاق الرحلة

لا تعتبر الرحلة مكتملة بمجرد إغلاق بعض شرائحها، ولا بمجرد نجاح Build أو Workflow عام.

لا يصدر قرار الرحلة إلا بعد:

1. إغلاق جميع شرائح الرحلة المسجلة.
2. إغلاق أي شريحة إضافية اكتُشفت أثناء التنفيذ.
3. تحديث سجل الرحلات بالشرائح الجديدة عند الحاجة.
4. التحقق من الترابط بين جميع الشرائح.
5. التحقق من القراءة والكتابة وانتقالات الحالة بين الأسطح.
6. تنفيذ سيناريو الرحلة كاملًا من البداية إلى النهاية.
7. نجاح السيناريوهات السلبية والحدّية المنطبقة.
8. نجاح الفحوص التكاملية المستهدفة.
9. نجاح بوابات الصفر الخاصة بالرحلة.
10. عدم وجود فجوة داخلية قابلة للإصلاح.

يمنع بصورة قطعية:

* الانتقال إلى شريحة جديدة قبل إغلاق الحالية.
* تنفيذ جميع الشرائح بالتوازي.
* إعلان اكتمال الرحلة بناءً على إغلاق أغلب الشرائح.
* تأجيل شريحة ناقصة إلى رحلة أخرى.
* ترك فجوة معروفة تحت مسمى تحسين لاحق.
* الانتقال إلى الرحلة التالية بسبب نجاح فحص جزئي.
* اعتبار تقرير أو Matrix أو Workflow بديلًا عن تنفيذ الشريحة.
* اعتبار نجاح Build دليلًا على اكتمال الرحلة.
* اعتبار نجاح Backend منفردًا دليلًا على نجاح الواجهة.
* اعتبار نجاح الواجهة منفردة دليلًا على الأثر التشغيلي.

---

## 10. قاعدة Code-First وFix-First

الأولوية للكود الحي:

```text
تشخيص مركز
→ تعديل أو إضافة أو حذف أو نقل أو دمج
→ ربط كامل
→ تحقق مستهدف
→ إصلاح نتيجة التحقق
```

يمنع الاكتفاء بـ:

* التشخيص.
* كتابة TODO.
* إنشاء Matrix.
* إنشاء README.
* إنشاء ملف Evidence.
* كتابة خطة دون تنفيذ.
* إصلاح واجهة دون الباك إند.
* إنشاء endpoint بلا مستهلك.
* إخفاء الخطأ بـfallback أو mock.
* إضافة alias أو wrapper لإخفاء السبب الجذري.
* إنتاج تقارير طويلة بدل تغيير الكود.
* إعلان `FIX_REQUIRED` دون محاولة الإصلاح الفعلي.

أي فجوة قابلة للإصلاح داخل المستودع يجب إصلاحها فورًا.

لا يجوز التوقف إلا عند مانع خارجي حقيقي مثل:

* صلاحية مفقودة.
* سر غير متاح.
* جهاز مطلوب غير متاح.
* Provider خارجي.
* بيئة خارجية.
* اعتماد بشري مستقل إلزامي.

---

## 11. سلسلة الفول ستاك الرأسية

لكل Feature أو عملية، افحص وأكمل السلسلة التالية حسب انطباقها:

```text
User Intent
→ UI Control
→ Route / Navigation
→ Surface Adapter
→ Shared Controller
→ Generated API Client
→ OpenAPI Operation
→ Authentication
→ Authorization
→ Backend Route
→ Handler
→ Input Validation
→ Domain Service
→ Repository
→ Database Transaction
→ Constraints / Indexes
→ Event / Outbox
→ Retry / Idempotency
→ Cross-Service Handoff
→ State Readback
→ Shared View Model
→ Affected Surface Refresh
→ User Feedback
→ Runtime Proof
```

يمنع إغلاق أي Feature عند وجود:

* زر بلا عملية حقيقية.
* شاشة بلا بيانات تشغيلية.
* Frontend capability بلا Backend.
* Backend capability بلا عقد أو مستهلك.
* route يتيم.
* handler غير مربوط.
* حقول قاعدة بيانات غير ممثلة في العقد.
* حقول عقد غير منفذة في الباك إند.
* حالة يفسرها كل سطح بطريقة مختلفة.
* نجاح UI دون أثر خلفي.
* أثر خلفي دون قراءة راجعة للأسطح.
* عميل API يدوي عند وجود عميل مولد.
* business logic داخل ملفات Surface.
* permission logic متكرر في الأسطح.
* raw API mapping داخل الشاشات.
* state machine محلية تناقض الحقيقة المشتركة.

---

## 12. الملكية الموحدة

### DSH

العقل المشترك الحاكم:

```text
services/dsh/frontend/shared
```

أسطح DSH مخصصة للعرض والتفاعل والتنقل والتركيب فقط.

### WLT المرتبط بـDSH

العقل المشترك الحاكم:

```text
services/wlt/frontend/shared/dsh
```

WLT هو المالك الوحيد للحقيقة المالية.

يمنع على DSH أو أي Surface:

* تنفيذ mutations مالية مستقلة.
* امتلاك ledger محلي.
* احتساب رصيد نهائي محليًا.
* اختراع حالة دفع أو استرداد.
* تفسير مالي يناقض WLT.
* تجاوز handoff المالي المعتمد.
* إنشاء حقيقة مالية ثانية.
* تنفيذ reconciliation محلي غير مملوك.

يمكن لـDSH الاحتفاظ بالمراجع والحالات التشغيلية وقراءة النتائج المالية المسموح بها فقط.

عند عبور DSH وWLT، افحص:

* idempotency.
* outbox.
* retries.
* reconciliation.
* duplicate delivery.
* failure recovery.
* readback.
* audit trail.
* ownership boundaries.
* compensating actions.
* stale state recovery.

---

## 13. الواجهات وتجربة الاستخدام

لا تعتبر الرحلة مكتملة لمجرد وجود الصفحة أو نجاح البناء.

تحقق من:

* اكتمال الوظائف والتبويبات.
* وضوح التسلسل التشغيلي.
* توافق العناصر مع الدور.
* ظهور الإجراءات المسموحة فقط.
* إخفاء الإجراءات الممنوعة.
* حالات المنع والتعطيل.
* التأكيدات الخطرة.
* رسائل الأخطاء القابلة للتنفيذ.
* العربية وRTL.
* الوصولية.
* الشبكات الضعيفة.
* الأجهزة والشاشات المختلفة.
* الأداء وعدم التجميد.
* تحديث الحالة بعد العملية.
* ثبات الهوية البصرية.
* deep links عند الانطباق.
* keyboard and focus behavior عند الانطباق.
* responsive behavior على الويب.
* retry and recovery behavior.

يمنع استخدام Inline Styles داخل المكونات والشاشات.

استخدم:

* `@bthwani/ui-kit`.
* design tokens.
* `StyleSheet.create`.
* `WebStyleSheet.create`.
* المكونات المشتركة المعتمدة.

لا تضف أيقونة أو تبويبًا أو زرًا تجميليًا بلا حاجة تشغيلية وربط حقيقي.

---

## 14. قاعدة البيانات والبيانات التشغيلية

افحص حسب النطاق:

* migrations.
* constraints.
* foreign keys.
* unique constraints.
* indexes.
* concurrency.
* transactions.
* idempotency keys.
* retention.
* audit fields.
* tenant or actor ownership.
* rollback safety.
* seed compatibility.
* nullable and optional semantics.
* lifecycle consistency.
* referential integrity.

يمنع وجود:

* بيانات demo داخل الشاشات.
* runtime fixtures.
* hardcoded production-like fallback.
* in-memory truth بدل قاعدة البيانات.
* arrays محلية تمثل حقيقة تشغيلية.
* بيانات مالية وهمية تعد دليلًا.
* بيانات tenant وهمية تعد دليل عزل.
* seed logic داخل Runtime.
* fallback يخفي فشل قاعدة البيانات.
* حالات محلية لا تتطابق مع قاعدة البيانات.

البيانات التطويرية التشغيلية المعتمدة تأتي من Seeds فقط.

يسمح بـtest fixtures داخل الاختبارات المعزولة بشرط عدم وصولها إلى Runtime.

---

## 15. التنظيف والتشطيب والتنظيم

افحص كل ملف مرتبط بالرحلة واتخذ قرارًا واحدًا:

```text
KEEP
MODIFY
MOVE
MERGE
DELETE
```

عالج فورًا كل ما يثبت أنه:

* قديم.
* محلي.
* مكرر.
* متناقض.
* غير مستخدم.
* في مالك غير صحيح.
* مصدر حقيقة ثانٍ.
* route قديم.
* API client متقادم.
* mock إنتاجي.
* alias مؤقت.
* fallback يخفي خطأ.
* ملف generated قديم.
* شاشة منفصلة عن Shared Brain.
* كود مانح منقول بلا مواءمة.
* أثرًا من بنية سابقة.
* export يتيم.
* feature flag منتهي.
* route alias لم يعد لازمًا.
* dead adapter.
* duplicate controller.
* state mapping متكرر.

قبل الحذف:

1. افحص جميع imports والمستهلكين.
2. افحص routes والـexports.
3. افحص العقود والـgenerated outputs.
4. افحص تأثير Runtime.
5. افحص الاختبارات المرتبطة.
6. نفّذ الاختبارات المتأثرة.
7. احذف بعد إثبات عدم الحاجة.
8. تحقق من عدم ترك imports أو routes أو exports مكسورة.

لا تنفذ حذفًا جماعيًا غير مثبت.

---

## 16. المانح والمصادر المفتوحة

يجوز تحليل:

```text
bthwani2-boop/bthwani-suite
```

والمشروعات العالمية المشابهة لاستخراج:

* التدفقات التشغيلية.
* حالات الاستخدام.
* أنماط التفاعل.
* العلاقات بين الأسطح.
* نماذج الفشل والاستعادة.
* الأفكار الوظيفية المناسبة.
* حالات الحافة.
* نماذج الصلاحيات.
* أنماط المراقبة والدعم التشغيلي.

يمنع:

* النسخ الأعمى.
* استيراد البنية القديمة.
* نقل mocks أو fixtures.
* نقل الملكيات الخاطئة.
* إنشاء اعتماد Runtime على المانح.
* تعديل مستودع المانح.
* تجاوز الترخيص أو الأمن.
* استيراد كود متناقض مع العقود الحالية.
* إعادة إدخال منطق محلي سبق توحيده.

أي قيمة مقتبسة يعاد بناؤها داخل:

* البنية الحالية.
* المالك الحالي.
* العقود الحالية.
* تصميم النظام الحالي.
* سياسات الأمن والمالية الحالية.

---

## 17. SaaS والعزل

عامل SaaS بوصفه بُعد جاهزية حاكمًا، لا بوصفه تفويضًا تلقائيًا للتفعيل التجاري.

فعّل فحوص SaaS الإضافية فقط عندما تمس الرحلة:

* tenant ownership.
* tenant context.
* tenant isolation.
* cross-tenant access.
* subscriptions.
* entitlements.
* metering.
* tenant billing.
* tenant lifecycle.
* white-labeling.
* custom domains.
* commercial SaaS activation.

عند الانطباق، افحص:

* tenant keys.
* query scoping.
* row ownership.
* cache isolation.
* event isolation.
* storage isolation.
* audit isolation.
* authorization boundaries.
* cross-tenant negative tests.
* deletion and retention lifecycle.
* tenant-bound idempotency.
* tenant-aware reconciliation.

يمنع إعلان:

```text
SAAS_ACTIVE
```

أو تنفيذ تفعيل تجاري أو Billing حقيقي دون تفويض مستقل وأدلة الحوكمة المطلوبة.

عدم انطباق SaaS يجب تسجيله:

```text
NOT_AFFECTED_WITH_REASON
```

ولا يجوز توسيع الرحلة تلقائيًا إلى مشروع SaaS كامل.

---

## 18. الأمن والمالية والمخاطر العالية

استخدم التصعيد الرسمي والمراجعة المستقلة عند مساس الرحلة بـ:

* authentication.
* sessions.
* RBAC.
* PII.
* secrets.
* tenant isolation.
* payments.
* wallet.
* ledger.
* settlement.
* commission.
* refund.
* reconciliation.
* production migration.
* CI governance.
* infrastructure.
* release.
* signing.
* SaaS activation.

المنفذ لا يعتمد عمله عالي المخاطر اعتمادًا نهائيًا بنفسه.

عند وجود حقيقة مالية، يلزم فصل واضح بين:

* منفذ التغيير.
* المراجع المالي المستقل.
* مراجع الجودة عند الانطباق.
* مراجع الأمن عند الانطباق.
* سلطة قبول المخاطر عند وجود خطر متبقٍ.

غياب الموافقة المستقلة لا يمنع إصلاح الكود، لكنه يمنع ادعاء `CLOSED_WITH_EVIDENCE`.

---

## 19. الوكلاء المتوازيون

استخدم وكيلًا منسقًا حاكمًا لتحديد:

* النطاق.
* الملكية.
* الرحلة المفتوحة.
* الشريحة المفتوحة.
* ترتيب الاعتماد.
* الملفات المسموح بها.
* نقاط الدمج.
* التحقق النهائي.

يمكن استخدام عدة وكلاء داخل **الشريحة الحالية نفسها** فقط عندما تكون مهامهم مستقلة فعليًا، مثل:

* وكيل لتحليل العقد.
* وكيل لتحليل قاعدة البيانات.
* وكيل لتحليل سطح مستقل.
* وكيل لاختبار جانب منفصل.

لكن:

* لا يفتح أي وكيل شريحة لاحقة.
* لا ينفذ أي وكيل رحلة لاحقة.
* لا يعمل وكيلان على مالك الحقيقة نفسه بالتوازي.
* لا يغلق أي وكيل الشريحة منفردًا.
* قرار إغلاق الشريحة يصدر بعد دمج نتائج الجميع والتحقق الموحد.

يمنع تعديل وكيلين بالتوازي لنفس:

* الملف.
* migration.
* OpenAPI contract.
* generated client.
* shared controller.
* state machine.
* permission model.
* truth owner.
* package manifest.
* generated output.

التعديلات المشتركة أو المولدة أو المتسلسلة تنفذ Serially.

يجب على المنسق:

* مراجعة تغييرات جميع الوكلاء.
* منع التكرار.
* منع التناقض.
* منع تجاوز النطاق.
* دمج النتائج منطقيًا.
* تنفيذ تحقق موحد بعد آخر كتابة.
* تأكيد بوابة الشريحة قبل فتح التالية.

لا يعتبر التوازي مبررًا لإنشاء تقارير متكررة أو فحوص مكررة.

---

## 20. الفحوص وGitHub Actions

ابدأ دائمًا بأصغر فحص مستهدف يثبت التغيير.

وسع الفحص فقط عند:

* تغيير Shared Brain.
* تغيير OpenAPI أو generated client.
* تغيير قاعدة البيانات أو migration.
* تغيير Runtime.
* تأثير متعدد الأسطح.
* ارتفاع المخاطر.
* فشل الفحص المستهدف.
* عدم وضوح الاعتماد.
* الحاجة إلى إثبات تكامل الرحلة بعد إغلاق الشرائح.

يشمل التحقق حسب الانطباق:

* typecheck.
* lint المستهدف.
* unit tests.
* contract tests.
* generated-client drift.
* backend tests.
* database tests.
* migration validation.
* permission tests.
* negative-state tests.
* idempotency tests.
* DSH/WLT boundary tests.
* runtime smoke.
* visual verification.
* accessibility verification.
* security verification.
* tenant-isolation verification.
* finance verification.
* governance guards.
* targeted CI.

لا تشغّل تلقائيًا:

* جميع الاختبارات.
* جميع Builds.
* جميع Nx projects.
* Graphify الكامل.
* جميع Workflows.
* جميع GitHub Actions.
* Jobs ناجحة سابقًا.
* فحوص رحلة أخرى غير مرتبطة.

استخدم Graphify فقط عند غموض:

* الملكية.
* الاعتماد.
* routing.
* duplication.
* dead code.

### Workflows المؤقتة

استخدم Workflow مؤقتًا فقط عندما لا توجد وسيلة حالية كافية لإثبات التغيير.

يجب أن يكون:

* `workflow_dispatch`.
* محدودًا بمسارات الرحلة.
* محدودًا بالفحوص المطلوبة.
* غير مشغل تلقائيًا لكل Push أو PR.
* بلا Source mutation.
* بلا Commit أو Push من داخل CI.
* بلا ازدواج مع Workflow قائم.
* غير ممتد إلى رحلات غير مرتبطة.

بعد نجاحه:

1. احتفظ برقم التشغيل والرابط والنتيجة كدليل مختصر.
2. احذف ملف Workflow المؤقت.
3. تحقق من حذف أثره.
4. ادفع Commit التنظيف.
5. أعد تثبيت رأس الفرع.

لا تحذف Workflow حاكمًا أو أمنيًا أو دائمًا دون:

* إثبات أنه قديم أو مكرر أو غير مستخدم.
* التحقق من عدم اعتماد بوابة حاكمة عليه.
* موافقة السلطة المالكة عند اشتراطها.

---

## 21. استراتيجية الكتابة والـCommits

نفّذ التغييرات مباشرة على `target_ref` المصرح به.

بعد كل وحدة منطقية مترابطة وآمنة:

1. راجع Diff كاملًا.
2. تحقق من عدم وجود ملفات غير مرتبطة.
3. نفّذ الفحص المستهدف.
4. أصلح أي فشل.
5. أعد الفحص بعد آخر تعديل.
6. أنشئ Commit واضحًا.
7. Push إلى `target_ref`.
8. أعد تثبيت `resolved_commit_sha`.

يفضل أن تمثل كل شريحة Commit واحدًا أو مجموعة Commits مترابطة وصغيرة، بحسب حجمها الفعلي.

استخدم رسائل مثل:

```text
fix(jrn-xxx): close <specific gap>
feat(jrn-xxx): implement <vertical capability>
refactor(jrn-xxx): consolidate <truth owner>
chore(jrn-xxx): remove obsolete <artifact>
test(jrn-xxx): prove <runtime or contract behavior>
```

يمنع:

* Force Push.
* Rewrite history.
* Commit ضخم يخلط رحلات متعددة بلا ضرورة.
* Commit تقارير فقط.
* Commit generated logs.
* Commit screenshots أو diagnostics افتراضيًا.
* حذف إنجازات موجودة.
* استبدال فرع كامل بفرع آخر.
* إنشاء PR أو Merge دون تفويض مستقل.
* خلط إصلاحات غير مرتبطة بالشريحة الحالية.
* دفع كود فاشل معروف دون مانع خارجي موثق.

---

## 22. بوابات الصفر قبل إنهاء الرحلة

لا تعتبر الرحلة جاهزة للمراجعة قبل أن تصبح جميع القيم المنطبقة داخل نطاقها صفرًا:

```yaml
unbound_ui_controls: 0
unbound_components_or_files: 0
frontend_only_features: 0
backend_only_features: 0
missing_backend_routes: 0
unused_required_backend_routes: 0
contract_client_drift: 0
request_schema_mismatches: 0
response_schema_mismatches: 0
enum_status_mismatches: 0
nullable_optional_mismatches: 0
permission_mismatches: 0
error_mapping_mismatches: 0
local_surface_business_logic: 0
raw_surface_api_calls: 0
duplicate_truth_owners: 0
ui_success_without_backend_effect: 0
backend_effect_without_ui_readback: 0
database_fields_without_contract_binding: 0
contract_fields_without_backend_binding: 0
runtime_mock_or_demo_truths: 0
obsolete_or_dead_code_in_scope: 0
unregistered_journey_capabilities: 0
unclosed_registered_slices: 0
unclosed_discovered_slices: 0
cross_slice_integration_gaps: 0
unresolved_internal_gaps: 0
failed_required_checks: 0
runtime_journeys_unverified: 0
open_security_blockers: 0
open_financial_blockers: 0
open_isolation_blockers: 0
```

يجب أيضًا إثبات:

* اكتمال `FS-01..FS-18`.
* إغلاق جميع الشرائح الوظيفية المسجلة.
* إغلاق جميع الشرائح الإضافية المكتشفة.
* تطابق قاعدة البيانات والعقود والباك إند والعملاء والعقل المشترك والأسطح.
* عدم وجود منطق في غير مالكه.
* عدم وجود بيانات تشغيلية وهمية.
* نجاح السيناريو الأساسي.
* نجاح السيناريوهات السلبية الحرجة.
* نجاح القراءة الراجعة.
* نجاح التكامل بين الشرائح.
* نجاح الفحوص المنطبقة على الرأس نفسه.
* توثيق أي استبعاد بسبب تقني واضح.

---

## 23. القرارات الحاكمة

استخدم المفردات القانونية التالية فقط:

### `PASS`

نطاق دليل محدد نجح، مثل:

```text
PASS — evidence_scope: static
PASS — evidence_scope: runtime
PASS — evidence_scope: visual
```

لا يعني نجاح نطاق واحد نجاح النطاقات الأخرى.

### `FIX_REQUIRED`

يوجد شرط قبول داخل النطاق فشل ويحتاج تغييرًا في المستودع.

لا تكتفِ بإخراج القرار؛ استمر في الإصلاح ما دام الإصلاح ممكنًا.

### `NEEDS_EVIDENCE`

قد يكون التنفيذ موجودًا، لكن دليل الادعاء مفقود أو قديم.

أنشئ الدليل المستهدف ما دام ذلك ممكنًا داخل بيئة التنفيذ.

### `BLOCKED_EXTERNAL`

المتابعة تعتمد فعلًا على صلاحية أو اعتماد مستقل أو جهاز أو سر أو Provider أو بنية خارج حدود التنفيذ.

### `READY_FOR_REVIEW`

تم تنفيذ التغييرات، وأغلقت الفجوات الداخلية، وأغلقت جميع الشرائح، ونجحت الفحوص المستهدفة، وأصبح الرأس جاهزًا للمراجعات المستقلة المطلوبة.

هذه ليست موافقة نهائية وليست إغلاقًا إنتاجيًا.

### `CLOSED_WITH_EVIDENCE`

لا تستخدم إلا عندما:

* نجحت كل نطاقات الأدلة المنطبقة.
* كانت الأدلة على commit واحد غير متغير.
* تمت كل الموافقات المستقلة المطلوبة.
* لا يوجد Fail أو Blocked أو Pending.
* تم إثبات متطلبات Runtime وQA والأمن والمالية والعزل والـCI والRelease والإنتاج حسب الأثر.

### `PROTOCOL_VIOLATION`

حدث تجاوز للسلطة أو النطاق أو المرجع أو السلامة أو عقد الأدلة أو قاعدة الإغلاق المتسلسل.

يمنع استخدام المسميات القديمة أو غير الحاكمة:

```text
IMPLEMENTATION_PASS
READY_FOR_PR
BLOCKED_NEEDS_EVIDENCE
GATE_PASS
CLOSED
```

---

## 24. الانتقال بين الرحلات

داخل `journey_selection` المصرح به:

1. أكمل الرحلة الحالية شريحةً بعد شريحة.
2. أغلق كل شريحة قبل فتح التالية.
3. أغلق جميع الشرائح المسجلة والمكتشفة.
4. أصلح جميع الفجوات الداخلية.
5. ادفع تغييرات الرحلة إلى الفرع.
6. أعد تثبيت الرأس.
7. نفّذ التحقق التكاملي النهائي للرحلة.
8. تحقق من بوابات الصفر.
9. أخرج `READY_FOR_REVIEW` أو `CLOSED_WITH_EVIDENCE` حسب الأدلة والصلاحيات المتاحة.
10. انتقل تلقائيًا إلى الرحلة التالية داخل النطاق.

لا تنتقل عند وجود:

* شريحة مفتوحة.
* شريحة فاشلة.
* فجوة داخلية قابلة للإصلاح.
* كسر في عقد مشترك.
* Frontend/Backend disconnection.
* migration غير آمنة.
* تضارب ملكية.
* خطأ Runtime مثبت.
* Workflow فاشل متعلق بالرحلة.
* readback غير مكتمل.
* فجوة تكامل بين الشرائح.
* قدرة مكتشفة غير مسجلة.

توقف فقط عند:

* `BLOCKED_EXTERNAL`.
* `PROTOCOL_VIOLATION`.
* انتهاء جميع الرحلات المصرح بها.

لا تبدأ رحلة خارج `journey_selection`.

---

## 25. تقرير التقدم المختصر بعد كل شريحة

بعد كل شريحة، أخرج فقط:

```yaml
repository:
target_ref:
resolved_commit_sha:

journey:
slice:
slice_status:

root_cause:
changed_paths:
change_type:
implemented:
deleted_or_consolidated:

verification:
slice_zero_gate:
result:
commit:
next_slice:
```

يجب أن تكون `slice_status` واحدة من:

```text
IN_PROGRESS
FIX_REQUIRED
BLOCKED_EXTERNAL
READY_TO_CLOSE
CLOSED
```

لا تضع `CLOSED` إلا بعد نجاح بوابات الشريحة.

لا تعِد سرد الأمر أو البروتوكول.

لا تنشئ ملفات تقارير داخل المستودع إلا عندما يفرضها عقد حاكم أو خطر مرتفع.

---

## 26. التقرير النهائي لكل رحلة

بعد إنهاء كل رحلة، أخرج:

```yaml
repository_mode: REMOTE_ONLY
repository:
target_ref:
resolved_commit_sha:

journey_id:
journey_name:
journey_registry_status:

registered_slices:
discovered_slices:
closed_slices:
open_slices: 0

covered_layers:
covered_surfaces:
excluded_surfaces_with_reason:

implemented_capabilities:
fixed_root_causes:
cleaned_or_deleted_artifacts:
shared_truth_owners:
database_changes:
contract_changes:
backend_changes:
shared_brain_changes:
surface_changes:
runtime_changes:

commits:
targeted_checks:
evidence_scopes_passed:
independent_approvals_obtained:
independent_approvals_remaining:

zero_gate:
  unbound_ui_controls:
  unbound_components_or_files:
  frontend_only_features:
  backend_only_features:
  contract_client_drift:
  permission_mismatches:
  local_surface_business_logic:
  duplicate_truth_owners:
  runtime_mock_or_demo_truths:
  obsolete_or_dead_code_in_scope:
  unclosed_registered_slices:
  unclosed_discovered_slices:
  cross_slice_integration_gaps:
  unresolved_internal_gaps:
  failed_required_checks:
  runtime_journeys_unverified:

decision:
remaining_external_blockers:
remaining_risks:
next_authorized_journey:
```

---

## 27. التقرير النهائي للنطاق الكامل

بعد إنهاء آخر رحلة مصرح بها:

```yaml
repository_mode: REMOTE_ONLY
repository: bthwani2-boop/bthwani-suite-next
target_ref: sambassam
base_ref: master
final_resolved_commit_sha:

authorized_journeys:
completed_journeys:
ready_for_review_journeys:
closed_with_evidence_journeys:
blocked_journeys:

total_registered_slices:
total_discovered_slices:
total_closed_slices:
total_open_slices: 0

total_commits:
total_changed_paths:
total_deleted_obsolete_paths:
total_consolidated_truth_owners:
total_fixed_contract_mismatches:
total_fixed_surface_bindings:

checks_executed:
workflow_runs:
temporary_workflows_removed:

open_internal_gaps: 0
open_external_blockers:
required_independent_reviews:
final_decision:
```

ثم توقف.

لا تنشئ Pull Request، ولا تنفذ Merge، ولا تبدأ نطاقًا جديدًا دون أمر مستقل.

---

## 28. النتيجة المطلوبة

الهدف هو تنفيذ وتنظيف وتشطيب وربط كل رحلة مصرح بها بحيث تصبح:

* موحدة فول ستاك.
* متعددة الأسطح دون انفصال.
* منفذة شريحةً بعد شريحة.
* قائمة على مالك حقيقة واحد.
* متطابقة بين الواجهة والباك إند وقاعدة البيانات والعقود.
* خالية من المنطق المحلي والتكرار.
* خالية من البيانات التشغيلية الوهمية.
* خالية من الأزرار والصفحات والـroutes غير المربوطة.
* خالية من القديم والضجيج داخل النطاق.
* مثبتة بفحوص مستهدفة على الرأس نفسه.
* جاهزة للمراجعة المستقلة دون ادعاء إغلاق غير مثبت.

ابدأ الآن من GitHub Remote:

```text
ثبّت target_ref
→ استخرج الرحلات المصرح بها
→ افتح الرحلة الأولى فقط
→ استخرج جميع شرائحها
→ رتّب الشرائح
→ افتح الشريحة الأولى فقط
→ نفّذها وأغلقها
→ انتقل للشريحة التالية
→ أغلق جميع شرائح الرحلة
→ تحقق من الرحلة كاملة
→ انتقل إلى الرحلة التالية داخل النطاق
```

والقاعدة النهائية غير القابلة للتجاوز:

```text
لا شريحة تالية قبل إغلاق الشريحة الحالية.
لا رحلة تالية قبل إغلاق جميع شرائح الرحلة الحالية.
لا إغلاق للرحلة قبل تحقق التكامل الكامل وبوابات الصفر.
```
