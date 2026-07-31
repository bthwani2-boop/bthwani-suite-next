# الخطة النهائية الشاملة لإغلاق DSH وتكاملاته مع WLT

## 1. مرجع البرنامج

```yaml
repository: bthwani2-boop/bthwani-suite-next
work_branch: ala
pinned_head_at_planning: 5edaac5f7fe5cc492f64735850de8f5945436688
base_branch: master
base_sha_at_planning: d27791729eb8ab21b05ce0e88bb39769c92cc33e
pull_request: 199
pull_request_mode: draft
merge_authorized: false
force_push: forbidden
production_changes: forbidden
execution_mode: remote_first
primary_mode: DSH_WLT
```

يجب إعادة تثبيت `ala` قبل بدء أي كتابة، وقبل كل دفعة كتابة، وبعد كل Push، وقبل إعلان إغلاق أي رحلة.

---

# 2. حدود النطاق

## 2.1 النطاق المباشر

يشمل:

```text
services/dsh
services/wlt
contracts/openapi
العملاء المولدون من عقود DSH وWLT
قواعد بيانات DSH وWLT
DSH↔WLT adapters
DSH↔WLT events and evidence
DSH frontend packages
control-panel bindings المتعلقة بـDSH/WLT
app-client bindings المتعلقة بـDSH
app-partner bindings المتعلقة بـDSH/WLT
app-captain bindings المتعلقة بـDSH/WLT
app-field bindings المتعلقة بـDSH/WLT
اختبارات العقود والتكامل والتشغيل
CI والحوكمة الضرورية لهذا النطاق
```

## 2.2 الاعتماديات الحدودية

تُفحص أو تُعدّل فقط عند وجود اعتماد مثبت:

```text
Identity:
Actor، Session، Role، Permission، Device، trusted identity.

Workforce:
Captain/Field readiness، الملف المهني، التكليفات.

Media:
صور الكتالوج، الوثائق، إثبات التسليم، مرفقات الدعم.

Providers:
Payment provider، payout provider، messaging provider.

Platform Control:
إدارة Operator Context والسياسات المركزية عند امتلاكها خارج DSH.

Notifications:
توصيل الإشعارات إذا كانت الخدمة منفصلة.
```

لا تتحول هذه الخطة إلى إعادة بناء كاملة لهذه الخدمات ما لم يثبت أنها مانع مباشر لإغلاق رحلة DSH/WLT.

---

# 3. حدود ملكية الحقيقة

## DSH يملك

```text
الشريك والمتجر وحالتهما التشغيلية
المناطق والتغطية وقابلية الخدمة
الكتالوج المركزي وAssortment
الأسعار التشغيلية والتوفر
السلة وCheckout Intent التشغيلي
الطلب وعناصره وسعره المثبت
حالة الطلب والتنفيذ
التجهيز والاستلام الذاتي
إثبات الاستلام والتسليم
الاستثناءات والإنقاذ والعودة إلى المتجر
الطلبات الخاصة
التذاكر والحوادث التشغيلية
أدلة التشغيل التي تستهلكها WLT
```

## WLT يملك

```text
Payment sessions and provider truth
Authorization and capture
Financial ledger and journal entries
Wallets and balances
COD custody and delivery collections
Refund amounts and provider results
Commission policies and records
Settlement policies and settlements
Payout destinations and payout requests
Provider payout proof
Financial reconciliation
Promotion funding
Workforce financial records
Commercial benefits and loyalty when active
Financial closure status
```

## الأسطح لا تملك

```text
قرار الصلاحية
قرار قابلية الخدمة
السعر النهائي
حالة الطلب الحاكمة
قرار الدفع
الرصيد
العمولة
التسوية
الاسترداد
حالة COD
حالة الصرف
```

---

# 4. قاعدة إغلاق كل رحلة

كل رحلة تُنفذ كشريحة رأسية كاملة:

```text
PIN
→ تحديد Product Truth
→ تحديد مالك الحقيقة
→ تحديد الحالات والانتقالات
→ فحص قاعدة البيانات والمهاجرات
→ فحص عقد OpenAPI
→ فحص Backend
→ فحص DSH↔WLT عند انطباقه
→ فحص العملاء المولدين
→ ربط جميع الأسطح المطلوبة
→ اختبارات إيجابية
→ اختبارات سلبية وصلاحيات
→ اختبارات Idempotency والتزامن
→ Runtime readback
→ Commit ذري
→ Push
→ RE-PIN
→ Same-SHA evidence
→ CLOSE
```

لا تُغلق الرحلة إذا كان أي عنصر مما يأتي غير مثبت:

```yaml
product_truth: PASS
ownership: PASS
database: PASS
contract: PASS
backend: PASS
wlt_boundary: PASS_OR_NOT_APPLICABLE
generated_clients: PASS
surfaces: PASS
authorization: PASS
idempotency: PASS
negative_tests: PASS
runtime_readback: PASS
same_sha_evidence: PASS
```

---

# المرحلة FOUNDATION — الأساس المشترك

## FOUNDATION-00 — خط الأساس التنفيذي للمستودع

### المطلوب

1. إصلاح Guard Registry الحالي.
2. إصلاح Node Graph verification.
3. إغلاق Static Diagnostics.
4. تشغيل Control Panel architecture gate.
5. تشغيل Service Workspace gate.
6. تثبيت `contracts/openapi/index.yaml`.
7. إثبات عدم وجود فهرس مركزي موازٍ.
8. إثبات مصدر العملاء المولدين.
9. تشغيل DSH وWLT bundle provenance.
10. تشغيل DSH database workflow.
11. تشغيل WLT database workflow.
12. تشغيل Contextual CI على SHA واحد.

