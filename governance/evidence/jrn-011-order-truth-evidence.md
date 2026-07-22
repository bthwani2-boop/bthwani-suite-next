# JRN-011 — إنشاء الطلب وحقيقة الطلب

## قرار الإغلاق الداخلي

- `repository_mode`: `REMOTE_ONLY`
- `repository`: `bthwani2-boop/bthwani-suite-next`
- `branch`: `sambassam`
- `observed_baseline_commit`: `c19f122764fd3172b4ea5e11bcd42a4e3c91ee99`
- `verified_implementation_commit`: `fdace18a6ae4a92b077db32254d7f0253d102fd7`
- `workflow_run_id`: `29873796768`
- `status_context`: `jrn-011/order-truth`
- `status_conclusion`: `success`
- `decision`: `READY_FOR_REVIEW`
- `next_journey_started`: `false`

أُغلقت جميع الفجوات الداخلية التي ثبتت أثناء تنفيذ JRN-011، ونجحت بوابات static وGo وPostgreSQL 16 وTypeScript المستهدفة على commit التنفيذ نفسه. لا يُستخدم `CLOSED_WITH_EVIDENCE` لأن التحقق الحي على بيئة التشغيل المستهدفة، فحص الأجهزة والمتصفحات، والموافقات المستقلة للمنتج والجودة والأمن وحدود المالية والإطلاق ما تزال أدلة خارجية مطلوبة.

## نتيجة الشرائح المتسلسلة

| الشريحة | النتيجة | الدليل الرئيسي |
|---|---|---|
| FS-01 Product Truth | `CLOSED_INTERNAL` | `governance/product/contracts/jrn-011-order-creation-truth.product-truth.json` |
| FS-02 Roles / Surfaces / Forbidden | `CLOSED_INTERNAL` | `services/dsh/contracts/jrn-011-surface-rbac-registry.json` |
| FS-03 State / Ownership / allowedActions | `CLOSED_INTERNAL` | `services/dsh/contracts/jrn-011-order-state-policy.json` |
| FS-04 DSH/WLT Boundary | `CLOSED_INTERNAL` | `governance/boundaries/jrn-011-dsh-wlt-order-truth-boundary.md` |
| FS-05 Database Truth | `CLOSED_INTERNAL` | run `29873796768`: migrations + `dsh-902_903` و`dsh-905` invariants نجحت |
| FS-06 API / Contract | `CLOSED_INTERNAL` | `services/dsh/contracts/dsh.order-truth.openapi.yaml` |
| FS-07 Backend | `CLOSED_INTERNAL` | order truth domain/queries/handlers + Go checks |
| FS-08 Events / Outbox | `CLOSED_INTERNAL` | transactional outbox والـbridge invariants |
| FS-09 Shared Brain | `CLOSED_INTERNAL` | `services/dsh/frontend/shared/order-truth` + focused TypeScript |
| FS-10 Surface Binding | `CLOSED_INTERNAL` | app-client، app-partner، control-panel bindings |
| FS-11 Visible States | `CLOSED_INTERNAL` | `order-truth.visible-states.ts` |
| FS-12 Cross-Surface Consistency | `CLOSED_INTERNAL` | integrity gate وread-after-write |
| FS-13 Security / Privacy / RBAC | `CLOSED_INTERNAL` | scoped UUID validation، tenant/actor/store isolation، redaction tests |
| FS-14 RTL / Accessibility / Performance | `CLOSED_INTERNAL_EXTERNAL_QA_PENDING` | shared experience policy وUI-kit layout؛ فحص الأجهزة مستقل |
| FS-15 Monitoring / Runbooks | `CLOSED_INTERNAL_EXTERNAL_RUNTIME_REVIEW_PENDING` | runbook وحالة CI منشورة |
| FS-16 Cleanup / Compatibility | `CLOSED_INTERNAL` | compatibility registry وإزالة Inline Styles داخل نطاق الرحلة |
| FS-17 Tests / CI | `CLOSED_INTERNAL` | Workflow دائم؛ الوظائف الأربع نجحت |
| FS-18 Evidence / Rollback | `READY_FOR_INDEPENDENT_REVIEW` | هذا الملف وJSON المرافق وخطة rollback |

## الإصلاحات الجذرية المنفذة

### التحقق من المعرّفات والعقد

- تُرفض معرفات Checkout والطلب غير الصالحة قبل وصولها إلى PostgreSQL UUID casts.
- يحافظ مسار الإنشاء على `400 INVALID_CHECKOUT_INTENT_ID` كما يفرض عقد الإنشاء.
- تحافظ مسارات القراءة على `404 NOT_FOUND` للمعرف غير الصالح أو غير الموجود، فلا يحدث `500` ولا يُكشف اختلاف شكل المعرّف.
- أضيف `GetOperatorScopedOrderTruth` بدل القراءة العامة المباشرة، مع تثبيت tenant scope قبل hydration.

### الخصوصية والعزل متعدد الأسطح

- قراءات العميل مقيدة بـtenant والعميل.
- قراءات الشريك مقيدة بـtenant والمتجر.
- قراءات المشغّل مقيدة بـtenant وصلاحية `operations.read`.
- الشريك والمشغّل لا يتلقيان `clientId` أو snapshot العنوان الخاص.
- حُجبت metadata لأحداث الطلب عن الشريك والمشغّل لأنها قد تحتوي تشخيصات ممثل أو مزود لا تلزم السطح.

### الحقيقة التشغيلية وعدم التكرار

