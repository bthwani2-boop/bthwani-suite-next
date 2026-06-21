# BTHWANI NEXT — خطة التنفيذ الرئيسية من الألف إلى الياء

**التاريخ:** 2026-06-18  
**النطاق:** إنشاء وتنفيذ `bthwani-suite-next` كمستودع جديد نظيف، مع استخدام `realtest` كمصدر مانح ومصدر أدلة فقط.  
**نوع الملف:** خطة تنفيذ واحدة شاملة قابلة للتطبيق والمراجعة.  
**المبدأ الحاكم:** لا يوجد ادعاء جاهزية أو إغلاق أو 100% قبل وجود دليل تشغيل قابل للتحقق.

---

## 0) القرار التنفيذي النهائي

القرار المعتمد:

```text
OLD REPO / realtest = DONOR + REFERENCE + EVIDENCE SOURCE
NEW REPO = CANONICAL IMPLEMENTATION TARGET
```

المستودع الحالي لا يُنسخ كما هو، ولا يُنظف إلى ما لا نهاية. يتم استخدامه كمصدر مانح مؤقت للمعرفة، التصميم، العقود، أجزاء runtime الصحيحة، والحدود المعمارية المثبتة. المستودع الجديد هو خط التنفيذ الحقيقي.

الصيغة العملية:

```text
Evidence-Gated Extraction
→ Foundation Kernel
→ Service-Owned Full-Stack Capsules
→ Docker-backed Golden Slices
→ Runtime + Visual + Contract Evidence
```

الممنوع من البداية:

```text
نسخ كامل من realtest
البدء من الصفر المطلق بلا استفادة
تصميم شاشات فقط
Backend فقط
تفعيل كل الخدمات دفعة واحدة
تشغيل كل الحراس دفعة واحدة
إدخال preview/demo/mock runtime data
إدخال fake actor IDs
تفعيل خدمة مستقبلية بلا blueprint/check/openapi
```

المعتمد:

```text
هيكل جديد نظيف
حوكمة صغيرة قابلة للتنفيذ
ui-kit مضبوط قبل الشاشات
Docker من البداية
core/identity قبل DSH/WLT
DSH/WLT boundary من البداية
شرائح full-stack حقيقية
أدلة قليلة لكن كافية
```

---

## 1) القواعد غير القابلة للتفاوض

### 1.1 لا إغلاق بلا دليل

أي مرحلة أو شريحة لا تعتبر مغلقة إلا إذا وُجدت أدلة قابلة للتفتيش:

```text
git status
git diff --check
OpenAPI validation
generated client output
backend tests
frontend typecheck
Docker compose ps
API smoke output
DB migration output
screenshot evidence عند UI
```

### 1.2 لا تفعيل بلا مالك

أي ملف أو مجلد أو endpoint أو شاشة يجب أن يملك:

```text
owner
service
surface
target path
runtime purpose
acceptance gate
rollback path
```

### 1.3 لا شاشات مستقلة

كل شاشة يجب أن تكون مرتبطة بـ:

```text
service manifest
capability-map.ts
surface-map.ts
frontend/shared/<topic>
typed client
ui-kit public exports
route/registry
screenshot evidence
```

### 1.4 لا business logic في apps

`apps/*` هي runtime shells فقط:

```text
auth/session shell
navigation/bootstrap
theme/RTL/language
service slots
runtime environment
```

ممنوع داخل `apps/*`:

```text
DSH logic
WLT logic
order state machine
payment/refund/settlement logic
local design system
mock/demo runtime data
direct fetch to services
```

### 1.5 لا financial truth خارج WLT

DSH يحفظ ويعرض فقط:

```text
paymentSessionId
paymentStatus
financialReference
settlementStatus read-only
```

WLT فقط يملك:

```text
wallet
payment
refund
settlement
payout
commission
COD
ledger
reconciliation
finance reports
audit
```

### 1.6 لا تصميم محلي قابل لإعادة الاستخدام

الشاشات تستخدم `shared/ui-kit` فقط. Tamagui مسموح داخليًا داخل `shared/ui-kit` فقط، وممنوع في services/apps مباشرة.

---

## 2) الهيكل النهائي للمستودع الجديد

```text
bthwani-suite-next/
  apps/
    app-client/
      runtime/
      shell/
      service-slots/
    app-partner/
      runtime/
      shell/
      service-slots/
    app-captain/
      runtime/
      shell/
      service-slots/
    app-field/
      runtime/
      shell/
      service-slots/
    control-panel/
      runtime/
      shell/
      service-registry/
      sections/
        system-platform/
    webapp/
      runtime/
      shell/
    website/
      runtime/
      shell/

  services/
    _template/
    dsh/
    wlt/
    knz/
    arb/
    amn/
    esf/
    mrf/
    snd/
    kwd/

  core/
    identity/
    access/
    providers/
    runtime/

  shared/
    ui-kit/
    app-shell/
    config/
    testing/

  infra/
    docker/
    data-plane/

  contracts/
    master.openapi.yaml

  tools/
    guards/
    scripts/
    registry/
      runs/

  governance/
```

القاعدة:

```text
services/<service>/ = كل ما يخص الخدمة
apps/<surface>/     = تشغيل وتجميع فقط
shared/ui-kit       = التصميم فقط
core/identity       = authentication/identity/access فقط
infra               = تشغيل Docker/data-plane فقط
governance          = قرارات وقواعد قليلة قابلة للتنفيذ
tools/guards        = تحقق برمجي فقط، لا سياسة جديدة
```

---

## 3) شكل كل خدمة: Service Full-Stack Capsule

كل خدمة يجب أن تتبع القالب التالي:

```text
services/<service>/
  SERVICE_BLUEPRINT.md
  service.manifest.ts
  capability-map.ts
  surface-map.ts
  runtime-map.ts

  capabilities/
    <capability>/
      capability.ts
      acceptance-gate.ts
      evidence-plan.md

  contracts/
    <service>.openapi.yaml
    permissions.ts
    events/
    schemas/

  domain/
    <topic>/
      <topic>.model.ts
      <topic>.policy.ts
      <topic>.errors.ts

  backend/
    cmd/
    internal/
    routes/
    handlers/
    repositories/
    middleware/

  database/
    migrations/
    seeds/local/
    indexes/

  clients/
    generated/
    adapters/

  frontend/
    shared/
      _kernel/
      <topic>/
        <topic>.api.ts
        <topic>.types.ts
        <topic>.view-model.ts
        <topic>.states.ts
        <topic>.permissions.ts
        <topic>.formatters.ts
        index.ts

    app-client/
    app-partner/
    app-captain/
    app-field/
    control-panel/
    webapp/
    website/

  providers/
    requirements.ts
    ports/
    adapters/

  tests/
    contract/
    backend/
    integration/
    frontend/
    slice/

  guards/
  evidence/
```

---

## 4) مراحل التنفيذ الكاملة

## المرحلة 0 — تجميد القرار وتجهيز مسار العمل

### الهدف
تثبيت أن المستودع القديم مانح فقط، والجديد هو الهدف. لا كتابة كود قبل القرار.

### الملفات المطلوبة

```text
governance/00_DECISION_INDEX.md
governance/01_REPO_BOUNDARIES.md
governance/99_LEGACY_EXTRACTION_LEDGER.md
```

### المطلوب كتابته

```text
OLD realtest = donor/reference/evidence source
NEW bthwani-suite-next = canonical implementation target
No direct runtime dependency from new repo to old repo
No blind copy
No 100% claim without evidence
```

### أوامر البداية

```powershell
Set-Location -LiteralPath "C:\bthwani-suite"
git branch --show-current
git rev-parse --short HEAD
git --no-pager status --short
git ls-files --others --exclude-standard
```

### مخرجات القبول

```text
تم تثبيت الفرع donor
تم تثبيت أن old repo ليس runtime dependency للجديد
تم إنشاء ملف قرار واضح
لا يوجد تعديل في القديم أثناء هذه المرحلة
```

### ممنوع

```text
نسخ ملفات
إنشاء شاشات
تشغيل refactor
تحريك dsh/frontend أو wlt/frontend
```

---

## المرحلة 1 — إنشاء Skeleton للمستودع الجديد

### الهدف
إنشاء هيكل نظيف فقط، بدون ميزات.

### الأوامر

```powershell
New-Item -ItemType Directory -Force -Path "C:\bthwani-suite-next"
Set-Location -LiteralPath "C:\bthwani-suite-next"
git init
```

### الشجرة المطلوبة

```text
apps/
services/
core/
shared/
infra/
contracts/
tools/
governance/
```

### ملفات الجذر

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
.gitignore
README.md
```

### قبول المرحلة

```text
كل المسارات الأساسية موجودة
لا توجد خدمات مفعلة عشوائيًا
لا توجد شاشات فعلية
لا توجد بيانات demo/mock
لا توجد dependencies كثيرة
```

---

## المرحلة 2 — Toolchain Lock

### الهدف
قفل الأدوات قبل كتابة المنتج.

### ملف القرار

```text
governance/10_TOOLCHAIN_VERSION_LOCK.md
```

### القاعدة
لا نستخدم `latest` في `package.json` بعد التثبيت. يتم التحقق من أحدث stable compatible قبل القفل.

### الأدوات المطلوبة

```text
Node.js LTS compatible
pnpm pinned
TypeScript pinned or fallback documented
Expo SDK pinned
React / React Native pinned
Next pinned
Go pinned
PostgreSQL pinned
Docker Desktop stable patched
Playwright pinned
Nx pinned if used
Spectral/openapi-typescript pinned
```

### أوامر تحقق أولية

```powershell
node --version
pnpm --version
go version
docker --version
docker compose version
```

### قبول المرحلة

```text
packageManager مثبت
engines مثبتة
لا latest مفتوح
نسخة Go موحدة للخدمات الجديدة
PostgreSQL image محددة
```

### فشل المرحلة

```text
وجود latest في dependencies
اختلاف Go بين الخدمات
عدم وجود packageManager
عدم وجود pnpm-workspace.yaml
```

---

## المرحلة 3 — حوكمة مصغرة قابلة للتنفيذ

### الهدف
استبدال تضخم governance الحالي بمجموعة صغيرة حاكمة.

### ملفات الحوكمة النهائية

```text
governance/
  00_DECISION_INDEX.md
  01_REPO_BOUNDARIES.md
  02_SERVICES_AND_SURFACES.md
  03_UI_KIT_AND_BRAND_LOCK.md
  04_API_RUNTIME_BINDING.md
  05_DOCKER_AND_DATA_PLANE.md
  06_EVIDENCE_AND_GATES.md
  07_SECURITY_AND_SECRETS.md
  08_CLEANUP_AND_DEPRECATION.md
  09_SLICE_OPERATING_MODEL.md
  10_TOOLCHAIN_VERSION_LOCK.md
  99_LEGACY_EXTRACTION_LEDGER.md
