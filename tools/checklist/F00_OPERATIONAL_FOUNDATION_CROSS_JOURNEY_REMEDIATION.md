القرار التنفيذي: **نعم، نوقف رحلة الطلب الآن**، وننشئ قبلها **رحلة أساس تنفيذية** لا تشخّص فقط، بل تعالج جذور الخلل العابرة لكل الرحلات. الخطة السابقة كانت صحيحة في الاتجاه، لكنها ناقصة لأنها لم تحوّل كل gap إلى **ملف + تعديل مطلوب + أداة إثبات + معيار إغلاق**. الملف المرفق يؤكد نفس نقطة الضعف: الخطة السابقة بقيت عالية المستوى وتحتاج تحويلًا إلى مهام معالجة دقيقة. 

اسم الرحلة التي يجب تنفيذها أولًا:

```text
F00_OPERATIONAL_FOUNDATION_CROSS_JOURNEY_REMEDIATION
```

هدفها:

```text
إزالة أو تصنيف كل العيوب العابرة للرحلات قبل إنشاء أي Execution-Ready Package لرحلة الطلب أو غيرها.
```

## لماذا هذا إلزامي

المصنع الحالي نفسه يشترط تشغيل inventories وتصنيف كل surface/section/tab/screen/route/API/database/runtime/CI قبل بدء الرحلات.  لكن مولد الـ surface الحالي يعتمد على مؤشرات regex مثل `fetch`, `process.env`, `API_BASE`, وكلمات مثل `commission`, `settlement`, `refund`, `policy`, `SLA`, `provider` لاكتشاف direct API وbusiness logic. هذا يعني أن مخرجاته **تشخيصية أولية** وليست إثباتًا نهائيًا.

كذلك مولد الـ gap ledger يضع gaps افتراضيًا كـ `BLOCKED_NEEDS_EVIDENCE` أو `FIX_REQUIRED`، ويترك owner غالبًا `unassigned` حتى تتم المعالجة.  لذلك لا يجوز استخدامه وحده لإعلان “جاهز 100%”. يجب تحويل مخرجاته إلى قرارات تنفيذية مثبتة.

---

# Backlog التنفيذ الدقيق

## F00-T00 — قفل الحقيقة قبل أي تعديل

**الهدف:** منع العمل على HEAD قديم أو diagnostics قديمة.

**ينفذ:**

```powershell
Set-Location -LiteralPath "C:\bthwani-suite-next"

git fetch origin --prune
git branch --show-current
git rev-parse HEAD
git rev-parse origin/journy
git status --short
git --no-pager diff --check
```

**شرط الإغلاق:**

```text
PASS فقط إذا:
- الفرع المحلي هو المطلوب.
- HEAD المحلي يساوي origin/journy.
- git status فارغ.
- diff --check يمر.
```

**إذا فشل:**

```text
STOP.
لا تشخص ولا تعدل.
إما pull/rebase أو resolve divergence أولًا.
```

---

## F00-T01 — إصلاح محرك التشخيص نفسه

**المشكلة:** لا يجوز أن تنتج أدوات التشخيص gaps غير قابلة للتنفيذ مثل `undefined command` أو failures غير مصنفة. هذا يلوّث كل الرحلات.

**الملفات المستهدفة:**

```text
tools/scripts/generate-operational-toolchain-inventory.mjs
tools/scripts/generate-operational-surface-inventory.mjs
tools/scripts/generate-operational-journey-inventory.mjs
tools/scripts/generate-operational-gap-ledger.mjs
tools/guards/operational-journey-template-factory-gate.mjs
```

**التعديل المطلوب:**

```text
1. كل command في أي report يجب أن يحتوي:
   - id
   - command
   - tool
   - expected_exit_code
   - actual_exit_code
   - blocking
   - classification
   - log_path
   - remediation_hint

2. ممنوع ظهور:
   - undefined
   - unknown command
   - empty verification
   - empty owner
   - empty required_action

3. أي أداة غير موجودة يجب أن تصنف:
   BLOCKED_NEEDS_TOOL

4. أي أداة فشلت وهي موجودة يجب أن تصنف:
   FIX_REQUIRED

5. أي runtime مطلوب وغير شغال يجب أن يصنف:
   BLOCKED_NEEDS_RUNTIME

6. أي false positive يجب أن يأخذ:
   FALSE_POSITIVE_WITH_PROOF
```

