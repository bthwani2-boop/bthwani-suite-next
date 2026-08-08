# الأمر 1 — التشخيص وإنشاء خطة تنفيذ قابلة للتنفيذ

Status: DERIVED_SUPPORT

استخدم هذا الأمر عندما يكون المطلوب **تشخيص مهمة/رحلة/تطبيق/سطح/قسم/صفحة/ميزة/خدمة/نطاق ثم تجهيز حزمة تنفيذ مكتفية ذاتيًا** دون تنفيذ تغييرات المنتج نفسها.

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

ابدأ من المرجع المثبت واقرأ فقط ما ينطبق وفق الترتيب الحاكم الحالي:

```text
current authorized task
→ governance/authority/authority-precedence.json
→ governance/GOVERNANCE.md
→ governance/product/PRD.md
→ applicable engineering/security/delivery policy
→ applicable capability Product Truth
→ applicable machine contracts/registries
→ exact pinned implementation/runtime/platform evidence
```

لا تجعل Prompt أو Plan أو تقريرًا أو Fixture أو Snapshot مصدر Product Truth أو Implementation/Runtime/Repository-Platform truth.

افصل دائمًا بين:

```text
AUTHORITY TRUTH            = من يملك السياسة والقرار والكتابة والموافقة.
PRODUCT TRUTH              = السلوك والحالات والنتيجة المطلوبة.
IMPLEMENTATION TRUTH       = الكود والعقود والمهاجرات والإعدادات والاختبارات على SHA المثبت.
RUNTIME TRUTH              = السلوك/الحفظ/readback المثبت فعليًا.
REPOSITORY-PLATFORM TRUTH  = حالة GitHub/CI/rulesets/reviews الحية عندما يعتمد الادعاء عليها.
```

## 2. تثبيت الريموت وقدرات المضيف

قبل أي ادعاء أو كتابة للحزمة:

1. ثبّت المستودع والفرع/المرجع بالاسم الذي حدده المستخدم؛ لا تستبدله بالفرع الافتراضي.
2. اجلب أحدث رأس ريموت وثبّت SHA كاملًا باسم `PINNED_REMOTE_SHA`.
3. اقرأ من المرجع المثبت فقط؛ الذاكرة والتقارير التاريخية فرضيات لا أدلة حالية.
4. أعد حل رأس الفرع مباشرة قبل دفعة كتابة الحزمة؛ إذا تحرك، صالح الأثر الدلالي قبل الكتابة.
5. لا Force Push ولا Reset ولا overwrite لعمل أحدث.

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

إذا كان المضيف GitHub Remote/API بلا Shell، لا تدّع تشغيل مولد أو Validator أو Test. اقرأ القوالب والـSchema الحالية قبل أي كتابة API، وأي تحقق غير منفذ يبقى `NEEDS_EVIDENCE` بدل PASS.

## 3. نموذج العمل والنطاق

استخدم `CODE_BASED_LEAN` و`AFFECTED_PLUS_RISK_EXPANSION`:

```text
أصغر نطاق كامل يكشف السبب الجذري
→ توسع بسبب مثبت فقط
→ خطة غير متداخلة
→ تحقق متناسب مع الأثر والمخاطر والادعاء
```

اسم التطبيق/السطح/الصفحة/الرحلة هو **نقطة بدء لا حدًا للنطاق**. وسّع فقط إذا أثبتت الملكية أو الاعتماديات أو Product Truth أو الأمن أو المال أو البيانات أو Runtime أو readback ارتباطًا مباشرًا أو انتقاليًا.

```text
DIAGNOSIS_SCOPE
= أصغر نطاق كامل يكشف السبب الجذري وكل علاقة لازمة للإغلاق.

EXECUTION_SCOPE
= الهدف + الاعتماديات المثبتة + الأساس المشترك اللازم لإغلاقه.
```

العنصر غير المرتبط يصنف بدليل، لا بالصمت. لا تحول كل عيب في المستودع إلى وحدة تنفيذ.

## 4. المصادر المشتقة

يمكن استخدام:

```text
plans/smsm-dsh-wlt-journeys/
plans/diagnose-implementing/ packages
historical plans/reports/evidence
```

للاكتشاف والمقارنة فقط. لا تفترض عدد رحلات أو شرائح ثابتًا، ولا تورث حالة/SHA/قرارًا تاريخيًا. صنّف أي ادعاء مشتق مادي إلى أحد:

```text
CONFIRMED
PARTIALLY_CONFIRMED
STALE
CONTRADICTED
INCOMPLETE
UNPROVEN
NOT_APPLICABLE
```

ولا تضف enum جديدًا إلى JSON إن لم يسمح الـSchema الحالي بذلك.

