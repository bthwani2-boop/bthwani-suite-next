# 02 — بوابات GitHub Remote والمصدر والتحكم البشري

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `02/11`
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** REF Resolution Gate، Human-Gated Git/GitHub، تعريف 100%، المصدر الحاكم، منع machine-readable، وبروتوكول القرار.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---
## 4) بوابة حل REF من GitHub Remote

قبل أي قراءة أو تحليل أو تنفيذ، يجب حل `REF` مباشرة من GitHub Remote.

### 4.1 القواعد

- يجب حل `REF` كـ branch أو tag أو commit.
- ممنوع البحث عن فروع مشابهة.
- ممنوع الانتقال إلى default branch.
- ممنوع الاعتماد على local branch.
- ممنوع تحليل أي commit غير resolved commit.
- يجب تسجيل SHA النهائي في التقرير.

### 4.2 أوامر التحقق المقترحة

```powershell
Set-Location -LiteralPath "<REPO_LOCAL>"
git ls-remote --heads origin <REF>
git ls-remote --tags origin <REF>
git ls-remote origin <REF>
git fetch origin <REF> --prune
git rev-parse origin/<REF>
git log -1 --oneline origin/<REF>
```

### 4.3 المخرج الإلزامي للبوابة

```yaml
ref_resolution_gate:
  requested_ref: <REF>
  resolved: PASS | FAIL
  resolved_from: branch | tag | commit | N/A
  resolved_commit_sha:
  verification_command:
  output_excerpt:
  decision: CONTINUE | STOP
```

إذا فشل الحل:

```yaml
result: BLOCKED_NEEDS_EVIDENCE
reason: REF غير موجود أو غير قابل للحل في GitHub Remote
stop: true
```

---

## 5) بوابة التحكم البشري بالتغييرات

ذكر `LOCAL_BRANCH` أو `REF` أو طلب “نفّذ” لا يعني إذنًا بأي إجراء Git/GitHub تغييري.

### 5.1 ممنوع على الوكيل تلقائيًا

```text
branch creation
commit
push
pull request creation
merge
tag
release
force push
reset remote
rebase remote
```

### 5.2 أمثلة أوامر بشرية صريحة ومقبولة

```text
نفّذ commit الآن على الفرع <LOCAL_BRANCH>
ادفع التغييرات إلى GitHub
أنشئ PR من <LOCAL_BRANCH> إلى <BASE_REF>
ادمج هذا PR
أنشئ tag باسم <tag>
```

### 5.3 أمثلة غير كافية ولا تمنح إذنًا

```text
ابدأ التصحيح
نفّذ الرحلة
أغلق التوبك
راجع الملف
طبّق البروتوكول
التزم بهذا الملف
```

### 5.4 المخرج الإلزامي

```yaml
human_change_control_status:
  git_write_permission_granted: true | false
  explicit_user_command:
  allowed_actions:
  forbidden_actions:
  violation_detected: true | false
```

أي إجراء Git/GitHub تغييري بلا أمر مستقل = `PROTOCOL_VIOLATION`.

---

## 6) تعريف 100% داخل هذا البروتوكول

`100%` لا تعني ادعاءً لفظيًا. لا يجوز استخدام أي ادعاء اكتمال إلا إذا كانت الأدلة مكتملة.

### 6.1 Evidence Matrix الإلزامية

```yaml
evidence_matrix:
  - evidence_id:
    layer: github | code | backend | database | contract | api_client | shared_brain | surface | runtime | test | guard | ci | donor
    command:
    path_or_scope:
    expected_result:
    actual_result:
    numeric_measurement:
    pass_fail_status: PASS | FAIL | BLOCKED | N/A
    resolved_commit_sha:
    notes:
```

### 6.2 معايير الصفر داخل النطاق

لكي يقال “صفر” داخل النطاق، يجب أن يثبت الآتي:

```text
صفر أخطاء مثبتة
صفر تناقض مثبت
صفر تكرار غير مبرر
صفر فجوات معلنة أو مخفية
صفر منطق في غير مالكه
صفر direct API داخل UI surfaces
صفر mock/demo/preview كحقيقة تشغيلية
صفر financial mutation خارج WLT
صفر PASS بلا command/output/path/expected/actual
صفر CI PASS غير مثبت
صفر ضجيج في التقرير النهائي
```

