# الأمر 1 — التشخيص العميق وإنشاء حزمة تنفيذ قابلة للتنفيذ

Status: DERIVED_SUPPORT

استخدم هذا الأمر عندما يكون المطلوب **تشخيص مهمة/رحلة/تطبيق/سطح/قسم/صفحة/ميزة/خدمة/نطاق بعمق ثم تجهيز حزمة تنفيذ مكتفية ذاتيًا** دون تنفيذ تغييرات المنتج نفسها.

> هذا Prompt مساعد مشتق. لا يملك Product Truth أو سلطة حوكمة أو موافقة. اقرأ القيم والـenums والـflags من العقود والإطار الحي على المرجع المثبت؛ أي قائمة مكتوبة هنا وصف للحالة الحالية لا بديلًا عن المصدر الحاكم.

## المدخلات

```text
REPOSITORY: <owner/repo>
TARGET_REF: <branch-or-ref>
TASK_NAME: <safe-kebab-name>
TARGET_KIND: <JOURNEY | APPLICATION | SURFACE | SECTION | PAGE | FEATURE | SERVICE | DOMAIN | FILE | OTHER>
TARGET: <name/path/outcome>
PROBLEM: <observed problem or gap>
OBJECTIVE: <measurable desired outcome>
EXCLUSIONS: <[] or explicit exclusions>
DELIVERY: <NO_COMMIT | COMMIT | COMMIT_AND_PUSH>
```

الهدف الوحيد هنا هو **التشخيص والتخطيط وإعداد الحزمة**. لا تعدّل كود المنتج أو العقود أو قواعد البيانات أو الهجرات أو Runtime أو الاختبارات أو الحوكمة خارج مجلد الحزمة.

## 1. السلطة والحقيقة

ابدأ من المرجع المثبت واقرأ ما ينطبق وفق ترتيب السلطة الحاكم الحالي:

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

افصل دائمًا بين:

```text
AUTHORITY TRUTH            = من يملك السياسة والقرار والكتابة والموافقة.
PRODUCT TRUTH              = السلوك والحالات والنتيجة المطلوبة.
IMPLEMENTATION TRUTH       = الكود والعقود والمهاجرات والإعدادات والاختبارات على SHA المثبت.
RUNTIME TRUTH              = السلوك/الحفظ/readback المثبت فعليًا.
REPOSITORY-PLATFORM TRUTH  = حالة GitHub/CI/rulesets/reviews الحية عندما يعتمد الادعاء عليها.
```

لا تجعل Prompt أو Plan أو Package أو Report أو Fixture أو Snapshot مصدرًا لأي حقيقة أعلى منه.

## 2. تثبيت الريموت والقدرات

قبل أي ادعاء أو كتابة للحزمة:

1. ثبّت `REPOSITORY` و`TARGET_REF` بالاسم الذي حدده المستخدم؛ لا تستبدلهما بالافتراضي.
2. اجلب أحدث رأس ريموت كاملًا باسم `PINNED_REMOTE_SHA`.
3. اقرأ من ذلك SHA؛ الذاكرة والتقارير التاريخية فرضيات فقط.
4. أعد حل رأس الفرع مباشرة قبل كل logical write batch.
5. إذا تحرك الرأس، قارن `PINNED_REMOTE_SHA → LATEST_REMOTE_SHA` وصالح الأثر الدلالي قبل الكتابة.
6. بعد آخر كتابة/Push أعد حل `TARGET_REF` وسجّل `FINAL_OBSERVED_REMOTE_SHA`؛ لا تعتبر التسليم مثبتًا قبل ذلك.
7. لا Force Push ولا Reset ولا overwrite لعمل أحدث.