**الأوامر:**

```powershell
pnpm run diagnostics:operational:toolchain
pnpm run diagnostics:operational:surfaces
pnpm run diagnostics:operational:inventory
pnpm run diagnostics:operational:gaps
pnpm run guard:operational-journey-factory
```

**شرط الإغلاق الرقمي:**

```text
undefined_command_count = 0
empty_owner_count = 0
empty_required_action_count = 0
empty_verification_count = 0
unclassified_tool_failure_count = 0
```

---

## F00-T02 — تحويل gap ledger من “قائمة عامة” إلى “سجل تنفيذ”

**المشكلة:** gap ledger الحالي ينتج type/path/reason فقط تقريبًا. هذا لا يكفي للتنفيذ.

**الملف المستهدف:**

```text
tools/scripts/generate-operational-gap-ledger.mjs
```

**التعديل المطلوب:**

كل gap يجب أن يحتوي هذه الحقول الإلزامية:

```text
gap_id
type
path
owner
affected_surface
affected_journeys[]
root_cause
pattern_group
risk_level
required_action
target_files[]
allowed_decision
forbidden_actions[]
verification_commands[]
proof_required[]
status
blocks_journey_start
```

**مثال مطلوب لمخرجات gap:**

```json
{
  "gap_id": "BUSINESS_LOGIC_IN_SURFACE:services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx",
  "type": "BUSINESS_LOGIC_IN_SURFACE",
  "path": "services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx",
  "owner": "dsh_frontend_client_surface",
  "affected_surface": "app-client",
  "affected_journeys": ["order_lifecycle", "checkout", "payment_handoff"],
  "root_cause": "screen_owns_operational_logic",
  "pattern_group": "frontend_surface_logic_extraction",
  "risk_level": "P0",
  "required_action": "extract_to_shared_checkout_controller_and_adapter",
  "target_files": [
    "services/dsh/frontend/shared/checkout/*",
    "services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx"
  ],
  "allowed_decision": "SPLIT_REFACTOR",
  "forbidden_actions": ["delete", "inline_api_call", "direct_fetch_in_screen"],
  "verification_commands": [
    "pnpm run diagnostics:operational:surfaces",
    "pnpm run guard:frontend-feature-binding",
    "pnpm run typecheck"
  ],
  "proof_required": [
    "screen_has_no_fetch",
    "screen_has_no_process_env",
    "controller_import_exists",
    "adapter_bound_to_generated_client_or_contract"
  ],
  "status": "OPEN",
  "blocks_journey_start": true
}
```

**شرط الإغلاق:**

```text
كل gap في gap-ledger.json يحتوي كل الحقول أعلاه.
أي gap ناقص = FAIL.
```

---

## F00-T03 — إغلاق نمط BUSINESS_LOGIC_IN_SURFACE كجذر واحد

**المشكلة:** هذه ليست 39 مشكلة منفصلة؛ هذه root cause واحد: الشاشات تمتلك منطقًا تشغيليًا.

**الملفات المتأثرة حسب التشخيص:**

