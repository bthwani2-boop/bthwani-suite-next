# الأمر الأول — إعداد حزمة التشخيص وخط الأساس وخطة التنفيذ

> **الغرض:** إعداد حزمة تشخيص وخطة تنفيذ مكتفية ذاتيًا داخل `tools/diagnose-implementing/<TASK_NAME>/` دون تعديل كود المنتج. هذا Prompt أداة دعم مشتقة؛ لا ينشئ سياسة ولا يتجاوز تعليمات المهمة الحالية أو `governance/authority/authority-precedence.json` أو `AGENTS.md` أو الحوكمة والعقود الحية.
>
> **مصدر الاستفادة:** تُستخلص القواعد الصحيحة المنطبقة من `tools/BThwani-unified-execution-command-final-authoritative.md` ومن إطار `tools/diagnose-implementing/`، لكن كلاهما يظل أدنى من السلطة الحاكمة الفعلية على الـSHA المثبت.

## 0. المدخلات

```text
المستودع: <OWNER/REPOSITORY>
الفرع أو المرجع: <BRANCH_OR_REF>
اسم الحزمة: <TASK_NAME>
نوع نقطة البداية: <JOURNEY | APPLICATION | SURFACE | SECTION | PAGE | FEATURE | FILE | SERVICE | DOMAIN | OTHER>
نقطة البداية: <TARGET>
المشكلة أو الهدف: <REPORTED_PROBLEM>
النتيجة التشغيلية المطلوبة: <MEASURABLE_OBJECTIVE>
المستبعد صراحة: <EXCLUSIONS | []>
تفويض تسليم الحزمة: <NO_COMMIT | COMMIT | COMMIT_AND_PUSH>
```

نفّذ **التشخيص والتخطيط وإعداد الحزمة فقط**. لا تعدّل كود المنتج أو العقود أو قواعد البيانات أو الهجرات أو Runtime أو الاختبارات أو الحوكمة خارج مجلد الحزمة.

النتيجة المطلوبة: حزمة يستطيع منفذ آخر استخدامها دون إعادة اكتشاف النطاق أو تخمين المالك أو إعادة تصميم الحل أو اختراع الفحوص أو شروط الإغلاق.

---

## 1. نموذج العمل والدقة

استخدم نموذج `CODE_BASED_LEAN`:

```text
أصغر نطاق كامل يكشف السبب الجذري
→ توسع بسبب مثبت فقط
→ خطة غير متداخلة
→ تحقق متناسب مع المخاطر والادعاء
```

كلمات مثل «عميق» و«شامل» و«100%» ترفع معيار الإثبات، ولا تعني تلقائيًا قراءة كل ملف أو كل Skill أو تشغيل Full Graphify/Nx/Typecheck/Build/Test/Guards.

استهدف:

```text
ZERO_FALSE_SUCCESS
ZERO_UNASSESSED_REQUIRED_COVERAGE
ZERO_UNMAPPED_RELATED_CONCERN
ZERO_UNOWNED_CANONICAL_WRITE
ZERO_UNJUSTIFIED_PARALLEL_TRUTH
ZERO_VAGUE_EXECUTION_TASK
ZERO_UNPROVEN_CLOSURE_CLAIM
```

منهج التشخيص:

```text
DISCOVER
→ DIAGNOSE
→ CROSS-CHECK
→ CHALLENGE
→ RE-DIAGNOSE
→ PLAN
→ VERIFY_PLAN
```

لا تعتمد أول تفسير يبدو مناسبًا. حاول إثبات أن فرضية السبب الجذري خاطئة قبل اعتمادها.

---

## 2. تثبيت الحقيقة الريموت وقدرات المضيف

قبل أي ادعاء أو كتابة:

1. تحقق من المستودع والفرع/المرجع بالاسم الذي حدده المستخدم؛ لا تستبدله بالفرع الافتراضي.
2. اجلب أحدث رأس ريموت وثبّت SHA كاملًا بطول 40 حرفًا باسم `PINNED_REMOTE_SHA`.
3. اقرأ من المرجع المثبت فقط، ولا تستخدم الذاكرة أو تقريرًا أو نسخة محلية لإثبات Remote truth.
4. أعد حل رأس الفرع مباشرة قبل دفعة الكتابة؛ إذا تحرك، قارن التغيير الدلالي وصالح الخطة قبل الكتابة.
5. لا تستخدم Force Push أو Reset أو كتابة فوق عمل أحدث.

