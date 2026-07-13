# 06 — التنظيم، الأداء، التنظيف، التجميع، والتسلسل

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `06 of 12`
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** topic_file_organization/consolidation/journey_sequence matrices، تنظيم الملفات، الأداء، الحذف/النقل/الدمج، والمراجع الخارجية.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---

## 17) matrices إلزامية — تابع

### 17.12) topic_file_organization_matrix

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

---

### 17.13) consolidation_matrix

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

---

### 17.14) journey_sequence_matrix

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

### 18.1) Performance & Speed Code Checks

أي رحلة يجب أن تثبت أنها لا تضيف بطئًا أو تعقيدًا غير مبرر عبر:

- عدم تنفيذ عمليات ثقيلة داخل render.
- عدم بناء view-models داخل surface إذا كان مكانها shared.
- عدم تكرار API calls بين الأسطح لنفس المصدر.
- عدم وجود fetch/axios مباشر داخل surfaces.
- عدم تحميل بيانات كبيرة دفعة واحدة إذا كانت تحتاج pagination/filtering/lazy loading.
- عدم وجود loops أو transforms مكلفة داخل components.
- عدم تمرير raw API response إلى UI مباشرة.
- عدم تكرار mapping أو formatting بين الأسطح.
- عدم استيراد index واسع يسبب تحميلًا غير مطلوب.
- عدم وضع constants ضخمة أو fixtures أو mock data داخل runtime path.
- عدم وجود preview/demo/mock runtime truth.

أي خلل أداء مثبت داخل النطاق = `FIX_REQUIRED`.

### 18.2) File Size Rules

Frontend File Size Rules:

- screen/component file > 350 سطر = `FIX_REQUIRED` إلا بسبب معماري موثق.
- screen/component file > 500 سطر = `MUST_SPLIT`.
- shared controller/hook > 300 سطر = `REVIEW_SPLIT`.
- ملف يخلط types + controller + UI + constants + API client = `MUST_SPLIT`.
- ملف بأكثر من مسؤولية = `REFACTOR_SPLIT`.
- Topic بلا تقسيم واضح = `FIX_REQUIRED`.

Backend File Size Rules:

- backend handler file > 400 سطر = `REVIEW_SPLIT`.
- backend service/repository > 500 سطر = `REVIEW_SPLIT`.
- handler يخلط routing + validation + business rules + persistence = `MUST_SPLIT`.
- repository يحتوي business decision logic = `FIX_REQUIRED`.

### 18.3) Naming Rules

ممنوع استخدام: `new` | `old` | `temp` | `final` | `final2` | `test2` | `copy` | `backup` | `legacy` | `random` | `helpers.ts` أو `utils.ts` يحتوي منطقًا حاكمًا غير مصنف.

النمط داخل shared:

- `<topic>.types.ts`
- `<topic>.state.ts`
- `<topic>.view-model.ts`
- `<topic>.controller.ts`
- `<topic>.api.ts`
- `<topic>.adapters.ts`
- `<topic>.policy.ts`
- `<topic>.validation.ts`
- `<topic>.constants.ts`
- `<topic>.index.ts`

النمط داخل surface:

- `<Topic>Screen.tsx`
- `<Topic>Section.tsx`
- `<Topic>Card.tsx`
- `<Topic>Row.tsx`
- `<Topic>EmptyState.tsx`
- `<Topic>ErrorState.tsx`
- `<Topic>LoadingState.tsx`

### 18.4) Topic Folder Organization

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
`api.ts` | `repository.ts` | `controller.ts` | `state-machine.ts` | `policy.ts` | `validation.ts` | `permission.ts` | `lifecycle.ts` | `financial logic` | `duplicated domain types`.

---

## 24) حذف/نقل/دمج الملفات

قبل حذف أو نقل أو دمج أي ملف، يجب إثبات سلامة العملية كوديًا وعدم وجود أي ارتباط معلّق عبر البوابات التالية:

1. `imports` (الاستيرادات المباشرة)
2. `exports` (التصديرات التي تعتمد عليها ملفات أخرى)
3. `routes` (مسارات التوجيه والتوصيل)
4. `navigation` (شجرة التنقل ومMounting الأسطح)
5. `screen registry` (سجل تسجيل الشاشات والتطبيقات)
6. `runtime dependency` (التبعيات التشغيلية وقت التنفيذ)
7. `API/client binding` (روابط توليد العملاء والاتصال بالخادم)
8. `OpenAPI generated consumer` (مستهلكات العقود المولّدة)
9. `tests` (ملفات الاختبارات والـ assertions)
10. `guards` (ملفات الحراس وبوابات الفحص)
11. `CI` (ملفات بناء وتدقيق بيئة التطوير المستمر)
12. `docs that are executable or command-bearing` (ملفات الحوكمة أو التوثيق المنفذ للمهام)
13. `package scripts` (أوامر تشغيل الحزم و scripts)
14. `workspace references` (المراجع العامة ومسارات Nx والـ monorepo)

القرار النهائي لكل ملف خاضع للتحقيق يجب أن يكون واحدًا مما يلي:
`KEEP_ACTIVE` | `REFACTOR_SPLIT` | `MERGE_DUPLICATE` | `RETIRE_DEAD` | `MOVE_TO_OWNER` | `FIX_REQUIRED` | `BLOCKED_NEEDS_EVIDENCE`

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

### 24.1) zero_defect_closure_matrix

قبل أي `PASS` أو `IMPLEMENTATION_PASS` أو `MERGE_READY`، يجب فحص كل عنصر داخل النطاق (ملف/route/handler/matrix row) مقابل مصفوفة الخلو من العيوب الإلزامية:

```yaml
zero_defect_closure_matrix:
  path:
  owner:
  responsibility:
  linked_runtime:
  linked_api:
  linked_database:
  linked_tests:
  duplicate_status: PASS | FAIL | N/A
  dead_code_status: PASS | FAIL | N/A
  contradiction_status: PASS | FAIL | N/A
  leakage_status: PASS | FAIL | N/A
  performance_status: PASS | FAIL | N/A
  naming_status: PASS | FAIL | N/A
  file_size_status: PASS | FAIL | N/A
  final_decision: KEEP_ACTIVE | REFACTOR_SPLIT | MERGE_DUPLICATE | RETIRE_DEAD | MOVE_TO_OWNER | FIX_REQUIRED | BLOCKED_NEEDS_EVIDENCE
  required_action:
  verification_command:
```

قواعد صارمة:

- أي فحص بحالة FAIL أو بلا evidence = `FIX_REQUIRED` فورًا.
- لا يجوز `KEEP_ACTIVE` إذا كانت أي فئة N/A بلا مبرر موثق.
- تعميم فحص التسرب (leakage_status) ليشمل: تسرب مالي خارج WLT، تسرب logic إلى surfaces، تسرب process.env/أسرار، تسرب raw API response، تسرب mock/demo/preview كحقيقة تشغيلية.

---

### 24.2) implementation_or_closure_no_pending_fix_rule — التنفيذ الإلزامي المباشر ومنع التشخيص فقط

عند `task_mode: implementation_or_closure`:

- يُحظر الاكتفاء بالتقرير أو التشخيص أو الخطة؛ **أي فئة FAIL في المصفوفة يجب معالجتها مباشرة وفوريًا في الكود الحي داخل شجرة العمل المحلية**:
  - `dead_content` -> حذف مباشر (RETIRE_DEAD) بعد التحقق من بوابات 24.
  - `duplication` -> دمج فعلي (MERGE_DUPLICATE).
  - `scattering_fragmentation` -> نقل فعلي إلى canonical_owner.
  - `deficiency_gaps` -> إضافة فعلية للمنطق أو الحقل الناقص.
  - `leakage` -> سحب وإعادة المنطق لمالكه الصحيح.
- عند `TASK=implementation_or_closure`، لا يجوز ترك `FIX_REQUIRED` داخل النطاق كتشخيص فقط إذا كان قابلًا للإصلاح داخل الريبو؛ يجب تنفيذ الإصلاح في الكود/الملف الحي.
- الاستثناء الوحيد هو التحول إلى `BLOCKED_NEEDS_EVIDENCE` بسبب نقص وصول أو بيئة غير متاحة فعليًا للوكيل.

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

ممنوع: نسخ كود عشوائي، أو إدخال dependency جديدة دون سبب وفحص أثر.