### بوابة الإغلاق

```yaml
guard_registry: PASS
node_graph: PASS
static_diagnostics: PASS
control_panel_architecture: PASS
service_workspaces: PASS
canonical_openapi_index: PASS
dsh_bundle_provenance: PASS
wlt_bundle_provenance: PASS
generated_client_provenance: PASS
dsh_database: PASS
wlt_database: PASS
contextual_ci: PASS
```

---

## FOUNDATION-01 — سجل تغطية DSH/WLT

يجب إنشاء أو تصحيح سجل حاكم يربط:

```text
كل عقد فرعي
→ كل Path
→ كل OperationId
→ كل جدول ومهاجرة
→ كل Handler
→ كل Adapter
→ كل Event
→ كل Surface
→ كل Test
→ رقم الرحلة
→ حالة الإغلاق
→ SHA الدليل
```

أي Path غير مرتبط برحلة يُعتبر:

```text
FIX_REQUIRED
```

وأي رحلة لا تملك Path أو كودًا أو دليلًا فعليًا لا تُعتبر منفذة.

---

## FOUNDATION-02 — قاعدة البيانات والمهاجرات

يشمل DSH وWLT:

* ترتيب المهاجرات.
* عدم تعديل المهاجرات المنشورة.
* قاعدة جديدة.
* قاعدة تحتوي بيانات سابقة.
* إعادة التشغيل الآمن.
* Backfills.
* القيود والفهارس.
* Unique constraints.
* Foreign keys.
* Idempotency receipts.
* Outbox.
* Audit records.
* فشل جزئي.
* Roll-forward.
* Backup وRestore.
* Migration manifest drift.

بوابة الإغلاق:

```yaml
fresh_database: PASS
existing_database_upgrade: PASS
migration_replay: PASS
migration_manifest: PASS
constraints: PASS
indexes: PASS
backfills: PASS
partial_failure_recovery: PASS
backup_restore: PASS
```

---

## FOUNDATION-03 — Operator Context والنطاق الموثوق

يجب أن يشتق الخادم:

```text
actor_id
actor_type
surface
operator_context_id
roles
permissions
partner assignments
store assignments
area assignments
captain assignment
field assignment
financial scope
```

يُمنع الوثوق بقيم يختارها العميل مثل:

```text
partner_id
store_id
actor_id
captain_id
collector_id
beneficiary_id
operator_context_id
financial scope
```

تُختبر حالات Cross-partner وCross-store وCross-context وReplay.

---

## FOUNDATION-04 — حدود DSH↔WLT

يجب إثبات أن:

* DSH يرسل Evidence ومراجع تشغيلية فقط.
* WLT يعيد مراجع وحالات مالية فقط.
* لا يرسل العميل Financial scope.
* لا يرسل DSH رصيدًا محسوبًا يدويًا.
* لا يكتب DSH في Ledger.
* لا يكرر WLT حقيقة حالة الطلب.
* كل طلب DSH→WLT يحمل Service authentication.
* النطاق المالي مشتق من الخادم.
* Correlation ID وIdempotency Key مطبقان.
* Unknown provider results تُحال إلى Reconciliation.
* WLT mutations تبقى خلف بوابة التشغيل المعتمدة.

---

## FOUNDATION-05 — الأحداث والتعافي

يجب دعم:

```text
Transactional outbox
Idempotent consumers
Event replay
Dead-letter handling
Event ordering عند الحاجة
Correlation IDs
Unknown-result recovery
Provider retry policy
Duplicate webhook protection
Duplicate command protection
```

---

## FOUNDATION-06 — الصحة والمراقبة

يشمل:

* DSH health/readiness.
* WLT health/readiness.
* Database dependency status.
* Provider status.
* Structured logs.
* Secret redaction.
* Metrics.
* Trace context.
* Business failure classification.
* Alertable reconciliation backlogs.
* Queue and outbox backlog.
* Runtime smoke tests.

---

# المرحلة A — الثقة والإدارة والسياسات التشغيلية

## JOURNEY-01 — إدارة الموظفين والأدوار داخل DSH

```text
إنشاء/قراءة موظف إداري
→ إسناد Role
→ اشتقاق Permission
→ اشتقاق Operator Context
→ تقييد العمليات حسب السطح
→ Audit
→ إبطال الصلاحية والجلسات عند التغيير
```

الأسطح:

```text
control-panel
```

---

## JOURNEY-02 — نطاقات Partner وStore وArea وWorkforce

```text
Actor
→ Partner assignment
→ Store assignment
→ Area assignment
→ Workforce readiness
→ Scope readback
→ Object authorization
→ انتهاء أو تعليق التكليف
```

تشمل Partner App وField App وCaptain App ولوحة التحكم.

---

## JOURNEY-03 — تسجيل الكابتن والاعتماد التشغيلي

```text
إنشاء Captain reference
→ ربط Workforce profile
→ إصدار Credential
→ التحقق من الجاهزية
→ المنطقة والتكليف
→ صلاحية الاستلام والتوصيل
→ التعليق أو الإبطال
```

لا تملك DSH الملف المهني؛ تستهلك جاهزيته وتملك التكليف التشغيلي.

---

## JOURNEY-04 — الجاهزية المالية للكابتن والممثل

```text
Actor readiness from Workforce
→ Operational eligibility from DSH
→ Financial eligibility projection
→ Wallet/commission/payout references from WLT
→ منع الصرف عند غياب الجاهزية
```

---

## JOURNEY-05 — المناطق والسياسات التشغيلية