سجّل Capability Preflight:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_VALIDATOR
CAN_COMMIT
CAN_PUSH
```

إذا كان المضيف GitHub Remote/API بلا Shell:

- لا تدّع تشغيل `new-package.mjs` أو `new-unit.mjs` أو `validate-package.mjs`.
- إذا كان المطلوب يفرض تشغيل الأدوات نفسها ولا توجد قدرة تنفيذ، فالقرار `BLOCKED_EXTERNAL`.
- إذا سمحت المهمة بالكتابة الريموت فقط، لا تنشئ بنية أو Schema من الذاكرة؛ اقرأ القوالب الحالية أولًا، وأي تحقق لم يُشغّل فعليًا يبقى `NEEDS_EVIDENCE`.

---

## 3. السلطة، الحقيقة، والمصادر المشتقة

اقرأ `governance/authority/authority-precedence.json` و`AGENTS.md` على SHA المثبت، ثم اتبع الإحالات الحاكمة المنطبقة فقط.

افصل بين:

```text
AUTHORITY / NORMATIVE TRUTH
= ما يجب أن يكون ومن يملك القرار.

IMPLEMENTATION TRUTH
= الكود والعقود والمهاجرات والإعدادات والاختبارات الحالية.

RUNTIME TRUTH
= ما يحدث فعليًا أثناء التشغيل والقراءة الراجعة.
```

لا تجعل الكود الخاطئ ينشئ ملكية، ولا تجعل وثيقة نظرية تثبت Runtime.

تعامل مع المصادر التالية كمصادر استدلال أو اكتشاف لا كحقيقة أعلى:

```text
tools/BThwani-unified-execution-command-final-authoritative.md
governance/operational_journey_protocol_package/
journey registries
smsm-dsh-wlt-journeys
reports / plans / historical evidence
```

لكل ادعاء مادي مأخوذ من مصدر مشتق صنّف نتيجته نصيًا إلى:

```text
CONFIRMED_BY_CANONICAL_EVIDENCE
CONFIRMED_BY_IMPLEMENTATION_EVIDENCE
CONFIRMED_BY_RUNTIME_EVIDENCE
PARTIALLY_CONFIRMED
STALE
CONTRADICTED
INCOMPLETE
UNPROVEN
NOT_APPLICABLE
```

لا تضف هذه التصنيفات إلى JSON إذا لم يسمح الـSchema الحالي بها.

---

## 4. نموذج منصة بثواني وحدود الملكية

تحقق من القيم الحية في `governance/product/platform-model.yaml` وProduct Truth والعقود، ولا تجمدها من هذا Prompt. استخدم النموذج التالي كمرشح تشخيصي ما دام متوافقًا مع المصادر الأعلى:

```text
Identity         → Actor, auth, sessions, devices, roles, permissions, service identity.
Workforce        → workforce profile, employment, departments, supervisors, assignments, readiness.
DSH              → Partner, Store, catalog, assortment, cart, order, fulfillment, dispatch, delivery.
WLT              → ledger, balances, payment, commission, debt, settlement, refund, COD, payout, reconciliation.
Platform Control → sovereign platform state, rollout and centrally governed operational policy.
Providers        → provider definitions, capabilities, secret references and connection policy.
Media            → file metadata, owner/scope/purpose and lifecycle.
Shared Brains    → controllers/adapters/view-models consuming canonical contracts/clients.
Surfaces         → presentation, composition, navigation and visible state; not domain truth owners.
```

ثبّت الفرق بين:

```text
Platform Context
Operator Context
Partner
Store
Actor
Service Identity
Assignment
```

لا تستخدم معرف نطاق عام لطمس المالك القانوني. `partner_id` و`store_id` محددات موارد، وليسا إثبات صلاحية بحد ذاتهما.

الحقيقة المالية تبقى في WLT؛ لا تجعل Surface أو DSH يملك Ledger أو Balance mutation أو Settlement truth.

---

## 5. نمط المهمة وموجه المخاطر

اختر نمط المخاطر الأساسي من القاموس الحي في `AGENTS.md`، مثل:

```text
TEXT_ONLY | CODE_ONLY | PRODUCT_MODEL | UI_CODE | UI_VISUAL | API_CONTRACT
RUNTIME | DSH_WLT | SECURITY_PRIVACY | AGENT_SYSTEM | DEPENDENCY_CI | REFACTOR_CLEANUP
```

لا تخلط هذا مع نية المهمة؛ هنا النية هي `DIAGNOSE/PLAN`.

وثّق أسباب توسيع الفحص عند تأثر أي من:

```text
product model
shared contract/generated client
migration/database ownership
identity/auth/session/authorization
trusted scope/isolation
WLT/finance
shared runtime/workspace dependency
multiple bounded contexts or governed surfaces
release/production-sensitive behavior
```

الوضع الافتراضي:

```text
AFFECTED_PLUS_RISK_EXPANSION
```

---

## 6. تعريف النطاق بدقة

قبل إنشاء الوحدات حدّد:

```text
requested outcome
current behavior
required behavior
actors/service identities
canonical truth owner
canonical write path
read consumers
trusted scopes
required surfaces
control-panel sections
contract operations/generated clients
backend routes/domain services
state machine/transitions
DB tables/migrations/constraints/indexes
Events/Outbox/Jobs/Cache/Search/Media/Providers
runtime dependencies
negative/retry/offline/recovery behavior
allowed paths
read-only paths
forbidden paths
acceptance criteria
```

قاعدة النطاق:

```text
DIAGNOSIS_SCOPE
= أصغر نطاق مستودع كامل يكشف الروابط والسبب الجذري والمخاطر.

