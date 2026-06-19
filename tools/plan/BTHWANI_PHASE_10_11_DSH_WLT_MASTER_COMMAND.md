# BThwani — Phase 10/11 Master Extraction + DSH/WLT Logic + Control Panel + Mobile UX Command

> انسخ هذا الملف كاملًا إلى Claude Code داخل `C:\bthwani-suite-next`.
>
> هذا الأمر لا ينفذ شرائح المنتج نفسها. هدفه تجهيز مرحلة ما قبل الشرائح بدرجة قابلة للقياس، ثم فتح الطريق مباشرة إلى `DSH-001 Store Discovery`.
>
> تعريف 100% هنا ليس ادعاءً لفظيًا. تعريفه: كل مصفوفة مطلوبة موجودة، كل صف مطلوب موجود، كل قاعدة ملكية/صلاحية/أداء/واجهة ممثلة، وكل gate رقمي ينجح. أي فشل في gate = لا يوجد 100% ولا يبدأ تنفيذ الشرائح.

---

## 0) هوية المستودعات والنطاق

نفّذ داخل المستودع الجديد فقط:

```powershell
C:\bthwani-suite-next
```

على الفرع الحالي فقط:

```text
working_treating,02
```

المستودع المانح للقراءة والتحليل فقط:

```powershell
C:\bthwani-suite
```

فرع المانح:

```text
realtest
```

ممنوع تعديل المانح. ممنوع نقل مجلدات كاملة من المانح. المانح مصدر قرار وتصميم وتحليل فقط، وليس مصدر نسخ مباشر.

---

## 1) الهدف النهائي

أنشئ وحقق مرحلة واحدة جامعة:

```text
PHASE_10_11_MASTER_EXTRACTION_LOGIC_UX_COVERAGE
```

الناتج المطلوب:

```text
1. تثبيت حالة Phase 10 الحالية بدون كسر ما تم بناؤه.
2. تجهيز extraction_matrix.csv من الألف إلى الياء كقيادة استخراج.
3. تجهيز dsh_wlt_logic_coverage_matrix.csv كقيادة اكتمال منطق DSH/WLT.
4. تجهيز control_panel_coverage_matrix.csv وفق أقسام لوحة التحكم السبعة المعتمدة فقط.
5. تجهيز mobile_ux_journey_matrix.csv لكل تطبيقات الموبايل الأربعة.
6. تجهيز screen_state_coverage_matrix.csv لكل شاشة/رحلة مطلوبة.
7. تجهيز donor_control_panel_alias_matrix.csv لتطبيع أقسام المانح إلى أقسام الجديد.
8. تحديث governance/00_DECISION_INDEX.md بإضافة governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md فقط.
9. إنشاء evidence pack.
10. لا تنفيذ backend، لا DB migrations، لا OpenAPI product endpoints، لا شاشات فعلية، لا frontend/shared logic فعلي.
11. النتيجة النهائية المسموحة فقط: READY_FOR_DSH_001_PLANNING_GATE.
```

---

## 2) القواعد الصارمة غير القابلة للتجاوز

ممنوع تمامًا:

```text
- تعديل C:\bthwani-suite
- نسخ مجلد كامل من المانح
- تنفيذ شاشات فعلية
- إنشاء backend فعلي
- إنشاء migration أو seed فعلي لشريحة منتج
- إنشاء OpenAPI endpoint جديد خاص بمنتج فعلي
- إنشاء frontend/shared logic فعلي لـ DSH أو WLT
- إنشاء Docker profile لتشغيل شريحة منتج
- إنشاء Excel binary
- إنشاء screen blueprint files
- إنشاء governance files كثيرة أو مكررة
- استخدام VERIFIED أو CLOSED أو PRODUCTION_READY لأي صف أو تقرير
- تفعيل خدمات reserved: knz, arb, amn, esf, mrf, snd, kwd
- تفعيل webapp أو website
- تخمين مسار من المانح بدون دليل scan
- اعتبار تصميم المانح source-code truth
```

مسموح فقط:

```text
- قراءة المانح وتحليله
- إنشاء/تحديث machine-readable/*.csv
- إنشاء governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md
- تحديث governance/00_DECISION_INDEX.md
- تشغيل gates وتحقيق أدلة
- إنشاء evidence files تحت tools/registry/runs
```

---

## 3) تحقق أولي إلزامي قبل أي كتابة

نفّذ حرفيًا:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$ErrorActionPreference = "Stop"

Write-Host "=== PRECHECK: BRANCH ==="
$ExpectedBranch = "working_treating,02"
$CurrentBranch = (git branch --show-current).Trim()
if ($CurrentBranch -ne $ExpectedBranch) {
  throw "Wrong branch. Expected '$ExpectedBranch' but got '$CurrentBranch'."
}

Write-Host "=== PRECHECK: REMOTE ==="
git fetch origin

Write-Host "=== PRECHECK: HEAD ==="
git branch --show-current
git rev-parse HEAD
git rev-parse "origin/$ExpectedBranch"

Write-Host "=== PRECHECK: STATUS ==="
git --no-pager status --short
git --no-pager diff --check

if (git status --porcelain) {
  throw "Working tree is not clean. Stop. Do not continue."
}

Write-Host "=== PRECHECK: FOUNDATION GATE BEFORE ==="
pnpm run foundation:gate -- -Zip
```

إذا فشل أي أمر: توقّف ولا تعدّل أي ملف.

---

## 4) Evidence session

```powershell
$SessionId = "PHASE-10-11-MASTER-COVERAGE-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$EvidenceRoot = Join-Path (Get-Location) "tools\registry\runs\$SessionId"
New-Item -ItemType Directory -Force -Path $EvidenceRoot | Out-Null