سجّل Capability Preflight الأساسي ثم وسّعه حسب الأدلة المخطط لها:

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
CAN_ACCESS_PROVIDER
CAN_VERIFY_PRODUCTION
CAN_COMMIT
CAN_PUSH
```

لا يلزم أن تكون كلها متاحة؛ يلزم تحديد ما ينطبق وما هو متاح. قدرة مطلوبة وغير متاحة تصبح requirement/blocker/evidence gap في الخطة ولا تُخفى.

إذا كان المضيف GitHub Remote/API بلا Shell، لا تدّع تشغيل Generator أو Validator أو Test. طبّق validations التي يطبقها الإطار الحالي يدويًا بقدر ما يمكن إثباته، ثم أعد قراءة كل الملفات المكتوبة من الريموت. أي تحقق لم يُنفذ يبقى غير مثبت.

## 3. نموذج العمل والنطاق

استخدم `CODE_BASED_LEAN` و`AFFECTED_PLUS_RISK_EXPANSION`:

```text
أصغر نطاق كامل يكشف السبب الجذري
→ توسع بسبب مثبت فقط
→ خطة غير متداخلة
→ تحقق متناسب مع الأثر والمخاطر والادعاء
```

اسم التطبيق/السطح/الصفحة/الرحلة **نقطة بدء لا حدًا للنطاق**. وسّع فقط بسبب ملكية/اعتمادية/Product Truth/أمن/مال/بيانات/Runtime/readback مثبتة.

```text
DIAGNOSIS_SCOPE
= أصغر نطاق كامل يكشف السبب الجذري وكل علاقة لازمة للإغلاق.