```text
services/dsh/frontend/app-client/checkout/CheckoutScreen.tsx
services/dsh/frontend/app-client/orders/OrdersListScreen.tsx
services/dsh/frontend/app-field/finance/DshFieldFinanceScreen.tsx
services/dsh/frontend/app-partner/account/PartnerHubScreen.tsx
services/dsh/frontend/app-partner/account/PartnerSupportScreen.tsx
services/dsh/frontend/app-partner/dsh-partner-binding.contracts.ts
services/dsh/frontend/app-partner/orders/DshPartnerOrderRejectionScreen.tsx
services/dsh/frontend/app-partner/orders/OrdersInboxScreen.tsx
services/dsh/frontend/app-partner/orders/PartnerOrderAlertsPanel.tsx
services/dsh/frontend/app-partner/orders/PartnerOrderIssuePanel.tsx
services/dsh/frontend/app-partner/store/DshPartnerStoreCourierScreen.tsx
services/dsh/frontend/control-panel/administration/AdministrationDashboardScreen.tsx
services/dsh/frontend/control-panel/catalogs/CatalogDashboardScreen.tsx
services/dsh/frontend/control-panel/catalogs/drawers/CatalogWorkspaceDrawers.tsx
services/dsh/frontend/control-panel/hr/ControlPanelHrScreen.tsx
services/dsh/frontend/control-panel/operations/AreaCapacityScreen.tsx
services/dsh/frontend/control-panel/operations/AssistedOrderDeskScreen.tsx
services/dsh/frontend/control-panel/operations/AuditSupportSlaScreen.tsx
services/dsh/frontend/control-panel/operations/AuditTrailDetailWorkspace.tsx
services/dsh/frontend/control-panel/operations/AwnakScreen.tsx
services/dsh/frontend/control-panel/operations/CaptainOperationsScreen.tsx
services/dsh/frontend/control-panel/operations/CommandCenterScreen.tsx
services/dsh/frontend/control-panel/operations/ControlPanelDshSheinProxyScreen.tsx
services/dsh/frontend/control-panel/operations/DispatchAssignmentScreen.tsx
services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx
services/dsh/frontend/control-panel/operations/GeoHeatmapScreen.tsx
services/dsh/frontend/control-panel/operations/LiveOrdersScreen.tsx
services/dsh/frontend/control-panel/operations/OperationsHubScreen.tsx
services/dsh/frontend/control-panel/operations/OrderRescueScreen.tsx
services/dsh/frontend/control-panel/operations/PartnerStoresScreen.tsx
services/dsh/frontend/control-panel/platform/DshPlatformVarsWorkspace.tsx
services/dsh/frontend/control-panel/platform/DshPlatformWorkspaces.tsx
services/dsh/frontend/control-panel/platform/index.ts
services/dsh/frontend/control-panel/platform/MapsProviderInspector.tsx
services/dsh/frontend/control-panel/platform/PlatformDashboardScreen.tsx
services/dsh/frontend/control-panel/platform/PlatformPoliciesScreen.tsx
services/dsh/frontend/control-panel/platform/ProviderRegistryPanel.tsx
services/dsh/frontend/control-panel/support/SupportDashboardScreen.tsx
services/wlt/frontend/control-panel/_skeleton-proof/WltFinanceReadOnlySkeletonProof.tsx
```

**التعديل المطلوب:**

لكل شاشة:

```text
قبل:
Screen.tsx يحتوي حسابات، policy، SLA، provider، settlement، refund، capacity، mapping، filtering، validation.

بعد:
Screen.tsx = render فقط.
useXController.ts = orchestration.
x.view-model.ts = labels/states/derived display model.
x.policy.ts = action availability / permissions / state transitions.
x.adapter.ts = API/generated-client/backend binding.
x.types.ts = types.
```

**ممنوع:**

```text
fetch داخل Screen
process.env داخل Screen
API_BASE داخل Screen
business constants داخل Screen
settlement/refund/commission/ledger logic داخل DSH screen
```

**أوامر الإثبات:**

```powershell
pnpm run diagnostics:operational:surfaces
pnpm run guard:frontend-feature-binding
pnpm run guard:runtime-config
pnpm run typecheck
```

**شرط الإغلاق:**

```text
BUSINESS_LOGIC_IN_SURFACE count = 0
DIRECT_API_IN_SURFACE count = 0
كل Screen مربوط بـ controller أو مصنف كـ pure render مع proof.
```

---

## F00-T04 — إغلاق DIRECT_API_IN_SURFACE

**الملفات المستهدفة:**

```text
services/dsh/frontend/app-partner/Catalog/ProductMediaScreen.tsx
services/dsh/frontend/control-panel/finance/FinanceDashboardScreen.tsx
```

**المعالجة الدقيقة:**

### ProductMediaScreen

```text
1. إزالة أي fetch/baseUrl/process.env من الشاشة.
2. إنشاء/استخدام:
   services/dsh/frontend/shared/media/product-media.adapter.ts
   services/dsh/frontend/shared/media/use-product-media-controller.ts
   services/dsh/frontend/shared/media/product-media.view-model.ts
3. الشاشة تستدعي controller فقط.
4. adapter فقط يملك API transport.
```