```

### قواعد صارمة

```text
لا canonical governance خارج index
لا TBD فضفاض
لا policy داخل tools/guards
لا ملف governance بلا acceptance condition
لا نسخ history/legacy ledger الضخم من القديم
```

### حالات بديلة عن TBD

```text
NOT_APPROVED_YET
BLOCKED_NEEDS_BLUEPRINT
BLOCKED_NEEDS_API_CONTRACT
BLOCKED_NEEDS_RUNTIME_EVIDENCE
OUT_OF_SCOPE_FOR_THIS_SLICE
```

---

## المرحلة 4 — Guard Foundation

### الهدف
إنشاء حراس قليلة وموجهة، لا كتالوج ضخم.

### الحراس الأولية

```text
tools/guards/guard-manifest.json

tools/guards/no-direct-tamagui-outside-ui-kit.mjs
tools/guards/no-ui-kit-deep-imports.mjs
tools/guards/no-local-design-system.mjs
tools/guards/no-raw-hex-outside-ui-kit.mjs
tools/guards/no-direct-fetch-in-screen.mjs
tools/guards/no-preview-demo-mock-runtime.mjs
tools/guards/no-memory-repo-in-slice-runtime.mjs
tools/guards/no-financial-mutation-outside-wlt.mjs
tools/guards/no-broken-imports.mjs
tools/guards/service-fullstack-linkage.mjs
```

### سكربتات التشغيل

```text
tools/scripts/run-foundation-gate.ps1
tools/scripts/run-slice-gate.ps1
```

### القاعدة

```text
لا all guards افتراضيًا
لا full lint افتراضيًا
لا ZIP افتراضيًا
الحارس يتحقق فقط ولا يخترع سياسة
```

---

## المرحلة 5 — Docker & Data Plane Foundation

### الهدف
تجهيز Docker كبيئة تشغيل حقيقية للشرائح.

### الهيكل

```text
infra/
  docker/
    compose.local.yml
    compose.slice.yml
    compose.full.yml
    env/
      local.env.example
      slice.env.example
    scripts/
      up-local.ps1
      down-local.ps1
      reset-local.ps1
      smoke-local.ps1

  data-plane/
    postgres/
      init/
      roles/
      extensions/
      backup/
      restore/
    minio/
      buckets/
      policies/
    redis/
      config/
```

### قواعد Docker

```text
infra/docker = orchestration فقط
services/<service>/database = migrations/schema/seeds الخاصة بالخدمة
core/identity ليس داخل DSH
MinIO required فقط في media slices
Redis لا يعمل حتى توجد حاجة queue/cache
Mongo لا ينتقل للجديد بلا قرار مثبت
```

### قواعد backend runtime

```text
no memory repo in local/slice/realtest
no CORS * in slice/realtest/live
no http.ListenAndServe direct without timeouts
health/readiness لكل خدمة
context timeout لكل DB/provider call
```

### قبول المرحلة

```text
compose.slice.yml موجود
postgres healthcheck موجود
identity profile موجود أو مخطط
DSH profile موجود أو مخطط
WLT profile موجود أو مخطط
no Mongo
no Redis active unless justified
```

---

## المرحلة 6 — Core Identity

### الهدف
تجهيز authentication/identity/access خارج services.

### المسار

```text
core/identity/
  contracts/
    auth.openapi.yaml
  backend/
  domain/
  database/
    migrations/
    seeds/local/
  clients/
  guards/
```

### ما يملكه core/identity

```text
login
logout
refresh
session verification
token introspection
actor identity
roles
permissions
surface access
service access
```

### ما لا يملكه

```text
orders
catalog
wallets
payments
settlements
bookings
delivery
provider business logic
```

### عقد الهوية الموحد

```text
subject
roles
permissions[]
authState
surfaceAccess
serviceAccess
```

### قبول المرحلة

```text
auth.openapi.yaml في core/identity وليس services/auth
ActorIdentity contract موجود
لا fake IDs
لا undefined إلى DB
frontend missing actor = blocked state لا API call
```

---

## المرحلة 7 — Contracts Foundation

### الهدف
تثبيت العقود قبل التنفيذ.

### المسارات

```text
contracts/master.openapi.yaml
core/identity/contracts/auth.openapi.yaml
services/dsh/contracts/dsh.openapi.yaml
services/wlt/contracts/wlt.openapi.yaml
```

### دور master.openapi.yaml

```text
index only
paths: {}
no generated master client
no runtime dependency
```

### حالات العقود

```text
RESERVED
CONTRACT_DRAFT
CONTRACT_ACTIVE
IMPLEMENTED
RUNTIME_VERIFIED
DEPRECATED
```

### قبول المرحلة

```text
master لا يحتوي endpoints
identity تحت core
service openapi تحت service
لا خدمة reserved تدخل client generation
OpenAPI lint يعمل
```

---

## المرحلة 8 — UI Kit Foundation

### الهدف
ضبط التصميم المركزي قبل الشاشات.

### المسار

```text
shared/ui-kit/
  src/
    tokens/
    theme/
    typography/
    spacing/
    radius/
    elevation/
    icons/
    primitives/
    components/
    states/
    layouts/
    archetypes/
    index.ts
