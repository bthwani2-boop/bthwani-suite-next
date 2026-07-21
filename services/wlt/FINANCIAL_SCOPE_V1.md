# نطاق WLT المالي والتجاري القابل للتشغيل — v2

**الخدمة:** `services/wlt` — المالك الوحيد للحقيقة المالية وأرصدة الولاء والاستحقاقات المدفوعة.

**الوضع الافتراضي المحلي:** مزود مالي Mock داخل Docker، مع تفعيل mutations في بيئات التطوير والتحقق الإنتاجي المحلي فقط.

> قاعدة حاكمة: كل قدرة مالية أو تجارية ظاهرة يجب أن تكون مرتبطة بعقد WLT حي، ومحمية بهوية خدمة DSH، ومفتاح idempotency أو correlation، ومسار عكس/تسوية عند الحاجة. لا توجد نجاحات واجهة محلية.

## 1. داخل النطاق المعتمد

### 1.1 جلسات الدفع والتفويض والالتقاط

- DSH يثبت snapshot التسعير، ويرسل المبلغ النهائي ومرجع snapshot إلى WLT.
- WLT يملك جلسة الدفع وحالات authorize/capture/failure/expiry.
- لا يحق لأي تطبيق أو متصفح مخاطبة المزود المالي مباشرة.

### 1.2 الدفع عند الاستلام

- WLT يملك سجل COD والتحصيل والتسليم والتسوية.
- DSH يرسل حقائق التنفيذ عبر outbox durable فقط.

### 1.3 الاسترجاعات

- WLT يملك إنشاء الاسترجاع واعتماده وإكماله.
- بعد اكتمال refund يرسل WLT حدثًا موثقًا إلى DSH.
- DSH يعكس الآثار التشغيلية التجارية idempotently: حجز الكوبون وقيد الولاء.

### 1.4 المنتجات التجارية والاشتراكات

- WLT يملك المنتج المالي التجاري وسعره ودورته.
- DSH يملك العرض التسويقي وتعريف الخطة الظاهر للعميل، ويربطه بـ`wlt_product_reference`.
- شراء الاشتراك يبدأ من DSH ثم ينشئ WLT payment session.
- التفعيل لا يحدث إلا بعد إثبات capture ومطابقة العميل والمبلغ والعملة والمنتج.
- الاستحقاق النشط داخل WLT هو الحقيقة المالية؛ DSH يحتفظ بمرجع تشغيلي للعرض متعدد الأسطح.

### 1.5 الولاء

- DSH يملك سياسة الاستحقاق التشغيلية ويرصد حقيقة اكتمال الطلب.
- WLT يملك رصيد النقاط والدفتر غير القابل للتعديل.
- DSH يرسل earn/reverse عبر outbox durable وبمفتاح idempotency لكل طلب.
- refund مؤكد يلغي earn غير المرسل، أو يطلب reverse إذا كان القيد وصل إلى WLT.
- لا يجوز تعديل رصيد النقاط مباشرة من لوحة التحكم أو تطبيق العميل.

### 1.6 تمويل العروض

- DSH يملك حساب الخصم والأهلية وsnapshot checkout.
- WLT يملك حجز وتمرير وعكس مساهمة المنصة/الشريك المالية.
- أي عرض ممول يتطلب reservation قبل اعتماد الدفع، وcommit عند إنشاء الطلب، وrelease عند الفشل، وreverse عند refund.

## 2. خارج النطاق الحالي

- الإكراميات `tips` حتى اعتماد نموذج مالي مستقل وتسوية وعكس كاملين.
- الخصم أو النقاط أو الاشتراك الذي لا يمر عبر حدود WLT المعتمدة.
- أي مزود إنتاج حقيقي دون قرار إطلاق وبيانات اعتماد ومراقبة وتسوية.

## 3. بوابات التشغيل

كل mutation في WLT يحتاج بوابتين مستقلتين:

1. `X-Service-Caller: dsh` مع `WLT_DSH_SERVICE_TOKEN` صحيح.
2. `WLT_MUTATIONS_ENABLED=true` في بيئة النشر المقصودة.

المسارات التجارية معتمدة في:

```text
services/wlt/contracts/wlt.commercial.openapi.yaml
```

لكنها تبقى fail-closed إذا غاب متغير البيئة. بيئات التطوير والتحقق المحلي تستخدم مزودًا وهميًا وتفعّل البوابة. الإنتاج الحقيقي يجب أن يضبطها صراحة بعد اكتمال provider/reconciliation release gates.

## 4. استبدال المزود المالي

```bash
WLT_FINANCIAL_PROVIDER_MODE=mock
WLT_FINANCIAL_PROVIDER_BASE_URL=http://wiremock-financial-provider:8080
WLT_ALLOW_PRODUCTION_PROVIDER=false
WLT_MUTATIONS_ENABLED=true
```

للإنتاج الحقيقي فقط:

- `WLT_FINANCIAL_PROVIDER_MODE=production`
- `WLT_FINANCIAL_PROVIDER_BASE_URL=<approved-provider>`
- `WLT_ALLOW_PRODUCTION_PROVIDER=true`
- `WLT_MUTATIONS_ENABLED=true`
- مفاتيح الخدمة والمزود من secret manager، لا من المستودع.

## 5. شرط الإغلاق

لا تُعد القدرة مغلقة إلا إذا اجتازت معًا:

- العقد والراوتر والحارس.
- مصادقة الخدمة والبوابة البيئية.
- idempotency والتعارض المتزامن.
- مسار الفشل والتحرير والعكس.
- تطبيق migrations على قاعدة نظيفة.
- اختبارات backend وE2E متعددة الأسطح.

```yaml
financial_scope_version: v2
provider_mode_default: mock
commercial_mutations_approved: true
mutation_runtime_gate: WLT_MUTATIONS_ENABLED
production_provider_allowed_default: false
in_scope:
  - payment_sessions
  - authorize_capture
  - cod
  - refunds
  - settlements
  - commercial_products
  - paid_subscriptions
  - loyalty_ledger
  - promotion_funding
out_of_scope:
  - tips
closure_rule: every_visible_financial_capability_must_be_runtime_bound_idempotent_reversible_or_removed
```