git branch --show-current | Set-Content -LiteralPath (Join-Path $EvidenceRoot "branch.txt") -Encoding UTF8
git rev-parse HEAD | Set-Content -LiteralPath (Join-Path $EvidenceRoot "head-before.txt") -Encoding UTF8
git --no-pager status --short | Set-Content -LiteralPath (Join-Path $EvidenceRoot "git-status-before.txt") -Encoding UTF8
```

---

## 5) Phase 10 reconciliation — لا تكسر الموجود

افحص الملفات الموجودة في الجديد:

```text
governance/13_DSH_SERVICE_ACTIVATION.md
services/dsh/service.manifest.ts
services/dsh/capability-map.ts
services/dsh/surface-map.ts
services/dsh/runtime-map.ts
services/dsh/contracts/dsh.openapi.yaml
```

القواعد:

```text
- لا تحذف Phase 10A الحالية.
- لا تعيد تسمية ملفات Phase 10A الحالية.
- لا تضف SERVICE_BLUEPRINT.md جديد لأي خدمة.
- إذا كان services/dsh/SERVICE_BLUEPRINT.md موجودًا بالفعل ومذكورًا في governance/13، لا تحذفه في هذه المهمة. سجله في extraction_matrix.csv كـ EXISTING_PHASE10A_ARTIFACT مع action = REVIEW_AFTER_DSH_001_GATE.
- إذا كان services/_template موجودًا، سجله كقالب.
- إذا كان services/_template غير موجود، لا تنشئه الآن إلا إذا كان foundation gate الحالي يتطلبه صراحة. الأولوية عدم كسر حالة الفرع.
```

اكتب نتيجة فحص Phase 10 في:

```text
tools/registry/runs/<SessionId>/phase10-scan.txt
```

---

## 6) تحليل المانح للوحة التحكم والواجهات

من `C:\bthwani-suite` على فرع `realtest`، اقرأ فقط ولا تعدّل.

نفّذ تحليلًا بالأوامر التالية أو ما يكافئها:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite"
git branch --show-current
git status --short

rg -n "dashboard|operations|finance|catalogs|partners|marketing|platform|administration|hr|community-services|support" control-panel dsh wlt -S > "C:\bthwani-suite-next\tools\registry\runs\$SessionId\donor-control-panel-section-scan.txt"
rg -n "export \{|Screen|Workspace|Queue|Hub|Approval|Ledger|Settlement|Refund|Payout|Commission|Catalog|Partner|Support|Operations|Marketing|Platform" dsh/frontend/control-panel wlt/frontend -S > "C:\bthwani-suite-next\tools\registry\runs\$SessionId\donor-screen-export-scan.txt"
rg -n "mock|demo|preview|Tamagui|fetch\(|axios|ledger|settlement|refund|commission|payout|wallet|cod" dsh wlt control-panel -S > "C:\bthwani-suite-next\tools\registry\runs\$SessionId\donor-risk-pattern-scan.txt"
Set-Location -LiteralPath "C:\bthwani-suite-next"
```

إذا لم يكن المانح موجودًا محليًا أو لم يكن على `realtest`، لا تخمّن. اكتب `BLOCKED_NEEDS_EVIDENCE` للصفوف التي تحتاج source_path حقيقي.

---

## 7) الملفات المطلوب إنشاؤها

أنشئ هذه الملفات فقط:

```text
machine-readable/extraction_matrix.csv
machine-readable/dsh_wlt_logic_coverage_matrix.csv
machine-readable/control_panel_coverage_matrix.csv
machine-readable/mobile_ux_journey_matrix.csv
machine-readable/screen_state_coverage_matrix.csv
machine-readable/donor_control_panel_alias_matrix.csv
governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md
```

حدّث فقط:

```text
governance/00_DECISION_INDEX.md
```

لا تنشئ ملفات حوكمة أخرى.

---

## 8) extraction_matrix.csv

المسار:

```text
machine-readable/extraction_matrix.csv
```

الهيدر الحرفي:

```csv
record_id,source_path,target_path,owner,service,surface,capability,slice_id,layer,artifact_type,imports,runtime_data,api_binding,db_dependency,auth_dependency,ui_kit_compliance,test_coverage,evidence,decision,action,risk,rollback,status,next_action
```

قرارات الاستخراج المسموحة فقط:

```text
ADOPT_AS_IS
ADAPT_NORMALIZE
REWRITE_FROM_SPEC
REFERENCE_ONLY
REJECT
```

حالات status المسموحة فقط:

```text
INVENTORY_ONLY
READY_FOR_SLICE
BLOCKED_NEEDS_EVIDENCE
BLOCKED_NEEDS_WLT
BLOCKED_NEEDS_API_CONTRACT
BLOCKED_NEEDS_RUNTIME_EVIDENCE
RESERVED_INVENTORY
REJECTED
```

ممنوع استخدام `VERIFIED` في هذه المهمة.

يجب ألا يقل عدد السجلات عن:

```text
160 rows
```

يجب أن تشمل هذه الشرائح:

```text
DSH-001 store-discovery
DSH-002 storefront-catalog
DSH-003 cart-serviceability
DSH-004 checkout-intent
WLT-001 payment-session
DSH-WLT-001 payment-integration
DSH-005 order-tracking
DSH-006 partner-orders
DSH-007 captain-tasks
DSH-008 field-onboarding
DSH-009 address-zone-serviceability
DSH-010 order-cancellation-refund-bridge
DSH-011 operations-support
DSH-012 media-reference
DSH-013 notifications-readiness
WLT-002 refund-status
WLT-003 settlement-read-model
WLT-004 commission-cod-reference
WLT-005 ledger-audit-minimal
DSH-WLT-002 refund-bridge
DSH-WLT-003 settlement-status-bridge
DSH-WLT-004 cod-status-bridge
```

لكل شريحة أضف طبقات عند الحاجة:

```text
governance
contract
domain
database-migration
database-seed
backend
client
frontend-shared
screen
route
app-mount
docker
guard
evidence
visual-reference
```

قواعد الرفض الفوري:

```text
preview/demo/mock runtime => REJECT
fake actor IDs => REJECT
screen-shaped API => REWRITE_FROM_SPEC أو REJECT حسب الخطر
financial mutation outside WLT => REJECT
local design system => REJECT
deep ui-kit imports => REJECT
direct Tamagui outside ui-kit => REJECT
memory repo runtime => REWRITE_FROM_SPEC
CORS wildcard outside local => REJECT
old docs as truth => REJECT
old docs as reference => REFERENCE_ONLY
closure claims without evidence => REJECT
direct fetch inside screen => REJECT
raw colors outside shared/ui-kit => REJECT
business logic inside apps/* => REJECT
```

---

## 9) dsh_wlt_logic_coverage_matrix.csv

المسار:

```text
machine-readable/dsh_wlt_logic_coverage_matrix.csv
```

الهيدر الحرفي:

```csv
logic_id,service,capability,slice_id,actor,surface,operation,domain_rule,api_contract,db_objects,auth_rule,wlt_boundary,idempotency_required,state_transitions,error_cases,negative_cases,performance_rule,observability_rule,visual_dependency,evidence_required,status,next_action
```

يجب ألا يقل عدد السجلات عن:

```text
180 rows
```

## 9.1 DSH mandatory logic coverage

أضف سجلات لكل العمليات التالية:

```text
Store / Discovery:
- list active stores
- get store details
- filter stores by serviceability zone
- handle closed store
- handle unavailable store
- handle unauthorized actor
- handle empty stores
- handle pagination
- control-panel store management read

Catalog:
- list categories
- list products by store
- get product details
- handle unavailable product
- handle out-of-stock product
- handle media reference
- handle catalog pagination
- handle control-panel catalog read
- handle partner catalog management readiness
- item approval readiness
- listing governance readiness
- duplicate resolution readiness
- taxonomy governance readiness
- bulk operations proposal only
- publication readiness
- adoption queue

Cart / Serviceability:
- create cart
- get cart
- add cart item
- update cart item quantity
- remove cart item
- validate store open
- validate product available
- validate delivery zone
- validate price snapshot operationally
- reject incompatible multi-store cart if forbidden
- handle stale cart
- handle empty cart
- handle address not serviceable

Checkout Intent:
- create checkout intent
- validate cart before checkout
- create order draft
- request WLT payment session by contract only
- store paymentSessionId
- store paymentStatus
- store financialReference only
- reject payment truth mutation inside DSH
- handle WLT timeout
- handle WLT payment failure
- handle idempotent checkout retry

Orders:
- place order after payment status allowed
- get order detail
- list client orders
- list partner orders
- list operations orders
- track order status
- cancel order request
- reject invalid order state transition
- reject unauthorized order access

Partner:
- partner order queue
- accept order
- reject order
- mark preparing
- mark ready
- store readiness state
- partner approval
- partner activation
- partner document review
- partner deactivation
- partner fulfillment lane
- partner intake lane
- reject partner action for non-owned store

Captain:
- list assigned tasks
- accept task if allowed
- pickup state transition
- dropoff state transition
- reject non-assigned captain
- reject invalid task transition
- handle location/status update readiness
- cod status read-only reference

Field:
- list field visits
- store onboarding checklist
- submit readiness result
- attach media reference if needed
- reject non-assigned field actor

Operations / Support:
- operations room read model
- command center
- live orders
- assisted order desk
- order rescue
- dispatch assignment
- geo heatmap
- area capacity
- exceptions escalation
- support queue read model
- support ticket detail
- SLA dashboard
- customer 360
- manual call intake
- messaging workspace
- audit action required

Marketing:
- marketing hub
- campaign readiness
- offers readiness
- marketing approval
- video submissions review
- media campaign reference

Platform:
- platform overview
- vars read-only
- appearance read-only
- service registry read-only
- provider health read-only
- rollouts read-only
- audit read-only
- permissions access readiness
```

## 9.2 WLT mandatory logic coverage related to DSH

أضف سجلات لكل العمليات التالية:

```text
Payment Session:
- create payment session
- get payment session
- idempotent payment session creation
- validate amount/currency/reference
- link to DSH checkout intent/order draft
- provider reference creation
- local payment simulator readiness
- payment pending
- payment succeeded
- payment failed
- payment expired
- provider timeout
- duplicate callback handling

Refund Bridge:
- create refund request
- get refund status
- reject DSH direct refund execution
- idempotent refund request
- refund failed
- refund succeeded
- refund audit trail

Settlement / Payout / Commission / COD:
- settlement status read model
- payout status read model
- commission reference read model
- COD reference/status read model
- reject DSH financial calculation
- reject DSH ledger mutation

Ledger / Audit / Reconciliation:
- minimal ledger reference
- financial audit reference
- reconciliation reference
- reject ledger mutation outside WLT
- audit required for every money-state transition
```

## 9.3 Financial ownership rule

DSH allowed only:

```text
paymentSessionId
paymentStatus
financialReference
settlementStatus read-only
refundStatus read-only
payoutStatus read-only
commissionReference read-only
codStatus read-only
WLT request/callback references
```

DSH forbidden:

```text
wallet balance calculation
payment confirmation
payment provider callback truth
refund execution
settlement execution
payout execution
commission calculation
COD financial truth
ledger mutation
reconciliation mutation
finance report truth
```

WLT owns:

```text
wallet
payment session
payment confirmation
payment callback truth
refund
settlement
payout
commission
COD financial truth
ledger
reconciliation
finance reports
finance audit
```

أي مخالفة لهذه القاعدة يجب أن تكون `REJECTED` أو `BLOCKED_NEEDS_WLT` حسب نوع الصف.

