# 03 — النطاق، الطوبولوجيا، الملكية، DSH/WLT، والمانح

**Package:** Unified Operational Journey Protocol — v3 modular strict + Amendment v2
**File:** `03 of 12`
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Source path:** governance/operational_journey_protocol_package (self-contained)
**GitHub file SHA observed:** `<RESOLVED_COMMIT_SHA>`
**Scope:** تعريف الرحلة، المسارات السيادية، shared brains، حدود DSH/WLT، واستخدام المانح قراءة فقط.

> قاعدة حاكمة: هذا الملف جزء من حزمة واحدة مكوّنة من 12 ملفًا. لا يُستخدم منفردًا لإعلان PASS. أي قبول يجب أن يرجع إلى `00_INDEX_AND_COVERAGE.md` ثم يطبّق كل الملفات ذات العلاقة، بما فيها `10_EXECUTION_PLAN_NO_SKIP_GATE.md` و`11_CODE_FIRST_FULLSTACK_SURFACE_COVERAGE_MODE.md`.

---

## 11) تعريف الرحلة قبل التنفيذ

قبل أي تعديل، يجب إخراج تعريف الرحلة التالي:

```yaml
topic_definition:
  ref: <REF>
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

وسّع `topic_definition` أعلاه بهذه الحقول الإلزامية كلما كانت الرحلة تمس Partner أو Store:

```yaml
entity_boundary:
  primary_entity:
  secondary_entities:
  partner_store_relationship:
  partner_owned_truths:
  store_owned_truths:
  forbidden_entity_conflation:
  naming_policy:
```

غياب `entity_boundary` مكتملًا في أي رحلة DSH فيها Partner أو Store = `FIX_REQUIRED`.

وسّع `topic_definition` بهذه الحقول عندما تنطبق شروط ملحق SaaS/Tenancy:

```yaml
saas_context:
  mode: NOT_APPLICABLE | SAAS_READY_DEFERRED | SAAS_ACTIVE
  tenant_entity_defined: true | false
  tenant_context_source:
  tenant_selection_authority:
  tenant_owned_entities:
  global_entities:
  tenant_isolation_model:
  cross_tenant_access_policy:
  privileged_cross_tenant_workflow:
  tenant_data_classification:
  tenant_data_residency:
  tenant_export_required: true | false
  tenant_deletion_required: true | false
  tenant_backup_restore_required: true | false
  tenant_observability_required: true | false
  tenant_quota_required: true | false
  entitlement_impact: NONE | READ_ONLY | REQUIRED
  subscription_impact: NONE | READ_ONLY | REQUIRED
  metering_impact: NONE | READ_ONLY | REQUIRED
  billing_impact: NONE | READ_ONLY | REQUIRED
  saas_activation_gate_required: true | false
```

إذا كانت الرحلة تمس بيانات مملوكة لمستأجر أو عملية عابرة للمستأجرين ولم تملأ `saas_context` فالنتيجة `FIX_REQUIRED`.

### 11.1) Entity Boundary Gate — Partner vs Store

لا يجوز استخدام `Partner` و`Store` كمرادفين داخل أي رحلة DSH.

التعريف الملزم:

- `Partner` / الشريك:
  هو الكيان القانوني أو التجاري أو التشغيلي الذي يخضع للانضمام والاعتماد والتحقق.
  يملك الهوية القانونية، الوثائق، المالك، حالة الانضمام، قرارات الاعتماد، سجل التدقيق، والجاهزية التشغيلية العامة.

- `Store` / المتجر:
  هو نقطة البيع أو الفرع أو الواجهة التجارية التي تظهر للعميل وتستقبل الكتالوج والطلبات.
  يملك الاسم الظاهر للعميل، الفرع/الموقع، الكتالوج، أوقات العمل، serviceability، marketing visibility، client visibility، وربط الطلبات.

العلاقة الحاكمة:

```text
Partner owns one or many Stores.
Store belongs to zero or one Partner during legacy/backfill, and must belong to one Partner for new onboarding flows.
```

قواعد الفصل:

- أي حالة مرتبطة بالهوية، الوثائق، الزيارة، الموافقة، الرفض، الاعتماد، أو أهلية الشريك = Partner lifecycle.
- أي حالة مرتبطة بالكتالوج، الظهور للعميل، الاكتشاف، الخدمة، الطلبات، أو التسويق = Store publication/visibility.
- app-field ينشئ ملف انضمام Partner ويجمع بيانات Store الأول كجزء من الملف، ولا يفعّل Partner ولا ينشر Store.
- control-panel يملك قرارات اعتماد Partner وقرارات نشر/إخفاء Store حسب الصلاحيات.
- app-partner يرى حالة Partner onboarding ويدير Store فقط بعد السماح، ولا يملك self-activation.
- app-client لا يرى Partner إطلاقًا؛ يرى Stores فقط.
- أي route أو schema أو UI label أو type أو status يخلط بين Partner وStore بلا mapping صريح = `FIX_REQUIRED`.

---

## 12) Canonical Repository Topology

هذه المسارات هي المرجع الأولي، ويجب إثباتها من الريبو عند التنفيذ:

```text
DSH shared brain:
services/dsh/frontend/shared

DSH UI-only surfaces:
services/dsh/frontend/app-client
services/dsh/frontend/app-partner
services/dsh/frontend/app-field
services/dsh/frontend/app-captain
services/dsh/frontend/control-panel

WLT-for-DSH shared brain:
services/wlt/frontend/shared/dsh

