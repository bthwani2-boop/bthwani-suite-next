# 06 — التنظيم، الأداء، التنظيف، التجميع، والتسلسل

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `06/09`  
**Repository:** `<REPO_REMOTE>`  
**Remote ref:** `<REF>`  
**Source path:** `tools/plan/command_operational_journey_unified`  
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`  
**Scope:** topic_file_organization/consolidation/journey_sequence matrices، تنظيم الملفات، الأداء، الحذف/النقل/الدمج، والمراجع الخارجية.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 11 ملفًا (بعد إضافة Amendment). لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md`.

---
## 17) matrices إلزامية — تابع

### 17.12 topic_file_organization_matrix

```yaml
topic_file_organization_matrix:
  shared_brain:
    topic_folder:
    files:
      - path:
        responsibility:
        line_count:
        naming_status: PASS | FAIL | N/A
        size_status: PASS | REVIEW_SPLIT | MUST_SPLIT
        ownership_status: PASS | FAIL | N/A
        action: KEEP_ACTIVE | REFACTOR_SPLIT | MERGE_DUPLICATE | RETIRE_DEAD | MOVE_TO_OWNER | FIX_REQUIRED | BLOCKED_NEEDS_EVIDENCE
  surfaces:
    app-client:
      role: REQUIRED | READ_ONLY | FORBIDDEN | NOT_APPLICABLE
      topic_folder:
      files:
        - path:
          responsibility:
          line_count:
          imports_shared_brain: PASS | FAIL | N/A
          direct_api_absence: PASS | FAIL | N/A
          local_business_logic_absence: PASS | FAIL | N/A
          process_env_absence: PASS | FAIL | N/A
          storage_access_absence: PASS | FAIL | N/A
          raw_api_mapping_absence: PASS | FAIL | N/A
          cross_service_internal_import_absence: PASS | FAIL | N/A
          size_status: PASS | REVIEW_SPLIT | MUST_SPLIT
          naming_status: PASS | FAIL | N/A
          action:
    app-partner:
      role:
      topic_folder:
      files:
    app-field:
      role:
      topic_folder:
      files:
    app-captain:
      role:
      topic_folder:
      files:
    control-panel:
      role:
      topic_folder:
      files:
```

قواعد:

- أي سطح غير مذكور = `FIX_REQUIRED`.
- أي ملف بلا responsibility = `FIX_REQUIRED`.
- أي ملف كبير بلا split decision = `FIX_REQUIRED`.
- أي اسم غامض = `FIX_REQUIRED`.
- أي business logic داخل surface = `FIX_REQUIRED`.

### 17.13 consolidation_matrix

```yaml
consolidation_matrix:
  duplicated_or_scattered_items:
    - item:
      current_paths:
      problem:
      canonical_owner:
      required_action: MERGE_DUPLICATE | MOVE_TO_OWNER | REFACTOR_SPLIT | RETIRE_DEAD | KEEP_ACTIVE
      verification_command:
  missing_items:
    - item:
      required_owner:
      why_required:
      required_action:
      verification_command:
  contradictions:
    - item:
      conflicting_paths:
      expected_truth_owner:
      required_action:
      verification_command:
```

أي عنصر مكرر أو متشظي بلا قرار = `FIX_REQUIRED`.

### 17.14 journey_sequence_matrix

```yaml
journey_sequence_matrix:
  current_journey:
  previous_related_journeys:
    - name:
      status: PASS | FIX_REQUIRED | BLOCKED_NEEDS_EVIDENCE
      evidence:
      remaining_gaps:
      dependency_on_current_journey:
  prerequisites:
    - item:
      status: PASS | FIX_REQUIRED | BLOCKED_NEEDS_EVIDENCE
      verification_command:
  carry_forward_items:
    - item:
      source_journey:
      reason_carried_forward:
      required_owner:
      required_action:
      verification_command:
  execution_order:
    - step:
      reason:
      blocks:
      verification_command:
```

قواعد:

- لا يجوز تنفيذ رحلة جديدة كأنها معزولة عما سبق.
- إذا كانت الرحلة تعتمد على نقص سابق مانع: `FIX_REQUIRED`.
- إذا كان النقص خارج النطاق ولا يمنع: يسجل في carry_forward.
- لا يعاد فتح PASS إلا بدليل تناقض جديد.
- أي carry_forward بلا مالك أو سبب أو أمر تحقق = `FIX_REQUIRED`.

---

## 18) تنظيم الملفات والأداء

### 18.1 فحص الأداء كوديًا

أي رحلة يجب أن تثبت أنها لا تضيف بطئًا أو تعقيدًا غير مبرر عبر:

```text
عدم تنفيذ عمليات ثقيلة داخل render
عدم بناء view-models داخل surface إذا كان مكانها shared
عدم تكرار API calls بين الأسطح لنفس المصدر
عدم وجود fetch/axios مباشر داخل surfaces
عدم تحميل بيانات كبيرة دفعة واحدة إذا كانت تحتاج pagination/filtering/lazy loading
عدم وجود loops أو transforms مكلفة داخل components
عدم تمرير raw API response إلى UI مباشرة
عدم تكرار mapping أو formatting بين الأسطح
عدم استيراد index واسع يسبب تحميلًا غير مطلوب
عدم وضع constants ضخمة أو fixtures أو mock data داخل runtime path
عدم وجود preview/demo/mock runtime truth
```

أي خلل أداء مثبت داخل النطاق = `FIX_REQUIRED`.

### 18.2 قواعد حجم الملفات

Frontend:

```text
screen/component file > 350 سطر = FIX_REQUIRED إلا بسبب معماري موثق
screen/component file > 500 سطر = MUST_SPLIT
shared controller/hook > 300 سطر = REVIEW_SPLIT
ملف يخلط types + controller + UI + constants + API client = MUST_SPLIT
ملف بأكثر من مسؤولية = REFACTOR_SPLIT
Topic بلا تقسيم واضح = FIX_REQUIRED
```

Backend:

```text
backend handler file > 400 سطر = REVIEW_SPLIT
backend service/repository > 500 سطر = REVIEW_SPLIT
handler يخلط routing + validation + business rules + persistence = MUST_SPLIT
repository يحتوي business decision logic = FIX_REQUIRED
```

### 18.3 قواعد التسمية

ممنوع:

```text
new
old
temp
final
final2
test2
copy
backup
legacy
random
helpers.ts يحتوي منطقًا حاكمًا غير مصنف
utils.ts يحتوي منطقًا حاكمًا غير مصنف
```

النمط داخل shared:

```text
<topic>.types.ts
<topic>.state.ts
<topic>.view-model.ts
<topic>.controller.ts
<topic>.api.ts
<topic>.adapters.ts
<topic>.policy.ts
<topic>.validation.ts
<topic>.constants.ts
<topic>.index.ts
```

النمط داخل surface:

```text
<Topic>Screen.tsx
<Topic>Section.tsx
<Topic>Card.tsx
<Topic>Row.tsx
<Topic>EmptyState.tsx
<Topic>ErrorState.tsx
<Topic>LoadingState.tsx
```

### 18.4 Topic folder organization

DSH shared:

```text
services/dsh/frontend/shared/<topic>/
  index.ts
  <topic>.types.ts
  <topic>.state.ts
  <topic>.view-model.ts
  <topic>.controller.ts
  <topic>.api.ts
  <topic>.adapters.ts
  <topic>.policy.ts
  <topic>.validation.ts
  <topic>.constants.ts
```

WLT-for-DSH shared:

```text
services/wlt/frontend/shared/dsh/<topic>/
  index.ts
  <topic>.types.ts
  <topic>.state.ts
  <topic>.view-model.ts
  <topic>.controller.ts
  <topic>.api.ts
  <topic>.adapters.ts
  <topic>.policy.ts
  <topic>.validation.ts
  <topic>.constants.ts
```

Surface topic folder:

```text
services/<service>/frontend/<surface>/<topic>/
  <Topic>Screen.tsx
  components/
    <Topic>Section.tsx
    <Topic>Card.tsx
    <Topic>Row.tsx
    <Topic>EmptyState.tsx
    <Topic>ErrorState.tsx
    <Topic>LoadingState.tsx
```

ممنوع داخل surface topic folder:

```text
api.ts
repository.ts
controller.ts
state-machine.ts
policy.ts
validation.ts
permission.ts
lifecycle.ts
financial logic
duplicated domain types
```

---

## 24) حذف/نقل/دمج الملفات

قبل حذف أو نقل أو دمج أي ملف، يجب إثبات حالته عبر:

```text
imports/exports
routes/navigation
manifests/registry
tests
guards
Graphify/Nx إن وجد
runtime usage
API/client bindings
OpenAPI references
database references
```

قرار الملف يجب أن يكون واحدًا فقط:

```text
KEEP_ACTIVE
REFACTOR_SPLIT
MERGE_DUPLICATE
RETIRE_DEAD
MOVE_TO_OWNER
FIX_REQUIRED
BLOCKED_NEEDS_EVIDENCE
```

```yaml
file_decision_matrix:
  - path:
    current_role:
    references_checked:
    decision:
    reason:
    risk:
    required_action:
    verification_command:
```

---

### 24.1 قاعدة التنظيف والتشطيب النهائي الشامل (Zero-Defect Closure)

