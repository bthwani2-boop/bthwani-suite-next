# App Partner — الرؤية النهائية

## الدور النهائي

سطح الشريك لإكمال onboarding وإدارة ملفه وفريقه ومتاجره وكتالوج متجره وطلباته وتنفيذه وتقاريره المالية المقروءة عبر DSH facade، دون امتلاك Master Catalog أو Identity أو WLT truth.

## بنية التنقل

- Activation/session/readiness.
- Dashboard.
- Onboarding/profile/team.
- Stores/readiness/hours/areas/delivery modes.
- Catalog proposals/assortment/inventory/pricing/media/reels.
- Orders/inbox/preparation/issues/substitutions/handoff.
- Fleet عند الانطباق.
- Campaigns/promotions/loyalty participation.
- Finance summaries/COD/settlements/payouts/refunds.
- Support/notifications/settings.

## ما يجب أن يظهر

### Onboarding والجاهزية

- checklist مع status وسبب كل نقص.
- evidence upload/scan/review/needs-info.
- lifecycle active/suspended/terminated.
- لا تحرير مباشر للحقول القانونية بعد الاعتماد دون workflow.

### الفريق

- members/invitations/roles/assignments.
- كل permission من Identity/Workforce لا قائمة محلية.
- revoke ينعكس فورًا على الجلسة والتحكمات.

### المتاجر

- list/detail/create/edit/readiness/publication/pause.
- ساعات، موقع، مناطق خدمة، fulfillment modes، delivery policy.
- منع النشر مع نقص واضح قابل للإصلاح.

### الكتالوج

- البحث في Master Catalog وربط assortment.
- Product proposal بدل إنشاء Master محلي.
- proposal status/conflict/needs-info.
- stock/availability/min-max-step.
- price/preparation effective changes.
- media/reels upload/moderation status.

### الطلبات

- inbox مع sorting/filtering/pagination وعدم التكرار.
- accept/reject ضمن timer خادمي.
- preparation/ETA/delay/missing item/substitution.
- ready/handoff verification.
- cancellation/return/support status.

### الأسطول

- partner captains membership/readiness/availability عند اعتماد mode.
- لا إسناد لكابتن خارج affiliation أو readiness.

### المالية

- balance/commission/debt/settlement/payout/COD/refund summaries masked.
- destination management عبر DSH facade؛ لا raw values بعد الإدخال.
- لا حساب totals أو eligibility في التطبيق.

## التحكمات والحالات

كل create/edit/publish/pause/submit/withdraw/accept/reject/start/ready/handoff/invite/revoke/upload/filter/export/financial-request يملك confirmation وpermission وidempotency وreadback.

الحالات: onboarding incomplete، review pending، needs info، store blocked، catalog conflict، stock stale، order timer expired، preparation delayed، handoff exception، finance unavailable، payout unknown، offline queued، scope revoked.

## التقنية والبرمجة

- Expo shell وcontrollers مشتركة سيادية.
- generated DSH clients فقط.
- partition query cache بالpartner/store/actor scope.
- local drafts مشفرة ومحدودة، لا تتحول إلى truth.
- upload resumable مع Media ownership.
- background refresh لا ينفذ mutation صامتة.

## التجريب اليدوي النهائي

- فعّل Partner، أكمل onboarding، أنشئ Store وانشره، اربط Catalog، عدّل stock/price، استقبل Order واقبله وجهزه وسلمه، راقب العميل والكابتن، ثم راجع finance/support.
- اختبر cross-partner IDs وrevoke أثناء session وoffline catalog/order actions وtimer races وWLT unavailable.
- تحقق أن كل تغير يظهر في Control Panel وApp Client والسطح التشغيلي التالي.

## بوابة الإغلاق

`local_identity_catalog_finance_truths=0; cross_partner_access=0; unmapped_partner_controls=0; readiness_bypasses=0; order_transition_bypasses=0; manual_partner_lifecycle=PASS; same_sha_evidence=PASS`.
