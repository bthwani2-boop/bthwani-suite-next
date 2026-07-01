# 03 — النطاق، الطوبولوجيا، الملكية، DSH/WLT، والمانح

**Package:** Unified Operational Journey Protocol — v3 modular strict  
**File:** `03/09`  
**Repository:** `bthwani2-boop/bthwani-suite-next`  
**Remote ref:** `start`  
**Source path:** `tools/plan/command_operational_journey_unified`  
**GitHub file SHA observed:** `617ed1f69bc91d42ce8c433b92c252b7abda2ce3`  
**Scope:** تعريف الرحلة، المسارات السيادية، shared brains، حدود DSH/WLT، واستخدام المانح قراءة فقط.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 11 ملفًا (بعد إضافة Amendment). لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md`.

---
## 11) تعريف الرحلة قبل التنفيذ

قبل أي تعديل، يجب إخراج تعريف الرحلة التالي:

```yaml
topic_definition:
  ref: start
  resolved_commit_sha:
  task_mode: analysis_only | implementation_or_closure | merge_review
  purpose:
  in_scope:
  out_of_scope:
  owning_service: DSH | WLT | BOTH | OTHER
  owning_shared_brain:
  related_backend_modules:
  related_database_tables:
  migrations_required: true | false
  api_contracts_required:
  api_clients_required:
  required_surfaces:
  optional_surfaces:
  read_only_surfaces:
  forbidden_surfaces:
  primary_control_panel_section:
  secondary_control_panel_sections:
  read_only_control_panel_sections:
  forbidden_control_panel_sections:
  permissions:
  states:
  state_transitions:
  loading_empty_error_success_contract:
  blocked_disabled_retry_offline_contract:
  tests_required:
  guards_required:
  runtime_evidence_required: true | false
  ci_required: true | false
  evidence_required:
```

قواعد التعريف:

1. لا تقبل `frontend` كتعريف عام.
2. لا تقبل `backend` كتعريف عام.
3. لا تقبل `control-panel` دون section محدد.
4. لا تقبل `mobile apps` دون تحديد السطح والدور.
5. أي استبعاد يجب أن يذكر السبب ودليل عدم التأثر.
6. أي سطح `REQUIRED` يجب أن يثبت دوره التشغيلي لا مجرد ظهور شاشة.
7. أي سطح UI يعالج القرار بدل shared brain = `FIX_REQUIRED`.

---

## 12) Canonical Repository Topology

هذه المسارات هي المرجع الأولي، لكنها يجب أن تثبت من الريبو عند التنفيذ:

```text
DSH shared:
services/dsh/frontend/shared

DSH UI surfaces:
services/dsh/frontend/control-panel
services/dsh/frontend/app-partner
services/dsh/frontend/app-field
services/dsh/frontend/app-client
services/dsh/frontend/app-captain

WLT-for-DSH shared:
services/wlt/frontend/shared/dsh

WLT UI surfaces:
services/wlt/frontend/control-panel
services/wlt/frontend/app-partner
services/wlt/frontend/app-field
services/wlt/frontend/app-client
services/wlt/frontend/app-captain

Apps runtime:
apps/app-client/runtime
apps/app-partner/runtime
apps/app-field/runtime
apps/app-captain/runtime
apps/control-panel/runtime

DSH OpenAPI:
services/dsh/contracts/dsh.openapi.yaml

