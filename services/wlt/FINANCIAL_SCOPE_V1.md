# نطاق WLT المالي الأدنى القابل للتشغيل — v1

**الخدمة:** `services/wlt` (Wallet / Financial Truth)
**المصدر:** قرار مالك معتمد — البند 2/3 من `tools/plan/BTHWANI_FINAL_CLOSURE_DECISION_REGISTER_ONEBYONE.md`
**الوضع الافتراضي:** مزود مالي Mock (WireMock داخل Docker) نشط افتراضيًا في local/staging؛ استبدال المزود الحقيقي بعد الإطلاق عبر env فقط.

> قاعدة حاكمة: كل قدرة مالية ظاهرة في أي سطح يجب أن تكون إما مربوطة فعليًا بـ Runtime (WLT + المزود) أو محذوفة/مخفية تمامًا من الإصدار. لا يوجد وسط بينهما (انظر شرط الإغلاق في البند 3 من سجل القرارات).

---

## 1. داخل النطاق (IN SCOPE) — v1

### 1.1 مرجع جلسة الدفع (DSH → WLT Handoff)
- إنشاء وقراءة `payment_session_reference` من DSH إلى WLT عند بدء الدفع.
- WLT هو المالك الوحيد لحالة الجلسة؛ DSH يستهلك فقط `wlt_reference` و`payment_status_reference`.
- لا يجوز لأي سطح آخر إنشاء أو تعديل حالة الدفع مباشرة.

### 1.2 التفويض والالتقاط عبر بطاقة (Card Authorize/Capture)
- ينفذ عبر `provider adapter` واحد داخل `services/wlt/backend/internal/provider`.
- الوضع الافتراضي: **mock** عبر `wiremock-financial-provider` (Docker، profile `financial-simulators`).
- المزود الحقيقي (production) يبقى ممنوعًا افتراضيًا؛ التفعيل عبر متغيرات بيئة فقط (انظر القسم 3).

### 1.3 الدفع عند الاستلام (COD)
- تسجيل `cod_financial_state` وتحصيل COD ضمن ملكية WLT.
- لا يجوز لـ DSH أو أي تطبيق تخزين حالة تحصيل COD كحقيقة نهائية؛ DSH يعرض مرجع الحالة فقط.

### 1.4 المرتجعات المالية (Refunds)
- إنشاء وتتبع `refunds` وربطها بـ `settlements`/`ledger` داخل WLT.
- حالة الاسترجاع الظاهرة لأي سطح هي `refund_status_reference` فقط.

---

## 2. خارج النطاق ومخفي في v1 (OUT OF SCOPE & HIDDEN)

يطابق `deferred_and_hidden_in_v1` في سجل قرارات الإغلاق (البنود 46/55 وما في حكمها):

- **الولاء (Loyalty):** لا نقاط، لا مكافآت، لا رصيد ولاء ظاهر أو محسوب.
- **الاشتراكات (Subscriptions):** لا خطط اشتراك، لا تجديد تلقائي، لا فوترة دورية.
- **الإكراميات (Tips):** لا حقل tip في السلة أو الطلب أو الإيصال حتى اعتماد مالي كامل منفصل.

أي إشارة UI أو Seed أو route أو deep link لهذه القدرات يجب أن تكون محذوفة تمامًا من الإصدار، لا "قريبًا" ولا حالة معطّلة ظاهرة.

---

## 3. إجراء استبدال المزود المالي (Provider Swap Procedure)

الاستبدال بين المزود الوهمي (mock) والمزود الحقيقي (production) يتم **حصريًا عبر متغيرات البيئة** دون أي تغيير كود:

```bash
WLT_FINANCIAL_PROVIDER_MODE=mock        # القيمة الافتراضية في local/staging
WLT_FINANCIAL_PROVIDER_BASE_URL=http://wiremock-financial-provider:8080
WLT_ALLOW_PRODUCTION_PROVIDER=false     # يجب أن يبقى false إلا بقرار وتفعيل صريحين
```

- التبديل إلى مزود حقيقي: تعيين `WLT_FINANCIAL_PROVIDER_MODE=production`، `WLT_FINANCIAL_PROVIDER_BASE_URL` إلى نقطة نهاية المزود الحقيقي، و`WLT_ALLOW_PRODUCTION_PROVIDER=true` معًا في بيئة الإنتاج فقط.
- هذا القرار مرتبط ببند [P0] "مزود الدفع والعمليات المالية الفعلية" في سجل قرارات الإغلاق ويبقى `PENDING` حتى اعتماد مزود إنتاج فعلي؛ الافتراضي الحالي (mock) لا يمثل جاهزية إنتاجية.
- الحارس `tools/guards/wlt-financial-boundary-gate.mjs` يمنع أي إشارة مباشرة لمزود مالي إنتاجي أو نقطة وصول مباشرة خارج `services/wlt` والمسارات المسموح بها.

---

## 4. القاعدة الحاكمة للإغلاق

كل قدرة مالية ظاهرة لأي مستخدم (عميل، شريك، كابتن، ميداني، تحكم) يجب أن تكون:

- **مربوطة Runtime بالكامل** (WLT حي + مزود mock/production يستجيب + مسار E2E مُختبر)، **أو**
- **محذوفة بالكامل** من ذلك السطح (لا زر، لا نص، لا route، لا Seed).

لا يُقبل عرض قدرة مالية "معطّلة بصريًا" أو "قريبًا" كحل وسط (يطابق شرط إغلاق البند 3 في سجل القرارات).

---

```yaml
financial_scope_version: v1
provider_mode_default: mock
mutations_enabled_default: true
production_provider_allowed_default: false
in_scope:
  - payment_session_reference_handoff
  - card_authorize_capture_via_provider_adapter
  - cod_records_and_collection
  - refunds
deferred_and_hidden_in_v1:
  - loyalty
  - subscriptions
  - tips
provider_swap_env_vars:
  - WLT_FINANCIAL_PROVIDER_MODE
  - WLT_FINANCIAL_PROVIDER_BASE_URL
  - WLT_ALLOW_PRODUCTION_PROVIDER
closure_rule: every_visible_financial_capability_must_be_runtime_bound_or_removed
```