EXECUTION_SCOPE
= الهدف + الاعتماديات المثبتة + الأساس المشترك اللازم لإغلاقه.
```

العنصر غير المرتبط يصنف بدليل، لا بالصمت. لا تحول كل عيب في المستودع إلى وحدة تنفيذ.

## 4. التغطية المزروعة ليست أمر مسح شامل

قد يزرع مولد الحزمة Coverage لكل الأسطح/المجالات الموجودة. تعامل معها كـ**assessment ledger** لا كأمر لقراءة كل ملف في المستودع.

```text
Seeded coverage entry
→ bounded relevance check
→ if relation is proven: RELATED + evidence + unit
→ if non-relation is proven: supported exclusion + reason + reopen trigger
→ deepen inspection only when evidence indicates relation or uncertainty material to closure
```

لا تستخدم عبارة `repository-wide diagnosis` في Tool output لتجاوز `CODE_BASED_LEAN`. المطلوب تقييم كل required coverage entry، وليس إجراء deep scan مستقل لكل entry.

## 5. المصادر المشتقة

يمكن استخدام الموجود فعليًا مثل:

```text
plans/smsm-dsh-wlt-journeys/
plans/diagnose-implementing/ packages
historical plans/reports/evidence
```

للاكتشاف والمقارنة فقط. لا تورث حالة/SHA/قرارًا تاريخيًا ولا تفترض عدد رحلات ثابتًا. صنّف الادعاء المشتق نصيًا مثل:

```text
CONFIRMED
PARTIALLY_CONFIRMED
STALE
CONTRADICTED
INCOMPLETE
UNPROVEN
NOT_APPLICABLE
```

ولا تضف enum إلى JSON إن لم يسمح Schema الحالي به.

## 6. التشخيص وإثبات السبب الجذري

استخدم:

```text
DISCOVER → DIAGNOSE → CROSS-CHECK → CHALLENGE → RE-DIAGNOSE → PLAN → VERIFY_PLAN
```

لكل Finding مادي أثبت:

```text
path/symbol
observed problem
evidence
competing hypothesis checked
root cause
canonical truth/write owner
writers/readers/consumers
affected surfaces/journeys
security/data/financial/runtime/scope risk
required target state
required verification
```

لا تعتمد أول تفسير. حاول تكذيب Root Cause وابحث عن writer/reader/contract/state-transition/runtime path بديل قبل تثبيته.

## 7. الموجود قبل الجديد

قبل إنشاء File/Component/Hook/Controller/API/Service/Migration/Guard/Test:

```text
search by name
→ search by semantics
→ inspect imports/exports/routes/navigation/registries/manifests
→ inspect API/DB/test bindings
→ use relationship tools only if ambiguity remains
```

الأولوية:

```text
REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW
```

لا تخطط للحذف حتى يثبت عدم الاستهلاك أو يكتمل الترحيل.

## 8. Full-Stack Multi-Surface trace

لكل Capability/Journey مرتبطة تتبع بقدر الانطباق:

```text
Product Truth
→ Actor / Service Identity
→ Session/Device
→ Platform/Operator/Partner/Store/Assignment trusted scope
→ Role/Permission/Object authorization
→ Surface/Route/Screen/Control
→ Shared controller/adapter
→ Generated Client
→ Canonical Contract
→ API/Handler
→ Domain policy/State machine
→ Repository/Transaction/Database
→ Cache/Idempotency
→ Event/Outbox/Job/Provider
→ WLT when financial
→ Persisted Effect
→ Canonical Readback
→ Every required consuming surface
→ Audit/Observability
→ Runtime evidence
```

غطِّ عند الانطباق success/invalid/denied/wrong-scope/forbidden-state/duplicate/replay/race/concurrency/timeout/unknown-result/offline/reconnect/retry/partial-failure/restart/mixed-version/compensation/reconciliation.

أي حلقة لازمة مفقودة = Finding وخطة، لا “سليم افتراضيًا”.

## 9. المخاطر الخاصة

### PostgreSQL / Migrations
- لا تعدّل Migration مطبقة؛ أنشئ forward migration جديدة.
- خطط `EXPAND → compatible code → BACKFILL → verify → switch writers → switch readers → remove fallbacks → CONTRACT` عند الحاجة.
- غطِّ fresh/non-empty DB، drift/conflicting/orphan/duplicate data، locks/index build/batching/idempotency، restart/partial failure، rollback/roll-forward.
- لا تستخدم `IF NOT EXISTS` لإخفاء Drift معروف.

### Compatibility
عند API/Schema/Contract/Mobile-facing change خطط لما ينطبق:

```text
old mobile + new backend
new mobile + old backend عند الحاجة
current control-panel + new backend
generated-client/event/cache compatibility
mixed-version runtime
rollback/roll-forward
compatibility window: owner + expiry + removal trigger + monitoring/tests
```

### Security / Privacy
غطِّ auth/authz/session/token/secrets/PII/input-output validation/injection/SSRF/path traversal/upload/rate-limit/replay/IDOR/cross-scope/audit حسب الأثر. UI-only authorization غير مقبول.

### DSH / WLT
أي أثر مالي يمر عبر الحد الحاكم الحالي مع WLT مالك الحقيقة المالية، مع idempotency/correlation/readback/reconciliation/unknown-result handling عند الانطباق.

### Mobile
افحص navigation/deep-links/Expo config/native permissions/push/maps/SecureStore/offline/native rebuild/OTA/EAS/signing/runtime env عند التأثر. Metro success لا يثبت Native build.

### Control Panel
افحص route/object authorization، server/client boundaries، trusted scope، pagination/filter/search isolation، bulk/destructive actions، audit، session expiration، error mapping، rollback/readback، cross-surface readback.

## 10. Concurrent-Agent planning

إذا كان تعدد الوكلاء معروفًا أو محتملًا، لا تفترض أن `pinnedStartSha` سيبقى baseline التنفيذ النهائي. سجّل في الحزمة بمواضعها الحالية:

```text
integration-sensitive owners
shared contracts/schemas/generated clients
shared files and symbols
migration/transaction collision zones
cross-unit/journey collision zones
must-not-overwrite paths
reconciliation triggers if TARGET_REF moves
```

الحزمة لا تنشئ lock عالميًا ولا تدّعي ملكية حصرية للفرع؛ هي تخطط لمواضع الاصطدام كي يحسمها الأمر 2 مقابل أحدث رأس فعلي.

## 11. إنشاء/استئناف الحزمة من الإطار الحي

المسار الحالي:

```text
plans/diagnose-implementing/<TASK_NAME>/
```

اقرأ الإطار والـSchema والـValidator الحاليين قبل الاستخدام. القيم المكتوبة في هذا Prompt ليست authority ثابتة.

### Collision / Resume policy

قبل الإنشاء افحص `PACKAGE_PATH`:

```text
ABSENT
→ create from current framework.

EXISTS + same repository/branch/objective/task identity
→ RESUME_AND_RECONCILE; لا overwrite ولا package مكرر.

EXISTS + stale/superseded but semantically same task
→ inspect retention/history; resume or choose a new explicit task name only with a recorded reason.

EXISTS + different task identity
→ do not overwrite; choose a distinct safe TASK_NAME.
```

عند توفر Shell استخدم المولد الحالي وأوامره الفعلية. مثال الحالة الحالية فقط:

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <TASK_NAME> `
  --branch <TARGET_REF> `
  --sha <PINNED_REMOTE_SHA> `
  --surface <TARGET> `
  --objective "<OBJECTIVE>" `
  --repository <REPOSITORY>