EXECUTION_SCOPE
= الهدف + كل اعتماد مباشر أو انتقالي مثبت
  + كل أساس مشترك يلزم استقراره لإغلاق الهدف.
```

يصبح العنصر مرتبطًا إذا كان يملك الحقيقة أو يكتب/يقرأ الحالة أو يفرض صلاحية أو عقدًا أو Scope أو Migration أو رحلة سابقة/لاحقة أو Readback أو أثرًا ماليًا/أمنيًا/تشغيليًا أو يمثل نسخة موازية للحقيقة.

العيب غير المرتبط:

```text
DEFECT_OUTSIDE_EXECUTION_SCOPE
```

مع الدليل، سبب الاستبعاد، أثر عدم المعالجة، وشرط إعادة الفتح.

الاعتماد الخارجي:

```text
EXTERNAL_DEPENDENCY
```

مع المالك وشرط فك الحظر، ولا يستخدم لإخفاء خلل داخلي.

---

## 7. التشخيص المتعدد الجولات

افحص بقدر الانطباق:

### 7.1 Product/Architecture/Ownership
- Product Truth والنتيجة التجارية.
- Domain boundaries وTruth owners وwrite authority.
- Dependency direction وforbidden imports.
- Parallel truths وdual writes وlocal copies.
- State machines والحالات والأفعال الممنوعة.

### 7.2 Identity/Security/Scope
- Authentication/session/device/service identity.
- Roles/permissions/assignments.
- Platform/Operator/Partner/Store/Actor scope.
- Object authorization وIDOR وprivilege escalation.
- Cross-partner/store/operator leakage.
- Secret/PII/logging boundaries.

### 7.3 Contracts/Backend/Data
- OpenAPI، errors، enums، nullable/optional، idempotency.
- Generated-client provenance وعدم وجود handwritten parallel types.
- Handler/domain/repository/transactions/concurrency.
- Migrations/schema/constraints/indexes/backfill/data integrity.

### 7.4 Events/Runtime/Resilience
- Outbox/Inbox/Jobs/Queues/DLQ/retry/dedupe.
- Cache invalidation/search/media/providers.
- timeout/unknown result/recovery/compensation/reconciliation.
- Docker/env/ports/health/readiness/logs/metrics/traces.

### 7.5 Multi-Surface/UI
- كل Surface مثبت الارتباط.
- routes/navigation/deep links/screens/pages/tabs/controls/forms.
- loading/empty/error/blocked/conflict/offline/unknown-result/retry/recovery.
- RTL/localization/accessibility/focus/large text/responsive behavior.
- كل control إلى أثر Backend محفوظ ثم Readback.

### 7.6 Legacy/Cleanup
- dead code/stale routes/obsolete files/backups.
- duplicated contracts/state machines.
- runtime-reachable mocks/fixtures/seeds.
- silent fallbacks/unused APIs/orphan tables.

لكل Finding مادي وثّق على الأقل:

```text
path/symbol
problem
evidence
root cause
canonical owner
affected consumers/surfaces
security/data/runtime/financial/scope risk
priority
required fix
required verification
```

لا تبدأ خطة تعديل تخمينية قبل إثبات السبب الجذري والمالك ومسار الكتابة والمستهلكين وحاجة Migration/Compatibility والاختبار الذي يمنع الرجوع.

---

## 8. فحص الموجود قبل اقتراح الجديد

قبل التخطيط لإنشاء File/Component/Hook/Controller/API/Service/Migration/Guard/Test:

1. ابحث بالاسم.
2. ابحث بالمعنى الوظيفي.
3. افحص imports/exports/routes/navigation/registries/manifests.
4. افحص API/DB/test bindings.
5. استخدم Graphify/Nx فقط إذا بقيت العلاقات غامضة.

الأولوية:

```text
REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW
```

ولا تخطط للحذف حتى يثبت عدم الاستهلاك أو اكتمال مسار الترحيل.

---

## 9. إنشاء الحزمة بالإطار القائم فقط

المسار الوحيد:

```text
tools/diagnose-implementing/<TASK_NAME>/
```

الإطار الحالي:

```text
tools/diagnose-implementing/_template/
tools/diagnose-implementing/new-package.mjs
tools/diagnose-implementing/new-unit.mjs
tools/diagnose-implementing/validate-package.mjs
```

لا تنشئ Framework موازياً ولا تعود إلى أشجار `topics/contexts/journeys/` المكررة.

عند توفر Shell استخدم:

```powershell
node tools/diagnose-implementing/new-package.mjs `
  --name <TASK_NAME> `
  --branch <BRANCH_OR_REF> `
  --sha <PINNED_REMOTE_SHA> `
  --surface "<TARGET>" `
  --objective "<TARGET_KIND>: <MEASURABLE_OBJECTIVE>" `
  --repository <OWNER/REPOSITORY>
