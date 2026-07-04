# 07 — الفحوصات، Runtime Evidence، CI، ومراجعة PR

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `07/09`  
**Repository:** `<REPO_REMOTE>`  
**Remote ref:** `<REF>`  
**Source path:** governance/operational_journey_protocol_package (self-contained)  
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`  
**Scope:** أوامر الفحص الكودية، runtime evidence، CI rules، وPR/merge review.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---
## 19) أوامر فحص كودية مستهدفة

### Affected-Only Verification
* يبدأ التحقق من مسارات الكود المتأثرة (affected paths) والـ guards الخاصة بالنطاق فقط.
* لا يتم تشغيل الفحوصات الكاملة (full-suite) إلا إذا تغير الـ shared brain أو الـ API/database/migration/runtime، أو إذا فشل فحص المسارات المتأثرة (affected check)، أو كانت المنطقة (multi-surface) عالية الخطورة.
* الفحوصات العامة المذكورة في هذا الملف هي فحوصات مرجعية تُستدعى حسب التأثر وليست إلزامية دائمًا في كل عملية إغلاق.


```powershell
Set-Location -LiteralPath "<REPO_LOCAL>"

git status --short
git diff --check

git grep -n "fetch\|axios" -- services/dsh/frontend/control-panel services/dsh/frontend/app-client services/dsh/frontend/app-partner services/dsh/frontend/app-field services/dsh/frontend/app-captain services/wlt/frontend/control-panel services/wlt/frontend/app-client services/wlt/frontend/app-partner services/wlt/frontend/app-field services/wlt/frontend/app-captain

git grep -n "process\.env" -- services/dsh/frontend/control-panel services/dsh/frontend/app-client services/dsh/frontend/app-partner services/dsh/frontend/app-field services/dsh/frontend/app-captain services/wlt/frontend/control-panel services/wlt/frontend/app-client services/wlt/frontend/app-partner services/wlt/frontend/app-field services/wlt/frontend/app-captain

git grep -n "localStorage\|sessionStorage\|AsyncStorage" -- services/dsh/frontend/control-panel services/dsh/frontend/app-client services/dsh/frontend/app-partner services/dsh/frontend/app-field services/dsh/frontend/app-captain services/wlt/frontend/control-panel services/wlt/frontend/app-client services/wlt/frontend/app-partner services/wlt/frontend/app-field services/wlt/frontend/app-captain
```

فحص أحجام الملفات:

```powershell
$TopicPaths = @(
  "services\dsh\frontend\shared\<topic>",
  "services\dsh\frontend\app-client\<topic>",
  "services\dsh\frontend\app-partner\<topic>",
  "services\dsh\frontend\app-field\<topic>",
  "services\dsh\frontend\app-captain\<topic>",
  "services\dsh\frontend\control-panel\<topic>",
  "services\wlt\frontend\shared\dsh\<topic>",
  "services\wlt\frontend\app-client\<topic>",
  "services\wlt\frontend\app-partner\<topic>",
  "services\wlt\frontend\app-field\<topic>",
  "services\wlt\frontend\app-captain\<topic>",
  "services\wlt\frontend\control-panel\<topic>"
)

Get-ChildItem -Path $TopicPaths -Include *.ts,*.tsx -ErrorAction SilentlyContinue |
  ForEach-Object {
    $lines = (Get-Content $_.FullName).Count
    [PSCustomObject]@{ Lines = $lines; Path = $_.FullName }
  } |
  Where-Object { $_.Lines -gt 350 } |
  Sort-Object Lines -Descending
```

فحص أسماء مشبوهة:

```powershell
Get-ChildItem -Recurse services\dsh\frontend,services\wlt\frontend -Include *.ts,*.tsx |
  Where-Object { $_.Name -match "(old|temp|copy|backup|final|final2|test2|new|legacy|random)" } |
  Select-Object FullName
```

فحوصات عامة حسب النطاق:

```powershell
pnpm run foundation:gate
pnpm run journey:gate
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

الحراس المكوّنة للبوابتين (لا تُشغّل مباشرة — تعمل عبر البوابات):

```text
foundation:gate  = ui-kit-boundary + runtime-config + no-broken-imports + cleanup-policy
journey:gate     = fullstack-boundary + wlt-financial-boundary + runtime-config + no-broken-imports
```


إذا كان الأمر غير موجود في `package.json` أو workspace:

```yaml
result: FIX_REQUIRED | BLOCKED_NEEDS_EVIDENCE
missing_command:
expected_owner:
required_action:
verification_command:
```

لا يجوز تحويل الأمر المفقود إلى PASS.

---

## 20) Runtime Evidence

Runtime Evidence إلزامي عند `implementation_or_closure` إذا كانت الرحلة تشغيلية.

لكن:

```text
runtime success لا يستبدل Code-Based Gate
screenshot لا يستبدل imports/contracts/tests
manual navigation دليل إضافي فقط
```

أي حالة:

```text
runtime success + code failure = FIX_REQUIRED
screenshot success + broken code path = FIX_REQUIRED
API smoke success + contract mismatch = FIX_REQUIRED
```

مصفوفة Runtime:

```yaml
runtime_evidence_matrix:
  backend_boot:
    command:
    expected:
    actual:
    status: PASS | FAIL | BLOCKED | N/A
  database_boot:
    command:
    expected:
    actual:
    status:
  api_smoke:
    endpoint:
    request:
    expected_response:
    actual_response:
    status:
  surface_boot:
    surface:
    command:
    expected:
    actual:
    status:
  cross_surface_flow:
    step:
    expected:
    actual:
    status:
```

---

## 21) CI Rules

```text
CI غير متاح = CI_NOT_CONFIGURED وليس PASS
```

قواعد:

- `analysis_only`: يمكن إخراج `ANALYSIS_PASS` مع `CI_NOT_CONFIGURED` إذا لم تكن CI مانعة للتحليل.
- `implementation_or_closure`: يمنع `IMPLEMENTATION_PASS` مع CI غير مثبتة إلا ببديل مكافئ موثق.
- `merge_review`: يمنع `MERGE_READY` دون CI أو بديل موثق.

```yaml
ci_status:
  configured: true | false
  latest_run_found: true | false
  latest_run_status: PASS | FAIL | PENDING | CI_NOT_CONFIGURED | BLOCKED
  workflow_paths:
  checked_commit_sha:
  verification_command_or_source:
  decision_impact:
```

---

## 22) PR / Merge Review

عند مراجعة PR أو commit range، افحص:

```text
changed files
commit intent
scope containment
base/head diff
CI status
guards/tests/build evidence
ownership boundaries
DSH/WLT financial boundary
surface/shared split
runtime impact
API/database impact
dead code or duplication
unexplained files
```

نتائج الدمج المسموحة:

```text
MERGE_READY
DO_NOT_MERGE
BLOCKED_NEEDS_EVIDENCE
```

مصفوفة الدمج:

```yaml
merge_review_matrix:
  base_ref:
  head_ref:
  head_commit_sha:
  changed_files:
  diff_scope_status: PASS | FAIL | BLOCKED
  ci_status:
  tests_status:
  guards_status:
  ownership_status:
  financial_boundary_status:
  backend_api_database_status:
  runtime_status:
  merge_decision: MERGE_READY | DO_NOT_MERGE | BLOCKED_NEEDS_EVIDENCE
  blockers:
```

---