### FinanceDashboardScreen

```text
1. ممنوع اتصال WLT مباشر من الشاشة.
2. يجب استخدام DSH governed finance proxy أو WLT boundary adapter مصرح.
3. إنشاء/استخدام:
   services/dsh/frontend/shared/finance-wlt-link/finance/finance-dashboard.controller.ts
   services/dsh/frontend/shared/finance-wlt-link/finance/finance-dashboard.view-model.ts
   services/dsh/frontend/shared/finance-wlt-link/finance/finance-dashboard.adapter.ts
4. أي settlement/refund/COD/ledger يبقى read-only في DSH.
```

**أوامر الإثبات:**

```powershell
pnpm run guard:frontend-feature-binding
pnpm run guard:wlt-financial-boundary
pnpm run guard:runtime-config
pnpm run diagnostics:operational:surfaces
```

**شرط الإغلاق:**

```text
DIRECT_API_IN_SURFACE count = 0
FinanceDashboardScreen لا يحتوي fetch/process.env/baseUrl
ProductMediaScreen لا يحتوي fetch/process.env/baseUrl
```

---

## F00-T05 — تفكيك SHARED_API_LOGIC_MIXED

**الملفات المستهدفة:**

```text
services/dsh/frontend/shared/finance-wlt-link/finance/finance-hub-runtime.api.ts
services/dsh/frontend/shared/finance-wlt-link/finance-boundary/dsh-wlt-payment-session.client.ts
services/dsh/frontend/shared/orders/dsh-order-lifecycle-client.ts
services/dsh/frontend/shared/partner/partner.api.ts
services/wlt/frontend/shared/dsh/use-wlt-dsh-field-commission-reference-controller.tsx
services/wlt/frontend/shared/dsh/use-wlt-dsh-reference-controller.tsx
services/wlt/frontend/shared/dsh/wlt-dsh-finance-hub.types.ts
services/wlt/frontend/shared/dsh/wlt-dsh-finance-hub.view-model.ts
services/wlt/frontend/shared/dsh/wlt-dsh-http-request.ts
services/wlt/frontend/shared/dsh/wlt-dsh-reference.api.ts
```

**المشكلة:** shared file واحد يجمع transport + domain + UI view-model + runtime config.

**التقسيم الإجباري:**

```text
*.transport.ts
- fetch/http/request/baseUrl فقط

*.adapter.ts
- OpenAPI/generated client operation mapping فقط

*.controller.ts / use-*.ts
- orchestration فقط

*.view-model.ts
- labels/states/display فقط
- ممنوع fetch/baseUrl/process.env

*.policy.ts
- action availability/permissions فقط

*.types.ts
- types فقط
- ممنوع runtime code
```

**قرار كل ملف:**

```text
SPLIT_REFACTOR
أو KEEP_ACTIVE_AS_TRANSPORT_WITH_PROOF
أو KEEP_ACTIVE_AS_VIEW_MODEL_WITH_PROOF
أو MOVE_TO_OWNER
أو DELETE_AFTER_PROOF
```

**ممنوع:**

```text
حذف مباشر
دمج مباشر
نقل بدون import/export proof
إبقاء ملف mixed بحجة أنه يعمل
```

**أوامر الإثبات:**

```powershell
pnpm run diagnostics:operational:surfaces
pnpm exec madge services/dsh --circular
pnpm exec madge services/wlt --circular
pnpm exec depcruise services/dsh
pnpm exec depcruise services/wlt
pnpm run guard:frontend-feature-binding
pnpm run guard:wlt-financial-boundary
pnpm run typecheck
```

**شرط الإغلاق:**

```text
SHARED_API_LOGIC_MIXED count = 0
كل shared API file مصنف transport/adapter/controller/view-model/policy/types
لا circular dependency جديد
```

---

## F00-T06 — تصنيف DIRECT_API_IN_SHARED_UNCLASSIFIED

**الملفات المستهدفة:**