---

## 10) control_panel_coverage_matrix.csv

المسار:

```text
machine-readable/control_panel_coverage_matrix.csv
```

الهيدر الحرفي:

```csv
page_id,section,service,capability,slice_id,page_type,target_path,route_path,actor,allowed_actions,api_contract,db_dependency,wlt_boundary,permissions,states_required,filters_required,table_columns_required,bulk_actions_allowed,audit_required,visual_reference_required,evidence_required,status,next_action
```

أقسام لوحة التحكم المعتمدة فقط:

```text
partners
operations
wallet-finance
support
marketing
catalog
platform
```

ممنوع إنشاء قسم رئيسي خارج هذه السبعة.

يجب ألا يقل عدد السجلات عن:

```text
70 rows
```

## 10.1 Alias mapping من المانح إلى الجديد

يجب الالتزام بهذه الخريطة:

```text
donor: partners -> target: partners
donor: operations -> target: operations
donor: finance -> target: wallet-finance
donor: support -> target: support
donor: marketing -> target: marketing
donor: catalogs -> target: catalog
donor: platform -> target: platform
donor: dashboard -> target: shell-overview only, not main section
donor: community-services -> RESERVED_INVENTORY
donor: administration -> platform subpage
donor: hr -> platform subpage or RESERVED_INVENTORY
```

## 10.2 Minimum pages by section

Partners:

```text
PartnerApprovalsScreen
PartnerActivationScreen
PartnerDocumentReviewScreen
PartnerReadinessScreen
PartnerDeactivationScreen
PartnerFulfillmentLaneScreen
PartnerIntakeScreen
```

Operations:

```text
OperationsRoomScreen
CommandCenterScreen
LiveOrdersScreen
DispatchAssignmentScreen
OrderRescueScreen
AssistedOrderDeskScreen
AreaCapacityScreen
ExceptionsEscalationsScreen
GeoHeatmapScreen
AuditSupportSlaScreen
```

Wallet Finance:

```text
PaymentSessionsScreen
WalletSummaryScreen
RefundStatusScreen
SettlementStatusScreen
PayoutStatusScreen
CommissionReferenceScreen
CodStatusScreen
LedgerAuditScreen
ReconciliationScreen
DailyReconciliationScreen
FinanceAuditScreen
```

Support:

```text
SupportQueueScreen
SupportTicketListScreen
SupportTicketDetailScreen
SupportEscalationQueueScreen
SupportSlaDashboardScreen
Customer360Screen
ManualCallIntakeScreen
ClientMessagingWorkspaceScreen
PartnerMessagingWorkspaceScreen
CaptainMessagingWorkspaceScreen
SupportAuditTrailScreen
```

Marketing:

```text
MarketingHubScreen
CampaignsScreen
OffersScreen
MarketingApprovalScreen
VideoSubmissionsReviewScreen
MediaCampaignScreen
```

Catalog:

```text
CatalogManagementScreen
CategoriesScreen
ProductsScreen
ItemApprovalScreen
ListingGovernanceScreen
CatalogItemDetailScreen
CatalogIdentityGovernanceScreen
CatalogDuplicateResolutionScreen
CatalogVisibilityPolicyScreen
CatalogPartnerHandoffScreen
CatalogMediaGovernanceScreen
CatalogQuickEntryDraftScreen
CatalogTaxonomyGovernanceScreen
CatalogBulkOperationsScreen
CatalogAuditTrailScreen
CatalogPublicationReadinessScreen
CatalogAdoptionQueueScreen
```

Platform:

```text
PlatformOverviewScreen
VarsScreen
AppearanceScreen
ServicesRegistryScreen
ProvidersScreen
RolloutsScreen
HealthScreen
AuditScreen
PermissionsAccessScreen
AdministrationApprovalChainScreen
HrReadOnlyScreen
```

كل صفحة يجب أن تحدد:

```text
section
service owner
capability
slice_id
page_type
route_path
actor = operator أو finance-operator أو platform-operator
allowed_actions
permissions
loading/empty/error/permission/success states
pagination/index/filters/table columns إذا قائمة
WLT boundary إذا لها علاقة مالية
audit_required إذا فيها write أو status action أو finance read
visual_reference_required إذا يوجد donor visual
```

---

## 11) donor_control_panel_alias_matrix.csv

المسار:

```text
machine-readable/donor_control_panel_alias_matrix.csv
```

الهيدر الحرفي:

```csv
donor_section,target_section,target_policy,service_owner,status,reason,next_action
```

يجب أن يحتوي بالضبط على هذه donor sections كحد أدنى:

```text
dashboard
operations
finance
catalogs
community-services
support
partners
marketing
platform
administration
hr
```

ولا يجوز أن يكون `target_section` خارج:

```text
partners
operations
wallet-finance
support
marketing
catalog
platform
shell-overview
RESERVED_INVENTORY
```

---

## 12) mobile_ux_journey_matrix.csv

المسار:

```text
machine-readable/mobile_ux_journey_matrix.csv
```

الهيدر الحرفي:

```csv
journey_id,app,surface,service,capability,slice_id,actor,entry_point,screen_sequence,target_paths,api_contracts,db_dependency,wlt_dependency,permissions,primary_actions,secondary_actions,states_required,offline_or_retry_required,visual_reference_required,evidence_required,status,next_action
```

التطبيقات المطلوبة:

```text
app-client
app-partner
app-captain
app-field
```

يجب ألا يقل عدد الرحلات عن:

```text
55 rows
```

## 12.1 app-client mandatory journeys

```text
client-store-discovery
client-store-details
client-storefront-catalog
client-product-details
client-search-filter
client-cart
client-address-serviceability
client-checkout-intent
client-payment-status
client-order-tracking
client-cancel-order-request
client-refund-request-status
client-support-entry
client-notifications-readiness
```

