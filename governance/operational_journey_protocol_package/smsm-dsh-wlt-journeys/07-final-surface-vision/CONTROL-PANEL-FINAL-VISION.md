# Control Panel — الرؤية النهائية الحاكمة

## الدور النهائي

لوحة التحكم هي سطح الإدارة والتشغيل والمراجعة والتدخل المصرح، وليست قاعدة بيانات بديلة أو أداة لتجاوز state machines. كل إجراء يمر بعقد generated client وpermission وobject scope وoperator context وreason وaudit وreadback. كل قيمة مالية تأتي عبر DSH Finance Facade من WLT، وكل حقيقة تشغيلية تأتي من مالكها.

## السجل الآلي الملزم

السجل الحاكم للتغطية موجود في:

`../08-control-panel-coverage/CONTROL-PANEL-SECTION-REGISTRY.json`

ويُقارن آليًا مع:

- `services/dsh/frontend/control-panel/navigation.ts`.
- `apps/control-panel/runtime/src/app/**/page.tsx`.
- ملفات الرحلات `J001..J107`.

لا يجوز إضافة قسم أو Route أو صفحة دون تسجيلها وربطها بالرحلات والحالات والتحكمات والتجريب اليدوي.

## الأقسام النهائية وعدم التجاهل

### 1. الرئيسية — `/dsh/dashboard`

- صحة Identity/Workforce/DSH/WLT/Providers/Media/Notifications.
- critical alerts والحوادث وSLA وprojection freshness.
- اختصارات قائمة على الصلاحية.
- لا KPI بلا تعريف ومصدر و`as_of`.

### 2. العمليات — `/dsh/operations`

- Order workboards وlive orders وallowedActions.
- preparation/issues/substitution.
- Dispatch/Offers/Assignment/Reassignment.
- tracking/pickup/custody/delivery proof/exceptions/rescue.
- cancellations/returns/work items.
- كل filter/sort/search/page من الخادم.

### 3. التحليلات — `/dsh/analytics` و`/dsh/analytics/operational`

- metric registry وSLA definitions والفترات والمناطق الزمنية.
- freshness/data quality/projection lag.
- drill-down إلى الحقيقة بصلاحية.
- exports مدققة.

### 4. الشركاء والمتاجر

Routes:

- `/dsh/partners`.
- `/dsh/partners/[partnerId]`.
- `/dsh/partners/stores`.

التغطية:

- onboarding queue/evidence/decisions/lifecycle.
- partner profile/team/commercial model/support.
- stores/readiness/publication/pause/suspend.
- service areas/maps/delivery modes/fleet.
- summaries المالية masked عبر facade.

### 5. اعتماد الكتالوجات

Routes:

- `/dsh/catalogs`.
- `/dsh/catalogs/governance`.

التغطية:

- taxonomy/master products/variants/barcodes/media.
- proposals/review/conflict/merge/lineage.
- assortment/availability/price/preparation/publication.
- preview وruntime projection diagnostics.

### 6. التسويق والاكتشاف — `/dsh/marketing`

- Home Discovery targeting.
- campaigns/coupons/loyalty/content.
- funding references من WLT.
- eligibility/performance/reconciliation دون حساب مالي محلي.

### 7. المالية والتسويات

Routes:

- `/wlt/finance`.
- `/wlt/finance/payment-sessions`.

التغطية:

- payment sessions، wallet/account summaries، COD، eligibility، commissions، obligations، refunds، settlements، payout destinations/requests، reconciliation، reports.
- masked references وحالات وreason codes.
- segregation of duties.
- لا direct WLT calls أو raw ledger/bank/provider details.

### 8. الدعم والمساعدة — `/dsh/support`

- tickets/messages/internal notes/attachments.
- partner support.
- incidents/escalations/SLA.
- object scope وvisibility العامة/الداخلية.

### 9. المنصة السيادية

Routes:

- `/dsh/platform`.
- `/dsh/platform/policies`.

التغطية:

- change sets/review/approval/schedule/rollback.
- rollout/kill switch والسياسات الفعالة.
- provider registry/capabilities/health/maintenance.
- runtime/registries/cache/events/jobs diagnostics.
- credentials references فقط.

### 10. الإدارة والصلاحيات — `/dsh/administration`

- Actors والتفعيل والجلسات والأجهزة.
- الأدوار والصلاحيات والحزم وOperator Context.
- trusted scope/object authorization diagnostics.
- audit/correlation/evidence.

### 11. الموارد البشرية — `/dsh/hr`

- الأشخاص والملفات المهنية.
- Captain/Field provisioning/readiness.
- assignments/shifts/supervisors/areas/stores/effectivity.
- documents/media status.
- لا تكرار Identity أو WLT truth.

### Route غير ملاحي: تسجيل الدخول — `/dsh/login`

- loading/ready/invalid credentials/service unavailable/rate limited/session established/error.
- return URL آمن، session rotation، ولا خلط بين outage وفشل بيانات الدخول.

## نموذج الصفحة الإلزامي

كل صفحة يجب أن تحتوي أو تثبت N/A لكل عنصر:

1. عنوان وغرض وscope فعال ظاهر.
2. breadcrumbs وRoute ثابت.
3. summary metrics مع freshness.
4. search/filter/sort/pagination server-side.
5. table/list/cards accessible.
6. loading/ready/empty/error/forbidden/stale/conflict/unknown-result.
7. detail drawer/page يعيد القراءة ولا يثق بـrow snapshot.
8. actions من `allowedActions` الخادمية.
9. confirmation وreason للعملية الحساسة.
10. idempotency وversion conflict وresult lookup.
11. success readback لا toast فقط.
12. audit/correlation/source links.

## ضوابط كل زر وأيقونة وتبويب وحقل

- معرف تغطية أو ارتباط واضح بالرحلة والعملية.
- accessibility name وrole وtooltip للأيقونة المجردة.
- permission visibility منفصلة عن business enablement.
- loading محلي يمنع التكرار.
- stale version/conflict handling.
- unknown result مع `التحقق من النتيجة`.
- لا control شكلي بلا API binding أو أثر.
- كل mutation لها اختبار إيجابي وسلبي وdouble-submit وresponse-loss.

## التقنية والبرمجة

- Next.js shell داخل `apps/control-panel/runtime`.
- DSH UI السيادي في `services/dsh/frontend/control-panel` والعقل المشترك في `services/dsh/frontend/shared`.
- WLT views عبر `services/wlt/frontend/shared/dsh` وDSH facade فقط.
- generated clients وquery keys وcontrollers وview models وerror mapping مركزية.
- لا deep imports أو server secrets في client bundle.
- لا Route قديمة موازية أو page placeholder غير مصنفة.

## التجريب اليدوي النهائي

1. اختبر كل دور Operator وملاحة مختلفة.
2. افتح كل Route مباشرًا واختبر refresh/back/session expiry/deep link.
3. اختبر كل تبويب وfilter وsort وsearch وpagination وtable/card/form/dialog.
4. اختبر كل action بصلاحية صحيحة وناقصة وobject خارج scope وversion stale ونقر مكرر وفقد الاستجابة.
5. تحقق من الأثر في التطبيقات وDB/event/audit/WLT حسب الرحلة.
6. اختبر dependency unavailable/recovery.
7. اختبر keyboard-only وقارئ الشاشة وRTL وzoom والنص الكبير.

## بوابة إغلاق السطح

`registered_navigation_sections=11; unmapped_routes=0; unmapped_pages=0; unmapped_tabs_controls_states=0; direct_db_actions=0; direct_wlt_calls=0; permission_backend_mismatches=0; control_panel_journey_coverage=J001..J107; required_manual_cases=PASS; same_sha_evidence=PASS`.