## 5. التشخيص وإثبات السبب الجذري

استخدم الدورة:

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

لا تعتمد أول تفسير. حاول إثبات أن Root Cause المقترح خاطئ، وابحث عن writer/reader/contract/state transition/runtime path بديل قبل تثبيته.

## 6. فحص الموجود قبل اقتراح الجديد

قبل إنشاء File/Component/Hook/Controller/API/Service/Migration/Guard/Test:

```text
search by name
→ search by semantics
→ inspect imports/exports/routes/navigation/registries/manifests
→ inspect API/DB/test bindings
→ use Graphify/Nx only if relationships remain ambiguous
```

الأولوية:

```text
REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW
```

ولا تخطط للحذف حتى يثبت عدم الاستهلاك أو يكتمل مسار الترحيل.

## 7. Full-Stack Multi-Surface trace

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

غطِّ عند الانطباق:

```text
success
invalid input
denied/forbidden/wrong scope
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

أي حلقة لازمة مفقودة = Finding وخطة، لا “سليم افتراضيًا”.

## 8. المخاطر الخاصة التي يجب أن تدخل الخطة عند الانطباق

### PostgreSQL / Migrations
- لا تعدّل Migration مطبقة؛ أنشئ forward migration جديدة.
- خطط `EXPAND → compatible code → BACKFILL → verify → switch writers → switch readers → remove fallbacks → CONTRACT` عند الحاجة.
- اختبر fresh/non-empty DB، البيانات المتعارضة/اليتيمة/المكررة، restart/partial failure، locks/index build/batching/idempotency، rollback أو roll-forward.
- لا تستخدم `IF NOT EXISTS` لإخفاء Drift معروف.

### Compatibility
عند تغيير API/Schema/Contract خطط لإثبات ما ينطبق:

```text
old mobile + new backend
new mobile + old backend عند الحاجة
current control-panel + new backend
generated-client/event/cache compatibility
mixed-version runtime
rollback/roll-forward
compatibility window: owner + expiry + removal trigger + monitoring/tests
```

لا تفترض تحديث كل تطبيقات الهاتف لحظيًا، ولا تخطط Dual-write أو fallback دائمًا.

### Security / Privacy
غطِّ auth/authz/session/token/secrets/PII/input-output validation/injection/SSRF/path traversal/upload/rate-limit/replay/IDOR/cross-scope/audit حسب الأثر. UI-only authorization غير مقبول.

### DSH / WLT
أي أثر مالي يمر عبر الحد الحاكم الحالي مع WLT مالك الحقيقة المالية، وidempotency/correlation/readback/reconciliation/unknown-result handling عند الانطباق.

### Mobile
عند التأثر افحص navigation/deep-links/Expo config/native permissions/push/maps/SecureStore/offline/native rebuild/OTA/EAS/signing/runtime env. نجاح Metro لا يثبت Native build.

### Control Panel
عند التأثر افحص route + object authorization، server/client boundaries، trusted scope selection، pagination/filter/search isolation، bulk/destructive actions، audit، session expiration، error mapping، optimistic rollback/readback، cross-surface readback.

## 9. إنشاء الحزمة من الإطار الحي فقط

المسار الحاكم الحالي:

```text
plans/diagnose-implementing/<TASK_NAME>/
```

استخدم فقط:

```text
plans/diagnose-implementing/_template/
plans/diagnose-implementing/new-package.mjs
plans/diagnose-implementing/new-unit.mjs
plans/diagnose-implementing/validate-package.mjs
```

عند توفر Shell:

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <TASK_NAME> `
  --branch <TARGET_REF> `
  --sha <PINNED_REMOTE_SHA> `
  --surface <TARGET> `
  --objective "<OBJECTIVE>" `
  --repository <REPOSITORY>