WLT UI-only surfaces:
services/wlt/frontend/app-client
services/wlt/frontend/app-partner
services/wlt/frontend/app-field
services/wlt/frontend/app-captain
services/wlt/frontend/control-panel

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

## 13) المسارات السيادية الحاكمة

### 13.1) DSH Frontend Brain

المسار الحاكم: `services/dsh/frontend/shared`

يمتلك ويحكم:

- logic / state / policy / API mapping / validation.
- types, states, state machines, view-models, controllers/hooks.
- API clients/adapters, permissions, role/view policies, validation rules.
- transforms, lifecycle rules, registry/config/domain constants.
- loading/empty/error/success contracts.
- blocked/disabled/retry/offline contracts.
- shared providers.
- DSH-facing WLT read-only integration bindings.

### 13.2) DSH UI-only surfaces

المسارات:

- `services/dsh/frontend/app-client`
- `services/dsh/frontend/app-partner`
- `services/dsh/frontend/app-field`
- `services/dsh/frontend/app-captain`
- `services/dsh/frontend/control-panel`

المسموح (واجهة فقط):

- rendering, layout, labels, icons.
- navigation composition.
- role-specific visible rendering.
- calling shared controller hooks and passing UI props.
- surface-specific composition.

الممنوع:

- direct API (fetch/axios مباشر).
- process.env أو URL construction.
- raw API response mapping inside UI.
- local business logic, local state machine, local permission policy.
- storage access كمنطق تشغيلي.
- cross-service internal imports.
- duplicated domain types/status/view-models.
- financial truth أو mutation.

### 13.3) WLT-for-DSH Brain

المسار الحاكم: `services/wlt/frontend/shared/dsh`

يمتلك:

- WLT-for-DSH types, states, contracts, view-models.
- read-only API adapters/controllers.
- financial reference mappings.
- commission/COD/payment/refund/settlement status references.
- read-only bindings consumed by DSH shared.

### 13.4) WLT UI-only surfaces

المسارات:

- `services/wlt/frontend/app-client`
- `services/wlt/frontend/app-partner`
- `services/wlt/frontend/app-field`
- `services/wlt/frontend/app-captain`
- `services/wlt/frontend/control-panel`

ممنوع فيها:

- financial mutation.
- ledger/payment/refund/settlement/commission/payout truth.
- API adapter مباشر أو state machine or controller-core.
- financial permission logic or business lifecycle logic.

### 13.5) Apps runtime

المسارات:

- `apps/app-client/runtime`
- `apps/app-partner/runtime`
- `apps/app-field/runtime`
- `apps/app-captain/runtime`
- `apps/control-panel/runtime`

المسموح:

- provider wrapping, navigation entry point, runtime bootstrap, surface mounting.

الممنوع:

- business logic, API binding, state machine, controllers, financial logic.

---

## 14) قاعدة العقل الموحد Full-Stack Brain

كل رحلة داخل DSH أو WLT-for-DSH يجب أن تمتلك مصدر منطق واحد فقط.

```text
DSH domain logic:
services/dsh/frontend/shared/<topic>

WLT-for-DSH financial/read-only references:
services/wlt/frontend/shared/dsh/<topic>
```

كل سطح يجب أن يستهلك نفس controller و state contract و view-model و validation و permissions و lifecycle و role/view policy و API binding و error/loading/empty/success contract.
أي اختلاف بين الأسطح يجب أن يكون policy مصرحًا داخل shared، وليس منطقًا منفصلًا داخل surface.

---

## 15) حدود DSH/WLT المالية

WLT هو المالك الوحيد للحقيقة المالية.
DSH لا ينفّذ financial mutation.

ممنوع على DSH امتلاك أو تنفيذ:

- payment mutation, wallet mutation, refund finalization, settlement posting, commission truth, COD financial truth, ledger mutation, reconciliation, financial reports truth, provider direct access.

المسموح لـ DSH:

- عرض references/status/metadata المالية للقراءة فقط.

أي mutation مالي خارج WLT يعتبر `FIX_REQUIRED`.

---

## 16) استخدام المانح Read-Only

المانح `bthwani2-boop/bthwani-suite` قراءة فقط لاستخراج القيمة، لا لنقل الفوضى أو البنية.
مسموح استخراج screen experience, user flows, interaction behavior, visual rhythm, banners, carousels, motion patterns, state presentation, cross-surface relationships, experience assets.
ممنوع نقل مسارات المانح، بنيته كما هي، كوده الميت، mock/demo/preview كحقيقة تشغيلية، ownership خاطئة، منطق مالي داخل DSH، تصميم مكرر، أو API access مباشر من الشاشات.
كل قيمة صالحة من المانح يجب أن يعاد بناؤها داخل بنية الريبو الجديد ومالكه الصحيح.


## Frontend-Backend Ownership Separation

Frontend owns:
- presentation
- interaction capture
- rendering
- navigation composition
- invoking shared controllers
- displaying canonical states

Frontend must not own:
- domain decisions
- request contract invention
- response reinterpretation
- permission truth
- lifecycle truth
- financial truth
- database-shaped models
- independent status vocabulary

Backend owns:
- authorization enforcement
- validation
- business decisions
- lifecycle transitions
- persistence
- transaction boundaries
- concurrency protection
- idempotency
- audit
- canonical operational errors

Contract owns:
- request shape
- response shape
- enums
- error schemas
- pagination semantics
- nullable/optional semantics