```

### ألوان الهوية

```text
brandAction     = #FF500D
surfaceBase     = #FFFFFF
brandStructure  = #0A2F5C
```

### المكونات الأولية

```text
BthScreen
BthText
BthButton
BthIconButton
BthCard
BthSurface
BthHeader
BthListItem
BthBadge
BthChip
BthTextField
BthStateView
BthLoadingState
BthEmptyState
BthErrorState
BthDataTable
BthToolbar
BthFilterBar
BthTabs
BthActionBar
BthDialog
BthSheet
```

### قواعد التصميم

```text
Tamagui inside ui-kit only
no raw hex outside ui-kit
no local design system
no reusable visual component outside ui-kit
no fontFamily outside ui-kit
no random shadow/radius/spacing
```

### تقنية الحفاظ على التصميم الحالي

```text
Visual Parity Refactor
```

أي:

```text
تصوير الشاشة القديمة
استخراج local styles
تصنيفها
تحويلها إلى tokens/components
بناء نفس الشكل باستخدام ui-kit
مقارنة before/after
قبول أو رفض الفرق
```

---

## المرحلة 9 — Interface Blueprints

### الهدف
توحيد قوالب التطبيقات ولوحة التحكم قبل الشاشات.

### ملفات مطلوبة

```text
governance/11_INTERFACE_BLUEPRINTS.md
governance/12_CONTROL_PANEL_SECTION_BLUEPRINTS.md
```

### app-shell

```text
shared/app-shell/
  mobile/
    MobileAppShell.tsx
    MobileTabShell.tsx
    MobileStackShell.tsx
    MobileScreenFrame.tsx
  control-panel/
    ControlPanelShell.tsx
    ControlPanelSectionLayout.tsx
    ControlPanelPageFrame.tsx
    ControlPanelDataPage.tsx
    ControlPanelDetailPage.tsx
  navigation/
  rtl/
  locale/
  auth-session/
```

### Control Panel sections

```text
dashboard
operations
support
finance
catalogs
partners
marketing
system-platform
administration
hr
```

### قوالب الصفحات

```text
ControlPanelOverviewPage
ControlPanelDataTablePage
ControlPanelQueuePage
ControlPanelDetailPage
ControlPanelEditorPage
ControlPanelReviewPage
ControlPanelMetricsPage
ControlPanelTimelinePage
ControlPanelSettingsPage
```

---

## المرحلة 10 — Service Full-Stack Template

### الهدف
تجهيز قالب موحد للخدمات قبل تفعيل الخدمات.

### المطلوب

```text
services/_template/
  SERVICE_BLUEPRINT.md
  service.manifest.ts
  capability-map.ts
  surface-map.ts
  runtime-map.ts
  capabilities/_template/
  contracts/
  domain/
  backend/
  database/
  clients/
  frontend/shared/_kernel/
  frontend/shared/_topic-template/
  tests/
  guards/
  evidence/