```text
إنشاء Zone
→ Operational profile
→ Delivery modes
→ SLA rules
→ Capacity limits
→ Serviceability policy
→ Audit
→ Rollback controlled policy
```

يجب أن تكون السياسة Versioned وقابلة للتدقيق.

---

## JOURNEY-06 — تقييم السياسة التشغيلية

```text
Location + Store + Time + Fulfillment mode
→ Policy evaluation
→ Allowed/denied decision
→ Reason codes
→ Capacity result
→ SLA result
→ Runtime readback
```

لا يُعاد تنفيذ القرار داخل Frontend.

---

# المرحلة B — الشريك والمتجر

## JOURNEY-07 — إنشاء مسودة شريك ميدانيًا

```text
Field employee
→ Partner draft
→ بيانات الاتصال
→ النشاط
→ الموقع
→ Store draft
→ حفظ تدريجي
→ منع التكرار
```

---

## JOURNEY-08 — وثائق الشريك والوسائط

```text
Upload intent
→ Media upload
→ Document association
→ Validation
→ Review
→ Approval/rejection
→ Audit
```

---

## JOURNEY-09 — الزيارات الميدانية للشريك

```text
إنشاء Visit
→ Work queue
→ الوصول
→ Checks
→ Evidence
→ Complete
→ Escalation عند الفشل
→ Operator readback
```

---

## JOURNEY-10 — جاهزية الشريك

تُحسب من:

```text
البيانات الأساسية
الوثائق
التحقق الميداني
المتجر
التغطية
الفريق
الكتالوج
الإعدادات التشغيلية
الحالة المالية المطلوبة
الموانع المفتوحة
```

---

## JOURNEY-11 — مراجعة وتفعيل الشريك

```text
Submitted
→ Under review
→ Verified
→ Active
→ Suspended/Blocked
→ Closed
```

كل انتقال يحتاج صلاحية وReason code وAudit.

---

## JOURNEY-12 — دعوات فريق الشريك

```text
إنشاء Invite
→ ربط Store/Partner scope
→ Accept/reject
→ Team membership
→ Role
→ Suspension/removal
→ Scope readback
```

---

## JOURNEY-13 — إنشاء المتجر

```text
Partner
→ Store
→ Address
→ Coordinates
→ Business type
→ Contact
→ Hours
→ Fulfillment modes
→ Initial status
```

---

## JOURNEY-14 — إعدادات المتجر

تشمل:

```text
General settings
Order acceptance settings
Preparation policy
Courier settings
Pickup settings
Notification settings
Operational status
```

---

## JOURNEY-15 — مناطق تغطية المتجر

```text
Coverage zone
→ Geometry
→ Distance rules
→ Schedule
→ Delivery mode
→ Fees input
→ Serviceability binding
→ Conflict validation
```

---

## JOURNEY-16 — التحقق الميداني من المتجر

```text
Store visit
→ Verification checks
→ Media/evidence
→ Readiness result
→ Escalation
→ Correction
→ Re-verification
```

---

## JOURNEY-17 — جاهزية المتجر

لا يُنشر المتجر قبل اكتمال:

```text
Active partner
Valid location
Hours
Coverage
Operational profile
Team
Assortment
Catalog media
Delivery/pickup mode
Required financial policy
No blocking escalation
```

---

## JOURNEY-18 — نشر المتجر وتعليقه

```text
Draft
→ Ready
→ Published
→ Temporarily unavailable
→ Suspended
→ Unpublished
→ Closed
```

مع تحديد أثر التغيير على:

* الطلبات الحالية.
* السلات.
* Checkout intents.
* التوصيلات الحالية.
* ظهور العميل.

---

## JOURNEY-19 — أسطول الشريك والمندوبون المحليون

```text
Store courier configuration
→ Courier eligibility
→ Assignment scope
→ Availability
→ Partner-delivery assignment
→ Revocation
```

---

## JOURNEY-20 — إغلاق الشريك تجاريًا وتشغيليًا

```text
وقف النشر
→ منع الطلبات الجديدة
→ إكمال أو إنقاذ الطلبات الحالية
→ إبطال الدعوات والتكليفات
→ حل COD المفتوح
→ إكمال الاستردادات
→ إغلاق العمولات
→ إغلاق التسويات
→ إكمال أو إلغاء Payouts
→ Financial closure from WLT
→ Partner closed
```

---

# المرحلة C — الكتالوج والمحتوى والتسويق

## JOURNEY-21 — Domains وTaxonomy

```text
Catalog domain
→ Node hierarchy
→ Categories
→ Attributes
→ Units
→ Brands
→ Ordering
→ Localization
→ Activation/archive
```

يجب منع:

* الدورات.
* التكرار الدلالي.
* حذف Node مستخدم.
* Taxonomy محلية في الأسطح.

---

## JOURNEY-22 — المنتجات المركزية

```text
Master product
→ Identity
→ Category
→ Attributes
→ Variants
→ Units
→ Barcode
→ Restrictions
→ State
→ Audit
```

---

## JOURNEY-23 — اقتراحات المنتجات

```text
Partner/Field proposal
→ Duplicate detection
→ Evidence
→ Submit
→ Under review
→ Approve/reject
→ Merge with existing product
→ Readback
```

---

## JOURNEY-24 — Catalog Approvals والحوكمة

```text
Approval record
→ Review authority
→ Transition
→ Decision reason
→ Immutable audit
→ Policy validation
```

---

## JOURNEY-25 — أصول وصور الكتالوج