```

`--surface` اسم تقني للمدخل؛ لا يعني أن الهدف Surface.

لا تغيّر `schemaVersion` ولا تخترع حقول JSON إلزامية غير مدعومة.

---

## 10. COVERAGE.json هو سجل التغطية المنظم الوحيد

استكمل كل seeded entry، ولا تترك `UNASSESSED` عند الجاهزية.

الـassessments المدعومة حاليًا:

```text
UNASSESSED
RELATED
NOT_RELATED_WITH_EVIDENCE
DEFECT_OUTSIDE_EXECUTION_SCOPE
EXTERNAL_DEPENDENCY
```

افحص على الأقل:

- repository.
- control-panel / app-client / app-partner / app-captain / app-field.
- كل current control-panel section المولدة.
- DSH shared frontend/backend/database.
- WLT related scope.
- contracts/clients.
- events/jobs/integrations.
- identity/authorization/security.
- tests/quality.
- runtime/observability.
- CI/tooling/automation.
- governance/ownership.

ابقِ التغطية compact إذا ثبت عدم العلاقة، ووسع إلى paths/symbols/actions/writers/readers/states/journeys عند وجود قيمة تنفيذية.

`RELATED` يجب أن يملك evidence وunit links. الاستبعاد يجب أن يملك evidence وreason وreopen trigger. الصمت ليس استبعادًا.

---

## 11. PHASE-00 — BASELINE_STABILIZATION

ابدأ الخطة بخط أساس **مرتبط بالمهمة**؛ ليس إصلاحًا تلقائيًا للمستودع كله.

افحص:

```text
authority/product ownership
identity/security/trusted scope
canonical database/migration integrity
contract/generated-client alignment
service boundaries/shared state machines
Shared Brains/cross-surface writes and reads
Events/Jobs baseline
runtime/health/readiness
guards/tests required by the risk
parallel truths/central duplicates
```

صنّف نصيًا:

```text
FOUNDATION_BLOCKER
SHARED_PREREQUISITE
JOURNEY_PREREQUISITE
JOURNEY_LOCAL
SHARED_OPTIMIZATION
NON_BLOCKING_DEBT
EXTERNAL_DEPENDENCY
```

عيب يضرب عدة رحلات/أسطح أو مالكًا مركزيًا يعالج مرة واحدة في `FOUNDATION` أو `MIGRATION`، لا داخل كل Journey.

أنشئ بعد وحدات الأساس `VERIFICATION` واحدة تمثل `FOUNDATION_CLOSURE_GATE`. حتى إذا لم توجد إصلاحات، يجب أن تثبت البوابة صلاحية الأساس.

كل Journey داخل النطاق تعتمد مباشرة أو انتقاليًا على هذه البوابة.

خطط لـ`pnpm run guard:foundation` فقط إذا كان موجودًا ومنطبقًا، عند الحالة الأولية، وبعد إصلاح الأساس، وقبل أول Journey، وبعد mutation تأسيسي لاحق، وقبل الإغلاق.

---

## 12. اكتشاف الرحلات والشرائح الرأسية

لا تفترض صحة Registry واحد. قارن Product Truth والحوكمة والسجلات والمصادر المشتقة مع code/contracts/database/runtime/surfaces/tests/events.

ابحث عن:

```text
documented / undocumented
registry-only / code-only
stale / duplicate / partial
inbound / outbound
closed-without-runtime-evidence
```

لكل Journey وثّق:

```text
actor/outcome
predecessors/prerequisites
foundation/shared dependencies
truth owner/write path/readback
required surfaces/control-panel consumers
states/transitions
blockers
what it unlocks
```

عند الحاجة فكك Capability إلى شرائح رأسية:

```text
use case واحدة
→ كل طبقاتها
→ كل أسطحها
→ تحققها
→ إغلاقها
```

لا تستخدم التقسيم الأفقي: «كل Frontend ثم كل Backend ثم DB».

إذا كانت مصادر مشتقة تعرض شرائح ثابتة مثل SMSM أو FS، استخدمها **كعدسات فحص بعد إثبات الانطباق** لا كSchema إلزامي ولا كعدد رحلات ثابت.

---

## 13. سلسلة التتبع Full-Stack

لكل Journey/Capability مرتبطة تتبع بقدر الانطباق:

```text
Product Truth
→ Actor / Service Identity
→ Session/Device
→ Platform/Operator/Partner/Store/Assignment trusted scope
→ Role/Permission/Object authorization
→ Surface/Route/Screen/Control
→ Shared Brain
→ Generated Client
→ Canonical Contract
→ API/Handler
→ Domain policy/State machine
→ Repository/Transaction/Database
→ Cache/Idempotency
→ Event/Outbox/Job/Provider
→ WLT when financial
→ Persisted Effect
→ Readback
→ Every required consumer surface
→ Audit/Observability
→ Runtime evidence
```

غطِّ:

```text
success
invalid input
denied/forbidden
wrong scope
forbidden state
duplicate/replay
race/concurrency
timeout/unknown result
offline/reconnect
retry/backoff
partial failure/restart
stale client/mixed version
compensation/reconciliation
```

أي حلقة لازمة مفقودة تصبح Finding وخطة.

---

## 14. قواعد خاصة يجب أن تدخل الخطة عند الانطباق

### 14.1 PostgreSQL/Migrations
- لا تعدّل Migration مطبقة؛ أنشئ Migration جديدة.
- خطط `EXPAND → compatible code → BACKFILL → verify → switch writers → switch readers → remove fallbacks → CONTRACT` عند الحاجة.
- اختبر قاعدة جديدة وغير فارغة وإعادة التشغيل والبيانات المتعارضة/اليتيمة/المكررة والفشل الجزئي.
- خطط locks/index build/batching/idempotency/rollback أو roll-forward.
- لا تستخدم `IF NOT EXISTS` لإخفاء Drift معروف.

### 14.2 Compatibility
عند تغيير API/Schema/Contract خطط لإثبات:

```text
old mobile + new backend
new mobile + old backend عند الحاجة
current control-panel + new backend
generated client/event/cache compatibility
mixed-version runtime
rollback/roll-forward
compatibility window owner + expiry + removal trigger
```

لا تفترض تحديث كل تطبيقات الهاتف لحظيًا. Compatibility المؤقتة يجب أن تكون محددة بمالك ومدة وخطة إزالة؛ لا Dual-write أو fallback دائم.

### 14.3 Security/Privacy
غطِّ auth/authz/session/token/secrets/PII/input/output/injection/SSRF/path traversal/upload/rate limit/replay/IDOR/cross-scope/audit/dependency/workflow permissions حسب الخطر. UI-only authorization غير مقبول.

### 14.4 DSH/WLT
أي أثر مالي يخطط عبر الحد الحاكم DSH↔WLT، مع WLT مالكًا للحقيقة المالية، وidempotency/audit/readback/reconciliation عند الانطباق.

### 14.5 Mobile
خطط عند التأثر لـnavigation/deep links/Expo/native permissions/push/maps/SecureStore/offline/native rebuild/OTA/EAS/signing/runtime env. نجاح Metro لا يثبت Native build.

### 14.6 Control Panel
خطط route+object authorization، server/client boundaries، scope selection الخادمي، pagination/filter/search isolation، bulk/destructive actions، audit، session expiration، error mapping وcross-surface readback.

---

## 15. إنشاء الوحدات غير المتداخلة

استخدم الأنواع الحالية فقط:

```text
TOPIC
CONTEXT
JOURNEY
FOUNDATION
MIGRATION
CLEANUP
VERIFICATION
```

عند توفر Shell:

```powershell
node tools/diagnose-implementing/new-unit.mjs `
  tools/diagnose-implementing/<TASK_NAME> `
  --id <UNIT_ID> `
  --name <UNIT_NAME> `
  --kind <UNIT_KIND> `
  --depends-on "<DEPENDENCY_IDS>"
```