```

### قبول المرحلة

```text
القالب موجود
لا يحتوي business feature حقيقية
يمنع screen بدون capability
يمنع surface بدون shared topic
يمنع service بدون manifest
```

---

## المرحلة 11 — Extraction Intelligence

### الهدف
تحليل القديم لاستخراج الصحيح فقط.

### ملف العمل

```text
machine-readable/extraction_matrix.csv
```

### أعمدة المصفوفة

```text
source_path
target_path
owner
service
surface
layer
imports
runtime_data
api_binding
db_dependency
auth_dependency
ui_kit_compliance
test_coverage
evidence
decision
action
risk
rollback
```

### قرارات الاستخراج

```text
ADOPT_AS_IS
ADAPT_NORMALIZE
REWRITE_FROM_SPEC
REFERENCE_ONLY
REJECT
```

### يرفض مباشرة

```text
preview/demo/mock runtime
fake actor IDs
screen-shaped API
financial mutation outside WLT
local design system
deep ui-kit imports
direct Tamagui outside ui-kit
memory repo runtime
CORS wildcard
old docs as truth
closure claims without evidence
```

---

## المرحلة 12 — Screen Inventory & Naming Normalization

### الهدف
إعداد كل الشاشات قبل النقل، بدون نقل فعلي جماعي.

### قواعد التسمية

```text
services/<service>/frontend/<surface>/<capability>/<ScreenName>Screen.tsx
services/<service>/frontend/<surface>/<capability>/<ScreenName>Route.tsx
```

### أمثلة صحيحة

```text
services/dsh/frontend/app-client/store-discovery/StoreDiscoveryScreen.tsx
services/dsh/frontend/control-panel/stores/StoreManagementScreen.tsx
services/dsh/frontend/app-partner/orders/PartnerOrdersScreen.tsx
services/dsh/frontend/app-captain/tasks/CaptainTasksScreen.tsx
```

### ممنوع

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

### Screen Acceptance Gate

```text
اسم صحيح
مسار صحيح
service owner واضح
surface واضح
مربوطة capability.ts
مربوطة surface-map.ts
تستخدم frontend/shared/<topic>
تستخدم @bthwani/ui-kit فقط
لا direct Tamagui
لا mock/demo/preview data
لا direct fetch
loading state
empty state
error state
permission state
route/registry
TypeScript pass
runtime render
screenshot evidence
```

---

## المرحلة 13 — Performance & Runtime Baseline

### الهدف
منع بناء backend ثقيل أو مستهلك للسيرفر.

### قواعد backend

```text
كل خدمة runtime منفصل عند التشغيل
server timeouts إلزامية
context timeout لكل DB/provider call
health/readiness endpoints
no unbounded goroutines
rate limit عند الحاجة
structured logs
```

### قواعد DB

```text
pagination لكل list endpoint
limit افتراضي وصارم
indexes لكل filter/sort/foreign key
no N+1 queries
read models للقوائم الثقيلة
```

### قواعد providers

```text
timeout
retry محدود
queue للعمليات البطيئة
idempotency key
circuit breaker
audit log
provider health
controlled failover
```

### أهداف قياس أولية

```text
p95 API reads < 300ms
p95 writes < 700ms
DB basic query < 100ms
CPU تحت load test <= 70%
RAM ثابتة بلا leak بعد 30 دقيقة
error rate < 1%
```

هذه أهداف قبول تُقاس، وليست ادعاءات.

---

## المرحلة 14 — Foundation Gate

### الهدف
التأكد أن الأساس قابل للبناء قبل أول شريحة.

### أمر التشغيل

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
.\tools\scripts\run-foundation-gate.ps1
```

### يجب أن يفحص

```text
repo tree
packageManager/engines
pnpm workspace
minimal governance
contracts/master.openapi.yaml
core/identity/auth.openapi.yaml
ui-kit public exports
brand color lock
no direct Tamagui outside ui-kit
no local design system
Docker compose config
no preview/demo/mock runtime
service template shape
```

### قبول المرحلة

```text
FOUNDATION_GATE_PASS
```

ولا يعني هذا أن المنتج جاهز، فقط أن الأساس قابل لبدء الشرائح.

---

## المرحلة 15 — أول شريحة تشغيلية: DSH-001 Store Discovery

### الهدف
إثبات أول vertical slice حقيقية بدون تعقيد مالي.

### نطاق الشريحة

```text
Identity session read
DSH stores table
local seed في Postgres
GET /dsh/stores
GET /dsh/stores/{storeId}
generated DSH client
frontend/shared/store
app-client StoreDiscoveryScreen
control-panel StoreManagementScreen
Docker smoke
screenshot evidence
```

### الملفات

```text
services/dsh/capabilities/store-discovery/capability.ts
services/dsh/domain/store/store.model.ts
services/dsh/domain/store/store.policy.ts
services/dsh/contracts/dsh.openapi.yaml
services/dsh/database/migrations/001_create_stores.sql
services/dsh/database/seeds/local/001_seed_local_stores.sql
services/dsh/backend/internal/store/
services/dsh/backend/routes/store.routes.go
services/dsh/clients/generated/
services/dsh/frontend/shared/store/
services/dsh/frontend/app-client/store-discovery/StoreDiscoveryScreen.tsx
services/dsh/frontend/control-panel/stores/StoreManagementScreen.tsx
```

### Docker profile

```text
dsh-001
```