```text
Upload intent
→ Upload completion
→ Asset validation
→ Review
→ Link to domain/node/product/store/proposal
→ Variant generation
→ Public delivery
→ Unlink/archive
```

---

## JOURNEY-26 — Assortment المتجر

```text
Master product
→ Store assortment
→ Store-specific SKU
→ Availability
→ Quantity limits
→ Preparation time
→ Options
→ Active period
```

---

## JOURNEY-27 — الأسعار والتوفر والمخزون

```text
Store price
→ Compare price
→ Availability
→ Stock policy
→ Effective dates
→ Publication eligibility
→ Checkout revalidation
```

الخادم يعيد حساب السعر ولا يقبل سعر العميل.

---

## JOURNEY-28 — نشر الكتالوج للعميل

```text
Approved taxonomy
+ Approved master product
+ Published store
+ Active assortment
+ Valid price
+ Available status
+ Valid media
→ Public catalog
```

---

## JOURNEY-29 — Reels والمحتوى المرئي

```text
Partner reel
→ Media
→ Review
→ Approval
→ Publication
→ Public readback
→ Suspension/archive
```

---

## JOURNEY-30 — Home Discovery

تشمل:

```text
Banners
Promos
Filters
Categories
Featured stores
Reels
Ordering
Scheduling
Audience rules
Publication
```

---

## JOURNEY-31 — الحملات وTickers وعروض الشركاء

```text
Campaign
→ Ticker
→ Partner offer
→ Schedule
→ Targeting
→ Approval
→ Publication
→ Expiration
→ Audit
```

---

## JOURNEY-32 — التمويل الترويجي في WLT

```text
DSH promotion definition
→ Funding party
→ Budget reservation in WLT
→ Consumption evidence
→ Ledger effect
→ Exhaustion
→ Reversal/correction
→ Reconciliation
```

يُمنع احتساب التمويل الترويجي داخل DSH.

---

# المرحلة D — العميل والاكتشاف والسلة

## JOURNEY-33 — عناوين العميل

```text
Create address
→ Coordinates
→ Address details
→ Default address
→ Update
→ Archive/delete policy
→ Ownership verification
```

---

## JOURNEY-34 — خصوصية العنوان والموقع

يجب منع:

* قراءة عنوان عميل آخر.
* كشف الإحداثيات لغير الأطراف المصرح لها.
* إبقاء الموقع بعد انتهاء الحاجة.
* تسجيل العنوان الكامل في Logs.
* إرسال معلومات زائدة إلى الشريك أو الكابتن.

---

## JOURNEY-35 — خريطة العميل والموقع

```text
Map region
→ Pin validation
→ Reverse geocoding عند توفره
→ Coverage preview
→ Store/serviceability lookup
```

---

## JOURNEY-36 — اكتشاف المتاجر

```text
Location
→ Published stores
→ Open/closed state
→ Serviceable modes
→ Store summary
→ Store detail
→ Catalog entry
```

---

## JOURNEY-37 — Store Context

يجب أن يعيد سياقًا موحدًا يضم:

```text
Store identity
Partner identity
Operational status
Hours
Coverage
Fulfillment modes
Catalog status
Serviceability
```

---

## JOURNEY-38 — قابلية الخدمة

```text
Client location
+ Store
+ Zone
+ Time
+ Capacity
+ Fulfillment mode
+ Operational policy
→ Serviceable or denied
→ Reason code
→ Estimated SLA
→ Delivery fee input
```

---

## JOURNEY-39 — السلة

```text
Create/read cart
→ Add item
→ Update quantity
→ Remove item
→ Restore cart
→ Reprice
→ Revalidate availability
→ Clear/expire
```

يجب حماية السلة من التزامن والكتابة المكررة.

---

## JOURNEY-40 — مراقبة السلات تشغيليًا

```text
Operator cart search
→ Problem diagnosis
→ No unauthorized mutation
→ Audit readback
```

---

# المرحلة E — Checkout والدفع وإنشاء الطلب

## JOURNEY-41 — Checkout Intent

```text
Cart snapshot
→ Address
→ Serviceability
→ Store status
→ Item availability
→ Server price
→ Fulfillment mode
→ Payment method
→ Create intent
→ Read/cancel/expire
```

---

## JOURNEY-42 — إنشاء Payment Session في WLT

```text
DSH checkout intent
→ Trusted DSH call
→ WLT payment session
→ Immutable amount/currency
→ Provider reference
→ Idempotency receipt
→ Reference returned to DSH
```

---

## JOURNEY-43 — Authorize وCapture

```text
Authorize
→ Provider result
→ Capture
→ Balanced ledger transaction
→ Payment timeline
→ DSH payment-session event
→ Checkout reconciliation
```

لا ينشئ DSH أي Ledger entry.

---

## JOURNEY-44 — Provider Webhooks والنتائج المجهولة

```text
Signed webhook
→ Signature verification
→ Deduplication
→ Durable provider event
→ State transition
→ Unknown result
→ Provider inquiry
→ Reconciliation case
→ Final resolution
```

---

## JOURNEY-45 — إنشاء الطلب

```text
Valid checkout intent
→ Idempotency claim
→ Order snapshot
→ Items
→ Prices
→ Address snapshot
→ Fulfillment mode
→ Payment/COD reference
→ Initial state
<ctrl94> Outbox event
→ Readback
```

---

## JOURNEY-46 — حقيقة الطلب

يجب وجود مصدر واحد لـ:

```text
Order state
Items
Amounts
Store
Client
Fulfillment mode
Operational timeline
Cancellation
Dispatch reference
Delivery status
Financial closure references
```

---

