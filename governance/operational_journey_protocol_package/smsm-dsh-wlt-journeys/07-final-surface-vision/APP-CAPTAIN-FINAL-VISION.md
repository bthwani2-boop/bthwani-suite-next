# App Captain — الرؤية النهائية

## الدور النهائي

سطح تنفيذ ميداني آمن للكابتن: الهوية والجاهزية والعروض والإسناد والوصول للمتجر والاستلام والتتبع والتسليم والاستثناءات وCOD والدعم، مع أقل قدر من البيانات والصلاحيات.

## بنية التنقل

- Activation/session/device.
- Readiness/blocked reasons.
- Availability.
- Assignment offers.
- Active delivery.
- Map/tracking/contact.
- Pickup/handoff proof.
- Delivery proof/failed attempt/rescue.
- COD custody/financial eligibility/summary.
- Notifications/support/profile.

لا تظهر tab أو route لا يملك الكابتن capability صالحة لها.

## ما يجب أن يظهر

### الجاهزية

- profile/documents/assignment/status/financial eligibility كأسباب منفصلة.
- زر معالجة كل نقص عند السماح، أو توجيه واضح للمشرف.
- تعليق أو انتهاء assignment يمنع mutations فورًا.

### التوفر والعروض

- online/offline availability بحالة خادمية.
- offer card: store/pickup/dropoff/estimate/mode/expiry والبيانات الضرورية فقط.
- accept/decline مرة واحدة، server timer، unknown-result lookup.
- لا ghost offers أو multiple active assignments.

### المهمة النشطة

- timeline وallowedActions من الخادم.
- navigation/map مع stale/provider-down states.
- arrival/contact/pickup verification.
- custody transition واضح.
- offline queue فقط للأفعال المعتمدة مع conflict handling.

### التسليم والاستثناءات

- proof capture/upload/scan state.
- recipient/code/signature/photo حسب policy.
- failed attempt reasons وأدلة.
- rescue/reassignment effect يظهر فورًا.
- لا complete بدون proof ولا بعد cancellation.

### COD والمالية

- expected/collected/in-custody/handed-over/reconciled status.
- financial eligibility reason من WLT عبر DSH.
- masked summary فقط؛ لا ledger أو threshold calculation محلي.

## التحكمات

Availability toggle، offer accept/decline، open map، call/message proxy، arrived، verify pickup، start route، delivery attempt، capture proof، complete، report issue، request rescue، collect COD، handover COD، support message، logout.

كل تحكم يجب أن يحدد visibility/enablement/confirmation/duplicate behavior/offline support/backend operation/readback.

## الحالات المرئية

Not activated، profile incomplete، document expired، assignment missing، financially blocked، location permission missing، no offers، offer expired، assignment changed، offline queued، map degraded، pickup rejected، proof scanning/rejected، delivery unknown result، rescue active، COD discrepancy، session revoked.

## التقنية والبرمجة

- Expo dev-client/runtime بميناء المشروع المعتمد.
- SecureStore، location permissions، foreground/background policy واضحة.
- tracking batching/rate/accuracy/timestamps من contract.
- generated DSH client فقط.
- local queue مشفرة وbounded ومرتبطة assignment/version.
- no customer PII beyond current operational need.

## تجربة المستخدم

- استخدام بيد واحدة وأزرار كبيرة أثناء الحركة.
- تأكيد بصري وصوتي محدود وآمن.
- منع الإجراءات الخطرة أثناء القيادة حسب السياسة.
- أخطاء reason-coded وخطوة تالية واضحة.
- العربية/RTL وlarge text وcontrast وscreen reader.

## التجريب اليدوي النهائي

- جهاز فعلي: activation→readiness→availability→offer→accept→pickup→tracking→delivery→proof→COD/support.
- اختبر revoke/reassign/cancel أثناء offline، location spoof/stale، duplicate taps، app kill، expired offer، wrong order/proof، WLT unavailable.
- قارِن الحالة مع Client/Partner/Control Panel وWLT projection.

## بوابة الإغلاق

`ineligible_operations=0; ghost_offers=0; multiple_assignments=0; proof_bypasses=0; location_privacy_failures=0; local_financial_truth=0; manual_delivery_e2e=PASS; same_sha_evidence=PASS`.