قبل أي `PASS` أو `IMPLEMENTATION_PASS` أو `MERGE_READY`، يجب فحص كل عنصر داخل النطاق (ملف/route/handler/matrix row) مقابل كل فئة من فئات العيوب التالية دون استثناء واحد. هذه الطبقة تدقيق نهائي فوق `topic_file_organization_matrix` و`consolidation_matrix` و`file_decision_matrix`، ولا تحل محلها.

```yaml
zero_defect_closure_matrix:
  scope_item:
  defect_categories_checked:
    errors:
      definition: "منطق خاطئ، route/handler/client مكسور، تعارض بين الكود والعقد/OpenAPI"
      status: PASS | FAIL | N/A
      evidence:
    deficiency_gaps:
      definition: "نقص وظيفي أو توثيقي أو اختباري، حالة غير معالجة، حقل matrix فارغ"
      status: PASS | FAIL | N/A
      evidence:
    contradiction:
      definition: "تعارض بين مصدرين للحقيقة، بين الأدلة والادعاء، أو بين ملفين يصفان نفس الشيء بشكل مختلف"
      status: PASS | FAIL | N/A
      evidence:
    scattering_fragmentation:
      definition: "نفس المسؤولية موزعة في أكثر من مكان بلا مالك واحد (canonical_owner)"
      status: PASS | FAIL | N/A
      evidence:
    duplication:
      definition: "كود أو منطق أو نوع أو مسار مكرر بلا سبب معماري موثق"
      status: PASS | FAIL | N/A
      evidence:
    dead_content:
      definition: "كود/ملف/route/export غير مستخدم في أي import أو route أو test أو runtime"
      status: PASS | FAIL | N/A
      evidence:
    leakage:
      definition: >-
        تسرب أي نوع من مالكه الصحيح إلى مكان غير مخوّل، ويشمل دون حصر: تسرب مالي خارج WLT،
        تسرب business logic/state/validation/permission/lifecycle إلى surfaces، تسرب process.env
        أو أسرار أو مفاتيح إلى كود عميل/شاشات، تسرب raw API response إلى UI، تسرب بيانات داخلية
        عبر حقول API عامة، تسرب mock/demo/preview كحقيقة تشغيلية.
      status: PASS | FAIL | N/A
      evidence:
    other_defective_state:
      definition: "أي حالة أخرى لا تندرج تحت ما سبق لكنها تخالف قواعد الحجم/التسمية/التنظيم في هذا الملف"
      status: PASS | FAIL | N/A
      evidence:
  final_decision: KEEP_ACTIVE | REFACTOR_SPLIT | MERGE_DUPLICATE | RETIRE_DEAD | MOVE_TO_OWNER | FIX_REQUIRED | BLOCKED_NEEDS_EVIDENCE
```

قواعد صارمة:

```text
أي فئة أعلاه بحالة FAIL أو بلا evidence = FIX_REQUIRED فورًا، بغض النظر عن حالة الفئات الأخرى.
لا يجوز final_decision: KEEP_ACTIVE إذا كانت أي فئة N/A بلا مبرر موثق داخل evidence.
تعريف leakage هنا يوسّع ويُلزم بند 28 في 09_ACCEPTANCE_QUICK_COMMAND_CLOSE.md (لا تسرب مالي خارج WLT) ليشمل كل أنواع التسرب لا المالي فقط.
هذا الجدول إلزامي على كل عنصر داخل النطاق بلا استثناء، ولا يجوز اعتبار الرحلة PASS ما لم يكتمل لكل عنصر.
```

### 24.2 التنفيذ الإلزامي المباشر — منع FIX_REQUIRED المعلّق ومنع التشخيص فقط

`FIX_REQUIRED` ليس مخرجًا نهائيًا مقبولًا لإغلاق أي عنصر عندما تسمح مهمة الرحلة بالتنفيذ. **تشخيص بلا تنفيذ = مخرج غير مقبول عند `task_mode: implementation_or_closure`.** القاعدة تُطبَّق حسب `task_mode` المعرّف في `01_COMMAND_INPUTS_RESULTS.md` و`03_SCOPE_TOPOLOGY_OWNERSHIP_DONOR.md`:

```text
عند task_mode: implementation_or_closure
  - الوكيل يملك صلاحية تنفيذية كاملة ومسبقة (Full Execution Authority) داخل حدود النطاق المعرّف في 03، بلا حاجة لتأكيد بشري إضافي لكل خطوة على حدة، على أن يبقى كل تنفيذ داخل شجرة العمل المحلية فقط (انظر القيد أدناه).
  - أي فئة FAIL في zero_defect_closure_matrix يجب معالجتها مباشرة وفوريًا في الكود الحي داخل النطاق أثناء نفس الجلسة، وليس فقط توصيفها أو جدولتها لاحقًا:
      dead_content        -> حذف مباشر للملف/الكود/المجلد غير المستخدم (RETIRE_DEAD)، بعد فحص 24 (imports/routes/manifests/tests/guards/runtime/API/OpenAPI/database)
      duplication         -> دمج فعلي في مالك واحد (MERGE_DUPLICATE)
      scattering_fragmentation -> نقل فعلي إلى canonical_owner (MOVE_TO_OWNER)
      deficiency_gaps      -> إضافة فعلية للناقص (كود/اختبار/توثيق/حقل matrix) وليس فقط الإشارة إليه
      other_defective_state / errors -> إصلاح فعلي أو تقسيم (REFACTOR_SPLIT / FIX)
      contradiction        -> حسم فعلي لمصدر الحقيقة الواحد (SSOT) وحذف/تصحيح النسخة المتعارضة
      leakage              -> إزالة فعلية للتسرب من مكانه غير المخوّل وإعادته لمالكه الصحيح
  - يُمنع منعًا باتًا: تأجيل التنفيذ، الاكتفاء بتقرير تشخيصي، اقتراح خطة دون تطبيقها، أو "الهروب" من فئة FAIL بتصنيفها N/A بلا مبرر موثق.
  - يُمنع تسليم أي مخرج يحتوي بندًا واحدًا بحالة FIX_REQUIRED دون تنفيذ فعلي، إلا إذا تحوّل فعليًا إلى BLOCKED_NEEDS_EVIDENCE بسبب نقص إثبات حقيقي (بيئة/وصول/بيانات لا يملكها الوكيل) — وهذا الاستثناء الوحيد المقبول، وليس هروبًا من التنفيذ بل حالة موثقة بدليل صريح.
  - الهدف الرقمي الملزم لكل عنصر داخل النطاق: صفر أخطاء، صفر تناقض، صفر تكرار، صفر فجوات، صفر ضجيج (لا تقارير بلا تنفيذ)، صفر ضعف أو نقص في المنطق أو التشغيل، صفر تشتت/تبعثر، صفر فشل، وصفر عيوب — وأي عنصر لا يحقق هذا كاملًا يبقى `FIX_REQUIRED` وواجب المعالجة الفورية في نفس الجلسة، لا التالية.
  - الحذف/النقل/الدمج/الإضافة/التعديل هنا كلها تعديلات في شجرة العمل المحلية ضمن نطاق التنفيذ المصرّح به فقط، ولا تُلغي Human-Gated Git/GitHub Change Control في 02_REMOTE_REF_SOURCE_GIT_GATES.md: أي commit/push/PR/merge/tag/release يبقى ممنوعًا دون أمر بشري مستقل صريح. الصلاحية الكاملة هنا صلاحية تنفيذ كود، لا صلاحية Git/GitHub.

عند task_mode: analysis_only أو merge_review
  - يُمنع التنفيذ المباشر (لا حذف ولا تعديل كود) لأن المهمة نفسها لا تخوّل ذلك.
  - لكن يُمنع أيضًا إغلاق أي فئة FAIL بدون required_action + required_owner + verification_command صريحة وقابلة للتنفيذ لاحقًا، حتى لا يتحول zero_defect_closure_matrix إلى تقرير ضجيج بلا قرار.
```

قواعد صارمة إضافية:

```text
أي زيارة implementation_or_closure لاحقة على نفس النطاق تجد فئة FAIL سبق توصيفها ولم تُعالج بلا BLOCKED_NEEDS_EVIDENCE موثق = PROTOCOL_VIOLATION (تراكم عيوب غير معالجة عبر رحلات متتالية).
أي وكيل ينتج تقرير تشخيص فقط (بلا تنفيذ فعلي) عند task_mode: implementation_or_closure دون أن يحوّل كل بند إلى BLOCKED_NEEDS_EVIDENCE موثق = PROTOCOL_VIOLATION.
لا يجوز تبرير التأجيل بعبارات عامة مثل "يفضّل لاحقًا" أو "خارج الوقت الحالي" ما لم يكن ذلك موثقًا كـ BLOCKED_NEEDS_EVIDENCE بسبب محدد وقابل للتحقق.
```

---

## 25) External Reference Rule

استخدم مصادر خارجية رسمية أو مفتوحة موثوقة فقط عند وجود فجوة لا يمكن حسمها من الريبو أو العقود أو المانح.

يجب توثيق:

```yaml
external_reference_record:
  gap:
  why_repo_is_insufficient:
  source_used:
  adopted_practice:
  project_application:
  code_evidence:
  dependency_added: true | false
  dependency_impact_check:
```

ممنوع:

```text
نسخ كود خارجي عشوائي
إدخال dependency جديدة دون سبب مباشر
تغيير architecture بسبب مثال خارجي دون فحص أثر
```

---