## JOURNEY-47 — قراءة الطلب عبر الأسطح

```text
app-client
app-partner
app-captain
control-panel
```

كل سطح يرى فقط البيانات التي يحتاجها.

---

## JOURNEY-48 — إلغاء الطلب

```text
Cancellation request
→ Actor and reason
→ State eligibility
→ Inventory/assortment effect
→ Dispatch effect
→ Delivery effect
→ Refund requirement
→ WLT handoff
→ Final cancellation record
```

---

# المرحلة F — التجهيز والاستلام والتنفيذ

## JOURNEY-49 — وصول الطلب للشريك

```text
Order created
→ Store workboard
→ Notification
→ SLA timer
→ Accept/reject eligibility
```

---

## JOURNEY-50 — قبول أو رفض الطلب

```text
Accept
or
Reject with governed reason
→ Customer readback
→ Dispatch/payment/refund consequences
→ Audit
```

---

## JOURNEY-51 — Workboard التجهيز

```text
Accepted
→ Preparing
→ Preparation estimate
→ Ready
→ Handoff eligible
```

---

## JOURNEY-52 — مشاكل التجهيز والاستبدال

```text
Missing item
→ Preparation issue
→ Proposed resolution
→ Customer decision
→ Partner resolution
→ Reprice/refund difference
→ Continue or cancel
```

أي فرق مالي يُعالج عبر WLT.

---

## JOURNEY-53 — تنبيهات تأخر التجهيز

```text
Refresh alerts
→ SLA breach detection
→ Alert
→ Acknowledge
→ Escalation
→ Operational intervention
```

---

## JOURNEY-54 — الاستلام الذاتي

```text
Pickup selected
→ Window
→ Store marks ready
→ Client notification
→ Customer arrived
→ Verification
→ Collected
```

حالات إضافية:

```text
No-show
Window extension
Reschedule
Cancel
Refund consequence
```

---

## JOURNEY-55 — إنشاء إسناد التوصيل

```text
Ready order
→ Eligible delivery mode
→ Candidate captain
→ Capacity/routing policy
→ Assignment
→ Offer
→ Timeout
```

---

## JOURNEY-56 — قبول أو رفض الإسناد

```text
Captain assignment
→ Accept/decline
→ Eligibility recheck
→ Prevent double assignment
→ Retry/reassignment
```

---

## JOURNEY-57 — Store-Captain Handoff

```text
Captain arrival
→ Store pickup readiness
→ Order verification
→ Package handoff
→ Missing/damaged package handling
→ Pickup confirmation
```

---

## JOURNEY-58 — بدء التوصيل والتتبع الحي

```text
Picked up
→ In transit
→ Location updates
→ Client tracking
→ Partner tracking
→ Operator tracking
→ Arrived
```

يجب تطبيق:

* Rate limits.
* Assignment ownership.
* Location privacy.
* Offline queue.
* Stale update rejection.

---

## JOURNEY-59 — إثبات التسليم

```text
Delivery code/photo/signature/location
→ Upload
→ Media validation
→ Proof association
→ Completion validation
→ Delivered
→ Immutable timeline
```

---

## JOURNEY-60 — استثناءات التوصيل

تشمل:

```text
Customer unavailable
Wrong address
Unsafe location
Damaged order
Missing package
Payment/COD issue
Vehicle failure
Captain incident
Store issue
Partial failure
```

---

## JOURNEY-61 — العودة إلى المتجر

```text
Exception
→ Return authorized
→ Captain arrives at store
→ Store accepts return
→ Inventory/operational evidence
→ Refund/financial consequence
```

---

## JOURNEY-62 — Rescue وإعادة الإسناد

```text
Failure detected
→ Rescue case
→ Current assignment frozen
→ New captain eligibility
→ Reassignment
→ Evidence transfer
→ Customer/operator readback
```

---

## JOURNEY-63 — توصيل الشريك

```text
Partner-delivery mode
→ Partner courier assignment
→ Pickup
→ Depart
→ Arrive
→ Proof
→ Exception
→ Operator oversight
```

تظل WLT مالك COD والتحصيل المالي حتى في توصيل الشريك.

---

## JOURNEY-64 — الحوادث التشغيلية

```text
Create incident
→ Scope and severity
→ Link order/store/captain/partner
→ Investigation
→ Containment
→ Resolution
→ Audit
```

---

# المرحلة G — الطلبات الخاصة

## JOURNEY-65 — إنشاء الطلب الخاص

```text
Client request
→ Description
→ Evidence/media
→ Review
→ Information exchange
```

---

## JOURNEY-66 — التسعير والموافقة

```text
Operator quote
→ Client review
→ Approve/reject
→ Checkout/payment reference
```

---

## JOURNEY-67 — تنفيذ الطلب الخاص

```text
Approved quote
→ Execution plan
→ Dispatch when required
→ Fulfillment
→ Evidence
→ Completion
```

---

## JOURNEY-68 — إلغاء أو فشل الطلب الخاص

```text
Cancel
→ Eligibility
→ Work already performed
→ Refund/charge consequence
→ Audit
```

---

# المرحلة H — COD والماليات

## JOURNEY-69 — إنشاء COD Record

```text
Order payment method
→ WLT payment truth
→ Delivery collector
→ DSH delivery handoff
→ WLT COD/delivery collection record
```

---

## JOURNEY-70 — تحصيل COD

```text
Delivered order
→ Expected amount
→ Actual collected amount
→ Collector identity
→ Proof
→ Collect
→ Ledger entry
→ Variance detection
```

---

## JOURNEY-71 — عهدة COD وتحويلها

