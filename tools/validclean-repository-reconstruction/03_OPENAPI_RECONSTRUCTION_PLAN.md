# 03 — خطة إعادة بناء OpenAPI والعقود والعملاء

## 1. الهدف

إنشاء سلسلة تعاقدية واحدة قابلة للإثبات:

```text
Service-owned modular source
→ deterministic bundle
→ validation
→ generated client
→ shared adapter
→ consuming surfaces
→ runtime parity
```

العقد يصف الحدود؛ لا يحل محل منطق المجال أو قاعدة البيانات. ولا يجوز أن يتحول الملف المركزي إلى نسخة من عقود الخدمات.

## 2. الفهرس المركزي الوحيد

الهدف النهائي:

```text
contracts/master.openapi.yaml
```

وظيفته الوحيدة:

- تعريف أنه Master index.
- تسجيل عقد دخول واحد لكل خدمة أو Core domain.
- عدم تسجيل Endpoints تشغيلية.
- عدم تسجيل الوحدات الداخلية لكل خدمة.
- عدم استخدامه لتوليد عميل منصة شامل.

بعد ترحيل المستهلكين، يحذف:

```text
/openapi.yaml
```

ويضاف Guard يفشل إذا وُجد أكثر من ملف يحمل:

```yaml
x-bthwani-contract-role: MASTER_INDEX_ONLY
x-bthwani-contract-state: CONTRACT_ACTIVE
```

## 3. شكل كل خدمة

### DSH

```text
services/dsh/contracts/
├── dsh.openapi.yaml                 # مدخل واحد فقط
├── paths/
├── components/
├── overlays/                        # عند الحاجة وبقواعد محددة
├── generated/
│   ├── dsh.bundle.openapi.yaml
│   ├── dsh.operation-index.json
│   ├── dsh.contract-manifest.json
│   └── dsh.ownership-report.json
└── README.md
```

### WLT

```text
services/wlt/contracts/
├── wlt.openapi.yaml
├── paths/
├── components/
├── generated/
│   ├── wlt.bundle.openapi.yaml
│   ├── wlt.operation-index.json
│   ├── wlt.contract-manifest.json
│   └── wlt.ownership-report.json
└── README.md
```

### Core domains

النمط نفسه لـ:

```text
core/identity/contracts/identity.openapi.yaml
core/workforce/contracts/workforce.openapi.yaml
core/platform-control/contracts/platform-control.openapi.yaml
core/providers/contracts/providers.openapi.yaml
```

## 4. قواعد المصدر الواحد

1. كل `method + path` يعرف مرة واحدة داخل خدمة واحدة.
2. كل `operationId` فريد على مستوى الخدمة.
3. الملف الرئيسي للخدمة يركب Modules ولا يكررها.
4. Bundle مولد فقط وغير قابل للتعديل اليدوي.
5. العميل يولد من Bundle، لا من ملف جزئي ولا من قائمة يدوية.
6. لا Registry يضيف أو يحذف معنى عمليات من العقد.
7. العملية المتقاعدة تختفي من المصدر والBundle والعميل وRuntime؛ يبقى اختبار 404 أو عدم المطابقة عند الحاجة، لا سجل حقيقة موازٍ.
8. لا Route حي بلا Contract.
9. لا Contract active بلا Handler حي.
10. لا عملية مالية مملوكة لـDSH.

## 5. تصنيف عمليات DSH المالية الظاهرية

أي مسار يعرض ماليات داخل سياق DSH يصنف إلى أحد خيارين فقط:

### WLT direct through trusted adapter

العقد والعميل داخل WLT، والسطح يصل إليه عبر Adapter مشترك موثوق.

### Read-only projection

يصرح العقد بوضوح:

```yaml
x-bthwani-truth-owner: services/wlt
x-bthwani-projection-owner: services/dsh
x-bthwani-mutation-forbidden: true
```

الممنوع داخل DSH:

- credit/debit.
- ledger append.
- commission finalization.
- payout mutation.
- refund finalization.
- settlement creation.
- authoritative balance calculation.

## 6. تشديد Schemas

داخل الأمن والمال والهوية:

- يمنع `additionalProperties: true` إذا كان الشكل معروفًا.
- يمنع `unknown` في العملاء المولدين للحالات المعروفة.
- تحدد العملات والمبالغ بصورة صريحة.
- تحدد التواريخ والمنطقة الزمنية.
- تحدد حالات الخطأ المستقرة.
- تحدد Headers الموثوقة: Authorization، service caller، correlation، idempotency، expected version عند الحاجة.
- لا يُعرّف `tenant_id` كمدخل حر إذا لم يكن Tenant حقيقيًا أو إذا كان يجب اشتقاقه من الجلسة.

## 7. خطة الترحيل

### A — الجرد

- استخراج كل ملفات `*.openapi.yaml` وoverlays وschemas.
- استخراج كل Routes الفعلية من Go/Next/BFF.
- استخراج كل operationIds والعملاء وAdapters والمستهلكين.
- كشف التكرار والتعارض والملفات غير المستهلكة.

### B — تثبيت المالك

لكل عملية:

```yaml
service_owner:
domain:
truth_or_projection:
allowed_callers:
required_permission:
trusted_scope_source:
financial_effect:
runtime_handler:
consumers:
```

### C — توحيد Service Entry

- Identity أولًا.
- Workforce ثانيًا.
- WLT ثالثًا.
- DSH رابعًا.
- Providers وPlatform Control بعد ثبات الحدود.

### D — Bundle والتوليد

- إنشاء compose command حتمي لكل خدمة.
- توليد bundle وmanifest وoperation index.
- حذف العميل الحالي وإعادة توليده.
- فشل CI عند وجود Diff بعد إعادة التوليد.

### E — Runtime parity

لكل خدمة:

```text
OpenAPI operations - runtime routes = 0
runtime routes - OpenAPI operations = 0
active generated operations - consumers/declared public operations = explained
```

### F — تقاعد القديم

- إيقاف الكتابة القديمة أولًا.
- ترحيل المستهلكين.
- إيقاف القراءة القديمة.
- حذف route وadapter وschema وregistry والاختبار الذي يحمي الترقيع.
- إبقاء Regression test للقاعدة الجديدة.

## 8. بوابات OpenAPI

```yaml
duplicate_master_indexes: 0
duplicate_method_paths: 0
duplicate_operation_ids: 0
unresolved_refs: 0
contract_without_runtime: 0
runtime_without_contract: 0
manual_generated_clients: 0
client_regeneration_diff: 0
retirement_registries_affecting_truth: 0
financial_mutations_outside_wlt: 0
unknown_financial_schemas: 0
raw_surface_http_calls: 0
```

لا يعد Spectral وحده إغلاقًا؛ الإغلاق يحتاج Runtime parity وعميلًا قابلًا لإعادة التوليد ومستهلكًا حقيقيًا وقراءة راجعة.