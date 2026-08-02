# 16E — الرحلات J056..J078: التجهيز والإسناد والتوصيل والدعم

> جزء إلزامي من الخطة الرئيسية. تطبق قواعد `16A` ومعيار إغلاق الرحلة العام على كل رحلة.

## J056 — صندوق طلبات الشريك والتنبيهات

- **الهدف:** عرض الطلبات الجديدة للشريك بترتيب صحيح وتنبيه قابل للتدقيق.
- **المالك:** DSH؛ Notifications للتسليم فقط.
- **الأسطح:** app-partner inbox/bell/alerts، Control Panel partner workboard.
- **الثوابت:** لا يظهر طلب خارج partner/store scope؛ cursor/order stable؛ alert لا يغير حالة الطلب.
- **الاختبارات:** duplicate event، delayed alert، revoked staff، multi-store scope، reconnect after offline.
- **معيار الإغلاق:** missing/duplicate inbox items صفر؛ cross-partner exposure صفر؛ notification/readback correlation PASS.

## J057 — قبول الطلب ورفضه

- **الهدف:** اتخاذ قرار partner ضمن المهلة وبأسباب رفض معتمدة.
- **المالك:** DSH.
- **الحالات:** pending_partner/accepted/rejected/timed_out؛ transition/version محكومة.
- **الأسطح:** app-partner decision screen/sheet، Control Panel live orders، app-client status readback.
- **الاختبارات:** double decision، stale version، unauthorized store member، timeout race، unknown-result retry.
- **معيار الإغلاق:** قرار واحد نهائي؛ reason/audit كامل؛ timers server-authoritative؛ جميع الأسطح تقرأ الحالة نفسها.

## J058 — التجهيز والتقديرات والمشكلات والاستبدال

- **الهدف:** إدارة بدء التجهيز وETA والتأخير والعناصر المفقودة والاستبدال.
- **المالك:** DSH.
- **الأسطح:** app-partner preparation panels، app-client decision/status، Control Panel alerts.
- **الحالات:** accepted/preparing/ready/delayed/issue_waiting_customer/issue_resolved.
- **الاختبارات:** invalid estimate، stale item issue، duplicate customer decision، timeout، partial substitution.
- **معيار الإغلاق:** transitions وallowedActions كاملة؛ price-impacting substitutions تعبر المسار المالي الحاكم؛ silent changes صفر.

## J059 — الطلبات الخاصة

- **الهدف:** إدارة طلب خاص أو تعليمات إضافية مع مراجعة وقبول وتنفيذ.
- **المالك:** DSH؛ Media للمرفقات؛ WLT لأي فرق مالي فعلي.
- **الأسطح:** app-client special request، app-partner/operator workbench.
- **الحالات:** submitted/reviewing/accepted/rejected/quoted/confirmed/executed.
- **الاختبارات:** unsafe content، attachment abuse، unauthorized quote، duplicate accept، quote expiry.
- **معيار الإغلاق:** scope/validation/audit PASS؛ no hidden financial mutation؛ every visible action/readback bound.

## J060 — Customer Pickup

- **الهدف:** تنفيذ استلام العميل للطلب دون مسار كابتن.
- **المالك:** DSH.
- **الأسطح:** app-client pickup session/code، app-partner ready/handoff، Control Panel monitor.
- **الحالات:** pickup_selected/ready_for_pickup/code_issued/verified/completed/expired/failed.
- **الاختبارات:** code replay، wrong customer، expired code، partner completes without proof، cancellation race.
- **معيار الإغلاق:** fulfillment mode لا يدخل dispatch؛ verification single-use؛ completion proof/readback PASS؛ bypass صفر.

## J061 — توفر وسعة Dispatch

- **الهدف:** حساب pool الكباتن والسعة والأهلية التشغيلية قبل الإسناد.
- **المالك:** DSH؛ Workforce للجاهزية، WLT للأهلية المالية كإشارة فقط.
- **الأسطح:** Control Panel area capacity، app-captain availability، partner fleet status.
- **الثوابت:** no local client eligibility؛ capacity/version/time window؛ affiliation/mode respected.
- **الاختبارات:** stale location، suspended captain، over-capacity race، financial block، partner fleet mismatch.
- **معيار الإغلاق:** candidate selection deterministic/auditable؛ ineligible assignments صفر؛ capacity race tests PASS.