```text
Collected
→ Custody owner
→ Remittance
→ Recipient
→ Proof
→ Balanced ledger effect
→ Custody closed
```

---

## JOURNEY-72 — فروقات COD

```text
Expected vs actual
→ Reconciliation case
→ Assignment
→ Investigation
→ Confirmed variance/cash adjustment/recovery/write-off
→ Resolution
```

---

## JOURNEY-73 — إنشاء الاسترداد

```text
DSH cancellation/failure evidence
→ Refund eligibility
→ Remaining refundable amount
→ WLT refund request
→ Idempotency receipt
```

---

## JOURNEY-74 — اعتماد أو رفض الاسترداد

يجب تطبيق Maker–Checker:

```text
Requested
→ Independent approve/reject
→ Reason
→ Audit
```

---

## JOURNEY-75 — تنفيذ الاسترداد

```text
Approved
→ Provider call
→ Processing claim
→ Completed
or
Provider unknown
→ Reconciliation
```

---

## JOURNEY-76 — سياسة العمولات

```text
Commission policy
→ Version
→ Effective date
→ Beneficiary types
→ Calculation basis
→ No retroactive silent mutation
```

---

## JOURNEY-77 — إنشاء العمولة

```text
Verified DSH source
→ Active WLT policy
→ Commission record
→ Beneficiary
→ Evidence
→ Ledger effect
```

---

## JOURNEY-78 — تعديل وتأكيد العمولة

```text
Reasoned adjustment
→ Operator
→ Delta
→ Audit
→ Confirm
→ Settlement eligibility
```

---

## JOURNEY-79 — سياسة التسوية

```text
Partner
→ Settlement frequency
→ Cutoff
→ Included evidence
→ Exclusions
→ Effective version
```

---

## JOURNEY-80 — إنشاء التسوية

```text
Delivered orders evidence
+ Completed refunds
+ Commissions
+ Adjustments
+ COD
→ WLT settlement
→ Evidence list
```

---

## JOURNEY-81 — مراجعة وترحيل التسوية

```text
Pending settlement
→ Summary
→ Evidence review
→ Post
→ Balanced journal
→ Posted state
```

---

## JOURNEY-82 — وجهات الصرف

```text
Actor
→ Typed destination
→ Validation
→ Encryption
→ Masked readback
→ Activation
→ Prior destination deactivation
```

---

## JOURNEY-83 — طلب الصرف

```text
Available funds
→ Hold
→ Destination binding
→ Payout request
→ Idempotent replay
```

---

## JOURNEY-84 — اعتماد ومعالجة الصرف

```text
Maker request
→ Checker approve/reject
→ Process
→ Provider reference
→ Complete
```

---

## JOURNEY-85 — فشل الصرف والنتيجة المجهولة

```text
Provider unknown
→ Funds remain held
→ Manual failure forbidden
→ Provider inquiry
→ Reconcile
→ Confirm success/failure
```

---

## JOURNEY-86 — التمويل المهني

يشمل:

```text
Field wallet
Field commissions
Field payouts
Captain commissions
Captain payouts
Representative finance
Financial eligibility
Payout destinations
```

WLT يملك الحقيقة؛ DSH يعرض Projection فقط.

---

## JOURNEY-87 — المراجع المالية داخل DSH

تشمل قراءات:

```text
Payment status
Refund status
Settlement status
Wallet status
Ledger entries
Financial summary
COD records
Commissions
Payout requests
```

يجب أن تكون Read-through أو Projection من WLT، وليست جداول مالية موازية في DSH.

---

## JOURNEY-88 — Reconciliation المالي العام

يقارن:

```text
DSH order
DSH delivery
Payment provider
Payment session
Ledger
Refund
COD
Commission
Settlement
Payout
```

ويُنتج Case قابلًا للإسناد والتحقيق والحل.

---

## JOURNEY-89 — رسم الاشتراك أو Onboarding Fee

```text
DSH partner/store onboarding state
→ Applicable commercial fee policy
→ WLT obligation/payment
→ Payment status reference
→ Readiness impact
```

لا يُفعّل إلا إذا كان Product Truth الحالي يقر هذا الرسم.

---

## JOURNEY-90 — المنتجات التجارية والاشتراكات والولاء

هذه رحلة **معلنة في عقد WLT لكنها مشروطة**:

```text
Commercial product
→ Subscription payment session
→ Activation
→ Renewal
→ Lifecycle
→ Client benefits
→ Loyalty ledger entries
```

قبل تنفيذها يجب حسم Product Truth:

```yaml
platform_is_full_saas: false
partner_saas_commercialization: deferred
client_commercial_benefits: requires_explicit_product_approval
```

لا تُحذف من سجل الرحلات، ولا تُفعّل تلقائيًا.

---

## JOURNEY-91 — التمويل التجاري الختامي للشريك

```text
Partner suspension/closure
→ Outstanding COD
→ Refunds
→ Commission adjustments
→ Final settlement
→ Pending payouts
→ Debt
→ Financial closure reference
→ DSH operational closure
```

---

# المرحلة I — الدعم والإشعارات والتحليلات

## JOURNEY-92 — تذاكر الدعم

```text
Create ticket
→ Actor/order/store/partner link
→ Category
→ Priority
→ Assignment
→ Status
→ Resolution
```

---

## JOURNEY-93 — رسائل الدعم ومرفقاتها

```text
Message
→ Sender role
→ Attachment upload
→ Delivery status
→ Readback
→ Sensitive-data controls
```

---

## JOURNEY-94 — دعم الشريك

```text
Partner/store issue
→ Ticket
→ Operational evidence
→ Escalation
→ Operator response
→ Resolution
```

