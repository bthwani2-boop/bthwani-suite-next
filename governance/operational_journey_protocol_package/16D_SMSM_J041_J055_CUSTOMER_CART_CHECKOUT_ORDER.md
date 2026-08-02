# 16D — الرحلات J041..J055: العميل والاكتشاف والسلة وCheckout والطلب

> جزء إلزامي من الخطة الرئيسية. تطبق قواعد `16A` ومعيار إغلاق الرحلة العام على كل رحلة.

## J041 — ملف العميل وتفضيلاته

- **الهدف والمالك:** إدارة بيانات العميل المسموحة وتفضيلاته دون تكرار هوية المصادقة؛ DSH يملك ملف التجارة، Identity يملك الحساب والجلسة.
- **النطاق:** display name، language، notification/marketing preferences، saved defaults، consent versions.
- **الأسطح:** app-client My Space/Preferences؛ Control Panel read مقيد للدعم عند التفويض.
- **الثوابت:** لا نسخ للphone/roles/session truth؛ PII access محدود؛ preference changes versioned.
- **الاختبارات:** unauthorized read/edit، stale update، invalid locale، consent withdrawal، deleted actor.
- **معيار الإغلاق:** profile source واحد؛ duplicated identity fields صفر؛ privacy/audit/readback PASS؛ كل controls مربوطة.

## J042 — عناوين العميل وخصوصيتها

- **الهدف:** إنشاء وتعديل وحذف واختيار عنوان مع حماية الموقع والـPII.
- **المالك:** DSH؛ Providers للgeocoding؛ Media غير منطبق إلا مرفق مثبت.
- **الأسطح:** app-client address list/map/form/default selector؛ Control Panel support masked view فقط.
- **البيانات:** label، coordinates، normalized address، service area refs، access instructions، encrypted/sensitive fields.
- **الاختبارات:** cross-customer IDOR، invalid coordinates، geocoder timeout، deleting active checkout address، stale default race.
- **معيار الإغلاق:** raw address leakage صفر؛ ownership constraints PASS؛ default uniqueness؛ serviceability readback؛ retention/delete policy مثبتة.

## J043 — الخرائط والترميز الجغرافي

- **الهدف:** تحويل اختيار الموقع إلى بيانات جغرافية موحدة مع provider abstraction.
- **المالكون:** Providers للاتصال، DSH للسياق التشغيلي.
- **الأسطح:** app-client address/store maps، app-field verification، app-captain delivery، Control Panel maps.
- **النطاق:** geocode/reverse geocode، map tiles/config، route hints، accuracy metadata، provider health.
- **الاختبارات:** provider unavailable، inaccurate result، malformed response، API key absence، quota/429، offline cached display.
- **معيار الإغلاق:** public secrets صفر؛ provider-specific truth في surfaces صفر؛ fallback واضح وغير صامت؛ all map states/a11y PASS.

## J044 — اكتشاف المتاجر والبحث والترشيح

- **الهدف:** إظهار المتاجر المنشورة والقابلة للخدمة حسب الموقع والبحث والمرشحات.
- **المالك:** DSH؛ Search/Cache مشتقات قابلة لإعادة البناء.
- **الأسطح:** app-client StoreDiscovery/Home؛ Control Panel diagnostics فقط.
- **النطاق:** query، categories، sorting، pagination، distance/ETA، opening state، availability filters.
- **الاختبارات:** no address، no results، stale index، duplicate pages، invalid cursor، closed/unpublished leakage.
- **معيار الإغلاق:** source operational DSH؛ index drift/rebuild proof؛ unpublished exposure صفر؛ filters/sort/pagination/readback PASS.

## J045 — تفاصيل المتجر وقراءة الكتالوج

- **الهدف:** عرض Store profile/assortment/categories/prices/availability من الحقيقة المركزية.
- **المالك:** DSH.
- **الأسطح:** app-client StoreDetail بكل tabs/cards/carousels/actions؛ app-partner/Control Panel readback للمقارنة.
- **الثوابت:** لا local mock catalog؛ store/partner ownership صحيح؛ price/availability timestamp/version ظاهر داخليًا.
- **الاختبارات:** store paused أثناء القراءة، product retired، empty category، partial media، stale cache، deep link invalid.
- **معيار الإغلاق:** كل section/control مسجل؛ local catalog truth صفر؛ loading/empty/error/blocked كاملة؛ cross-surface readback متطابق.