## 12.2 app-partner mandatory journeys

```text
partner-home-readiness
partner-store-readiness
partner-catalog-management
partner-incoming-orders
partner-order-detail
partner-accept-order
partner-reject-order
partner-mark-preparing
partner-mark-ready
partner-support-entry
partner-settlement-status-read
partner-document-review-readiness
partner-activation-readiness
```

## 12.3 app-captain mandatory journeys

```text
captain-task-list
captain-task-detail
captain-accept-task
captain-pickup-flow
captain-dropoff-flow
captain-location-status-readiness
captain-delivery-issue
captain-support-entry
captain-cod-status-read
captain-payment-reference-read
```

## 12.4 app-field mandatory journeys

```text
field-visit-list
field-visit-detail
field-store-onboarding
field-readiness-checklist
field-media-reference
field-submit-readiness
field-rejected-or-blocked-state
field-support-entry
field-partner-intake-readiness
```

كل journey يجب أن يحتوي target_paths وفق النمط:

```text
services/<service>/frontend/<surface>/<capability>/<ScreenName>Screen.tsx
```

---

## 13) screen_state_coverage_matrix.csv

المسار:

```text
machine-readable/screen_state_coverage_matrix.csv
```

الهيدر الحرفي:

```csv
screen_id,service,surface,capability,slice_id,target_path,route_path,loading_state,empty_state,error_state,permission_state,offline_state,retry_state,success_state,blocked_state,visual_reference,evidence_required,status,next_action
```

يجب ألا يقل عدد السجلات عن:

```text
80 rows
```

كل شاشة يجب أن تحدد صراحة:

```text
loading_state
empty_state
error_state
permission_state
success_state
```

وحسب الحاجة:

```text
offline_state
retry_state
blocked_state
```

أي شاشة بدون هذه الحالات لا تكون `READY_FOR_SLICE`.

---

## 14) قواعد تسمية الشاشات والمسارات

كل شاشة:

```text
services/<service>/frontend/<surface>/<capability>/<ScreenName>Screen.tsx
```

كل route:

```text
services/<service>/frontend/<surface>/<capability>/<ScreenName>Route.tsx
```

ممنوع:

```text
Home.tsx
Screen.tsx
Index.tsx
TestPage.tsx
PreviewScreen.tsx
DemoOrders.tsx
OldDashboard.tsx
NewScreen2.tsx
```

إذا وجدت في المانح، القرار:

```text
REFERENCE_ONLY أو REWRITE_FROM_SPEC
```

لا تنقلها كما هي.

---

## 15) قاعدة الاستفادة من تصميم المانح

كل شاشة مانح جيدة التصميم تسجل كـ visual reference فقط.

ممنوع:

```text
COPY_SCREEN_AS_IS
```

الإجراء المطلوب لكل visual-reference:

```text
capture donor screenshot later during slice
extract visual pattern
map to shared/ui-kit public exports
rebuild in target path
compare before/after
record visual acceptance
```

أي تصميم يستخدم local design system أو direct Tamagui أو raw colors خارج ui-kit:

```text
decision = REFERENCE_ONLY أو REJECT
```

حسب الخطر.

---

## 16) governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md

أنشئ الملف:

```text
governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md
```

يجب أن يحتوي:

```text
Status: CANONICAL
Stage: PHASE_10_11_MASTER_EXTRACTION_LOGIC_UX_COVERAGE
Purpose
Scope
What this phase does
What this phase does not do
CSV files
Decision meanings
Status meanings
Immediate rejection rules
DSH/WLT logic completeness rule
WLT financial ownership rule
Control panel seven-section rule
Donor section alias rule
Mobile UX coverage rule
Screen state rule
Design donor rule
Slice-start rule
Acceptance condition
```

يجب أن يصرح صراحة:

```text
لا يبدأ DSH-001 إلا بعد نجاح كل matrices checks.
لا يصبح أي صف VERIFIED إلا بعد تنفيذ الشريحة ووجود evidence.
DSH لا يملك الحقيقة المالية.
WLT يملك الحقيقة المالية.
لوحة التحكم في الجديد تعتمد 7 أقسام فقط.
أقسام المانح الزائدة إما alias أو shell-overview أو platform subpage أو RESERVED_INVENTORY.
```

---

## 17) تحديث governance/00_DECISION_INDEX.md

أضف فقط:

```text
14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md
```

لا تحذف الموجود. لا تغير ترتيب الموجود إلا إذا كان ضروريًا لإضافة الرقم 14. لا تكرر entry.

ملاحظة: إذا كان `BLOCKED_NEEDS_BLUEPRINT` موجودًا ضمن unresolved states، لا تضف استخدامًا جديدًا له. استخدم بدلًا منه:

```text
BLOCKED_NEEDS_EVIDENCE
BLOCKED_NEEDS_API_CONTRACT
BLOCKED_NEEDS_RUNTIME_EVIDENCE
BLOCKED_NEEDS_WLT
```

---

## 18) التحقق الرقمي الإلزامي

بعد إنشاء الملفات، نفّذ هذا التحقق كاملًا:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
$ErrorActionPreference = "Stop"

Write-Host "=== VERIFY REQUIRED FILES ==="
$requiredFiles = @(
  "governance\14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md",
  "machine-readable\extraction_matrix.csv",
  "machine-readable\dsh_wlt_logic_coverage_matrix.csv",
  "machine-readable\control_panel_coverage_matrix.csv",
  "machine-readable\mobile_ux_journey_matrix.csv",
  "machine-readable\screen_state_coverage_matrix.csv",
  "machine-readable\donor_control_panel_alias_matrix.csv"
)
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file)) { throw "Missing required file: $file" }
}