```

عند GitHub Remote/API بلا Shell:

1. اقرأ generator/templates/validator الحاليين.
2. طبّق قيود الاسم/repository/ref/40-SHA والمسار كما يطبقها الإطار بقدر ما هو قابل للإثبات.
3. أنشئ logical package write ذريًا قدر الإمكان (`tree + commit` واحد عند دعم API).
4. إذا تعذر atomic write، أعد تثبيت الرأس واستخدم conditional current-SHA writes بين الدفعات؛ لا تترك partial package بلا تصريح.
5. أعد قراءة كل ملفات الحزمة من الريموت بعد الكتابة وقارن shape بالقوالب الحالية.
6. لا تدّع Validator PASS دون تشغيله فعليًا.

## 12. Coverage والتتبّع

`COVERAGE.json` هو سجل التغطية المنظم الوحيد. استخدم assessments الحالية من Schema/Validator ولا تترك required coverage `UNASSESSED` عند الجاهزية.

```text
evidence/finding
→ root cause/truth owner
→ COVERAGE entry
→ execution unit
→ task
→ verificationId
→ acceptance criterion
→ RESULT لاحقًا
```

`RELATED` يحتاج evidence + unit links. الاستبعاد يحتاج evidence + reason + reopen trigger. الصمت ليس استبعادًا.

## 13. Foundation والوحدات

افتح `FOUNDATION`/`MIGRATION` فقط عندما يثبت concern مشترك يمنع عدة وحدات أو يملك حقيقة مركزية. لا تجعل Foundation مسحًا شاملاً.

أنشئ وحدة واحدة لكل `executionConcern` حقيقي غير متداخل وفق kinds الحالية من الإطار. إذا كان Root Cause وTruth Owner واحدًا، لا تقسّمه شاشةً بشاشة.

كل وحدة تحدد:

```text
root cause / truth owner
paths + symbols
writers/readers/consumers
surfaces/journeys
ordered atomic tasks
must-not-change
acceptance criteria
verification IDs + proof limits
rollback/roll-forward
logical commit boundary
dependsOn + what it unlocks
```

لا تستخدم أوامر عامة بلا target state ودليل وفحص.

## 14. ترتيب التنفيذ والتوازي

استخدم `dependsOn` كرسم بلا دورات. الأولوية:

```text
hard dependency
→ foundation blocker
→ critical path
→ central fix unlocking most consumers
→ high-risk/high-uncertainty early
→ small high-impact
→ minimize reopening stabilized truth
→ cleanup/non-blocking debt last
```

يمكن توازي القراءة والبحث وجمع الأدلة. داخل **الحزمة الواحدة** اتبع قيود الإطار الحالي على وحدات الكتابة، ولا تجعل ذلك ادعاء lock على وكلاء خارجيين أو workspaces أخرى.

## 15. خطة التحقق والقدرات

اقرأ الأوامر الفعلية من manifests/scripts/workflows/registries الحالية؛ لا تخترع commands.

```text
scoped inspection/search
→ nearest root-cause test/check
→ package/unit integration
→ affected typecheck/lint/test/build
→ contract/binding/data/security/isolation checks
→ runtime/readback/visual evidence عندما يتطلب الادعاء
→ full verification فقط بسبب مثبت أو policy
```

كل Check يذكر `proves` و`doesNotProve`. اربط كل evidence scope مخطط بقدرة فعلية أو بمسار الحصول عليها؛ لا تنتظر نهاية التنفيذ لاكتشاف أن الدليل غير ممكن.

أي تغيير لاحق في canonical truth/authz/contract/generated client/schema/shared state/runtime foundation يحدد الأدلة التي تصبح stale والفحوص التي يلزم إعادتها.

## 16. Execution/Review Handoff Contract — Mapping إلزامي

لا تنشئ Schema موازٍ. اجعل معلومات التسليم قابلة للاستخراج من **مواضعها الحاكمة داخل الحزمة الحالية**:

```text
claimed outcome / objective
→ MANIFEST.task.objective + START-HERE/GLOBAL-DIAGNOSIS عند الحاجة

canonical owner / root cause / canonical write path
→ unit DIAGNOSIS + EXECUTION.truthOwner/tasks