## J046 — Serviceability وETA

- **الهدف:** تقرير إمكانية الخدمة والسبب وETA/fee inputs قبل السلة والـCheckout.
- **المالك:** DSH؛ Providers للمسافة/المسار؛ WLT غير مالك للقرار التشغيلي.
- **النطاق:** store area، address، hours، capacity، fulfillment mode، route estimate، policy version.
- **الحالات:** serviceable/unserviceable/temporarily_unavailable/unknown_provider.
- **الاختبارات:** boundary coordinates، closed store، capacity zero، provider timeout، stale area version.
- **معيار الإغلاق:** reason codes كاملة؛ deterministic decision؛ client-side authoritative decision صفر؛ checkout revalidation PASS.

## J047 — إنشاء السلة وقراءتها وتعديلها

- **الهدف:** سلة واحدة لكل actor/context وفق Product Truth مع CRUD للعناصر.
- **المالك:** DSH.
- **الأسطح:** app-client Cart/Store controls؛ Control Panel cart activity read-only.
- **البيانات:** cart ID، store، items/variant/qty، version، pricing preview refs، timestamps.
- **الثوابت:** لا cross-store cart إلا إذا Product Truth يسمح؛ qty/min/max/step؛ optimistic concurrency.
- **الاختبارات:** duplicate tap، stale version، unavailable item، cross-customer IDOR، invalid quantity، concurrent devices.
- **معيار الإغلاق:** canonical cart write path واحد؛ duplicate lines/negative qty صفر؛ readback بعد كل mutation؛ race tests PASS.

## J048 — تزامن السلة واستعادتها

- **الهدف:** استعادة السلة بعد logout/reinstall/network interruption وحل تعارض الأجهزة.
- **المالك:** DSH؛ local storage cache غير حاكم.
- **الأسطح:** app-client startup/cart؛ support diagnostics عند التفويض.
- **الحالات:** synced/dirty/conflict/expired/merged/discarded.
- **الاختبارات:** offline edits، two-device updates، deleted product، price change، expired cart، retry after unknown result.
- **معيار الإغلاق:** conflict policy صريحة؛ silent overwrite صفر؛ local cache fallback-as-truth صفر؛ recovery/readback PASS.

## J049 — التسعير والرسوم والضرائب والتقريب

- **الهدف:** إنتاج quote تشغيلي موحد مع breakdown وإصدار policy، دون امتلاك DSH للدفتر المالي.
- **المالك:** DSH لحساب quote/order snapshot وفق السياسات؛ WLT يثبت القيود/الدفع.
- **النطاق:** item totals، discounts، delivery fee، service fees، tax، rounding، currency، promotion application.
- **الأسطح:** app-client cart/checkout، app-partner order preview، Control Panel checkout activity.
- **الاختبارات:** rounding boundaries، currency mismatch، promotion race، stale policy، negative total، tampered client amount.
- **معيار الإغلاق:** server recomputation فقط؛ local financial calculation صفر؛ invariant sum PASS؛ quote version pinned/readback.

## J050 — Checkout والتحقق والمعاينة

- **الهدف:** التحقق النهائي من cart/address/serviceability/availability/policy وإنتاج checkout intent.
- **المالك:** DSH.
- **الأسطح:** app-client GovernedCheckout، Control Panel checkout diagnostics.
- **الحالات:** draft/validating/ready/blocked/expired/consumed.
- **النطاق:** validation errors per field/item، quote expiry، address/fulfillment/payment selections، idempotency.
- **الاختبارات:** item unavailable، price changed، store closed، address unserviceable، duplicate submit، partial provider failure.
- **معيار الإغلاق:** all blockers machine-readable؛ no order before ready؛ UI states/actions كاملة؛ retry/refresh quote/readback PASS.

## J051 — اختيار Fulfillment Mode

