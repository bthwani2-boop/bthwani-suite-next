# الأمر 1 — التشخيص العميق وإنشاء حزمة تنفيذ قابلة للتنفيذ

Status: DERIVED_SUPPORT

استخدم هذا الأمر لتشخيص مهمة/رحلة/تطبيق/سطح/قسم/صفحة/ميزة/خدمة/نطاق بعمق ثم تجهيز حزمة تنفيذ مكتفية ذاتيًا **دون تعديل المنتج نفسه**.

> هذا Prompt مساعد مشتق. كل Schema/enum/flag/path مذكور فيه يخضع للمصدر الحاكم الحالي على الـSHA المثبت. لا تجعل Prompt أو Package أو تقريرًا أو خطةً أو مسودةً مصدر Product/Implementation/Runtime/Repository-Platform truth.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
TASK_NAME: <safe-kebab-name>
TARGET_KIND: <JOURNEY | APPLICATION | SURFACE | SECTION | PAGE | FEATURE | SERVICE | DOMAIN | FILE | OTHER>
TARGET: <blank = discover all proven-related scope | name/path/outcome>
PROBLEM: <blank/discovery | observed problem or gap>
OBJECTIVE: <blank/discovery | measurable desired outcome>
EXCLUSIONS: <[] or explicit exclusions>
DELIVERY: <NO_COMMIT | COMMIT | COMMIT_AND_PUSH>
```

`TARGET` الفارغ لا يعني full-repository scan تلقائيًا؛ يعني أن التشخيص يبدأ من المهمة/السياق المتاح ويستخرج **النطاق الحقيقي المثبت** من الأدلة والعلاقات. وإذا كان المقصود «كل شيء» فيجب إثبات أن هذا هو النطاق المصرح به، ثم تقسيمه إلى Coverage قابلة للتحقق دون إسقاط أي جزء.

## 1. السلطة والحقيقة وتصنيف المصادر

اقرأ حسب الترتيب الحالي:

```text
current authorized task
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable capability Product Truth
→ applicable machine contracts/registries
→ exact pinned implementation/runtime/repository-platform evidence
```

افصل:

```text
AUTHORITY TRUTH
PRODUCT TRUTH
IMPLEMENTATION TRUTH
RUNTIME TRUTH
REPOSITORY-PLATFORM TRUTH
DERIVED/HISTORICAL SUPPORT
```

أي Derived/Historical source أضعف من الحقيقة الحية الحالية ولا يورث حالة أو قرارًا لمجرد وجوده.

### قاعدة إلزامية — `plans` و`diagnose-implementing` ليست كودًا حيًا

تعامل مع:

```text
plans/**
plans/diagnose-implementing/**
```

باعتبارها **مسودات تخطيط/توثيق/تشخيص مشتقة أو تاريخية قد تكون ناقصة أو قديمة أو متناقضة أو خاطئة**، وليست:

```text
live code
runtime truth
implementation truth
product truth
proof of execution
proof of DONE/PASS
canonical source of truth
```

يجوز استخدامها فقط من أجل:

```text
discover prior intent
recover historical context
identify prior hypotheses/decisions to re-check
locate possible paths/owners/risks
avoid rediscovering already-known questions
```

لكن **ممنوع نسخ أو اعتماد أي ادعاء أو تصميم أو حالة DONE/PASS أو افتراض أو Scope أو قرار منها تلقائيًا**. كل ادعاء جوهري يعاد إثباته مقابل أحدث:

```text
code
contracts/schemas/registries
configuration/environment definitions
data/migrations
build/test/CI definitions
runtime paths
actual behavior/readback
current authority/product truth
```

عند التعارض:

```text
current higher-authority/live evidence wins
→ record the contradiction as a Finding
→ do not silently inherit the stale draft
```

ونفس القاعدة تنطبق على Prompt أو Report أو README أو comment أو historical commit إذا حاول أن يحل محل الحقيقة الحية دون دليل.

## 2. تثبيت الريموت والقدرات

قبل القراءة العميقة أو الكتابة:

```text
resolve REPOSITORY + exact TARGET_REF
→ PINNED_REMOTE_SHA = full current remote SHA
→ read from pinned truth
```

قبل كل logical write batch أعد حل الرأس. إذا تحرك:

```text
PINNED_REMOTE_SHA → LATEST_REMOTE_SHA
→ classify semantic impact
→ reconcile before write
```

بعد آخر write/push أعد الحل وسجّل `FINAL_OBSERVED_REMOTE_SHA`.

ممنوع default-branch substitution / force-push / hard-reset newer work / overwrite concurrent movement.

### Capability / Codex Preflight إلزامي

**اكتشف واستخدم تلقائيًا جميع قدرات وأدوات وإضافات وتكاملات Codex المتاحة والملائمة للمهمة** عندما يمكنها زيادة دقة التشخيص أو كشف علاقات أو ثغرات أو تناقضات أو تحسين التحقق والتخطيط. لا تهمل Capability ملائمة لمجرد أن القراءة اليدوية ممكنة، ولا تستخدم أدوات غير مرتبطة لمجرد أنها متاحة.

سجّل ما ينطبق:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_QUERY_LIVE_GITHUB
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_VALIDATOR
CAN_RUN_DATABASE
CAN_RUN_RUNTIME
CAN_RUN_CI
CAN_RUN_SECURITY_CHECKS
CAN_RUN_E2E
CAN_RUN_VISUAL
CAN_RUN_CODE_REVIEW
CAN_RUN_ARCHITECTURE_ANALYSIS
CAN_RUN_DEPENDENCY_ANALYSIS
CAN_RUN_STATIC_ANALYSIS
CAN_ACCESS_PROVIDER
CAN_VERIFY_PRODUCTION
CAN_COMMIT
CAN_PUSH
```

عند وجود Skill/Plugin ملائم، اقرأ تعليماته الفعلية واستخدمه ضمن حدود المهمة والسلطة. قدرة مطلوبة وغير متاحة تصبح evidence/dependency requirement. لا تدّع تشغيل Tool/Test/Validator لم يُنفذ.

المبدأ:

```text
USE EVERYTHING APPLICABLE.
DO NOT USE EVERYTHING BLINDLY.
DO NOT CLAIM A CAPABILITY THAT WAS NOT ACTUALLY USED.
```

## 3. CODE_BASED_LEAN والنطاق الحقيقي

```text
smallest complete root-cause scope
→ proven dependency/risk expansion only
→ non-overlapping plan
→ risk-proportional verification
```

اسم السطح/التطبيق/الصفحة/الرحلة **نقطة بدء وليس حدًا**. وسّع فقط بعلاقة مثبتة: ownership/dependency/Product Truth/security/finance/data/runtime/readback.

النطاق الحقيقي يحدد بواسطة:

```text
Root Cause
+ Blast Radius
+ Consumers
+ Dependencies
+ Contracts
+ Data Flow
+ Runtime Path
+ required cross-surface behavior
```

```text
DIAGNOSIS_SCOPE = أصغر نطاق كامل يكشف السبب وكل علاقة لازمة للإغلاق.
EXECUTION_SCOPE = الهدف + الاعتماديات المثبتة + shared prerequisite اللازم فقط.
```

أي مكوّن خارج الوصف الأولي لكنه متأثر مباشرة أو مطلوب لإكمال المسار End-to-End يدخل النطاق. وأي مكوّن غير مرتبط لا يُسحب إلى المهمة لمجرد الرغبة في تنظيف عام.

“عميق/شامل/100%/1000%” يرفع معيار الدليل والاستنفاد داخل النطاق المثبت، ولا يبرر unrelated repository scan.

## 4. Seeded Coverage ليس مسحًا أعمى

قد يزرع Generator الأسطح/المجالات كلها. هذه **assessment entries** لا أوامر deep scan عمياء:

```text
entry
→ bounded relevance check
→ RELATED: evidence + unit
→ proven non-related: supported exclusion + reason + reopen trigger
→ uncertain materially: remain OPEN and deepen
→ deepen only when relation/uncertainty is material
```

يجب تقييم required entries دون تحويل كل entry إلى مشروع تشخيص مستقل، ودون إسقاط Entry لمجرد عدم ظهور مشكلة من النظرة الأولى.

## 5. التشخيص الاستقصائي الجذري الشامل

استخدم:

```text
DISCOVER
→ DIAGNOSE
→ CROSS-CHECK
→ CHALLENGE
→ RE-DIAGNOSE
→ ADVERSARIAL_DIAGNOSIS
→ DECISION_GAP_ANALYSIS
→ PLAN
→ VERIFY_PLAN
```

لا تحصر التشخيص في الكود فقط. افحص بقدر الانطباق:

```text
Requirements / Product Logic
Architecture / Boundaries / Ownership
Business Logic / State Machines
Backend / Frontend / Mobile / Web
APIs / Contracts / Bindings / Generated Clients
Data Models / Schemas / Queries / Migrations
Auth / AuthZ / Permissions / Security / Privacy
Transactions / Concurrency / Idempotency
Events / Queues / Providers / Integrations
Configuration / Environment / Runtime / Networking
Build / Typecheck / Lint / Tests / CI
Performance / Reliability / Recovery / Observability
UI / UX / Visual Design / RTL / Accessibility / Localization
Navigation / Routes / Empty-Loading-Error States
Operational Flows / Supportability / Audit
Naming / Placement / Context / References
Dependencies / Supply Chain
Documentation accuracy relative to live implementation
Repository hygiene / dead-stale-legacy residue
```

لكل Finding مادي:

```text
finding_id
category/severity
path/symbol/surface/journey
problem + exact evidence
competing hypothesis checked
root cause or missing proof
canonical truth/write owner
writers/readers/consumers
blast radius
affected surfaces/journeys/contracts/data/runtime
security/data/financial/operational/design risk
current state
target state
required decision if any
required verification
reopen trigger
```

حاول **تكذيب Root Cause** قبل اعتماده وابحث عن writer/reader/contract/state/runtime path بديل.

اعتمد الحل الجذري الصحيح دائمًا بدل أي ترقيع أو workaround يتجاهل السبب. وإذا كان أصل الخلل Architecture/Design/Data Model/Contract/Ownership/State/Permissions/Boundary/Dependency Direction/Source of Truth/Legacy Design فضع في الخطة Refactor/Redesign/Rebuild المناسب بدل المحافظة على بنية خاطئة لتقليل حجم الـdiff.

قبل إنشاء شيء جديد:

```text
search name + semantics
→ imports/exports/routes/navigation/registries/manifests
→ API/DB/test bindings
→ configs/env/scripts/generated references
→ relationship/dependency tools when useful
```

الأولوية:

```text
REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW
```

## 6. FAIL-CLOSED أثناء التشخيص

الحالة الافتراضية لكل Claim أو Area مادي:

```text
UNPROVEN / OPEN
```

القواعد:

```text
غير مفحوص = OPEN
غير مثبت = OPEN
متناقض = OPEN
غامض جوهريًا = OPEN
قرار جوهري غير محسوم = OPEN
Finding معلوم غير مسجل = التشخيص غير مكتمل
Finding مسجل بلا Root Cause أو Missing-Proof واضح = التشخيص غير مكتمل
```

لا تستنتج السلامة من غياب Error أو من Build/Test أخضر منفرد. المطلوب **دليل إيجابي حديث** على كل Claim جوهري بحدود ما يثبته الدليل فعليًا.

لا نجاح جزئي في التشخيص: نجاح Backend أو API أو Screen أو Build أو Typecheck أو Lint أو Unit Test منفرد لا يثبت End-to-End ولا ينفي فجوات Design/Data/State/Auth/Integration/Runtime/Failure Behavior.

## 7. Full-Stack Multi-Surface trace

تتبع بقدر الانطباق:

```text
Product Truth
→ Actor/Service Identity
→ Session/Device
→ Trusted Platform/Operator/Partner/Store/Assignment scope
→ Role/Permission/Object authorization
→ Surface/Route/Screen/Control
→ shared controller/adapter
→ generated client/canonical contract
→ API/domain/state machine
→ validation/transformation
→ transaction/database
→ cache/idempotency
→ events/jobs/providers/WLT when financial
→ networking/response
→ persisted canonical readback
→ every required consuming surface
→ observable UI/operational result
→ audit/observability/runtime evidence
```

غطِّ حسب الأثر:

```text
success
empty/missing data
invalid/malformed input
denied/unauthenticated
wrong-role/wrong-scope/IDOR
forbidden state
not-found/conflict/stale version
duplicate/replay/idempotency
race/concurrency
boundary/min/max
partial failure
dependency/database/network failure
timeout/unknown-result
retry/backoff
offline/reconnect
restart/recovery
old/new data
mixed-version/migration compatibility
rollback/roll-forward
compensation/reconciliation
```

اكتشف أي فجوة أو تناقض في العقود بين APIs وBindings وFrontend وBackend والبيانات والأسطح، ولا تفترض أن تطابق نوعين أو نجاح استدعاء واحد يعني توحيد السلوك.

## 8. فحص البنية والتنظيف قبل التخطيط

**وحدة الفحص ليست الملف.** افحص حسب الحاجة:

```text
line
→ expression/condition/branch
→ block
→ function/method
→ type/class/component
→ helper/constant
→ file
→ file group
→ folder
→ module/package
→ service/surface
→ domain
→ contract/route/config/dependency
```

ابحث صراحةً عن:

```text
dead/unreachable code
stale/legacy/superseded residue
duplicate implementations
duplicate sources of truth
unused imports/exports/re-exports/dependencies
obsolete routes/contracts/DTOs/schemas/models
stale configs/env vars/feature flags/scripts/commands
temporary/debug/generated noise
old paths/names/aliases
orphan/stale references
wrong ownership/responsibility/placement/context
misleading naming
TODO/FIXME/HACK/workarounds/fallbacks
unnecessary compatibility layers
files/folders with no proven Purpose/Consumer/Responsibility
```

لا تقرر الحذف لمجرد أن العنصر «يبدو قديمًا»، ولا تقرر الاحتفاظ به لمجرد أنه «لا يسبب خطأ». لكل عنصر مشكوك فيه أثبت:

```text
Responsibility + Purpose + Consumer + Requirement + Architectural Reason
```

وخطط الحذف/النقل/الدمج/إعادة التسمية/إعادة الهيكلة فقط بعد فهم Blast Radius وشبكة المراجع في الاتجاهين.

## 9. Canonical Source of Truth وسلامة شبكة المراجع

لكل مفهوم افحص وجود Source of Truth واحد حيثما كان ذلك صحيحًا معماريًا، بما في ذلك:

```text
Contracts
Schemas
Models
Configurations
Policies
Mappings
Constants
Business Rules
State Definitions
Domain Definitions
```

عند تعدد غير مبرر:

```text
identify canonical owner
→ map all writers/readers/consumers
→ plan migration to canonical owner
→ remove secondary truth/synchronization residue when safe
→ verify references/readback after execution
```

ولكل Delete/Rename/Move/Merge/Split/Refactor/Replace مخطط، احصر كامل شبكة المراجع:

```text
Imports / Exports / Re-exports
Callers / Callees
Registrations / Bindings / Routes
Contracts / Schemas / Configs / Env
Dependencies
Tests / Mocks / Fixtures
Docs / Examples
Build / CI / Scripts
Generated References
```

## 10. Adversarial Diagnosis — حاول إثبات أن التشخيص ناقص

بعد أن يبدو التشخيص مكتملًا، **لا تنتقل مباشرة للحزمة**. نفّذ مراجعة عدائية مستقلة قدر الإمكان وابحث عمدًا عن:

```text
Silent Failures
Hidden Fallbacks
Edge Cases
Unreachable Error Handling
State Corruption
Race Conditions
Partial Transactions
Permission Leaks / IDOR / Cross-Scope
Contract / Schema / Data Drift
Duplicate Logic / Parallel Truth
Legacy Paths / Dead Code
Wrong Ownership / Placement / Naming / Context
Orphan References
Stale Configuration / Hidden Dependencies
Unvalidated Inputs
Inconsistent Cross-Surface Behavior
Operational Regressions
Missing consumers/writers/readers
Stale runtime/process/data assumptions
Failure/recovery paths not represented in the plan
```

استخدم أدوات تحليل/مراجعة/أمن/اعتماديات/علاقات متاحة عندما تكون ملائمة. ظهور Finding جديد يعيد دورة التشخيص ويمنع الانتقال للحزمة حتى يُحصر ويُفهم.

## 11. بوابة الاستفسارات والقرارات — ممنوع التخمين

قبل إنشاء الحزمة، قسّم المجهول إلى:

```text
DERIVABLE_FACT = يمكن حسمه من الأدلة/الكود/العقود/التشغيل → احسمه بنفسك ولا تسأل المستخدم.
TRUE_DECISION_GAP = لا يمكن حسمه بأمان دون قرار منتجي/وظيفي/معماري/سياساتي من المستخدم/السلطة.
EXTERNAL_EVIDENCE_GAP = يحتاج قدرة/بيئة/مزود/دليل غير متاح حاليًا.
```

**لا تسأل عن شيء يمكن اكتشافه من المستودع أو الأدلة المتاحة.**

عند وجود `TRUE_DECISION_GAP`:

1. اجمع كل الأسئلة المحتملة.
2. اربط الأسئلة المشتقة بسؤالها الجذري.
3. ادمج المتشابه والمتداخل.
4. احذف التكرار والازدواجية والأسئلة التي لا تغير قرارًا أو خطة.
5. رتب الأسئلة حسب dependency/impact بحيث تحسم الإجابة المبكرة أكبر عدد من الأسئلة اللاحقة.
6. اطرح **أكبر عدد ضروري فقط من الأسئلة عالية القيمة**؛ لا تشتت المستخدم بقائمة يمكن تقليصها منطقيًا.

لكل سؤال استخدم:

```text
QUESTION_ID
DECISION NEEDED
WHY EVIDENCE CANNOT RESOLVE IT
AFFECTED AREAS / CONSEQUENCES
OPTION A — description + tradeoffs
OPTION B — description + tradeoffs
OPTION C — only when materially distinct
RECOMMENDATION — preferred option
WHY — best-practice/evidence-based reason
WHAT CHANGES IF CHOSEN
```

لا تحول توصيتك إلى قرار نهائي دون سلطة. وإذا كانت Best Practice لا تكفي لأن القرار Product/Business preference، قل ذلك صراحةً.

بعد إجابات المستخدم:

```text
bind answer to QUESTION_ID
→ update assumptions/requirements/scope
→ detect contradictions with previous answers/evidence
→ collapse downstream questions now resolved
→ discover only genuinely new gaps
→ repeat until material decision gaps = ZERO
```

### شرط حاسم

```text
MATERIAL_TRUE_DECISION_GAPS > 0
→ PACKAGE CREATION FORBIDDEN
```

لا تبدأ إنشاء الحزمة لمجرد أن «معظم» الصورة واضحة. يجب أن تكون الحدود والمتطلبات والقرارات والسيناريوهات ومعايير القبول اللازمة للتنفيذ **محسومة بما يكفي لإنشاء خطة غير تخمينية**.

## 12. مخاطر يجب أن تدخل الخطة عند الانطباق

### PostgreSQL
Forward migration فقط؛ لا applied-history rewrite. خطط expand/compatible/backfill/switch/contract عند الحاجة، fresh/non-empty، drift/orphans/duplicates، locks/index/batching/idempotency، restart، rollback/roll-forward.

### Compatibility
old-mobile+new-backend، new-mobile+old-backend عند الحاجة، control-panel+backend، generated client/event/cache، mixed-version، rollback/roll-forward، compatibility owner/expiry/removal trigger.

### Security
auth/authz/session/token/secrets/PII/input-output validation/injection/SSRF/path traversal/upload/rate-limit/replay/IDOR/cross-scope/audit. UI-only auth غير مقبول.

### DSH/WLT
WLT يبقى المالك المالي. خطط idempotency/correlation/readback/reconciliation/unknown-result/compensation.

### Mobile / Control Panel
افحص native/deep-links/permissions/push/maps/SecureStore/offline/build/OTA/EAS/env عند Mobile، وroute/object auth/server-client/trusted scope/search isolation/bulk/audit/session/error/readback عند Control Panel.

### Design / UX / Accessibility
عند وجود Surface مرئية، لا تعتبر صحة الكود بديلًا عن صحة التجربة. خطط بقدر الانطباق loading/empty/partial/error/forbidden/conflict/offline/retry/recovery، hierarchy/consistency/RTL/localization/accessibility/responsive behavior، وvisual/runtime verification.

## 13. Concurrent-Agent planning

عند احتمال تعدد الوكلاء، سجّل في مواضع الحزمة الحالية:

```text
integration-sensitive owners
shared contracts/schemas/generated clients
shared files + symbols
migration/transaction collision zones
cross-unit/journey collision zones
must-not-overwrite paths
reconciliation triggers when TARGET_REF moves
```

الحزمة لا تنشئ distributed lock ولا تفترض أن `pinnedStartSha` سيبقى push baseline.

## 14. Package lifecycle — Create / Resume / Rebaseline

المسار الحالي يحدد من framework الحي، حاليًا تحت `plans/diagnose-implementing/<TASK_NAME>/`.

### بوابة ما قبل الإنشاء

لا تدخل هذه المرحلة إلا بعد:

```text
DIAGNOSIS = COMPLETE ENOUGH TO PLAN
MATERIAL_TRUE_DECISION_GAPS = 0
MATERIAL_UNRECORDED_FINDINGS = 0
SCOPE/OWNERS/CONTRACTS = RESOLVED OR EXPLICITLY EVIDENCE-BOUNDED
ACCEPTANCE/VERIFICATION = DEFINABLE WITHOUT GUESSING
```

قبل الإنشاء:

```text
ABSENT
→ create from current framework.

EXISTS + same task identity
→ RESUME_AND_RECONCILE; no overwrite/duplicate.

EXISTS + different identity
→ do not overwrite; distinct safe TASK_NAME.
```

وجود Package قديمة **لا يعني أن مرحلة التشخيص الحالية مكتملة**.

### Current-schema projection

عند استئناف حزمة قديمة:

1. اقرأ **الـSchema/Generator/Validator الحاليين**.
2. الحقول القديمة/الإضافية غير المعروفة للـSchema الحالي = `DERIVED_LEGACY_METADATA` نصيًا؛ لا تخلق requirement أو scope أو approval بذاتها.
3. لا تتبع fixed slices/journeys/policies قديمة إذا تعارضت مع الحوكمة الحالية.
4. أي old PASS/DONE/evidence يعاد تقييمه مقابل current truth وcandidate binding.
5. أي افتراض أو قرار داخل الحزمة لا يملك مصدرًا حاكمًا/إجابة قرار حالية يعاد فتحه كفرضية لا كحقيقة.

### Stale-package rebaseline

إذا كان drift محدودًا: reconcile affected paths/contracts/owners فقط.

إذا تغيرت authority/framework/schema ماديًا، أو كان drift واسعًا/غير قابل للحد بأمان:

```text
DO NOT replay hundreds of commits mechanically
→ mark old assumptions/evidence stale where affected
→ re-diagnose target against latest head
→ rewrite the derived plan/package as needed
→ preserve history through Git
```

الحزمة المشتقة لا تستحق استهلاكًا غير محدود لمجرد قدمها.

## 15. إنشاء الحزمة بأمان

عند Shell استخدم generator الحالي بصيغته الفعلية.

عند GitHub Remote/API بلا Shell:

```text
read generator + templates + validator
→ apply current name/repo/ref/SHA/path validations manually
→ prefer one atomic tree+commit for package creation
→ if unavailable, minimum conditional writes with head re-resolve
→ fetch every created file from remote
→ compare shape with current framework
→ never claim Validator PASS
```

في بيئة متعددة الوكلاء، per-file Contents API لا يساوي branch-head Compare-And-Swap؛ final multi-file package writes تفضّل Git tree/commit + non-force ref update عندما تتوفر.

## 16. Coverage / Units / Ordering

`COVERAGE.json` هو structured coverage ledger الوحيد. استخدم assessments الحالية من Validator/Schema.

```text
evidence/finding
→ root cause/owner
→ coverage
→ unit
→ task
→ verificationId
→ acceptance
→ RESULT later
```

أنشئ وحدة واحدة لكل executionConcern غير متداخل. Foundation/Migration فقط عند shared blocker مثبت.

كل وحدة تحدد:

```text
root cause + truth owner
paths/symbols
writers/readers/consumers
surfaces/journeys
ordered atomic tasks
must-not-change
acceptance
verification + proof limits
rollback/roll-forward
logical commit boundary
dependsOn/unlocks
```

رتب hard dependency → foundation blocker → critical path → central unlock → high-risk early → cleanup/finishing after functional migration but before final closure.

أي Finding مادي يجب أن يملك مسارًا واضحًا:

```text
Finding → Unit/Task → Acceptance → Verification
```

ولا يجوز أن يضيع Finding لأنه «مذكور في التقرير» فقط.

## 17. Verification plan + capability binding

اقرأ commands الحالية من manifests/scripts/workflows/registries:

```text
nearest root-cause check
→ unit/package integration
→ affected typecheck/lint/test/build
→ contract/data/security/isolation
→ runtime/readback/visual when claimed
→ failure/edge/adversarial checks
→ full verification only if proven/policy-required
```

كل Check يذكر:

```text
proves
doesNotProve
required capability
environment/profile
candidate/evidence binding expected during execution
```

اربط كل planned evidence scope بقدرة فعلية ومسار الحصول عليها قبل التسليم. لا تجعل Mock/Static proof خطة إثبات نهائي لClaim تشغيلي حقيقي.

## 18. Handoff Mapping إلزامي — بلا Schema موازٍ

```text
objective/claimed outcome → MANIFEST/START-HERE/GLOBAL-DIAGNOSIS
source classification/truth hierarchy → GLOBAL-DIAGNOSIS
root cause/owner/write path → unit DIAGNOSIS + EXECUTION
findings ledger → GLOBAL-DIAGNOSIS/COVERAGE + units
resolved decision answers → GLOBAL-DIAGNOSIS + relevant unit constraints
required/excluded surfaces → COVERAGE + affectedSurfaces/journeys
must-not-change → EXECUTION tasks
acceptance/readback → acceptanceCriteria + VERIFICATION
verification/proof limits → VERIFICATION
evidence scopes/limits → GLOBAL-DIAGNOSIS + VERIFICATION
protected approvals → current authority resolution recorded in diagnosis/closure planning
compatibility/migration/rollback → unit diagnosis/execution/verification
external dependency/reopen trigger → COVERAGE/order planning
concurrency collision zones → diagnosis/execution must-not-change/dependencies
cleanup/legacy/source-of-truth findings → explicit task + verification, not prose-only note
```

إذا عنصر لازم للإغلاق غير قابل للاستخراج من موضع واضح، الحزمة ليست Ready حتى لو لم يكتشفه Validator.

## 19. Readiness Gate

قبل التسليم:

```text
current schema/framework reconciled
source hierarchy applied; plans treated as derived support only
MANIFEST diagnosis COMPLETE + plan READY
material decision gaps = ZERO
no unresolved contradiction between user decisions and current authority/product truth
all material Findings recorded and mapped
coverage COMPLETE + zero required UNASSESSED
order READY
planned units READY/valid DONE
no missing/cyclic dependency
no duplicate concern
no vague task
no unknown verification
no unresolved marker
no hidden assumption required for execution
no secrets/PII/production-sensitive content
handoff mapping complete
collision/reconciliation risks assessed
cleanup/source-of-truth/reference integrity work mapped where applicable
```

عند توفر Shell شغّل current `validate-package ... --strict`. لا تدّع PASS بدونه.

Validator PASS لا يثبت صحة التشخيص أو المنتج أو Runtime إلا بقدر ما ينفذه Validator فعليًا.

## 20. التسليم والـLatest-Head Gate

```text
NO_COMMIT | COMMIT | COMMIT_AND_PUSH
```

اكتب الحزمة فقط. لا product/runtime/governance changes في هذا الأمر.

محليًا:

```text
inventory pre-existing changes
→ never claim foreign delta
→ stage explicit package paths/hunks only
→ inspect staged diff
```

مباشرة قبل final commit/push:

```text
resolve latest TARGET_REF
→ compare old base → latest
→ reconcile authority/framework/package-path semantic impact
→ invalidate/revisit affected diagnosis assumptions when needed
→ build package on latest safe head
→ fast-forward-safe push only
→ re-resolve after final write/push
```

إذا تحرك الرأس مرة أخرى، أعد البوابة. Git pull/merge success ليس semantic proof.

## 21. Retention

الحزمة `DERIVED_SUPPORT`. صنفها وفق repository-retention policy:

```text
actively consumed → retain while needed
task-temporary/superseded/unconsumed/reproducible → remove when authorized and safe
Git history = default archive
```

لا تخترع `--disposal`، ولا تستخدم الشجرة النشطة كأرشيف لنسخ `old/final2/backup/temp` غير المطلوبة.

## 22. التقرير والقرار

استخدم decision vocabulary الحالي فقط. `PASS` scoped وليس Final Closure.

```text
repository / target_ref
pinned_sha / final_observed_remote_sha
package_path / package_commit_sha
target + objective
source classification + authority/truth hierarchy
capabilities/tools/plugins actually used + limits
root causes + owners
Findings summary + unresolved evidence gaps
decision questions asked + resolved answers
coverage/units/order
handoff + evidence/approval plan
concurrency/reconciliation zones
compatibility/security/finance/data/runtime/design concerns
cleanup/legacy/source-of-truth/reference findings
strict validation actual result
remaining external evidence dependencies
retention classification
final decision
confirmation: no operational project file modified
```

### القرار المسموح

لا تقل إن التشخيص/الحزمة مكتملان إذا كان هناك:

```text
material decision gap
known unrecorded finding
material contradiction without disposition
required area still UNASSESSED
root cause/owner materially unknown without explicit evidence-bound blocker
execution task that still requires guessing
verification claim without acquisition path
```

الهدف النهائي لهذا الأمر ليس كثرة الوثائق، بل **حزمة مشتقة من أحدث حقيقة، لا تورّث أخطاء المسودات، لا تخفي مجهولًا، ولا تجبر منفذ الأمر 2 على اتخاذ قرارات منتجية أو معمارية من عنده أثناء التنفيذ**.
