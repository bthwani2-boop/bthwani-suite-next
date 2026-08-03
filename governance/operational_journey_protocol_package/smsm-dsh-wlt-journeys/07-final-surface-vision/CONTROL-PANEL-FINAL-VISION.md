# Control Panel — الرؤية النهائية

## الدور النهائي

سطح الإدارة والتشغيل والمراجعة والتدخل المصرح، وليس قاعدة بيانات بديلة أو أداة لتجاوز state machines. كل إجراء يمر بعقد وpermission وtrusted scope وreason وaudit وreadback.

## الهيكل المعلوماتي النهائي

### لوحة البداية

- صحة Identity/Workforce/DSH/WLT/Providers/Media/Notifications.
- التنبيهات والحوادث وSLA والمصالحات والفشل الجزئي.
- اختصارات قائمة على الصلاحية، لا روابط ثابتة للجميع.
- freshness وlast successful readback، دون false-green.

### الهوية والوصول

- Actors: إنشاء، بحث، قراءة، تعليق، إعادة تفعيل.
- التفعيل: إصدار/إلغاء/إعادة إصدار، masking وexpiry.
- الجلسات والأجهزة: revoke current/all، device status.
- الأدوار والصلاحيات والحزم والتكليفات.
- trusted scope/object authorization diagnostics.

### Workforce

- الأشخاص والملفات المهنية.
- تزويد الكابتن والميداني.
- readiness checklists وأسباب الحظر.
- assignments/shifts/supervisors/areas/stores/effective ranges.
- documents/media status دون تكرار بيانات Identity.

### Platform Control وProviders

- change sets وreview/approval/schedule/rollback.
- rollout/kill switch والسياسات الفعالة.
- provider registry/capabilities/health/maintenance.
- credentials references فقط؛ لا secrets في UI أو API response.

### الشركاء والمتاجر

- onboarding queue، evidence review، decisions، lifecycle.
- profile/team/commercial model.
- stores/readiness/publication/pause/suspend.
- service areas/maps/delivery modes/fleet.

### الكتالوج والتسويق

- taxonomy/master products/variants/barcodes/media.
- proposals/review/conflict/merge/lineage.
- assortment/stock/availability/price/preparation.
- reels/home discovery/campaigns/coupons/auctions/loyalty.

### الطلبات والتنفيذ

- order workboards مع filter/sort/pagination ثابتة.
- detail/timeline/allowedActions.
- partner decision/preparation/issues/substitution.
- dispatch availability/offers/manual assignment/reassignment.
- tracking/pickup/custody/delivery proof/exceptions/rescue.
- cancellation/returns/support/incidents.

### المالية عبر DSH Facade

- payment/refund/settlement/payout/COD/eligibility/reconciliation/report summaries.
- masked references وحالات وreason codes فقط.
- أي أمر مالي حساس يحتاج confirmation وreason وsegregation of duties.
- لا raw wallet/ledger/bank/provider details من DSH.

### الحوكمة والتشخيص

- audit trail وcorrelation lookup.
- event/outbox/inbox/job/DLQ diagnostics المحكومة.
- cache/search freshness/rebuild.
- runtime/CI/evidence views للقراءة، بلا ادعاء Closure تلقائي.

## نموذج الصفحة

كل صفحة يجب أن تتكون من:

1. عنوان وغرض وscope فعال ظاهر.
2. breadcrumbs وroute ثابت.
3. summary metrics مع freshness.
4. filters/sort/search/pagination server-side.
5. table/list accessible مع empty/error/partial states.
6. detail drawer/page لا يعتمد على row snapshot فقط.
7. actions من `allowedActions` الخادمية.
8. confirmation يوضح الأثر والسبب عندما يلزم.
9. toast/banner لا يكون الدليل الوحيد؛ يجب readback.
10. audit/correlation link للعملية الحساسة.

## ضوابط الأزرار والتحكمات

لكل زر أو أيقونة:

- accessibility name وtooltip عند الأيقونة المجردة.
- permission visibility وbusiness enablement منفصلان.
- loading محلي يمنع التكرار دون تجميد الصفحة.
- idempotency key عند mutation الحساسة.
- stale version handling وconflict dialog.
- unknown-result state مع زر «التحقق من النتيجة»، لا إعادة عمياء.
- success ينتج refresh/readback من الخادم.

## التقنية والبرمجة

- Next.js shell داخل `apps/control-panel/runtime`.
- DSH UI السيادي في `services/dsh/frontend/control-panel` والعقل المشترك في `services/dsh/frontend/shared`.
- WLT-related DSH views عبر `services/wlt/frontend/shared/dsh` وDSH facade فقط.
- generated clients، query keys مركزية، controller hooks، view models، error mapping موحد.
- لا deep imports بين الخدمات أو server secrets في client bundle.
- route groups وdynamic segments مقبولة حوكميًا دون تعطيل naming guard.

## الأمن والخصوصية

- deny-by-default، object authorization، scope banner.
- PII masking، exports مسجلة، support sessions محدودة الغرض والمدة.
- لا direct DB actions أو impersonation غير محكوم.
- CSRF/cookies/session rotation حسب المعمارية.

## التجريب اليدوي النهائي

- اختبر كل دور Operator بصفحة navigation مختلفة.
- افتح كل route مباشرة واختبر back/refresh/session expiry.
- اختبر كل filter/sort/page/empty/error/partial state.
- اختبر كل action بصلاحية صحيحة وناقصة وobject خارج scope ونسخة stale ونقر مكرر وفقد الرد.
- تحقق من الأثر في التطبيق المعني ومن DB/event/audit.
- اختبر keyboard-only، screen reader، RTL، zoom وlarge text.

## بوابة إغلاق السطح

`unmapped_routes=0; unmapped_controls=0; direct_db_actions=0; direct_wlt_calls=0; permission_backend_mismatches=0; missing_visible_states=0; required_manual_cases=PASS; same_sha_evidence=PASS`.
