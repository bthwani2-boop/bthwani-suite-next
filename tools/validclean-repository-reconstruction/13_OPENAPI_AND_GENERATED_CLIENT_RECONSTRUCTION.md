# 13 — إعادة بناء OpenAPI والعملاء المولدين

## المبدأ

لكل خدمة سلسلة حقيقة واحدة:

```text
canonical modules
→ deterministic composition
→ generated bundle
→ generated client
→ thin adapter
→ shared frontend brain / service client
→ surfaces
```

أي عملية أو schema أو parameter لا تملك مكانًا واحدًا في هذه السلسلة تُعد انحرافًا.

## الانحرافات المثبتة

### Platform Control

24 عملية مصدرية متكررة إجمالًا عبر Platform Control وDSH، منها 16 عملية تقريبًا في Platform Control:

- Change Sets في `platform-change-sets.openapi.yaml` و`platform-control.openapi.yaml`.
- Progressive Rollout في `jrn-041-progressive-rollout.openapi.yaml` و`platform-control.openapi.yaml`.

الحل:

```text
rename jrn-041 to domain name
→ keep modules as canonical
→ make platform-control.openapi.yaml an entry/index only
→ compose generated bundle
→ regenerate client
→ migrate consumers
→ gate operationId uniqueness among canonical sources
```

### DSH

ثماني عمليات SLA/Pickup/Partner Delivery مكررة بين:

```text
dsh.fulfillment-operations.openapi.yaml
dsh.partner-delivery.openapi.yaml
```

يجب اختيار المالك حسب الدلالة:

- Pickup state/customer arrival/no-show وPartner-delivery task lifecycle: `partner-delivery`.
- Capacity/SLA orchestration العامة: `fulfillment-operations` فقط إذا كانت عابرة لأنماط التنفيذ.

لا يكفي تغيير `operationId`; يجب نقل path/method/schema والمستهلكين إلى المالك الصحيح.

### Metadata

22 عقدًا مصدرًا بلا `x-bthwani-owner`. يجب ألا يصبح المالك اسم Journey أو فريق مؤقت؛ المالك قيمة مجال مستقرة:

```text
identity
workforce
platform-control
providers
dsh.catalog
dsh.orders
dsh.fulfillment
dsh.partner-delivery
dsh.support
wlt.payments
wlt.refunds
wlt.settlements
...
```

## أنواع العقود

### Master index

```yaml
x-bthwani-contract-role: MASTER_INDEX_ONLY
paths: {}
```

يسجل عقد دخول واحدًا لكل خدمة. لا يولد منه Client مباشر.

### Service entry

- يحدد Metadata الخدمة.
- يسجل modules أو يكون مصدر Composer.
- لا ينسخ عمليات الوحدات يدويًا.

### Module source

- مالك path/method محدد.
- يحمل owner/state.
- لا يعتمد على generated bundle.

### Generated bundle

- يحمل رأس `DO NOT EDIT`.
- يسجل source files وsource digest وgenerator version.
- لا يدخل في تنازع operation owners.
- delete/regenerate/diff = clean.

### Generated client

- يولد من Bundle فقط.
- لا يحتوي types يدوية عامة في نطاقات حساسة.
- package exports تشير إليه بوضوح أو يبقى build artifact خارج Git.

## إعادة بناء أسماء العقود

أسماء `jrn-*` مقبولة في سجلات الرحلات والاختبارات التي تشير إلى Journey key. ليست مناسبة لاسم عقد مجال دائم.

القاعدة:

```text
filename = domain capability
x-bthwani-journey-id = historical/governance cross-reference
```

مثال:

```text
jrn-041-progressive-rollout.openapi.yaml
→ platform-progressive-rollout.openapi.yaml
x-bthwani-journey-id: JRN-041
```

## Common components

لكل خدمة مصدر Common واحد للمعلمات والاستجابات المشتركة:

```text
Authorization
X-Tenant-ID when real tenant is required
X-Correlation-ID
Idempotency-Key
Error { code, message }
```

لا تُوحّد مكونات مختلفة دلاليًا لمجرد تشابه الاسم. Composer:

- يدمج تعريفات متطابقة.
- يستطيع تشديد قيود string المتوافقة وفق قاعدة معلنة.
- يفشل عند enum/const/type/location دلالي مختلف.
- يمنع dangling refs.

## Route parity

لكل operationId:

```text
OpenAPI method/path
= runtime router method/path
= generated client path
= adapter call
= surface action when exposed
```

عدادات مطلوبة:

```yaml
contract_without_route: 0
route_without_contract: 0
client_without_contract: 0
contract_without_client: 0
surface_raw_route: 0
operation_id_collisions: 0
dangling_refs: 0
```

## Provenance لجميع العملاء

الخدمات المطلوبة:

```text
core/identity
core/workforce
core/platform-control
core/providers
services/dsh
services/wlt
```

ملف provenance آلي أو رأس داخل الناتج:

```yaml
source_bundle:
source_sha256:
generator:
generator_version:
generated_at: omitted or deterministic
```

يمنع timestamp غير حتمي داخل الملفات الملتزمة.

## فحص المستهلكين

قبل حذف generated output بلا inbound reference:

- افحص package `exports` و`main/types`.
- افحص imports المباشرة وغير المباشرة.
- افحص bundler discovery.
- افحص CI publish/build.
- نفذ حذفًا مؤقتًا ثم build/typecheck.

## بوابات الإغلاق

```yaml
canonical_operation_id_collisions: 0
openapi_owner_missing: 0
openapi_state_missing: 0
manual_entry_contract_copies: 0
generated_provenance_missing: 0
unconsumed_generated_files: 0
bundle_regeneration_diff: 0
route_contract_drift: 0
raw_surface_routes: 0
```