Write-Host "=== VERIFY CSV HEADERS ==="
$headers = @{
  "machine-readable\extraction_matrix.csv" = "record_id,source_path,target_path,owner,service,surface,capability,slice_id,layer,artifact_type,imports,runtime_data,api_binding,db_dependency,auth_dependency,ui_kit_compliance,test_coverage,evidence,decision,action,risk,rollback,status,next_action";
  "machine-readable\dsh_wlt_logic_coverage_matrix.csv" = "logic_id,service,capability,slice_id,actor,surface,operation,domain_rule,api_contract,db_objects,auth_rule,wlt_boundary,idempotency_required,state_transitions,error_cases,negative_cases,performance_rule,observability_rule,visual_dependency,evidence_required,status,next_action";
  "machine-readable\control_panel_coverage_matrix.csv" = "page_id,section,service,capability,slice_id,page_type,target_path,route_path,actor,allowed_actions,api_contract,db_dependency,wlt_boundary,permissions,states_required,filters_required,table_columns_required,bulk_actions_allowed,audit_required,visual_reference_required,evidence_required,status,next_action";
  "machine-readable\mobile_ux_journey_matrix.csv" = "journey_id,app,surface,service,capability,slice_id,actor,entry_point,screen_sequence,target_paths,api_contracts,db_dependency,wlt_dependency,permissions,primary_actions,secondary_actions,states_required,offline_or_retry_required,visual_reference_required,evidence_required,status,next_action";
  "machine-readable\screen_state_coverage_matrix.csv" = "screen_id,service,surface,capability,slice_id,target_path,route_path,loading_state,empty_state,error_state,permission_state,offline_state,retry_state,success_state,blocked_state,visual_reference,evidence_required,status,next_action";
  "machine-readable\donor_control_panel_alias_matrix.csv" = "donor_section,target_section,target_policy,service_owner,status,reason,next_action";
}
foreach ($entry in $headers.GetEnumerator()) {
  $actual = (Get-Content -LiteralPath $entry.Key -TotalCount 1)
  if ($actual -ne $entry.Value) {
    Write-Host "EXPECTED: $($entry.Value)"
    Write-Host "ACTUAL:   $actual"
    throw "Invalid CSV header: $($entry.Key)"
  }
}

Write-Host "=== IMPORT CSV ==="
$extractionRows = Import-Csv -LiteralPath "machine-readable\extraction_matrix.csv"
$logicRows = Import-Csv -LiteralPath "machine-readable\dsh_wlt_logic_coverage_matrix.csv"
$controlRows = Import-Csv -LiteralPath "machine-readable\control_panel_coverage_matrix.csv"
$mobileRows = Import-Csv -LiteralPath "machine-readable\mobile_ux_journey_matrix.csv"
$stateRows = Import-Csv -LiteralPath "machine-readable\screen_state_coverage_matrix.csv"
$aliasRows = Import-Csv -LiteralPath "machine-readable\donor_control_panel_alias_matrix.csv"

Write-Host "extraction rows: $(@($extractionRows).Count)"
Write-Host "logic rows: $(@($logicRows).Count)"
Write-Host "control rows: $(@($controlRows).Count)"
Write-Host "mobile journeys: $(@($mobileRows).Count)"
Write-Host "screen states: $(@($stateRows).Count)"
Write-Host "alias rows: $(@($aliasRows).Count)"

if (@($extractionRows).Count -lt 160) { throw "extraction_matrix.csv must contain at least 160 rows." }
if (@($logicRows).Count -lt 180) { throw "dsh_wlt_logic_coverage_matrix.csv must contain at least 180 rows." }
if (@($controlRows).Count -lt 70) { throw "control_panel_coverage_matrix.csv must contain at least 70 rows." }
if (@($mobileRows).Count -lt 55) { throw "mobile_ux_journey_matrix.csv must contain at least 55 rows." }
if (@($stateRows).Count -lt 80) { throw "screen_state_coverage_matrix.csv must contain at least 80 rows." }
if (@($aliasRows).Count -lt 11) { throw "donor_control_panel_alias_matrix.csv must contain at least 11 rows." }

Write-Host "=== VERIFY NO VERIFIED/CLOSED CLAIMS ==="
$badClaims = @()
$badClaims += $extractionRows | Where-Object { $_.status -eq "VERIFIED" -or $_.action -match "CLOSED|production ready|100% complete" }
$badClaims += $logicRows | Where-Object { $_.status -eq "VERIFIED" -or $_.next_action -match "CLOSED|production ready|100% complete" }
$badClaims += $controlRows | Where-Object { $_.status -eq "VERIFIED" -or $_.next_action -match "CLOSED|production ready|100% complete" }
$badClaims += $mobileRows | Where-Object { $_.status -eq "VERIFIED" -or $_.next_action -match "CLOSED|production ready|100% complete" }
$badClaims += $stateRows | Where-Object { $_.status -eq "VERIFIED" -or $_.next_action -match "CLOSED|production ready|100% complete" }
if (@($badClaims).Count -gt 0) { throw "Forbidden VERIFIED/CLOSED/production claims detected." }

Write-Host "=== VERIFY REQUIRED SLICES ==="
$requiredSlices = @(
  "DSH-001","DSH-002","DSH-003","DSH-004","WLT-001","DSH-WLT-001",
  "DSH-005","DSH-006","DSH-007","DSH-008","DSH-009","DSH-010","DSH-011","DSH-012","DSH-013",
  "WLT-002","WLT-003","WLT-004","WLT-005","DSH-WLT-002","DSH-WLT-003","DSH-WLT-004"
)
foreach ($slice in $requiredSlices) {
  $count = @($extractionRows | Where-Object { $_.slice_id -eq $slice }).Count
  Write-Host "$slice extraction rows: $count"
  if ($count -lt 1) { throw "Missing extraction records for slice: $slice" }
}