- إنشاء الطلب يتم من Checkout Intent مملوك للعميل وفي tenant نفسه.
- مفتاح idempotency دائم في تطبيق العميل ولا يُحذف قبل نجاح actor-scoped GET readback.
- القفل والاسترجاع مقيدان بـ`tenant_id + client_id + idempotency_key`.
- Checkout Intent واحد لا ينشئ أكثر من طلب واحد.
- correlation ID منفصل عن مفتاح idempotency ولا يكشفه.
- snapshot العناصر والأسعار والعنوان وطريقة التنفيذ غير قابل لإعادة الاشتقاق من الكتالوج الحي بعد الإنشاء.

### الأحداث وحدود WLT

- `order.created` وoutbox ينشآن داخل المعاملة نفسها.
- bridge worker يستخدم الحدث نفسه كمفتاح idempotency عند النقل إلى outbox التشغيلي.
- WLT يظل المصدر المالي السيادي.
- DSH يقرأ Payment Session ويحدّث projection للقراءة فقط؛ لا ينفذ debit أو credit أو capture أو refund أو settlement.
- تمنع المصالحة تطبيق fact أقدم من الحقيقة المسقطة الحالية.

### الواجهات والتنظيف

- app-client ينفذ Checkout → create → actor-scoped read-after-write.
- app-partner وcontrol-panel يقرآن نفس Shared Brain دون حقيقة محلية.
- `allowedActions` تأتي من الخادم ولا تُشتق من status داخل السطح.
- أزيلت Inline Styles من ملخص حقيقة الطلب المشترك ومن جزء التنفيذ في شاشة الشريك، واستُخدمت خصائص layout المعتمدة في `@bthwani/ui-kit`.
- أضيف TypeScript config مستهدف للرحلة كي يثبت ملفاتها واستيراداتها دون خلط أخطاء رحلات أخرى غير مصرح بإصلاحها.

## بوابات التحقق الناجحة

### Static / Node

```text
node tools/guards/jrn-011-cross-surface-integrity-gate.mjs
node --test services/dsh/tests/jrn-011-order-*.test.mjs
```

النتيجة: `success`.

### Go

```text
go test ./internal/orders ./internal/http ./internal/wlt -count=1
```

النتيجة: `success`.

### PostgreSQL 16

طُبقت جميع migrations بالترتيب في قاعدة Workflow مع `ON_ERROR_STOP`، ثم نجح:

```text
services/dsh/database/tests/dsh-902_903_jrn011_order_truth_invariants.sql
services/dsh/database/tests/dsh-905_jrn011_payment_projection_invariants.sql
```

النتيجة: `success`.

### TypeScript المستهدف

```text
pnpm --dir services/dsh exec tsc -p tsconfig.jrn-011.json --noEmit
```

النتيجة: `success`.

### GitHub Actions

- workflow: `.github/workflows/jrn-011-order-truth-verify.yml`
- run: `29873796768`
- verified commit: `fdace18a6ae4a92b077db32254d7f0253d102fd7`
- published status: `jrn-011/order-truth = success`
- Static order-truth integrity: `success`
- Go order and WLT projection tests: `success`
- PostgreSQL order-truth invariants: `success`
- JRN-011 TypeScript binding: `success`
- Publish governed verification status: `success`

## بوابة الصفر الداخلية

```yaml
unbound_ui_controls: 0
frontend_only_features: 0
backend_only_features: 0
contract_client_drift: 0
request_response_mismatches: 0
permission_mismatches: 0
local_surface_business_logic: 0
raw_surface_api_calls: 0
duplicate_truth_owners: 0
runtime_mock_or_demo_truths: 0
obsolete_or_dead_code_in_scope: 0
unclosed_registered_slices: 0
unclosed_discovered_internal_slices: 0
cross_slice_integration_gaps: 0
unresolved_internal_gaps: 0
failed_required_internal_checks: 0
```

## الأدلة الخارجية المتبقية

1. تشغيل smoke محكوم في بيئة DSH/WLT المستهدفة يغطي first create، identical replay، different-fingerprint conflict، actor-scoped readback، event bridge retry/crash، وpayment projection outage/recovery.
2. فحص app-client وapp-partner وcontrol-panel على أجهزة ومتصفحات ممثلة للعربية وRTL وdynamic text والوصولية وoffline/partial states.
3. مراجعات مستقلة من Product Owner وQA والأمن وحدود المالية/WLT وسلطة الإطلاق والإنتاج.
4. لم يُنشأ Pull Request أو Merge لأنهما غير مصرحين في هذه المهمة.

## Rollback

1. أوقف `RunPaymentProjectionWorker` و`RunOrderEventBridgeWorker` قبل أي rollback بنيوي.
2. أعد ربط الأسطح إلى المسار السابق عند الضرورة مع إبقاء legacy routes في وضع compatibility فقط.
3. لا تحذف idempotency أو event outbox أو audit أو reconciliation rows قبل تسوية كل صف in-flight وأرشفته.
4. أعد كود التطبيق أولًا، ثم أزل الأعمدة أو triggers الإضافية بعد إثبات عدم وجود مستهلك يعتمد عليها.
5. لا تستخدم أي حركة مالية من DSH كآلية rollback.
6. بعد rollback تحقق من one-order-per-checkout، استمرارية الأحداث وبقاء WLT هو المصدر المالي.

## الخلاصة

الحالة القانونية الحالية هي `READY_FOR_REVIEW`: التنفيذ الداخلي والبوابات المستهدفة ناجحة، ولا توجد فجوة كود داخل نطاق JRN-011 مثبتة وقابلة للإصلاح متروكة. لا يُدّعى `CLOSED_WITH_EVIDENCE` قبل اكتمال الأدلة والموافقات الخارجية المذكورة أعلاه.