أي PASS بلا دليل عملي = `FIX_REQUIRED`.

---

## 7) قاعدة المصدر الحاكم

ابدأ من GitHub Remote فقط.

ممنوع الاعتماد على:

```text
الذاكرة
الانطباع
ادعاءات سابقة
README غير مدعوم بدليل
نجاح ظاهري من شاشة واحدة
ملفات machine-readable كحقيقة حاكمة
المانح كمالك للبنية
local branch غير مطابق للريموت
```

المصادر المقبولة للحسم:

```text
GitHub Remote resolved ref
commit/diff/PR evidence
live repository topology
actual source files
OpenAPI/contracts
backend routes/handlers/services/repositories
database migrations/tables/seeds
shared controllers/state/view-models
surface bindings
runtime routes/navigation
guards/tests/typecheck/build
CI evidence إن وجد
runtime/API/database smoke evidence عند التنفيذ أو الإغلاق
```

---

## 8) منع الاعتماد على machine-readable

`machine-readable/` ممنوع كمصدر قرار حاكم.

أي guard أو script أو تقرير يعتمد على `machine-readable/` كحقيقة حاكمة يجب تصنيفه:

```text
FIX_REQUIRED
```

ولا يتم إصلاح ذلك بإعادة توليد machine-readable. الإصلاح الصحيح هو إعادة القرار إلى الواقع الحي:

```text
source files
contracts
routes
migrations
imports/exports
shared brain usage
surface binding
runtime behavior
verified tests/guards
```

---

## 9) بروتوكول القرار المهني

يجب تنفيذ القرار بهذا الترتيب:

```text
1. فهم الهدف والنطاق والسياق.
2. حل REF من GitHub Remote.
3. تثبيت resolved_commit_sha.
4. قراءة commits/diff/PR/changed files عند وجودها.
5. تعريف الرحلة والمالكين والأسطح والأقسام.
6. بناء matrices إلزامية قبل الحكم.
7. فحص shared brains قبل surfaces.
8. فحص backend/API/database/runtime عند دخولها في النطاق.
9. فحص ownership وSSOT وpermissions وvisibility وrisk-based tests.
10. فحص guards/typecheck/lint/test/build/CI حسب النطاق.
11. تحويل أي غموض إلى blocker قابل للتحقق.
12. اختيار أقل معالجة مخاطرة وأعلى معالجة دقة.
13. تنفيذ الإصلاح فقط إذا كانت المهمة implementation_or_closure.
14. إعادة تشغيل الفحوصات المناسبة.
15. إخراج نتيجة واحدة وتقرير evidence-gated.
```

ممنوع ترك بند بصيغة:

```text
غير واضح
قد يكون صحيحًا
غالبًا يعمل
يحتاج مراجعة لاحقًا
سنعود له لاحقًا
```

أي غموض يجب تحويله إلى:

```yaml
missing_item:
  path_or_scope:
  why_it_blocks_decision:
  required_evidence:
  verification_command:
  safe_interim_decision: FIX_REQUIRED | BLOCKED_NEEDS_EVIDENCE
```

---

## 10) مزامنة المحلي عند التنفيذ فقط

لا تزامن المحلي إلا عند الحاجة لتنفيذ تعديل محلي.

```powershell
Set-Location -LiteralPath "<REPO_LOCAL>"
git fetch --all --prune
git checkout <LOCAL_BRANCH>
git status --short
git diff --check
git log --oneline --decorate -n 20
```

القواعد:

- إذا كان `<REF>` غير موجود في GitHub Remote: `BLOCKED_NEEDS_EVIDENCE`.
- إذا ظهر working tree غير نظيف وغير مفهوم: `BLOCKED_NEEDS_EVIDENCE`.
- إذا ظهرت تغييرات بشرية محلية: لا تكتب فوقها دون تصريح.
- المسموح فقط تعديل working tree وإخراج تقرير وأوامر مقترحة.