required/excluded surfaces/journeys
→ COVERAGE + unit affectedSurfaces/journeys

must-not-change boundaries
→ unit EXECUTION tasks.mustNotChange

final acceptance + verification IDs + proof limits
→ unit EXECUTION.acceptanceCriteria + VERIFICATION

canonical persisted readback
→ acceptanceCriteria/verification claim that names the readback explicitly

expected evidence scopes + evidence acquisition limits
→ GLOBAL-DIAGNOSIS and applicable VERIFICATION.proves/doesNotProve

protected/independent approvals
→ GLOBAL-DIAGNOSIS/CLOSURE planning section, resolved from current authority contracts

compatibility/migration/rollback
→ unit DIAGNOSIS/EXECUTION/VERIFICATION

external dependency + reopen/resume trigger
→ COVERAGE exclusion/external dependency + execution ordering/result planning
```

إذا لم يمكن استخراج عنصر لازم للإغلاق من موضع واضح، الحزمة ليست Ready حتى لو لم يكشفه Validator الحالي.

## 17. جاهزية الحزمة

قبل اعتماد الخطة أثبت بقدر الإطار الحالي:

```text
MANIFEST diagnosis = COMPLETE
MANIFEST plan = READY
COVERAGE assessment = COMPLETE
EXECUTION-ORDER = READY
all planned units = READY أو valid pre-proven DONE
zero required UNASSESSED
no missing/cyclic dependency
no duplicate executionConcern
no vague task
no unknown verificationId
no unresolved template marker
no secret/PII/production-sensitive content
handoff mapping complete
concurrent collision zones/reconciliation triggers assessed when applicable
```

عند توفر Shell شغّل `validate-package.mjs <PACKAGE_PATH> --strict` بصيغته الحالية. لا تستخدم flags غير مدعومة ولا تدّع PASS دون التنفيذ.

## 18. التسليم الآمن

```text
NO_COMMIT
COMMIT
COMMIT_AND_PUSH
```

Commit/Push الحزمة فقط، بلا تغييرات تشغيلية وبلا Force/PR/Merge/Release/Production دون تفويض مستقل.

### Local workspace safety

إذا كانت الكتابة محلية، سجّل قبلها:

```text
LOCAL_WORKSPACE_ID
PRE_EXISTING_LOCAL_CHANGES
INTENDED_PACKAGE_PATHS
```

لا تعتبر أي تغيير موجود مسبقًا ملكًا لك. لا تستخدم أوامر جماعية قد تلتقط تغييرات أجنبية. Stage paths الحزمة المقصودة فقط وافحص staged diff قبل Commit.

### Latest-head write gate

مباشرة قبل Commit/Push نهائي للحزمة:

```text
resolve latest TARGET_REF
→ compare PINNED_REMOTE_SHA → LATEST_REMOTE_SHA
→ classify concurrent delta
→ reconcile authority/framework/package-path impacts
→ write only onto latest safe head
→ re-resolve immediately after final write/push
```

إذا تحرك الرأس مرة أخرى قبل الكتابة، أعد البوابة. لا تعتمد `git pull` أو merge ميكانيكيًا كبديل عن semantic reconciliation.

## 19. Retention classification

الحزمة `DERIVED_SUPPORT`. عند نهاية المهمة خطط لتصنيفها وفق repository-retention policy الحالية:

```text
still actively consumed → retain while needed
superseded / task-temporary / unconsumed / reproducible → remove when authorized and safe
Git history = default archive
```

لا تخترع `--disposal`. الحذف نفسه تغيير مستودع يحتاج current-task authority ويجب ألا يكون Runtime/Build/CI/Migration/Governance/Operations معتمدًا على الحزمة.

## 20. القرار والتقرير

استخدم `governance/contracts/decision-vocabulary.json` الحالي فقط. `PASS` يخص claim/evidence scope محددًا وليس Final Closure.

التقرير المركز:

```text
repository / target_ref
pinned_sha / final_observed_remote_sha
package_path / package_commit_sha إن وجد
target + objective
risk/scope summary
root causes + truth owners
coverage + units + dependency order
handoff mapping
concurrency/collision zones
compatibility/security/finance/data/runtime concerns
strict validation actual result
remaining unknown/external dependencies
retention classification
final decision
confirmation: no operational project file modified
```
