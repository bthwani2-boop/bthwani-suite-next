# 07 — الفحوصات، Runtime Evidence، CI، ومراجعة PR

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `07/09`  
**Repository:** `bthwani2-boop/bthwani-suite-next`  
**Remote ref:** `start`  
**Source path:** `tools/plan/command_operational_journey_unified`  
**GitHub file SHA observed:** `617ed1f69bc91d42ce8c433b92c252b7abda2ce3`  
**Scope:** أوامر الفحص الكودية، runtime evidence، CI rules، وPR/merge review.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 10 ملفات. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة.

---
## 19) أوامر فحص كودية مستهدفة

شغّل فقط ما ينطبق فعليًا على الرحلة. لا تعتبر أي فحص ناجحًا إلا بمخرج واضح.

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"

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
pnpm run graphify
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
pnpm run nx:projects
pnpm run affected:typecheck
pnpm run affected:lint
pnpm run affected:test
pnpm run affected:build
pnpm run guard:unified-fullstack-brain
pnpm run guard:dsh-frontend-shared-ownership
pnpm run guard:wlt-dsh-frontend-shared-ownership
pnpm run guard:dsh-frontend-shared-boundary-imports
pnpm run guard:no-financial-mutation-outside-wlt
pnpm run guard:no-direct-fetch-in-screen
pnpm run guard:no-preview-demo-mock-runtime
pnpm run guard:no-broken-imports
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