- **الهدف:** اختيار `BTHWANI_CAPTAIN | PARTNER_CAPTAIN | PARTNER_SELF_FULFILLMENT | CUSTOMER_PICKUP` وفق قدرات المتجر والسياسة.
- **المالك:** DSH.
- **الأسطح:** app-client checkout، app-partner store settings/readback، Control Panel policy/operations.
- **الثوابت:** mode لا يحدد commercial model تلقائيًا؛ eligibility يعاد التحقق منها عند إنشاء الطلب.
- **الاختبارات:** unsupported mode، capacity changed، partner captain unavailable، pickup disabled، forged selection.
- **معيار الإغلاق:** allowed modes مصدر واحد؛ invalid selection rejected؛ downstream order/dispatch paths تتبع mode؛ surface consistency PASS.

## J052 — اختيار الدفع وPayment Session الأولية

- **الهدف:** اختيار وسيلة الدفع وطلب session مالية عبر DSH facade فقط.
- **المالكون:** DSH للتدفق والمرجع التشغيلي، WLT لإنشاء وحقيقة payment session.
- **الأسطح:** app-client PaymentDecision؛ Control Panel payment-session operations؛ لا direct WLT network.
- **الحالات:** not_required/pending/authorized/failed/unknown/expired حسب الطريقة.
- **الاختبارات:** provider timeout، duplicate create، tampered amount، unsupported method، session expired، COD eligibility failure.
- **معيار الإغلاق:** surface→DSH فقط؛ amount snapshot متطابق؛ unknown-result lookup/reconciliation PASS؛ raw financial details في DSH صفر.

## J053 — إنشاء الطلب وIdempotency

- **الهدف:** إنشاء Order مرة واحدة من checkout intent صالح مع snapshot كامل.
- **المالك:** DSH.
- **النطاق:** consume checkout، lock/revalidate، create order/items/timeline، attach payment/COD refs، emit outbox.
- **الحالات:** creating/created/payment_pending/confirmed أو failure دون partial orphan.
- **الاختبارات:** repeated submit، same key different payload، concurrent stock change، DB/outbox failure، payment unknown result.
- **معيار الإغلاق:** duplicate orders صفر؛ transaction/outbox atomicity PASS؛ snapshot immutable؛ client receives recoverable result/readback.

## J054 — حقيقة الطلب والجدول الزمني والقراءة

- **الهدف:** مصدر واحد لحالة Order وtimeline وallowedActions لكل actor.
- **المالك:** DSH.
- **الأسطح:** app-client orders/tracking، app-partner inbox/detail، app-captain assignment/execution، Control Panel live orders، app-field عند الانطباق.
- **البيانات:** state/version/events/reasons/actor/correlation/timestamps؛ projections لا تستبدل الحقيقة.
- **الاختبارات:** cross-actor IDOR، stale projection، missing event، out-of-order timeline، unauthorized action visibility.
- **معيار الإغلاق:** state machine واحدة؛ read models قابلة لإعادة البناء؛ timeline complete؛ allowedActions يطابق backend authorization بكل سطح.

## J055 — Workboards والتدخل التشغيلي والطلبات المساعدة

- **الهدف:** تمكين operator من رؤية queues والتدخل المصرح دون تعديل مباشر للـDB.
- **المالك:** DSH؛ Platform Control للموافقات السيادية عند لزومها.
- **الأسطح:** Control Panel live orders/assisted desk/command center؛ readback للأسطح المتأثرة.
- **العمليات:** search/filter/pagination، inspect، approved intervention، reason/evidence، rollback/compensation path.
- **الاختبارات:** unauthorized operator، stale version، intervention after terminal state، duplicate action، partial failure.
- **معيار الإغلاق:** direct DB/manual state edits صفر؛ كل action عقد/permission/audit؛ queues لا تفقد/تكرر items؛ readback runtime PASS.

## بوابة إغلاق المجموعة J041..J055

```yaml
customer_profile_and_address_privacy: PASS
serviceability_and_discovery_truth: PASS
local_catalog_or_cart_truth: 0
cart_concurrency_and_recovery: PASS
server_authoritative_pricing: PASS
checkout_blocker_coverage: PASS
surface_direct_wlt_calls: 0
order_creation_duplicates: 0
order_truth_and_timeline_single_owner: PASS
operator_direct_db_actions: 0
all_visible_controls_and_states_mapped: PASS
open_journeys_in_group: 0
failed_required_checks: 0
evidence_sha: FINAL_SHA
```