### أوامر

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
.\infra\docker\scripts\up-local.ps1 -Slice dsh-001
.\infra\docker\scripts\smoke-local.ps1 -Slice dsh-001
.\tools\scripts\run-slice-gate.ps1 -Slice dsh-001
```

### قبول الشريحة

```text
OpenAPI lint pass
generated client pass
DB migration pass
seed local applied only in local
API smoke returns real Postgres data
app-client renders stores via API
control-panel renders stores via API
no mock/frontend array
no direct fetch in screen
no Tamagui outside ui-kit
screenshot evidence exists
```

---

## المرحلة 16 — DSH-002 Storefront + Catalog

### الهدف
توسيع DSH بنفس النمط، لا إنشاء نظام جديد.

### النطاق

```text
categories
products
store catalog
media references
MinIO إذا احتوت الشريحة صورًا
app-client storefront
control-panel catalog list/editor shell
```

### قبول خاص

```text
MinIO required إذا media/upload/image داخل النطاق
لا fake public URL
لا base64 runtime
لا fixture static server
pagination للمنتجات
indexes على store/category/status
```

---

## المرحلة 17 — DSH-003 Cart + Serviceability

### الهدف
إضافة أول mutations في DSH بدون دخول الدفع.

### النطاق

```text
cart
cart item
serviceability
address/zone binding
cart policies
POST /dsh/carts
POST /dsh/carts/{cartId}/items
GET /dsh/carts/{cartId}
```

### قبول خاص

```text
idempotency للعمليات الحساسة عند الحاجة
no checkout/payment logic
no WLT access yet except none/read-only if justified
```

---

## المرحلة 18 — DSH-004 Checkout Intent

### الهدف
بناء checkout intent shell فقط، لا payment truth.

### النطاق

```text
checkout intent
order draft
price snapshot operational فقط
WLT payment session request لاحقًا
```

### ممنوع

```text
wallet balance
payment confirmation
refund
settlement
ledger
commission finalization
```

---

## المرحلة 19 — WLT-001 Payment Session

### الهدف
إنشاء أصغر WLT صحيح كـ Financial Platform Service.

### النطاق

```text
payment session
payment status
transaction reference
minimal ledger pending/posted
refund request shell
control-panel finance read model minimal
```

### علاقة DSH/WLT

```text
DSH → WLT create payment session
WLT → payment provider/local simulator
WLT → confirms/fails
WLT → DSH status/reference
DSH updates order paymentStatus only
```

---

---
---

# تحديث شامل — 2026-06-21
## DSH/WLT DONOR EXTRACTION AND CLOSURE PLAN

> **الفرع:** starting-implementing-slices @ a55dd95  
> **المانح:** realtest @ e5080831  
> **الحالة:** تحليل مكتمل — مستعد لتنفيذ الشرائح

---

## ملخص رقمي (حالة 2026-06-21)

| المكوّن | الحالة |
|---------|--------|
| DSH-001 Store Discovery (app-client) | **RUNTIME_VERIFIED** ✓ |
| DSH-001 Store Discovery (control-panel) | **NOT_STARTED** ✗ |
| DSH-002 Home Discovery (app-client) | **RUNTIME_VERIFIED** ✓ |
| DSH-002 Home Discovery (control-panel) | **NOT_STARTED** ✗ |
| DSH-003 Catalog | **NOT_STARTED** ✗ |
| DSH-004 Cart + Serviceability | **NOT_STARTED** ✗ |
| DSH-005 Checkout Intent + WLT Boundary | **NOT_STARTED** ✗ |
| DSH-006 Orders + Partner Acceptance | **NOT_STARTED** ✗ |
| DSH-007 Captain + Delivery | **NOT_STARTED** ✗ |
| DSH-008 Field Readiness | **NOT_STARTED** ✗ |
| DSH-009 Support + Operations | **NOT_STARTED** ✗ |
| DSH-010 Finance Visibility | **NOT_STARTED** ✗ |
| WLT Runtime | **CONTRACT_ONLY** ✗ |
| app-partner | **STUB** ✗ |
| app-captain | **STUB** ✗ |
| app-field | **STUB** ✗ |
| control-panel src/ | **EMPTY** ✗ |
| Pre-slice gates | **ALL PASS** ✓ |
| Docker runtime | **RUNNING** ✓ |
| DSH API smoke | **PASS** ✓ |
| Tests | **7 files — real** ✓ |
| Financial guard | **0 violations** ✓ |
| Old ports guard | **CLEAN** ✓ |

**الشرائح المكتملة:** 2 من 11 (DSH-001 + DSH-002 في app-client فقط)  
**الأسطح بتغطية كاملة:** 0 من 5 (لا يوجد سطح واحد مغلق بالكامل)

---

## ملفات machine-readable التي تم إنشاؤها

```text
C:\bthwani-suite-next\machine-readable\dsh-wlt\
  ├── dsh_wlt_execution_master_reference.json   ← المرجع الأعلى (المصدر الحقيقي)
  ├── dsh_wlt_execution_master_reference.md     ← شرح بشري للمرجع
  ├── dsh_wlt_master_plan.md                   ← الخطة التنفيذية
  ├── dsh_wlt_slice_master_matrix.json         ← تفاصيل 11 شريحة كاملة
  ├── dsh_wlt_slice_execution_matrix.csv       ← جدول التتبع
  ├── dsh_wlt_extraction_matrix.csv            ← قرارات المانح (22 عنصرًا)
  ├── dsh_wlt_gates.json                       ← 11 بوابة قبول
  ├── dsh_wlt_status.json                      ← الحالة الرقمية الحالية
  ├── dsh_wlt_runtime_ports.json              ← المنافذ الكانونية
  ├── dsh_wlt_docker_runtime.json             ← تكوين Docker
  └── README.md                               ← دليل الاستخدام