```text
services/dsh/frontend/shared/media/field-document-media.ts
services/dsh/frontend/shared/media/resolve-dev-media-url.ts
services/dsh/frontend/shared/operations/dsh-operational-runtime-adapter.ts
services/dsh/frontend/shared/platform/feature-flags.ts
services/dsh/frontend/shared/platform/platform-vars.ts
services/dsh/frontend/shared/runtime/dsh-auth-client.ts
services/dsh/frontend/shared/runtime/ui-only-runtime-clients.ts
services/wlt/frontend/shared/dsh/wlt-dsh-api-base-url.ts
```

**المعالجة:**

كل ملف يأخذ قرارًا واحدًا:

```text
KEEP_ACTIVE_AS_RUNTIME_ADAPTER
KEEP_ACTIVE_AS_PLATFORM_CONFIG
KEEP_ACTIVE_AS_TRANSPORT
RENAME_TO_ADAPTER_OR_TRANSPORT
MOVE_TO_PLATFORM_RUNTIME
SPLIT_REFACTOR
DELETE_AFTER_PROOF
```

**قاعدة الاسم:**

```text
أي ملف يحتوي direct API signs يجب أن يكون اسمه واضحًا:
*.adapter.ts
*.client.ts
*.transport.ts
*.runtime.ts
*.api-base-url.ts
```

**أوامر الإثبات:**

```powershell
pnpm run diagnostics:operational:surfaces
pnpm run guard:runtime-config
pnpm run guard:frontend-feature-binding
pnpm run typecheck
```

**شرط الإغلاق:**

```text
DIRECT_API_IN_SHARED_UNCLASSIFIED count = 0
```

---

## F00-T07 — تفكيك control-panel إلى ملاك تشغيل واضحين

**المشكلة:** control-panel هو أعلى مركز فجوات: operations/platform/finance/support/catalog/admin مختلطة كأنها سطح واحد.

**التعديل المطلوب:**

إنشاء أو تثبيت هذه الملكيات:

```text
services/dsh/frontend/control-panel/operations
owner: dsh_operator_operations

services/dsh/frontend/control-panel/platform
owner: dsh_platform_configuration

services/dsh/frontend/control-panel/finance
owner: dsh_finance_read_proxy_consumer

services/dsh/frontend/control-panel/support
owner: dsh_support_incident_operations

services/dsh/frontend/control-panel/catalogs
owner: dsh_catalog_governance

services/dsh/frontend/control-panel/administration
owner: dsh_admin_roles_governance
```

لكل شاشة في control-panel:

```text
Screen -> controller -> view-model -> adapter -> backend/OpenAPI/WLT owner
```

**الأولوية داخل control-panel:**

```text
1. finance: لأنها تمس WLT boundary
2. platform: لأنها تؤثر على كل التطبيقات
3. operations: لأنها تؤثر على رحلة الطلب والكابتن والشريك
4. support/incidents: لأنها تؤثر على الاستثناءات
5. catalogs/admin/hr: لاحقًا بعد تثبيت الأنماط
```

**أوامر الإثبات:**

```powershell
pnpm run diagnostics:operational:surfaces
pnpm run guard:fullstack-boundary
pnpm run guard:wlt-financial-boundary
pnpm run guard:frontend-feature-binding
pnpm run typecheck
```

**شرط الإغلاق:**

```text
كل control-panel screen له owner.
كل screen له controller أو pure-render proof.
لا توجد finance mutation داخل DSH UI.
لا توجد platform config ownership داخل app surfaces.
```

---

## F00-T08 — تثبيت WLT/DSH financial boundary

**المشكلة:** أي خلط بين DSH وWLT في finance يجعل رحلات الطلب، الدفع، التسوية، COD، refund غير موثوقة.

**القاعدة غير القابلة للكسر:**

```text
WLT owns:
payment
refund
settlement
commission
COD
ledger
wallet

DSH may:
request handoff
store opaque reference
display governed read-only projection
react to WLT event
never mutate financial truth
```

**الملفات التي يجب فحصها أولًا:**

```text
services/dsh/frontend/shared/finance-wlt-link/**
services/wlt/frontend/shared/dsh/**
services/dsh/backend/internal/wlt/**
services/dsh/backend/internal/wltoutbox/**
services/wlt/backend/internal/dshoutbox/**
services/dsh/contracts/dsh.openapi.yaml
services/wlt/contracts/wlt.openapi.yaml
```

