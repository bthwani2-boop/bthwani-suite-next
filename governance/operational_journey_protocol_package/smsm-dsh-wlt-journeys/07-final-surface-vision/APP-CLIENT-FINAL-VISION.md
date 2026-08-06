# App Client — الرؤية النهائية

## الدور النهائي

تجربة العميل من الهوية والموقع والاكتشاف حتى السلة والدفع والطلب والتتبع والدعم، مع واجهة واضحة لا تخفي أسباب المنع ولا تحسب حقيقة تشغيلية أو مالية محليًا.

## بنية التنقل

- Auth/activation/session recovery.
- Home discovery.
- Search/categories/stores.
- Store detail/catalog/product media.
- Cart.
- Checkout.
- Orders/tracking.
- Notifications.
- Support/returns/ratings.
- Profile/addresses/preferences.
- Financial summaries عبر DSH facade فقط عند اعتمادها.

كل deep link يمر عبر session/readiness/object gate ويعيد المستخدم إلى مكان صالح بعد تسجيل الدخول.

## ما يجب أن يظهر في الرحلات الأساسية

### الهوية والملف

- activation form، validation، attempt/expiry/blocked states.
- session-expired وdevice-revoked recovery.
- profile/preferences/consent/address list/map/default.
- لا عرض roles/permissions الداخلية إلا ما يلزم UX.

### الاكتشاف والكتالوج

- Home sections بfreshness وإمكانية refresh.
- address/location gate واضح.
- search/filter/sort/pagination أو infinite cursor بلا تكرار.
- store cards لا تعرض متجرًا غير منشور أو غير قابل للخدمة.
- store detail: profile/hours/serviceability/categories/items/availability/prices/media/reels.
- كل حالة empty منفصلة: لا متاجر، لا نتائج، لا أصناف، خارج التغطية، متجر موقوف.

### السلة

- cart authoritative من الخادم مع optimistic UX محدود وقابل للتراجع.
- quantity controls توضح min/max/step/unavailable.
- price changed/stock changed/promotion expired conflicts.
- restore بعد restart/reinstall/login، ولا local cart truth.

### Checkout

- address، fulfillment mode، payment method، promotion، breakdown.
- validation progress وblockers reason-coded.
- quote expiry وrefresh.
- زر submit واحد مع pending/unknown-result/lookup.
- لا order success قبل server readback.

### الطلب والتنفيذ

- order list/detail/timeline وallowedActions.
- partner decision/preparation/substitution/customer decision.
- tracking مع stale/degraded location states.
- pickup code أو delivery proof receipt حسب mode.
- cancellation/return/refund status دون direct financial action.

### الدعم والتقييم

- ticket create/messages/attachments/offline queue.
- return evidence وstatus.
- rating eligibility/moderation state.
- privacy controls والبيانات المعروضة للدعم.

## جميع التحكمات

- تبويبات Home/Orders/Profile واضحة وقابلة للوصول.
- icons لها أسماء وصولية.
- Add to cart/quantity/remove/clear.
- address add/edit/default/delete/map retry.
- filters/sort/pagination/reset.
- apply/remove coupon.
- select fulfillment/payment.
- submit/retry/check result.
- cancel/return/support/rate.

لكل تحكم يجب ربط operationId وhandler وsuccess readback واختبار duplicate tap وoffline.

## الحالات المرئية

يجب وجود تصميم محدد لكل: splash/bootstrap، unauthenticated، activation-required، profile-incomplete، loading skeleton، empty، validation، forbidden، blocked، price/stock conflict، offline cached، queued mutation، reconnecting، provider degraded، payment pending، unknown result، order created، cancelled، refunded، closed.

## التقنية والبرمجة

- Expo/React Native shell؛ shared sovereign controllers/view models خارج runtime.
- SecureStore للجلسة، local persistence cache فقط.
- generated DSH client؛ صفر `EXPO_PUBLIC_WLT_*`.
- query/mutation keys مركزية، cancellation عند unmount، no stale closure.
- maps/media/provider abstractions عبر العقود.
- deep links وnotification navigation typed ومقيدة.

## تجربة المستخدم

- العربية أولًا وRTL كامل.
- money formatter حاكم حسب ISO fraction digits.
- منع فقد السلة أو الطلب عند انقطاع الشبكة.
- إظهار سبب التعذر والخطوة التالية بدل رسالة عامة.
- touch targets وscreen reader وlarge text وsafe areas.
- أداء مناسب للأجهزة الضعيفة والصور والقوائم الطويلة.

## التجريب اليدوي النهائي

- جهاز فعلي: install→activation→address→discovery→store→cart→checkout→payment/COD→order→tracking→completion→support/rating.
- أعد الرحلة مع offline وslow network وapp kill وreinstall.
- غيّر السعر والمخزون والمنطقة والحالة أثناء الشاشات المفتوحة.
- راقب Network لإثبات Surface→DSH فقط.
- قارِن النتيجة مع Partner/Captain/Control Panel وWLT readback.

## بوابة الإغلاق

`local_catalog_cart_order_finance_truths=0; direct_wlt_calls=0; unmapped_controls=0; missing_states=0; deep_link_failures=0; accessibility_failures=0; complete_manual_e2e=PASS; same_sha_evidence=PASS`.