---

## JOURNEY-95 — الإشعارات

```text
Operational event
→ Template
→ Audience
→ Delivery channel
→ Retry
→ Delivery status
→ Read/unread
```

---

## JOURNEY-96 — تفضيلات الإشعارات

```text
Actor preferences
→ Mandatory vs optional events
→ Update
→ Enforcement
```

---

## JOURNEY-97 — إعدادات الإشعارات التشغيلية

```text
Operator config
→ Channel enablement
→ Template/version
→ Rate controls
→ Audit
```

---

## JOURNEY-98 — التحليلات التشغيلية

تشمل:

```text
Platform analytics
Order analytics
Delivery analytics
Store analytics
Support analytics
Partner performance
```

يجب أن تكون مشتقة من حقائق DSH، لا مصدرًا موازيًا.

---

## JOURNEY-99 — Workboards التشغيلية

تشمل:

```text
Partner order workboard
Operator order workboard
Dispatch workboard
Field work queue
Preparation alerts
Reconciliation workboard
```

---

## JOURNEY-100 — التدخل اليدوي والتدقيق

كل تدخل يحتاج:

```text
Permission
Reason code
Previous state
New state
Actor
Timestamp
Correlation ID
Linked evidence
Immutable audit
```

---

# المرحلة J — الأمان والتعافي والاحتفاظ

## JOURNEY-101 — منع الوصول العابر للنطاق

اختبارات إلزامية:

```text
Cross-partner
Cross-store
Cross-client
Cross-captain
Cross-field
Cross-operator-context
Cross-financial-context
Surface misuse
Role escalation
Object ID substitution
```

---

## JOURNEY-102 — Idempotency والتزامن

يغطي:

```text
Cart writes
Checkout creation
Order creation
Partner decisions
Assignment
Delivery status
POD
Payment mutations
COD collection/remittance
Refunds
Commissions
Settlements
Payouts
Policy changes
```

---

## JOURNEY-103 — Provider Security

يشمل:

```text
Webhook signatures
Replay protection
Secret rotation
Provider authentication
Timeouts
Circuit breaker
Response validation
Unknown-result handling
No secret logging
```

---

## JOURNEY-104 — Media Security

يشمل:

```text
File type
Size
Malware policy
Ownership
Upload intent expiration
Public/private access
Signed access
Metadata stripping
Retention
```

---

## JOURNEY-105 — Audit وRetention

يشمل:

```text
Operational audit
Financial audit
Support audit
Policy audit
Retention periods
Archiving
Legal deletion
PII minimization
Financial immutability
```

---

## JOURNEY-106 — Backup وRestore

يجب اختبار:

```text
DSH database backup/restore
WLT database backup/restore
Migration recovery
Outbox recovery
Ledger integrity after restore
Reconciliation after restore
```

---

## JOURNEY-107 — تعطل الخدمات

سيناريوهات:

```text
WLT unavailable during Checkout
Provider unavailable during payment
WLT unavailable after delivery
Database restart
Outbox backlog
Notification failure
Media failure
Partial order processing
```

---

# 5. تغطية وحدات عقد DSH

يجب أن ترتبط جميع الوحدات المعلنة بالرحلات الآتية:

```text
administration
→ J01, J02, J100

analyticsExtensions
→ J98, J99

captainFinancialEligibility
→ J04, J86

catalog
→ J21-J28

catalogGovernance
→ J23, J24

catalogProposalReadback
→ J23

checkout
→ J41-J45

clientAddress
→ J33

clientAddressPrivacy
→ J34

clientMap
→ J35

codCustody
→ J69-J72

deliveryExceptions
→ J60-J62

deliveryProofCompletion
→ J59

deliveryProofMedia
→ J59, J104

dispatchGovernance
→ J55-J58, J62

homeMarketingEvents
→ J30-J32

homeMarketingGovernance
→ J30, J31

incidentGovernance
→ J64

liveTracking
→ J58

marketingCommercial
→ J31, J32

notificationsGovernance
→ J95-J97

operationalPolicy
→ J05, J06

orderRescue
→ J62

orderTruth
→ J45-J48

orderWorkboards
→ J49-J53, J99

partnerCommercialClosure
→ J20, J91

partnerDelivery
→ J63

partnerFleet
→ J19

partnerOnboarding
→ J07-J18

partnerSupport
→ J94

paymentSessions
→ J41-J44

payoutsDestinations
→ J82-J86

platformPolicies
→ J05, J06

reels
→ J29, J30

refunds
→ J48, J73-J75

representativeFinance
→ J86

runtimeExtensions
→ FOUNDATION-05, FOUNDATION-06, J107

settlementsCommissions
→ J76-J81

storeCaptainHandoff
→ J57

supportGovernance
→ J92-J94, J100

supportMessageDelivery
→ J93

workforceScopes
→ J02-J04, J86
```

لا يجوز إعلان الإغلاق إذا بقيت وحدة غير مرتبطة برحلة.

---

# 6. تغطية وحدات عقد WLT

```text
common
→ FOUNDATION-03, FOUNDATION-04

payments
→ J42-J44

deliveryCollections
→ J69-J72

refunds
→ J73-J75

settlementsCommissions
→ J76-J80

settlementOperations
→ J80, J81

payoutsDestinations
→ J82-J84

payoutFailureBoundary
→ J85

codCustody
→ J69-J72

codRecords
→ J69-J72, J87

commercial
→ J89, J90

commercialSummary
→ J90, J91

promotionFunding
→ J32

workforceFinance
→ J04, J86
```

---

