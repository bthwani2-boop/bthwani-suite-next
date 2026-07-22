# JRN-035 — الاستردادات المالية: مصفوفة التنفيذ والإثبات

## القرار الحالي

- **حالة الكود:** IMPLEMENTED_FOR_REVIEW
- **حالة الإغلاق المحمي:** NEEDS_EVIDENCE
- **مالك الحقيقة المالية:** WLT
- **منسق الأهلية والواجهات:** DSH
- **الفرع المستهدف:** `sambassam`
- **سبب عدم إعلان CLOSED:** لا توجد بعد نتيجة مستقلة مرئية لكل وظائف GitHub Actions، ولا دليل runtime فعلي مع مزود دفع، ولا لقطات UI، ولا اعتماد Product Manager/Product Owner. لا يجوز استبدال هذه الأدلة بادعاء نصي.

## تغطية الشرائح التشغيلية

| الشريحة | التنفيذ | المسارات الرئيسية | الإثبات المتبقي |
|---|---|---|---|
| FS-01 Product Truth | منفذ | `governance/product/contracts/jrn-035-financial-refunds.product-truth.json` | اعتماد PM/PO |
| FS-02 الأدوار والصلاحيات | منفذ | `refund_finance_handlers.go`, `tenant_guard.go` | اختبار جلسات حقيقية متعددة الأدوار |
| FS-03 آلة الحالات | منفذ | `jrn-035-refund-governance.json`, `governed_refund.go` | نتيجة Go tests مستقلة |
| FS-04 حدود WLT/DSH | منفذ | WLT router + DSH proxy/handlers | financial-boundary gate نتيجة مستقلة |
| FS-05 قاعدة البيانات | منفذ | `wlt-037_jrn_035_refund_governance.sql` | PostgreSQL 16 migration job |
| FS-06 العقود | منفذ | WLT/DSH JRN-035 OpenAPI overlays | OpenAPI generation job |
| FS-07 الأهلية والمبلغ المتبقي | منفذ | قفل payment session وحساب المحجوز | اختبار تنافسي فعلي |
| FS-08 الجزئي والكامل | منفذ | amount=0 كامل المتبقي، amount>0 جزئي | runtime seeded payment/refund |
| FS-09 maker/checker | منفذ | أعمدة/قيد DB وفحص Go | اختبار حسابين مستقلين |
| FS-10 استدعاء المزود | منفذ | claim `approved→processing`, provider idempotency | sandbox provider evidence |
| FS-11 نتيجة المزود غير المحسومة | منفذ | `provider_unknown` + reconciliation case | timeout/ambiguous-result injection |
| FS-12 منع التكرار | منفذ | creation key + provider key + ledger source + outbox key | concurrent/replay test |
| FS-13 دفتر الأستاذ | منفذ | double-entry `refund_completed` | SQL evidence of balanced journal |
| FS-14 DSH readback | منفذ | WLT outbox + worker + DSH webhook | delivery/retry runtime evidence |
| FS-15 لوحة التحكم | منفذ | `RefundsCommandPanel.tsx` | visual evidence + accessibility run |
| FS-16 تطبيق العميل | منفذ | `OrderRefundStatusCard.tsx`, `OrdersListScreen.tsx` | device/runtime screenshot |
| FS-17 تطبيق الشريك | منفذ | `OrderRefundStatusCard.tsx`, `GovernedPartnerOrdersScreen.tsx` | device/runtime screenshot |
| FS-18 الحوكمة والإغلاق | جزئي | verifier workflows + هذا السجل | كل الأدلة المستقلة أعلاه |

## invariants المغلقة في الكود

1. DSH لا يكتب جداول الاسترداد أو دفتر الأستاذ في WLT.
2. المستأجر الموثوق مطلوب لكل مسار استرداد في WLT، ويعاد 404 عند محاولة عبور مستأجر آخر.
3. منشئ طلب الاسترداد لا يستطيع اعتماده أو رفضه بنفس الهوية.
4. مجموع الاستردادات المحجوزة/المكتملة لا يتجاوز مبلغ جلسة الدفع الأصلية تحت قفل قاعدة البيانات.
5. الانتقال إلى `processing` يثبت قبل الاتصال بالمزود، ولا توجد إعادة مزود تلقائية من `provider_unknown`.
6. الإكمال الناجح يجمع حالة الاسترداد ودفتر الأستاذ وإسقاطات الحالة وحدث outbox في معاملة واحدة.
7. قراءات العميل والشريك لا تعرض مراجع المزود أو أخطاءه أو هويات المشغلين أو تفاصيل المصالحة.
8. حدث DSH يستخدم `refund_reference + event_type` كهوية مستقلة، لذلك تدعم جلسة دفع واحدة عدة استردادات جزئية.

## مسارات التحقق البعيد

- `.github/workflows/jrn-035-financial-refunds-verification.yml`
  - verifier ثابت.
  - حارس ملكية WLT المالية.
  - ترحيلات PostgreSQL 16 كاملة بالترتيب.
  - اختبار invariants لقاعدة البيانات.
  - gofmt وتجميع/اختبارات WLT وDSH.
  - TypeScript typecheck وحراس ربط API/feature.
- `.github/workflows/jrn-035-openapi-verification.yml`
  - فحص العمليات والخصوصية.
  - توليد TypeScript فعلي من عقدي WLT وDSH.

## حالات الفشل التي يجب إثباتها قبل CLOSED

- نفس Idempotency-Key مع حمولة مختلفة يعيد conflict.
- طلبان متزامنان لا يتجاوزان remaining refundable amount.
- maker يحاول الاعتماد أو الرفض فيُمنع.
- definitive provider failure ينتهي `rejected` بلا ledger.
- timeout/connection ambiguity ينتهي `provider_unknown` بلا إعادة تلقائية.
- confirmed_success من المصالحة يكتب ledger/outbox مرة واحدة.
- إعادة تسليم outbox لا تنشئ إشعارًا تشغيليًا مكررًا.
- عميل أو شريك غير مالك للطلب لا يرى حالة الاسترداد.
- مستأجر غير مالك لمعرّف الاسترداد يحصل على NOT_FOUND.

## بوابات القرار

لا تُرقّى الرحلة إلى `CLOSED` أو `RELEASE_READY` إلا بعد إرفاق:

1. روابط تشغيل ناجحة لكل وظائف التحقق.
2. دليل runtime لمزوّد sandbox يغطي النجاح والفشل والغموض.
3. استعلامات قاعدة بيانات تثبت توازن دفتر الأستاذ وعدم التكرار.
4. إثبات بصري للوحة التحكم وتطبيقي العميل والشريك.
5. اعتماد Product Manager واعتماد Product Owner المسجلين في Product Truth.