```

---

## نتائج تحليل المانح

### الإيجابيات (ما هو نظيف في المانح):
- ✓ **DSH backend:** 32 migration، postgres repos نظيفة، handlers مكتملة
- ✓ **WLT backend:** 7 migrations، postgres repo نظيف
- ✓ **الحد المالي:** migration 025 حذف financial amount columns من DSH
- ✓ **dsh-wlt-boundary.ts:** يُعلن `mutation: forbidden` و `dshRole: view-only`
- ✓ **Frontend screens:** نظيفة، typed clients، لا direct fetch، لا Tamagui مباشر
- ✓ **Fake actor IDs:** محذوفة في HEAD commit (e5080831)
- ✓ **HTTP timeouts:** DSH 5s، WLT 10s — موجودة

### ما يحتاج تطبيعًا قبل النقل:
- ⚠️ **CORS wildcard** — 14 DSH handler + WLT main.go → يجب استبدال `*` بـ explicit origins
- ⚠️ **Old Docker ports** — DSH internal 8080، WLT internal 8083 → يجب remapping إلى 58080
- ⚠️ **wlt-dsh-client.ts** → hardcoded `http://localhost:8083` → يجب استبداله بـ env var
- ⚠️ **DshCaptainFinanceScreen.tsx** → نص عربي "في وضع preview فقط" → يجب إزالته

### ما يُرفض:
- ✗ **memory_repository.go (DSH)** → NOT thread-safe — REJECT_RUNTIME_RISK
- ✗ **memory_checkout_repository.go (DSH)** → REJECT_RUNTIME_RISK
- ✗ **memory_repository.go (WLT)** → REJECT_RUNTIME_RISK
- ✗ **wlt/backend/.data/wlt_dsh.db** → SQLite dev artifact — REJECT_NOISE

---

## الخطوة التالية الفورية

```
أولويات مرتبة:
1. إغلاق DSH-001 في control-panel (StoresListPage + StoreDetailAdminPage)
2. إغلاق DSH-002 في control-panel (HomeDiscoveryAdminPage + BannerManagement)
3. بعد اكتمال control-panel لـ DSH-001 + DSH-002 → طلب موافقة DSH-003
```

### أوامر التحقق قبل البدء:

```powershell
Set-Location "C:\bthwani-suite-next"
git --no-pager status --short
git diff --check
pnpm run foundation:gate
pnpm contracts:lint
pnpm run guard:matrix:v3
pnpm run guard:no-financial-mutation-outside-wlt
pnpm runtime:all
pnpm runtime:status
Invoke-RestMethod "http://localhost:58080/dsh/health"
Invoke-RestMethod "http://localhost:58080/dsh/stores?limit=10&offset=0"
```

### أوامر تشغيل control-panel:

```powershell
$env:NEXT_PUBLIC_DSH_API_BASE_URL = "http://localhost:58080"
pnpm --dir apps/control-panel/runtime dev --port 13000
```

---

## المنافذ الكانونية (لا تتغير)

| الخدمة | المنفذ |
|--------|--------|
| DSH API | 58080 |
| Postgres | 55432 |
| MinIO API | 59000 |
| MinIO Console | 59001 |
| app-client | 18101 |
| app-partner | 18102 |
| app-captain | 18103 |
| app-field | 18104 |
| control-panel | 13000 |

**محظور:** 8080/8081/8082/8083/8084/3000 كـ host ports

---

## قاعدة الإغلاق — لا استثناءات

```text
لا يُعلَن DSH مغلقًا إلا إذا تحقق كل التالي:
  ✓ كل شريحة DSH-001 إلى DSH-010 مكتملة أو مستبعدة بقرار موثق
  ✓ كل سطح من 5 أسطح يعمل حيًا
  ✓ WLT boundary مثبت (guard = 0 violations)
  ✓ لا old ports
  ✓ لا mock/demo/preview runtime
  ✓ لا memory repo runtime
  ✓ Docker يشغل الخدمات الحقيقية
  ✓ tests > 0 وحقيقية
  ✓ screenshots لكل سطح متأثر
  ✓ foundation:gate PASS
  ✓ slice gates PASS
```

### قبول خاص

```text
idempotency key لكل money write
audit log
no DSH financial mutation
no DSH write into WLT DB
no WLT write into DSH DB
communication via API/event only
```

---

## المرحلة 20 — DSH/WLT Integration Slice

### الهدف
ربط checkout intent مع payment session دون خلط الملكية.

### النطاق

```text
POST /dsh/checkout-intents
POST /wlt/payment-sessions
GET /wlt/payment-sessions/{id}
callback/event payment confirmed
DSH order payment state update
```

### قبول

```text
DSH holds status/reference only
WLT owns transaction/ledger
smoke test end-to-end
failure path tested
provider timeout simulated
```

---

## المرحلة 21 — Partner / Captain / Field Activation

### الهدف
عدم تفعيل surfaces غير جاهزة قبل وجود capability.

### app-partner

```text
DSH orders/readiness
ARB لاحقًا عند أول ARB slice
```

### app-captain

```text
DSH delivery tasks
AMN لاحقًا عند أول AMN slice
```

### app-field

```text
DSH field onboarding/readiness
ARB لاحقًا عند أول ARB field slice
```

### قبول

```text
surface appears only if mapped in surface-map.ts
service slot lazy loaded
no unused services loaded at app startup
```

---

## المرحلة 22 — Future Services Activation

الخدمات المحجوزة:

```text
knz
arb
amn
esf
mrf
snd
kwd
```