Write-Host "=== VERIFY REQUIRED DSH/WLT LOGIC CAPABILITIES ==="
$requiredLogicCapabilities = @(
  "store-discovery","storefront-catalog","cart-serviceability","address-zone-serviceability",
  "checkout-intent","order-tracking","partner-orders","captain-tasks","field-onboarding",
  "operations-room","support-queue","marketing","catalog-governance","platform-readiness",
  "payment-session","payment-integration","refund-bridge","settlement-status-bridge",
  "commission-reference","cod-reference","minimal-ledger-reference"
)
foreach ($capability in $requiredLogicCapabilities) {
  $count = @($logicRows | Where-Object { $_.capability -eq $capability }).Count
  Write-Host "$capability logic rows: $count"
  if ($count -lt 1) { throw "Missing required logic capability: $capability" }
}

Write-Host "=== VERIFY CONTROL PANEL SECTIONS EXACTLY ==="
$allowedSections = @("partners","operations","wallet-finance","support","marketing","catalog","platform")
$actualSections = @($controlRows | Select-Object -ExpandProperty section -Unique)
foreach ($section in $actualSections) {
  if ($allowedSections -notcontains $section) { throw "Forbidden control panel main section: $section" }
}
foreach ($section in $allowedSections) {
  $count = @($controlRows | Where-Object { $_.section -eq $section }).Count
  Write-Host "$section pages: $count"
  if ($count -lt 5) { throw "Insufficient control panel coverage for section: $section" }
}

Write-Host "=== VERIFY DONOR ALIASES ==="
$requiredDonorSections = @("dashboard","operations","finance","catalogs","community-services","support","partners","marketing","platform","administration","hr")
foreach ($section in $requiredDonorSections) {
  $count = @($aliasRows | Where-Object { $_.donor_section -eq $section }).Count
  if ($count -lt 1) { throw "Missing donor alias section: $section" }
}
$allowedAliasTargets = @("partners","operations","wallet-finance","support","marketing","catalog","platform","shell-overview","RESERVED_INVENTORY")
$badAliases = $aliasRows | Where-Object { $allowedAliasTargets -notcontains $_.target_section }
if (@($badAliases).Count -gt 0) { $badAliases | Format-Table; throw "Invalid alias target section." }

Write-Host "=== VERIFY MOBILE APPS COVERED ==="
$requiredApps = @("app-client","app-partner","app-captain","app-field")
foreach ($app in $requiredApps) {
  $count = @($mobileRows | Where-Object { $_.app -eq $app }).Count
  Write-Host "$app journeys: $count"
  if ($count -lt 8) { throw "Insufficient mobile UX coverage for $app." }
}

Write-Host "=== VERIFY SCREEN STATES ==="
$badStateRows = $stateRows | Where-Object {
  $_.loading_state -eq "" -or
  $_.empty_state -eq "" -or
  $_.error_state -eq "" -or
  $_.permission_state -eq "" -or
  $_.success_state -eq ""
}
if (@($badStateRows).Count -gt 0) {
  $badStateRows | Format-Table screen_id,target_path,loading_state,empty_state,error_state,permission_state,success_state
  throw "Every screen must declare loading, empty, error, permission, and success states."
}

Write-Host "=== VERIFY MONEY WRITES REQUIRE IDEMPOTENCY ==="
$moneyWriteRows = $logicRows | Where-Object {
  $_.service -match "wlt|dsh-wlt" -and
  $_.operation -match "create|confirm|callback|refund|settle|payout|transition|update"
}
$badIdempotency = $moneyWriteRows | Where-Object { $_.idempotency_required -ne "yes" }
if (@($badIdempotency).Count -gt 0) {
  $badIdempotency | Format-Table logic_id,service,capability,operation,idempotency_required
  throw "All WLT/DSH-WLT money writes or callbacks must require idempotency."
}

Write-Host "=== VERIFY DSH DOES NOT OWN FINANCIAL TRUTH ==="
$badDshFinancialTruth = $logicRows | Where-Object {
  $_.service -eq "dsh" -and (
    $_.domain_rule -match "wallet|ledger|settlement execution|payout execution|commission calculation|COD financial truth|payment confirmation|refund execution" -or
    $_.operation -match "confirm-payment|execute-refund|settle|payout|post-ledger|calculate-commission"
  )
}
if (@($badDshFinancialTruth).Count -gt 0) {
  $badDshFinancialTruth | Format-Table logic_id,capability,operation,domain_rule
  throw "DSH financial truth violation detected."
}

Write-Host "=== VERIFY CONTROL PANEL FINANCE OWNERSHIP ==="
$badControlFinance = $controlRows | Where-Object {
  $_.service -eq "dsh" -and
  $_.section -match "wallet-finance" -and
  $_.allowed_actions -match "confirm|execute|settle|payout|ledger|calculate"
}
if (@($badControlFinance).Count -gt 0) {
  $badControlFinance | Format-Table page_id,section,service,allowed_actions,wlt_boundary
  throw "DSH control panel cannot own financial truth actions."
}

Write-Host "=== VERIFY LIST OPERATIONS HAVE PERFORMANCE RULES ==="
$listRows = $logicRows | Where-Object { $_.operation -match "list" }
$badListRows = $listRows | Where-Object { $_.performance_rule -notmatch "pagination|index|limit" }
if (@($badListRows).Count -gt 0) {
  $badListRows | Format-Table logic_id,service,capability,operation,performance_rule
  throw "All list operations must declare pagination/index/limit performance rules."
}

Write-Host "=== VERIFY OBJECT ACCESS HAS AUTH RULES ==="
$objectRows = $logicRows | Where-Object {
  $_.api_contract -match "\{.*Id.*\}" -or
  $_.operation -match "detail|update|cancel|accept|reject|pickup|dropoff|refund|payment|activation|approval"
}
$badAuthRows = $objectRows | Where-Object { $_.auth_rule -eq "none" -or $_.auth_rule -eq "" }
if (@($badAuthRows).Count -gt 0) {
  $badAuthRows | Format-Table logic_id,service,capability,operation,auth_rule
  throw "Object-level operations must declare auth ownership rules."
}

