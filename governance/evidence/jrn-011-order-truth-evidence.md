# JRN-011 — إنشاء الطلب وحقيقة الطلب

## قرار الإغلاق

- `repository_mode`: `REMOTE_ONLY`
- `repository`: `bthwani2-boop/bthwani-suite-next`
- `branch`: `sambassam`
- `observed_baseline_commit`: `4d5b90e6909100f44e3e5f71976ae4f347f4b16c`
- `implementation_commit_prefix`: `c769d696`
- `decision`: `FIX_REQUIRED`
- `next_journey_started`: `false`

تم تنفيذ الشرائح `FS-01` إلى `FS-18` بالتتابع في الكود والعقود والاختبارات والحوكمة. لا يجوز تحويل الرحلة إلى `PASS` أو `CLOSED` لأن نتائج CI المنشورة، تطبيق migrations على بيئة تشغيل، اختبارات DSH/WLT الحية، اختبارات الأسطح، واستمارات الاعتماد المستقلة غير متوفرة على نفس commit عند تسجيل هذا الدليل.

## نتيجة الشرائح المتسلسلة

| الشريحة | النتيجة | الدليل الرئيسي |
|---|---|---|
| FS-01 Product Truth | `IMPLEMENTED_STATIC` | `governance/product/contracts/jrn-011-order-creation-truth.product-truth.json` |
| FS-02 Roles / Surfaces / Forbidden | `IMPLEMENTED_STATIC` | `services/dsh/contracts/jrn-011-surface-rbac-registry.json` |
| FS-03 State / Ownership / allowedActions | `IMPLEMENTED_STATIC` | `services/dsh/contracts/jrn-011-order-state-policy.json` |
| FS-04 DSH/WLT Boundary | `IMPLEMENTED_STATIC` | `governance/boundaries/jrn-011-dsh-wlt-order-truth-boundary.md` |
| FS-05 Database Truth | `IMPLEMENTED_PENDING_MIGRATION_EXECUTION` | migrations `dsh-902` إلى `dsh-905` |
| FS-06 API / Contract | `IMPLEMENTED_STATIC` | `services/dsh/contracts/dsh.order-truth.openapi.yaml` |
| FS-07 Backend | `IMPLEMENTED_PENDING_RUNTIME` | `services/dsh/backend/internal/orders/order_truth.go` |
| FS-08 Events / Outbox | `IMPLEMENTED_PENDING_RUNTIME` | `order_event_outbox.go` و`order_event_bridge_worker.go` |
| FS-09 Shared Brain | `IMPLEMENTED_PENDING_TYPECHECK` | `services/dsh/frontend/shared/order-truth/index.ts` |
| FS-10 Surface Binding | `IMPLEMENTED_PENDING_SURFACE_RUNTIME` | app-client، app-partner، control-panel |
| FS-11 Visible States | `IMPLEMENTED_STATIC` | `order-truth.visible-states.ts` |
| FS-12 Cross-Surface Consistency | `IMPLEMENTED_PENDING_GATE_EXECUTION` | `jrn-011-cross-surface-integrity-gate.mjs` |
| FS-13 Security / Privacy / RBAC | `IMPLEMENTED_PENDING_SECURITY_TEST` | actor-scoped SQL، redaction، DB invariants |
| FS-14 RTL / Accessibility / Performance | `IMPLEMENTED_PENDING_RUNTIME` | `order-truth.experience.ts` |
| FS-15 Monitoring / Runbooks | `IMPLEMENTED_PENDING_RUNTIME` | diagnostics وrunbooks |
| FS-16 Cleanup / Compatibility | `IMPLEMENTED_STATIC` | `jrn-011-legacy-compatibility.json` |
| FS-17 Tests / CI | `DEFINED_NOT_PROVEN` | `.github/workflows/jrn-011-order-truth-verify.yml` |
| FS-18 Evidence / Rollback | `RECORDED_WITH_BLOCKERS` | هذا الملف وملف JSON المرافق |

## الحقيقة التشغيلية المنفذة

### الإنشاء وعدم التكرار

- إنشاء الطلب يتم من Checkout Intent مملوك للعميل وفي tenant نفسه.
- مفتاح idempotency دائم في تطبيق العميل ولا يُحذف قبل نجاح actor-scoped GET readback.
- القفل والاسترجاع مقيدان بـ`tenant_id + client_id + idempotency_key`.
- يتم التحقق من ملكية Checkout قبل lookup على مستوى Checkout لمنع تسريب وجود طلب عميل آخر.
- Checkout Intent واحد لا ينشئ أكثر من طلب واحد.
- إعادة الطلب بنفس المفتاح والطلب نفسه تعيد الحقيقة السابقة؛ إعادة استخدام المفتاح لطلب مختلف ترجع تعارضًا.
- correlation ID منفصل عن مفتاح idempotency، والباك إند يستبدل أي correlation مساوية للمفتاح بقيمة hash غير سرية.

### snapshots وقاعدة البيانات

- order number تجاري غير قابل للتغيير مع uniqueness داخل tenant.
- أرقام الطلبات الجديدة تستخدم تاريخ UTC واثني عشر محرفًا من UUID بدل ثمانية.
- address، items، pricing، coupon reference، checkout linkage وcorrelation snapshots محمية من التغيير.
- pricing snapshot يُنسخ من Checkout Intent المعتمد ولا يعاد حسابه من الكتالوج الحي.
- `items` و`statusTimeline` و`allowedActions` تُسلسل كمصفوفات فارغة بدل `null`.

### الأسطح والعقل المشترك