أنشئ وحدة واحدة لكل `executionConcern` حقيقي. إذا كان Root Cause وTruth Owner واحدًا، لا تقسّمه حسب الأسطح.

يُمنع:

```text
duplicate executionConcern
unit بلا evidence
gap مرتبط بلا unit
dependency cycle
unit ضخمة لمشكلات مستقلة
screen-by-screen patching لسبب مركزي
```

### DIAGNOSIS.md
يشرح: الواقع، الأدلة، البدائل المستبعدة، root cause، truth owner، writers/readers/consumers، surfaces/journeys، dependencies، what it unlocks، boundaries/must-not-change، مخاطر وتأثير التأخير، وسبب اختيار الحل.

### EXECUTION.json
حافظ على الـSchema الحالي. كل Task تحدد بدقة:

```text
taskId/order/objective
paths/symbols
action/currentProblem/requiredChange/targetState
mustNotChange
acceptanceCriteria
verificationIds
rollback
commitBoundary
```

لا تستخدم «أصلح/راجع/حسّن/نظف/اربط» وحدها.

### VERIFICATION.json
لكل Check:

```text
verificationId/type/command/required/prerequisites
passCriteria/failCriteria
proves/doesNotProve
```

لا تجعل Static check يثبت Runtime أو Security أو Finance.