## J062 — إسناد Dispatch وعروض الكابتن

- **الهدف:** إنشاء assignment offer وتسليمه وقبوله/رفضه مرة واحدة.
- **المالك:** DSH.
- **الأسطح:** app-captain offer sheet، Control Panel dispatch assignment، partner tracking عند الانطباق.
- **الحالات:** proposed/offered/viewed/accepted/declined/expired/cancelled.
- **الاختبارات:** offer to two captains policy، double accept، expired accept، revoked captain، notification delay.
- **معيار الإغلاق:** assignment uniqueness؛ atomic accept؛ no ghost offers؛ timers/readback/audit PASS.

## J063 — الإسناد اليدوي وإعادة الإسناد

- **الهدف:** تمكين operator من assign/reassign مع سبب وتأثير واضح.
- **المالك:** DSH.
- **الأسطح:** Control Panel assignment/command center؛ app-captain current assignment؛ app-client tracking.
- **الثوابت:** لا overwrite صامت؛ old captain revoked/notified؛ eligibility rechecked.
- **الاختبارات:** stale operator view، concurrent auto assign، reassign after pickup، unauthorized operator.
- **معيار الإغلاق:** single active assignment؛ full audit/reason؛ compensation for partial notification failure؛ readback PASS.

## J064 — التتبع الحي وسلامة الموقع

- **الهدف:** استقبال مواقع الكابتن وعرض tracking مع integrity/privacy controls.
- **المالك:** DSH؛ Providers للخرائط.
- **الأسطح:** app-captain location publishing، app-client tracking، app-partner/Control Panel monitor.
- **الثوابت:** assignment-bound writes؛ rate/accuracy/timestamp checks؛ retention محدد.
- **الاختبارات:** spoofed/stale location، cross-order read، out-of-order points، offline batch، provider map down.
- **معيار الإغلاق:** unauthorized location reads/writes صفر؛ integrity filters PASS؛ privacy retention وdegraded UI مثبتان.

## J065 — تسليم المتجر للكابتن وPickup

- **الهدف:** إثبات انتقال الحيازة من المتجر للكابتن.
- **المالك:** DSH.
- **الأسطح:** app-partner handoff، app-captain pickup context، Control Panel pickup workbench.
- **الحالات:** ready/arrived/verification_pending/picked_up/handoff_exception.
- **الاختبارات:** wrong captain، wrong store، code/proof replay، pickup before ready، exception race.
- **معيار الإغلاق:** custody transition atomic؛ proof/audit موجود؛ order/assignment states متقاربة؛ bypass صفر.

## J066 — تنفيذ الكابتن وأثناء التوصيل

- **الهدف:** إدارة الرحلة من pickup إلى الوصول ومحاولات التواصل والتنفيذ.
- **المالك:** DSH.
- **الأسطح:** app-captain execution/map/actions/chat، app-client tracking، Control Panel live operations.
- **الحالات:** picked_up/en_route/arrived/contacting/delivery_attempt.
- **الاختبارات:** invalid transition، duplicate tap، offline queued action، reassignment conflict، customer data overexposure.
- **معيار الإغلاق:** allowedActions server-driven؛ offline reconciliation PASS؛ PII minimization؛ all actions audited/read back.

## J067 — إكمال إثبات التسليم

- **الهدف:** إكمال الطلب بعد تحقق proof/policy والشخص المستلم.
- **المالك:** DSH؛ WLT يتلقى الدليل المالي اللاحق.
- **الأسطح:** app-captain PoD form، app-client receipt/status، Control Panel proof review.
- **الحالات:** proof_pending/submitted/verified/completed/rejected.
- **الاختبارات:** duplicate completion، missing required proof، wrong recipient، offline unknown result، cancellation race.
- **معيار الإغلاق:** completion once؛ proof requirements enforced؛ outbox to WLT atomic؛ readback/timeline PASS.