### لا تفعّل خدمة مستقبلية إلا إذا توفر

```text
SERVICE_BLUEPRINT.md
service.manifest.ts
contracts/<service>.openapi.yaml
package/check script إذا دخلت workspace
first capability-map entry
first slice plan
Docker profile إذا لها backend
no preview/demo runtime
```

### قاعدة الأسطح

```text
app-client = كل الخدمات حسب الحاجة lazy
app-partner = dsh + arb
app-captain = dsh + amn
app-field = dsh + arb
control-panel = كل الخدمات عبر service registry
webapp/website = فقط الخدمات المصرح لها
```

---

## المرحلة 23 — CI / Gates

### الهدف
تحويل القواعد إلى مسار تحقق مستمر.

### Gates حسب التغيير

```text
UI change:
  design guards
  screen gate
  visual evidence

API change:
  OpenAPI lint
  generated types
  no direct fetch
  contract tests

Backend change:
  go test
  migration check
  runtime smoke
  timeout/CORS checks

Finance change:
  WLT ownership guard
  idempotency/audit checks
  DSH no mutation check

Docker change:
  compose config
  healthcheck
  smoke
```

### ممنوع

```text
full workspace lint افتراضيًا
all guards افتراضيًا
ZIP evidence افتراضيًا
```

---

## المرحلة 24 — Evidence Registry

### الهدف
أدلة قليلة لكنها كافية.

### المسار

```text
tools/registry/runs/<SESSION_ID>/
```

### لكل شريحة

```text
README.md
git-status.txt
git-diff-check.txt
openapi-lint.txt
generated-client.txt
backend-tests.txt
docker-ps.txt
api-smoke.txt
screenshots/
```

### لا ZIP إلا عند الحاجة

```text
CreateZip = false by default
```

---

## المرحلة 25 — Security & Secrets

### قواعد

```text
no secrets committed
.env.example فقط
real secrets خارج Git
local tokens موسومة LOCAL_ONLY
no production-like fake actor
no provider secret hardcoded
```

### Auth

```text
Bearer token/session هو المصدر
X-Client-Id dev-only وموسوم
frontend missing actor = blocked state
DB subject NOT NULL
```

---

## المرحلة 26 — Release / Store Gate لاحقًا

لا يوجد Store action الآن.

قبل أي AAB/TestFlight/Play Internal Testing يجب وجود:

```text
Multi-Surface Pre-Store Readiness Gate
app-client evidence
app-partner evidence
app-captain evidence
app-field evidence
control-panel evidence
backend smoke
payment smoke إذا في النطاق
no preview/demo/mock runtime
```

---

## 5) ترتيب التنفيذ المختصر

```text
0. قرار رسمي
1. Skeleton repo
2. Toolchain lock
3. Minimal governance
4. Minimal guards
5. Docker/data-plane foundation
6. core/identity
7. contracts/master + auth
8. ui-kit foundation
9. app-shell + interface blueprints
10. service template
11. extraction matrix
12. screen inventory
13. performance baseline
14. foundation gate
15. DSH-001 Store Discovery
16. DSH-002 Catalog
17. DSH-003 Cart
18. DSH-004 Checkout Intent
19. WLT-001 Payment Session
20. DSH/WLT payment integration
21. partner/captain/field slices
22. future services activation
23. CI gates
24. evidence registry
25. security/secrets
26. pre-store gate later
```

---

## 6) أمر العمل اليومي القياسي

كل جلسة تنفيذ يجب أن تبدأ بـ:

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"
git branch --show-current
git rev-parse --short HEAD
git --no-pager status --short
```

ثم تحديد:

```text
Slice ID
Service
Capability
Surface(s)
Expected files
Gates
Evidence path
Rollback
```

ثم التنفيذ.

كل جلسة تنتهي بـ:

```powershell
git diff --check
git --no-pager status --short
.\tools\scripts\run-slice-gate.ps1 -Slice <SLICE_ID>
```

---

## 7) شروط منع الانتقال للمرحلة التالية

لا تنتقل إذا وجد:

```text
untracked غير مفسر
failing gate
missing screenshot for UI
OpenAPI غير مطابق للـ client
screen direct fetch
screen local mock data
financial mutation outside WLT
memory repo في runtime
CORS wildcard
server بلا timeouts
service غير مذكورة في manifest
surface غير مذكور في surface-map
capability بلا evidence-plan
```

---

## 8) خلاصة التنفيذ

هذه الخطة لا تعتمد على الثقة أو الانطباع. تعتمد على:

```text
قرار واضح
هيكل واضح
قواعد قليلة
حراس موجهة
Docker runtime
OpenAPI contracts
Service-owned full-stack capsules
UI kit قبل الشاشات
frontend/shared داخل كل خدمة
شرائح صغيرة
أدلة قبل الإغلاق
```

الهدف العملي ليس قول “100%” مسبقًا، بل إنشاء نظام يجعل كل ادعاء 100% قابلًا للقياس:

```text
PASS = دليل
FAIL = إصلاح
BLOCKED = نقص محدد بسبب ودليل وخطوة معالجة
```