Write-Host "=== VERIFY SCREEN PATH NAMING ==="
$screenTargets = @()
$screenTargets += $controlRows | Select-Object -ExpandProperty target_path
$screenTargets += $mobileRows | Select-Object -ExpandProperty target_paths
$screenTargets += $stateRows | Select-Object -ExpandProperty target_path
$badScreenNames = $screenTargets | Where-Object { $_ -match "(^|/|\\)(Home|Screen|Index|TestPage|PreviewScreen|DemoOrders|OldDashboard|NewScreen2)\.tsx" }
if (@($badScreenNames).Count -gt 0) {
  $badScreenNames | ForEach-Object { Write-Host $_ }
  throw "Forbidden screen file names detected."
}

Write-Host "=== VERIFY NO EXCEL BINARY ==="
$excelFiles = Get-ChildItem -LiteralPath "machine-readable" -Recurse -File -Include "*.xlsx","*.xls" -ErrorAction SilentlyContinue
if ($excelFiles.Count -gt 0) { $excelFiles.FullName; throw "Excel binary files are not allowed. Use CSV only." }

Write-Host "=== VERIFY DIFF ==="
git --no-pager diff --check

Write-Host "=== VERIFY FOUNDATION GATE AFTER ==="
pnpm run foundation:gate -- -Zip

Write-Host "=== FINAL STATUS ==="
git --no-pager status --short
git --no-pager diff --stat
```

---

## 19) Evidence summary

بعد نجاح التحقق، اكتب:

```text
tools/registry/runs/<SessionId>/summary.txt
tools/registry/runs/<SessionId>/matrix-counts.txt
tools/registry/runs/<SessionId>/changed-files.txt
tools/registry/runs/<SessionId>/diff-stat.txt
tools/registry/runs/<SessionId>/git-status-after.txt
```

محتوى `summary.txt` يجب أن يكون:

```text
status: READY_FOR_DSH_001_PLANNING_GATE
branch: working_treating,02
phase_10_reconciliation: PASS
phase_11_extraction: PASS
phase_11b_logic_completeness: PASS
phase_11c_control_panel_mobile_ux: PASS
extraction_matrix_rows:
dsh_wlt_logic_coverage_rows:
control_panel_coverage_rows:
mobile_ux_journey_rows:
screen_state_coverage_rows:
donor_alias_rows:
next_slice: DSH-001 Store Discovery
forbidden_claims: 0
financial_ownership_violations: 0
idempotency_gaps: 0
list_performance_gaps: 0
object_auth_gaps: 0
evidence:
```

ثم أنشئ zip:

```powershell
Compress-Archive -Path (Join-Path $EvidenceRoot "*") -DestinationPath (Join-Path $EvidenceRoot "_HANDOFF.zip") -Force
```

---

## 20) التقرير النهائي المطلوب

اطبع فقط هذا التقرير النهائي:

```text
RESULT:
READY_FOR_DSH_001_PLANNING_GATE

BRANCH:
working_treating,02

FILES CREATED/UPDATED:
- governance/14_MASTER_EXTRACTION_LOGIC_UX_COVERAGE.md
- governance/00_DECISION_INDEX.md
- machine-readable/extraction_matrix.csv
- machine-readable/dsh_wlt_logic_coverage_matrix.csv
- machine-readable/control_panel_coverage_matrix.csv
- machine-readable/mobile_ux_journey_matrix.csv
- machine-readable/screen_state_coverage_matrix.csv
- machine-readable/donor_control_panel_alias_matrix.csv

MATRIX COUNTS:
- extraction_matrix:
- dsh_wlt_logic_coverage_matrix:
- control_panel_coverage_matrix:
- mobile_ux_journey_matrix:
- screen_state_coverage_matrix:
- donor_control_panel_alias_matrix:

CONTROL PANEL SECTIONS:
- partners:
- operations:
- wallet-finance:
- support:
- marketing:
- catalog:
- platform:

MOBILE APPS:
- app-client:
- app-partner:
- app-captain:
- app-field:

GATES:
- foundation gate:
- diff check:
- financial ownership check:
- idempotency check:
- object auth check:
- list performance check:
- screen state check:
- donor alias check:
- no Excel binary check:

EVIDENCE:
- evidence path:
- handoff zip:

NEXT ACTION:
Start DSH-001 Store Discovery using only matrix rows where slice_id=DSH-001 and status=READY_FOR_SLICE.
```

لا تعمل commit إلا إذا طلب المستخدم ذلك صراحة.

---

## 21) تعريف النجاح الرقمي النهائي

تعتبر المهمة ناجحة فقط إذا تحقق كل الآتي:

```text
required files missing = 0
extraction_matrix rows >= 160
dsh_wlt_logic_coverage_matrix rows >= 180
control_panel_coverage_matrix rows >= 70
mobile_ux_journey_matrix rows >= 55
screen_state_coverage_matrix rows >= 80
donor_control_panel_alias_matrix rows >= 11
all 7 control panel sections covered = PASS
all 4 mobile apps covered = PASS
required DSH/WLT logic capabilities missing = 0
DSH financial truth violations = 0
control-panel finance ownership violations = 0
money write idempotency gaps = 0
list operations without pagination/index/limit = 0
object operations without auth rule = 0
screen rows without loading/empty/error/permission/success states = 0
forbidden screen names = 0
forbidden VERIFIED/CLOSED/production claims = 0
Excel files = 0
git diff --check = PASS
foundation gate = PASS
next slice = DSH-001
```

أي نقص واحد = فشل. لا تبدأ الشرائح قبل إصلاحه.