WLT contracts:
services/wlt/contracts
```

أي مسار غير موجود أو غير مثبت من الريبو = `BLOCKED_NEEDS_EVIDENCE`.

---

## 13) حدود الملكية السيادية

### 13.1 DSH Frontend Shared Brain

المسار الحاكم:

```text
services/dsh/frontend/shared
```

يمتلك:

```text
types
states
state machines
view-models
controllers/hooks
API clients/adapters
permissions
role/view policies
validation rules
transforms
lifecycle rules
registry/config/domain constants
loading/empty/error/success contracts
blocked/disabled/retry/offline contracts
shared providers
DSH-facing WLT read-only integration bindings
```

### 13.2 DSH UI-only Surfaces

المسارات:

```text
services/dsh/frontend/control-panel
services/dsh/frontend/app-partner
services/dsh/frontend/app-field
services/dsh/frontend/app-client
services/dsh/frontend/app-captain
```

المسموح:

```text
rendering
layout
labels
icons
navigation composition
role-specific visible rendering
calling shared controller hooks
passing UI props
surface-specific composition
```

الممنوع:

```text
fetch/axios مباشر
API adapters/repositories
state machines
controller-core
business lifecycle logic
domain validation
permission logic
role policy
view policy
process.env أو URL construction
storage access كمنطق تشغيلي
cross-service internal imports
duplicated domain types/status/view-models
raw API response mapping
financial truth أو mutation
```

### 13.3 WLT-for-DSH Shared Brain

المسار الحاكم:

```text
services/wlt/frontend/shared/dsh
```

يمتلك:

```text
WLT-for-DSH types
states
contracts
view-models
read-only API adapters/controllers
financial reference mappings
commission/COD/payment/refund/settlement status references
read-only bindings consumed by DSH shared
```

### 13.4 WLT UI-only Surfaces

المسارات:

```text
services/wlt/frontend/control-panel
services/wlt/frontend/app-partner
services/wlt/frontend/app-field
services/wlt/frontend/app-client
services/wlt/frontend/app-captain
```

ممنوع فيها:

```text
financial mutation
ledger/payment/refund/settlement/commission/payout truth
API adapter مباشر
state machine
controller-core
financial permission logic
business lifecycle logic
```

### 13.5 Apps Runtime

المسارات:

```text
apps/app-client/runtime
apps/app-partner/runtime
apps/app-field/runtime
apps/app-captain/runtime
apps/control-panel/runtime
```

المسموح:

```text
provider wrapping
navigation entry point
runtime bootstrap
surface mounting
```

الممنوع:

```text
business logic
API binding
state machine
controllers
financial logic
```

---

## 14) قاعدة العقل الموحد Full-Stack Brain

كل رحلة داخل DSH أو WLT-for-DSH يجب أن تمتلك مصدر منطق واحد فقط.

```text
DSH domain logic:
services/dsh/frontend/shared/<topic>

WLT-for-DSH financial/read-only references:
services/wlt/frontend/shared/dsh/<topic>
```

كل سطح يجب أن يستهلك نفس:

```text
controller
state contract
view-model
validation
permissions
lifecycle
role/view policy
API binding
error/loading/empty/success contract
blocked/disabled/retry/offline contract
```

أي اختلاف بين الأسطح يجب أن يكون policy مصرحًا داخل shared، وليس منطقًا منفصلًا داخل surface.

---

## 15) حدود DSH/WLT المالية

WLT هو المالك الوحيد للحقيقة المالية.

ممنوع على DSH امتلاك أو تنفيذ:

```text
payment mutation
wallet mutation
refund finalization
settlement posting
commission truth
COD financial truth
ledger mutation
reconciliation
financial reports truth
provider direct access
```

المسموح لـ DSH:

```text
عرض references/status/metadata المالية للقراءة فقط
```

أي mutation مالي خارج WLT:

```yaml
result: FIX_REQUIRED
problem: financial mutation outside WLT
required_action: move truth/mutation to WLT owner and expose read-only reference to DSH if needed
```

---

## 16) استخدام المانح Read-Only

المانح يستخدم لاستخراج القيمة فقط، وليس لنقل البنية.

مسموح استخراج:

```text
screen experience
user flows
interaction behavior
visual rhythm
banners
carousels
motion patterns
state presentation
cross-surface relationships
experience assets
```

ممنوع نقل:

```text
مسارات المانح
بنيته كما هي
كوده الميت
mock/demo/preview كحقيقة تشغيلية
ownership خاطئة
منطق مالي داخل DSH
تصميم محلي مكرر
API access مباشر من الشاشات
أي نمط لا يتوافق مع بنية الريبو الجديد
```

كل قيمة صالحة من المانح يجب أن يعاد بناؤها داخل بنية الريبو الجديد ومالكه الصحيح.

---