**المعالجة:**

```text
1. كل DSH finance read يمر عبر governed proxy أو boundary adapter.
2. كل WLT mutation تبقى في WLT.
3. DSH لا يملك ledger/cod/settlement/refund mutation.
4. أي shared DSH/WLT file يصنف boundary adapter أو يمنع.
5. أي screen finance تستخدم controller/view-model فقط.
```

**أوامر الإثبات:**

```powershell
pnpm run guard:wlt-financial-boundary
pnpm run guard:fullstack-boundary
pnpm run guard:api-binding
pnpm run guard:backend-api-binding
pnpm run openapi:generate
pnpm run typecheck
```

**شرط الإغلاق:**

```text
WLT/DSH finance ambiguity = 0
direct WLT mutation from DSH UI = 0
finance direct API in surface = 0
```

---

## F00-T09 — إصلاح runtime smoke كشرط تأسيسي

**المشكلة:** runtime smoke فشل بسبب انتظار Postgres. هذا يمنع أي live-readiness لاحق.

**الملف المستهدف:**

```text
infra/docker/scripts/runtime.ps1
```

**التعديل المطلوب:**

```text
1. فصل health check حسب profile:
   - dsh
   - wlt
   - identity
   - media
   - observability

2. لا تنتظر Postgres عام إذا profile لا يطلبه.

3. عند فشل health:
   - اطبع container name
   - docker ps
   - docker compose ps
   - آخر 80 سطر log للخدمة
   - expected health condition
   - actual state

4. لا ترمي رسالة عامة:
   "Postgres did not become healthy"
   بدون تحديد أي container وأي compose file وأي profile.

5. أضف action:
   -Action doctor
   يطبع أسباب الفشل فقط بدون تغيير state.
```

**أوامر الإثبات:**

```powershell
pnpm run runtime:status
pnpm run runtime:smoke
pnpm run runtime:wlt:status
pnpm run runtime:wlt:smoke
pnpm run runtime:identity:status
pnpm run runtime:identity:smoke
```

**شرط الإغلاق:**

```text
runtime:smoke exit_code = 0 أو BLOCKED_NEEDS_DOCKER مع سبب واضح
runtime:wlt:smoke exit_code = 0 أو BLOCKED_NEEDS_DOCKER مع سبب واضح
runtime:identity:smoke exit_code = 0 أو BLOCKED_NEEDS_DOCKER مع سبب واضح
لا توجد رسالة health عامة غير مفسرة
```

---

## F00-T10 — إصلاح CI/security/tooling blockers

**المشاكل المثبتة من التشخيص:**

```text
typecheck = FIX_REQUIRED
test = FIX_REQUIRED
guard:secrets = FIX_REQUIRED / classification bug if no leaks found but command marked failed
guard:workflow-lint = FIX_REQUIRED
guard:workflow-security = FIX_REQUIRED
missing tools = BLOCKED_NEEDS_TOOL
runtime smokes = FIX_REQUIRED/BLOCKED_NEEDS_RUNTIME
```

**المعالجة الدقيقة:**

### typecheck

```powershell
pnpm run typecheck
```

**إذا الفشل من Spectral warnings:**

```text
- لا تسمها typecheck إذا هي contract lint.
- افصل contracts:lint عن typecheck.
- أصلح tags/descriptions أو غيّر policy إلى warning غير blocking إذا مقصود.
```

### test

```powershell
pnpm run test
```

**المطلوب:**

```text
- استخراج أول test failed فقط.
- إصلاح السبب.
- لا تقبل tail طويل بدون اسم الاختبار الفاشل.
```

### guard:secrets

```powershell
pnpm run guard:secrets
```

**المطلوب:**

```text
إذا gitleaks يقول no leaks found، يجب أن يكون PASS.
إذا PowerShell wrapper اعتبر native stderr كفشل، أصلح wrapper لا الحارس.
```

### workflow-lint

```powershell
pnpm run guard:workflow-lint
```

**المطلوب:**

```text
- إضافة actionlint config للـ self-hosted labels:
  bthwani-lenovo
  wsl
  docker
أو تعديل runs-on إلى labels معروفة.
```

### workflow-security