## J068 — وسائط إثبات التسليم

- **الهدف:** إدارة photo/signature/document evidence بأمان.
- **المالكون:** Media للملف، DSH للربط والحالة.
- **الأسطح:** app-captain capture/upload، Control Panel review، app-client فقط ما يسمح به Product Truth.
- **الاختبارات:** malicious/oversized file، wrong order binding، duplicate upload، expired URL، cleanup failure.
- **معيار الإغلاق:** scan/metadata/ownership/retention PASS؛ orphan media صفر؛ raw public URLs صفر؛ inaccessible evidence handled.

## J069 — استثناءات وفشل التوصيل

- **الهدف:** تسجيل failed attempt وأسبابه وأدلته والقرار التالي.
- **المالك:** DSH.
- **الأسطح:** app-captain exception form، Control Panel exceptions، app-client/partner status.
- **الحالات:** attempt_failed/contact_failed/address_issue/customer_unavailable/damaged/unsafe.
- **الاختبارات:** unsupported reason، no evidence، duplicate failure، fraudulent location، terminal state race.
- **معيار الإغلاق:** reason taxonomy واحدة؛ evidence/geo/time validation؛ next actions policy-driven؛ no silent terminal failure.

## J070 — Rescue والإنقاذ وإعادة الإسناد

- **الهدف:** إنقاذ طلب متعثر عبر operator workflow وإعادة إسناد/إرجاع/تعويض تشغيلي.
- **المالك:** DSH؛ WLT لأي compensation مالية.
- **الأسطح:** Control Panel rescue، app-captain/app-partner/app-client readback.
- **الحالات:** rescue_open/investigating/action_selected/reassigned/returned/resolved.
- **الاختبارات:** concurrent rescue actions، stale state، repeated compensation request، no eligible captain.
- **معيار الإغلاق:** one active rescue case؛ approved actions only؛ cross-service compensation idempotent؛ full timeline/readback.

## J071 — إلغاء الطلب

- **الهدف:** إلغاء order وفق actor/state/reason/policy مع أثر تشغيلي ومالي صحيح.
- **المالكون:** DSH للحالة، WLT للاسترداد/العكس المالي.
- **الأسطح:** app-client cancel، app-partner/operator decision، app-captain assignment removal.
- **الحالات:** cancellation_requested/approved/rejected/cancelled/financial_pending.
- **الاختبارات:** cancel after delivery، double cancel، concurrent accept/pickup، payment unknown result، unauthorized actor.
- **معيار الإغلاق:** cancellation state machine + financial handoff PASS؛ duplicate refunds صفر؛ all surfaces/readback synchronized.

## J072 — المرتجعات وطلب الاسترداد التشغيلي

- **الهدف:** إدارة return/refund request والأدلة والقرار التشغيلي قبل WLT.
- **المالك:** DSH للcase/order evidence؛ WLT للrefund truth.
- **الأسطح:** app-client request/status، app-partner response، Control Panel review.
- **الحالات:** submitted/reviewing/needs_info/approved/rejected/return_in_progress/financial_pending/resolved.
- **الاختبارات:** duplicate request، expired window، wrong item، evidence abuse، approval race.
- **معيار الإغلاق:** operational case واحد؛ no direct refund by surface؛ WLT reference/readback؛ retention/audit PASS.

## J073 — الدعم والتذاكر والمحادثات

- **الهدف:** إنشاء ticket وربطه بالactor/order/category وإدارة الرسائل والحالة.
- **المالك:** DSH Support؛ Notifications للتسليم؛ Media للمرفقات.
- **الأسطح:** app-client support، app-captain support، Control Panel support workspace.
- **الحالات:** open/assigned/waiting_customer/waiting_internal/resolved/closed/reopened.
- **الاختبارات:** cross-ticket IDOR، message replay، attachment abuse، close/reopen race، notification failure.
- **معيار الإغلاق:** scoped access؛ message ordering/idempotency؛ SLA timers؛ complete readback/audit؛ orphan messages صفر.

## J074 — دعم الشريك