```

`--surface` اسم تقني للمدخل الحالي فقط. لا تغيّر `schemaVersion` ولا تخترع حقولًا إلزامية أو Framework موازياً.

## 10. Coverage والتتبّع

`COVERAGE.json` هو سجل التغطية المنظم الوحيد. استخدم فقط assessments التي يسمح بها الإطار الحالي، ولا تترك required coverage `UNASSESSED` عند الجاهزية.

كل concern مادي يجب أن يكون قابلاً للتتبع دون إنشاء Schema موازٍ:

```text
evidence/finding
→ root cause/truth owner
→ COVERAGE entry
→ execution unit
→ task
→ verificationId
→ acceptance criterion
→ RESULT عند التنفيذ لاحقًا
```

`RELATED` يحتاج evidence + unit links. الاستبعاد يحتاج evidence + reason + reopen trigger. الصمت ليس استبعادًا.

## 11. Foundation فقط عند ثبوت الحاجة

إذا كان الهدف Journey/Application/Surface أو متعدد الأسطح، افتح `FOUNDATION`/`MIGRATION` فقط عندما يثبت concern مشترك يمنع عدة وحدات أو يملك حقيقة مركزية. لا تستخدم Foundation ذريعة لمسح المستودع كاملًا.

أنشئ `FOUNDATION_CLOSURE_GATE` من نوع `VERIFICATION` عند وجود أساس مشترك لازم، واجعل الوحدات التابعة تعتمد عليه. إذا لم يوجد أساس مشترك مثبت، لا تخترع مرحلة ثقيلة لمجرد الشكل.

## 12. الوحدات غير المتداخلة

أنشئ وحدة واحدة لكل `executionConcern` حقيقي غير متداخل:

```powershell
node plans/diagnose-implementing/new-unit.mjs `
  plans/diagnose-implementing/<TASK_NAME> `
  --id <UNIT_ID> `
  --name <UNIT_NAME> `
  --kind <TOPIC|CONTEXT|JOURNEY|FOUNDATION|MIGRATION|CLEANUP|VERIFICATION> `
  --depends-on "<DEPENDENCIES>"
```

إذا كان Root Cause وTruth Owner واحدًا، لا تقسّمه شاشةً بشاشة أو سطحًا بسطح.

كل وحدة تحدد بدقة:

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

لا تستخدم أوامر عامة مثل “أصلح/راجع/حسّن/نظف/اربط” بلا target state ودليل وفحص.

## 13. ترتيب التنفيذ والتوازي

استخدم `dependsOn` كرسم بلا دورات. الأولوية:

```text
hard dependency
→ foundation blocker
→ critical path
→ central fix unlocking most journeys/surfaces
→ high-risk/high-uncertainty early
→ small high-impact
→ minimize reopening stabilized contract/schema/file
→ cleanup/non-blocking debt last
```

يمكن توازي القراءة والبحث وجمع الأدلة والفحوص المستقلة. خطط لوحدة كتابة واحدة `IN_PROGRESS` فقط، واجعل migrations/contracts/generated clients/shared truth writes والـcommits متسلسلة.

## 14. خطة التحقق

لا تخترع أوامر؛ اقرأها من `package.json` وworkspace/service manifests وruntime/workflow scripts الحالية.

```text
scoped inspection/search
→ nearest targeted test/check
→ package/unit integration
→ affected typecheck/lint/test/build
→ contract/binding/data/security checks
→ runtime/readback/visual evidence عندما يتطلب الادعاء
→ full verification فقط عند سبب مثبت
```

كل Check يجب أن يذكر `proves` و`doesNotProve`. Static PASS لا يثبت Runtime أو Security أو Finance أو Visual.

أي تغيير لاحق في canonical truth/authz/contract/generated client/schema/shared state/runtime foundation يجب أن يحدد الأدلة التي تصبح stale والفحوص التي يلزم إعادتها.

## 15. جاهزية الحزمة

قبل اعتماد الخطة:

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
```

عند توفر Shell شغّل:

```powershell
node plans/diagnose-implementing/validate-package.mjs `
  plans/diagnose-implementing/<TASK_NAME> `
  --strict
```

لا تستخدم `--closure` في مرحلة التخطيط ولا أي flag غير مدعوم. إذا لم يُشغّل Validator فعليًا فلا تدّع PASS.

## 16. التسليم والقرار

طبّق فقط:

```text
NO_COMMIT
COMMIT
COMMIT_AND_PUSH
```

Commit/Push الحزمة فقط، بلا تغييرات تشغيلية، بلا Force، وبلا PR/Merge/Release/Production ما لم يطلب ذلك صراحة بشكل منفصل.

استخدم `governance/contracts/decision-vocabulary.json` فقط. عادة:

- `PASS`: إعداد/strict scope محدد شُغّل ونجح فعليًا.
- `NEEDS_EVIDENCE`: الخطة موجودة لكن تحقق مطلوب مفقود أو stale.
- `FIX_REQUIRED`: نقص داخلي في الخطة/Schema/coverage/concerns.
- `BLOCKED_EXTERNAL`: مانع خارجي حقيقي بعد استنفاد العمل الداخلي الآمن.

التقرير المركز:

```text
repository / target_ref / pinned_sha
package_path / package_commit_sha إن وجد
target + objective
risk/scope summary
authority + derived sources used
root causes + truth owners
coverage + execution units + dependency order
compatibility/security/finance/data/runtime concerns
strict validation actual result
remaining unknown/external dependencies
final decision
confirmation: no operational project file modified
```