---

## 16. ترتيب التنفيذ الذكي والتوازي

استخدم `dependsOn` كرسم بلا دورات، ووثّق سبب الترتيب والمسار الحرج داخل التشخيص دون اختراع Schema موازٍ.

الأولوية:

```text
hard dependency
→ foundation blockers
→ critical path
→ unlocks most journeys/surfaces
→ central fix preventing repeated work
→ high-risk/high-uncertainty early
→ small high-impact
→ minimize reopening stabilized contract/schema/file
→ cleanup/non-blocking debt last
```

يمكن توازي القراءة/البحث/جمع الأدلة/فحوص مستقلة. تبقى الكتابة إلى truth owners والمهاجرات والعقود والعملاء المولدين والـCommits متسلسلة. خطط لوحدة كتابة واحدة `IN_PROGRESS` فقط.

---

## 17. استراتيجية التحقق المخطط

لا تخترع أوامر؛ اقرأها من `package.json` وworkspace/service manifests وruntime scripts.

التدرج:

```text
scoped inspection/search
→ nearest targeted test/check
→ package/unit integration
→ affected typecheck/lint/test/build
→ contract/binding/data/security checks
→ runtime smoke عند الادعاء التشغيلي
→ full verification عند سبب مثبت فقط
```

استخدم Graphify فقط عند غموض الملكية/العلاقات/dead code، وNx affected عند حساب الأثر، وأدوات الأمن/الأداء عند الخطر المنطبق.