# 7. سيناريوهات E2E الإلزامية

## السيناريو 1 — طلب مسبق الدفع مع توصيل المنصة

```text
Partner/store ready
→ Catalog published
→ Client address
→ Serviceability
→ Cart
→ Checkout intent
→ WLT payment authorization/capture
→ Order
→ Partner preparation
→ Platform dispatch
→ Captain pickup
→ Tracking
→ POD
→ Commission
→ Settlement
→ Payout
```

## السيناريو 2 — طلب COD

```text
Checkout COD
→ Order
→ Delivery
→ WLT COD record
→ Collect
→ Remit
→ Ledger
→ Settlement
→ Reconciliation
```

## السيناريو 3 — الاستلام الذاتي

```text
Pickup checkout
→ Preparation
→ Ready notification
→ Customer arrived
→ Verification
→ Collection
→ Financial closure
```

## السيناريو 4 — توصيل الشريك

```text
Partner delivery mode
→ Partner courier
→ Pickup/depart/arrive
→ Proof
→ COD or prepaid financial closure
```

## السيناريو 5 — إلغاء واسترداد

```text
Order cancellation
→ Refund requirement
→ WLT refund
→ Independent approval
→ Provider completion
→ Ledger
→ Readback
```

## السيناريو 6 — فشل التوصيل والإنقاذ

```text
Delivery exception
→ Rescue
→ Reassignment or return
→ Refund/adjustment when required
→ Incident and audit
```

## السيناريو 7 — طلب خاص

```text
Special request
→ Information exchange
→ Quote
→ Client approval
→ Payment
→ Dispatch/execution
→ Completion
```

## السيناريو 8 — إغلاق شريك

```text
Suspend publication
→ Finish active orders
→ Resolve COD
→ Complete refunds
→ Final commissions
→ Final settlement
→ Payout/debt closure
→ Revoke scopes
→ Close partner
```

---

# 8. بوابة الإغلاق النهائية

```yaml
foundation:
  repository_baseline: PASS
  journey_registry: PASS
  database_migrations: PASS
  trusted_operator_context: PASS
  dsh_wlt_boundary: PASS
  events_recovery: PASS
  observability: PASS

dsh_domains:
  administration: PASS
  platform_policies: PASS
  partner_onboarding: PASS
  stores: PASS
  workforce_scopes: PASS
  catalog: PASS
  media: PASS
  marketing: PASS
  client_addresses: PASS
  discovery: PASS
  serviceability: PASS
  cart: PASS
  checkout: PASS
  orders: PASS
  preparation: PASS
  pickup: PASS
  dispatch: PASS
  captain_delivery: PASS
  partner_delivery: PASS
  live_tracking: PASS
  delivery_proof: PASS
  delivery_exceptions: PASS
  rescue: PASS
  special_requests: PASS
  incidents: PASS
  support: PASS
  notifications: PASS
  analytics: PASS

wlt_domains:
  payments: PASS
  provider_results: PASS
  ledger: PASS
  cod_records: PASS
  delivery_collections: PASS
  cod_reconciliation: PASS
  refunds: PASS
  commissions: PASS
  settlements: PASS
  payout_destinations: PASS
  payouts: PASS
  payout_failure_boundary: PASS
  promotion_funding: PASS
  workforce_finance: PASS
  commercial_conditional_scope: RESOLVED

evidence:
  positive_tests: PASS
  negative_tests: PASS
  authorization_tests: PASS
  idempotency_tests: PASS
  concurrency_tests: PASS
  provider_failure_tests: PASS
  database_replay: PASS
  backup_restore: PASS
  all_surface_readback: PASS
  runtime_e2e: PASS
  contextual_ci: PASS
  same_final_sha: PASS
  unresolved_in_scope_gaps: 0
  parallel_operational_truth_sources: 0
  parallel_financial_truth_sources: 0
```

---

# 9. ترتيب التنفيذ الإلزامي

```text
FOUNDATION-00 إلى FOUNDATION-06

J01-J06
الثقة والإدارة والسياسات

J07-J20
الشريك والمتجر

J21-J32
الكتالوج والمحتوى والتسويق

J33-J40
العميل والاكتشاف والسلة

J41-J48
Checkout والدفع والطلب

J49-J64
التجهيز والاستلام والتوصيل

J65-J68
الطلبات الخاصة

J69-J91
COD والماليات وتكامل WLT

J92-J100
الدعم والإشعارات والتحليلات

J101-J107
الأمان والتعافي والاحتفاظ

E2E scenarios
→ Security negative suite
→ Database replay and restore
→ DSH/WLT full contract verification
→ Contextual CI
→ Same-SHA closure
```

---

# 10. ما يجب عمله أولًا

أول نطاق تنفيذي لاحقًا هو:

```text
FOUNDATION-00
```

والترتيب الداخلي له:

```text
1. تثبيت أحدث SHA لفرع ala.
2. تشخيص Guard Registry failure.
3. تشخيص Node Graph failure.
4. تشخيص Static Diagnostics failure.
5. إغلاق Control Panel Architecture gate.
6. إغلاق Service Workspace gate.
7. إثبات OpenAPI canonical index.
8. إثبات DSH/WLT bundle provenance.
9. إثبات Generated Client provenance.
10. تشغيل DSH وWLT database workflows.
11. تشغيل Contextual CI.
12. إعادة تثبيت SHA.
13. توثيق Same-SHA evidence.
14. الانتقال إلى FOUNDATION-01.
```

لا تبدأ رحلة الشريك أو الكتالوج أو الطلبات أو الماليات قبل إغلاق الأساس.