- app-client: Checkout → order create → read-after-write، وقائمة/تفاصيل الطلب تقرأ `orderNumber` و`totalMinorUnits` وtimeline وpayment projection وversion من الحقيقة السيادية.
- app-partner: قراءة store-scoped من نفس Shared Brain مع حجب هوية العميل والعنوان الخاص.
- control-panel: قراءة tenant-scoped تتطلب `operations.read`.
- app-captain وapp-field غير مربوطين في JRN-011 قبل مرحلة الإسناد؛ إدخالهما هنا سيكون تجاوزًا لحد الرحلة.
- الصلاحيات المرئية تأتي من `allowedActions` في الخادم ولا تُشتق من label الحالة في الواجهة.

### الأحداث والإشعارات

- كل حدث order يدخل `dsh_order_event_outbox` داخل نفس المعاملة.
- claim يستخدم `FOR UPDATE SKIP LOCKED` مع استرجاع lease المتروك بعد انهيار worker.
- بعد 12 محاولة يصبح الحدث `dead_letter`.
- bridge worker ينقل الحدث إلى `dsh_operational_outbox_events` باستخدام UUID الحدث نفسه، ثم المستهلك السيادي ينشئ إشعار العميل idempotently.
- crash بين الإدخال وmark-published لا ينتج إشعارًا مكررًا بسبب `ON CONFLICT (id) DO NOTHING`.

### حدود WLT والإسقاط المالي

- WLT يظل المصدر المالي السيادي.
- DSH لا ينفذ debit أو credit أو refund أو settlement أو capture.
- `RunPaymentProjectionWorker` يقرأ Payment Session عبر عميل WLT الخادمي ومفتاح الخدمة.
- العامل يحدّث read-only projection فقط، ويمنع الرجوع إلى WLT fact أقدم.
- تغير الإسقاط يزيد order version ويضيف `order.payment_projection_updated` إلى event stream/outbox.
- عدم تغير الإسقاط يحدّث freshness دون event noise.
- بعد 12 فشل تصبح المصالحة `paused` ويظهر `ORDER_PAYMENT_PROJECTION_PAUSED`.

## تعريفات التحقق المضافة

### Node/static

```text
node tools/guards/jrn-011-cross-surface-integrity-gate.mjs
node --test services/dsh/tests/jrn-011-order-*.test.mjs
```

تغطي العقود، migrations، idempotency، actor isolation، redaction، read-after-write، الأسطح، outbox bridge، correlation security وWLT projection.

### Go

```text
go test ./internal/orders ./internal/wlt -count=1
```

تغطي fingerprint، ownership/actions، JSON arrays، WLT status mapping، polling policy وعميل Payment Session.

### PostgreSQL 16

يطبّق Workflow جميع migrations بالترتيب ثم يشغل:

- `services/dsh/database/tests/dsh-902_903_jrn011_order_truth_invariants.sql`
- `services/dsh/database/tests/dsh-905_jrn011_payment_projection_invariants.sql`

### TypeScript

```text
pnpm --dir services/dsh typecheck
```

### Workflow

`.github/workflows/jrn-011-order-truth-verify.yml` يحتوي أربع وظائف مستقلة:

1. Static order-truth integrity.
2. Go order and WLT projection tests.
3. PostgreSQL order-truth invariants.
4. DSH TypeScript typecheck.

## الحالة المنشورة عند التقاط الدليل

- `workflow_runs`: لا توجد نتيجة منشورة قابلة للاعتماد على commit التنفيذ عند الفحص.
- `commit_statuses`: لا توجد نتيجة منشورة قابلة للاعتماد عند الفحص.
- لذلك: `TESTS_DEFINED_AND_WIRED != TESTS_PASSED`.

## الفجوات المانعة

1. إعادة تثبيت exact full SHA لأن الفرع `sambassam` يتغير تزامنيًا بواسطة جلسات أخرى.
2. نجاح Workflow على exact reviewed commit، مع حفظ نتائج الوظائف الأربع.
3. تطبيق migrations `dsh-902` إلى `dsh-905` في قاعدة اختبار ثم قاعدة التشغيل المستهدفة مع سجل `ON_ERROR_STOP`.
4. smoke حي يثبت: first create، identical retry replay، different fingerprint conflict، read-after-write وcross-client/store denial.
5. proof حي يثبت أن event واحد ينتج notification واحدة بعد retry/crash simulation.
6. proof حي لمصالحة WLT يغطي pending، captured، refunded، source أقدم، outage/retry وpaused recovery.
7. فحص app-client وapp-partner وcontrol-panel على جهاز/متصفح للعربية وRTL وdynamic text وaccessibility وoffline/partial states.
8. مراجعة مستقلة من QA والأمن وحدود المالية/WLT.
9. لا يوجد PR أو merge إلى `main`.

## rollback

1. أوقف `RunPaymentProjectionWorker` و`RunOrderEventBridgeWorker` قبل أي rollback بنيوي.
2. أعد ربط الأسطح إلى المسار السابق عند الضرورة مع إبقاء legacy routes في وضع compatibility فقط.
3. لا تحذف idempotency أو event outbox أو audit أو reconciliation rows قبل تسوية كل صف in-flight وأرشفته.
4. أعد كود التطبيق أولًا، ثم أزل الأعمدة/triggers الإضافية بعد إثبات عدم وجود مستهلك يعتمد عليها.
5. لا تستخدم أي حركة مالية من DSH كآلية rollback.
6. بعد rollback تحقق من one-order-per-checkout، استمرارية الأحداث وبقاء WLT هو المصدر المالي.

## الخلاصة

تم تنفيذ الرحلة تقنيًا عبر جميع الشرائح بالتتابع، وتم التوقف عند `FS-18` كما طُلب. الحالة الصحيحة الآن هي `FIX_REQUIRED` بسبب غياب دليل التنفيذ والاعتمادات على نفس commit، وليست `PASS` أو `CLOSED`.