```powershell
pnpm run guard:workflow-security
```

**المطلوب:**

```text
- إصلاح permissions
- pinning
- injection risks
- untrusted checkout/use
```

**شرط الإغلاق:**

```text
blocking_bad = 0
guard:secrets passes when no leaks
workflow-lint passes
workflow-security passes
typecheck passes
test passes
```

---

## F00-T11 — تثبيت أدوات security غير الموجودة

**الأدوات المطلوبة حسب package/toolchain:**

`package.json` يحتوي تشغيل أدوات governance/security مثل `security:trivy`, `security:osv`, `guard:workflow-lint`, `guard:workflow-security`, `guard:actions-pin`, `guard:opa-policies`, `guard:rego-lint`, `guard:shellcheck`, `guard:dockerfile-lint`, `guard:yaml-lint`.

**المعالجة:**

```text
لكل أداة missing:
- إذا active/fail-policy: تثبيت إلزامي.
- إذا partial/optional: لا تجعلها blocker، لكن صنفها BLOCKED_NEEDS_TOOL.
- لا تترك أداة active مفقودة.
```

**أدوات يجب حسمها:**

```text
trivy
osv-scanner
pinact
regal
shellcheck
hadolint
yamllint
storybook/loki إذا مطلوبة
size-limit إذا مطلوبة
```

**شرط الإغلاق:**

```text
active_missing_tool_count = 0
partial_missing_tool_count مصنف وغير blocker
```

---

## F00-T12 — Knip / Madge / dependency-cruiser / jscpd triage بدون حذف عشوائي

**المشكلة:** هذه الأدوات تنتج candidates لا قرارات حذف.

**الأوامر:**

```powershell
pnpm exec knip --reporter json > .diagnostics/foundation/knip.json
pnpm exec madge services/dsh --circular > .diagnostics/foundation/madge-dsh-circular.txt
pnpm exec madge services/wlt --circular > .diagnostics/foundation/madge-wlt-circular.txt
pnpm exec depcruise services/dsh --output-type json > .diagnostics/foundation/depcruise-dsh.json
pnpm exec depcruise services/wlt --output-type json > .diagnostics/foundation/depcruise-wlt.json
pnpm exec jscpd . --reporters json --output .diagnostics/foundation/jscpd
```

**المعالجة:**

لكل candidate:

```text
UNUSED_FILE -> DELETE_AFTER_PROOF أو KEEP_ACTIVE_WITH_RUNTIME_PROOF
UNUSED_EXPORT -> REMOVE_EXPORT_ONLY أو KEEP_PUBLIC_API_WITH_PROOF
CIRCULAR_DEP -> SPLIT_OWNER_BOUNDARY أو FALSE_POSITIVE_WITH_PROOF
DUPLICATION -> EXTRACT_SHARED_HELPER أو ACCEPTABLE_DUPLICATION_WITH_REASON
```

**ممنوع:**

```text
delete بسبب knip فقط
merge بسبب jscpd فقط
split بسبب madge فقط
```

**شرط الإغلاق:**

```text
كل candidate له decision.
كل delete/move/merge له proof.
لا unresolved circular dependency في affected layers.
```

---

# ترتيب التنفيذ الملزم

نفّذ بهذا الترتيب، ولا تنتقل إذا فشل gate:

```text
F00-T00 Truth Lock
F00-T01 Diagnostic Engine Repair
F00-T02 Executable Gap Ledger
F00-T10 CI/Security Blocking Repair
F00-T09 Runtime Smoke Repair
F00-T03 BUSINESS_LOGIC_IN_SURFACE remediation
F00-T04 DIRECT_API_IN_SURFACE remediation
F00-T05 SHARED_API_LOGIC_MIXED remediation
F00-T06 DIRECT_API_IN_SHARED_UNCLASSIFIED classification
F00-T07 Control Panel ownership decomposition
F00-T08 WLT/DSH finance boundary closure
F00-T11 Missing tools classification/install
F00-T12 Graph/Knip/Madge/Depcruise/Jscpd triage
```

---

# تعريف الإغلاق النهائي لهذه الرحلة

