# 06 — التنظيم، الأداء، التنظيف، التجميع، والتسلسل

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `06/09`  
**Repository:** `bthwani2-boop/bthwani-suite-next`  
**Remote ref:** `start`  
**Source path:** `tools/plan/command_operational_journey_unified`  
**GitHub file SHA observed:** `617ed1f69bc91d42ce8c433b92c252b7abda2ce3`  
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