- **الهدف:** دعم partner/store/team/orders/catalog/finance references ضمن scope الشريك.
- **المالك:** DSH Support؛ WLT يظل مالك التفاصيل المالية.
- **الأسطح:** app-partner support، Control Panel partner support.
- **الثوابت:** masked financial information؛ no operator impersonation without governed session.
- **الاختبارات:** cross-partner ticket، raw bank data request، support session misuse، duplicate escalation.
- **معيار الإغلاق:** partner scope enforcement PASS؛ support actions audited؛ financial facade-only؛ all statuses/messages bound.

## J075 — الحوادث والتصعيدات

- **الهدف:** تسجيل incident تشغيلي/أمني/مالي وتصعيده مع ownership وSLA.
- **المالكون:** المجال المتأثر؛ DSH incident governance للتنسيق.
- **الأسطح:** Control Panel incidents/exceptions، app-field escalation، provider/workforce notices.
- **الحالات:** detected/triaged/assigned/mitigating/monitoring/resolved/postmortem.
- **الاختبارات:** duplicate incident، severity downgrade unauthorized، missing owner، alert failure، reopen.
- **معيار الإغلاق:** severity/owner/SLA/audit كامل؛ linked evidence؛ unresolved P0/P1 صفر قبل closure؛ postmortem for required classes.

## J076 — الإشعارات والقوالب والتفضيلات والتسليم

- **الهدف:** توليد وتسليم إشعارات متعددة القنوات وفق event/preferences/template/version.
- **المالك:** Notifications؛ DSH/WLT ينتجان domain events فقط.
- **الأسطح:** notification centers/bells/preferences في كل تطبيق، Control Panel config/audit.
- **الحالات:** queued/sent/delivered/failed/suppressed/read.
- **الاختبارات:** duplicate event، invalid token، preference opt-out، template missing، provider timeout، PII leakage.
- **معيار الإغلاق:** delivery idempotency؛ preference enforcement؛ template provenance؛ failed retry/DLQ؛ cross-actor leakage صفر.

## J077 — التقييمات وتقييم المزود والطلب

- **الهدف:** السماح بالتقييم بعد eligibility محددة ومنع التكرار والتلاعب.
- **المالك:** DSH؛ provider rating projections مشتقة.
- **الأسطح:** app-client order rating، app-partner/field gates، Control Panel moderation/analytics.
- **الحالات:** eligible/submitted/moderation/visible/hidden/appealed.
- **الاختبارات:** double rating، rating before completion، self-rating، cross-order، abusive content.
- **معيار الإغلاق:** eligibility server-side؛ one rating per policy؛ moderation/audit؛ aggregate rebuild proof؛ no local aggregates truth.

## J078 — التحليلات التشغيلية وSLA والتنبيهات

- **الهدف:** إنتاج metrics وتقارير تشغيلية من أحداث وحقائق قابلة للتتبع دون أن تصبح مصدر قرار حاكم.
- **المالك:** DSH analytics projections؛ WLT reports منفصلة للماليات.
- **الأسطح:** Control Panel analytics/dashboard/alerts، app-partner insights المقيدة.
- **النطاق:** metric definitions، windows/timezones، dimensions، freshness، drilldown، alert thresholds.
- **الاختبارات:** late/duplicate events، timezone boundary، stale projection، cross-partner analytics، metric definition drift.
- **معيار الإغلاق:** metric catalog/versioning؛ reconciliation to source؛ scope isolation؛ freshness/SLA visible؛ analytics cannot mutate truth.

## بوابة إغلاق المجموعة J056..J078

```yaml
partner_order_decisions: PASS
preparation_and_issue_workflows: PASS
dispatch_assignment_uniqueness: PASS
pickup_and_delivery_custody: PASS
live_tracking_privacy_integrity: PASS
delivery_proof_and_media: PASS
exception_rescue_cancellation_return: PASS
support_incident_notification: PASS
operational_analytics_reconciled: PASS
cross_surface_order_readback: PASS
open_journeys_in_group: 0
failed_required_checks: 0
evidence_sha: FINAL_SHA
```