لا تعتبر `F00_OPERATIONAL_FOUNDATION_CROSS_JOURNEY_REMEDIATION` مغلقة إلا إذا تحقق:

```text
gap_count_blocking_cross_journey = 0
BUSINESS_LOGIC_IN_SURFACE = 0
DIRECT_API_IN_SURFACE = 0
SHARED_API_LOGIC_MIXED = 0
DIRECT_API_IN_SHARED_UNCLASSIFIED = 0
unassigned_owner_count = 0
undefined_command_count = 0
unclassified_tool_failure_count = 0
runtime_unexplained_failure_count = 0
active_missing_tool_count = 0
workflow_lint_failures = 0
workflow_security_failures = 0
typecheck_failures = 0
test_failures = 0
wlt_dsh_finance_boundary_ambiguity = 0
delete_without_proof = 0
move_without_proof = 0
merge_without_proof = 0
```

---

# أمر التنفيذ الذي تعطيه للوكيل المحلي

```text
نفّذ رحلة:
F00_OPERATIONAL_FOUNDATION_CROSS_JOURNEY_REMEDIATION

لا تبدأ أي رحلة business.
لا تنشئ Execution-Ready Package لرحلة الطلب.
لا تضع أسماء فروع داخل ملفات governance أو journey packages.
لا تنسخ raw diagnostics إلى Git.
لا تحذف أو تنقل أو تدمج أي ملف قبل proof كامل.

المطلوب:
1. قفل truth sync مع origin.
2. إصلاح محرك diagnostics حتى لا ينتج undefined/unassigned/unclassified failures.
3. تحويل gap-ledger إلى سجل تنفيذ يحتوي owner/root_cause/affected_journeys/target_files/verification/proof_required.
4. معالجة كل gaps العابرة للرحلات بالنمط لا ملف-ملف عشوائيًا:
   - BUSINESS_LOGIC_IN_SURFACE
   - DIRECT_API_IN_SURFACE
   - SHARED_API_LOGIC_MIXED
   - DIRECT_API_IN_SHARED_UNCLASSIFIED
   - runtime smoke instability
   - CI/security/tooling failures
   - WLT/DSH finance boundary ambiguity
5. استخدام الأدوات:
   pnpm run diagnostics:operational:toolchain
   pnpm run diagnostics:operational:surfaces
   pnpm run diagnostics:operational:inventory
   pnpm run diagnostics:operational:gaps
   pnpm run graphify
   pnpm run graphify:callflow
   pnpm exec knip --reporter json
   pnpm exec madge services/dsh --circular
   pnpm exec madge services/wlt --circular
   pnpm exec depcruise services/dsh
   pnpm exec depcruise services/wlt
   pnpm exec jscpd .
   pnpm run guard:frontend-feature-binding
   pnpm run guard:runtime-config
   pnpm run guard:wlt-financial-boundary
   pnpm run guard:fullstack-boundary
   pnpm run guard:backend-api-binding
   pnpm run guard:no-broken-imports
   pnpm run typecheck
   pnpm run test
   pnpm run guard:workflow-lint
   pnpm run guard:workflow-security
   pnpm run guard:secrets
   pnpm run runtime:status
   pnpm run runtime:smoke
   pnpm run runtime:wlt:smoke
   pnpm run runtime:identity:smoke

الناتج المطلوب:
- لا كلام عام.
- لا تقرير فقط.
- كل gap له task وowner وtarget_files وrequired_action وverification.
- كل pattern له codemod/script إن أمكن.
- كل failure له إصلاح أو تصنيف blocker واضح.
- كل proof محفوظ في .diagnostics فقط.
- ملفات governance تعدل فقط إذا كان هناك خلل في القواعد أو المولدات.

لا تعلن الإغلاق إلا عند:
blocking_bad = 0
cross_journey_blockers = 0
unclassified_gaps = 0
```

الخلاصة العملية: **أول عمل ليس رحلة الطلب ولا حزمة تنفيذ الطلب. أول عمل هو إصلاح foundation نفسه: diagnostics → CI/tooling → runtime → frontend architecture → shared/API split → WLT/DSH boundary.** بعد هذا فقط تصبح رحلات الطلب والشريك والكابتن والـ control-panel قابلة للتنفيذ بدون غموض.