كل Check غير منفذ لا يعد PASS. أي Skip يجب أن يملك سبب `NOT_APPLICABLE` ودليل عدم التأثر.

خطط Checkpoints عند الحاجة:

```text
0 pinned start
1 foundation closure
2 DB/contracts/generated clients stable
3 services/state machines stable
4 surfaces/UX integrated
5 runtime/readback/evidence closure
```

---

## 18. Evidence invalidation

أي تغيير لاحق في:

```text
canonical truth
identity/authz/trusted scope
contract/generated client
database schema/migration
shared state machine/Shared Brain
foundation runtime
```

يجب أن تحدد الخطة الأدلة والفحوص والوحدات التي تصبح stale وتحتاج إعادة تحقق.

إذا ظهرت فجوة Foundation أثناء Journey:

```text
stop affected journey safely
→ capture/classify evidence
→ reopen/create owning foundation unit
→ invalidate downstream evidence
→ recompute order
→ repair foundation
→ rerun foundation gate
→ rerun affected checks
→ resume from last valid checkpoint
```

---

## 19. شروط جاهزية الحزمة

قبل الجاهزية:

```text
MANIFEST.status.diagnosis = COMPLETE
MANIFEST.status.plan = READY
COVERAGE.assessmentStatus = COMPLETE
EXECUTION-ORDER.status = READY
all planned units = READY (or valid pre-proven DONE)
```

تحقق من:

```text
zero UNASSESSED
no missing/duplicate/cyclic dependencies
no duplicated executionConcern
no vague tasks
no unknown verificationId
bidirectional coverage links
all relevant journeys depend on foundation gate
no unresolved template markers
no secret-like or production-sensitive content
```

عند توفر Shell شغّل:

```powershell
node tools/diagnose-implementing/validate-package.mjs `
  tools/diagnose-implementing/<TASK_NAME> `
  --strict
```

النجاح المطلوب:

```text
Validation summary: 0 error(s)
```

لا تستخدم `--disposal`؛ الفاحص الحالي يدعم `--strict` و`--strict --closure` فقط.

إذا لم يتوفر Shell فلا تزور هذه النتيجة: استخدم `NEEDS_EVIDENCE` حتى تشغيل Validator فعليًا.

---

## 20. تسليم الحزمة

طبّق التفويض فقط:

```text
NO_COMMIT
COMMIT
COMMIT_AND_PUSH
```

إذا كان Commit/Push مصرحًا:

- أعد تثبيت remote head قبل الكتابة.
- اجعل Commit الحزمة فقط.
- لا تضمّن ملفات تشغيلية.
- Push بلا Force.
- أعد تثبيت رأس الفرع بعد Push.

لا PR ولا Merge ولا Release ولا Production إلا بطلب صريح منفصل.

التقرير النهائي المركز:

```text
repository
branch/ref
pinned remote SHA
package path
package commit SHA إن وجد
target + objective
risk mode
authority sources applied
derived sources cross-checked
coverage totals
major root causes/truth owners
foundation/migration/shared/journey/verification units
related journeys/surfaces/control-panel sections
critical path + planned order
compatibility/migration/security/finance concerns
external dependencies
strict validator command/result أو NEEDS_EVIDENCE
confirmation: no operational project file modified
canonical decision
```

القرار المقبول لهذه المرحلة يكون بما يطابق الحقيقة الفعلية، عادة `PASS` لنطاق إعداد مثبت، أو `NEEDS_EVIDENCE` إذا تعذر إثبات فحص مطلوب، أو `BLOCKED_EXTERNAL` عند مانع خارجي حقيقي. لا تستخدم `CLOSED_WITH_EVIDENCE` لمجرد أن خطة التنفيذ أصبحت جاهزة.
