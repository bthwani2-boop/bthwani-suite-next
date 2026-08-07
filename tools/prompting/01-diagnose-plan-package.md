# الأمر الأول — إعداد حزمة التشخيص وخط الأساس وخطة التنفيذ

> **التصنيف وحدود السلطة:** هذا الملف Prompt تنفيذي قابل لإعادة الاستخدام، وهو أداة دعم مشتقة لا تنشئ سياسة ولا تملك حقيقة المنتج أو البيانات أو العقود أو الموافقات. عند أي تعارض تُطبّق تعليمات المهمة الحالية ثم `governance/authority/authority-precedence.json` ثم `AGENTS.md` ثم المصادر الحاكمة التي يسجلها المرجع المثبت. لا تجعل اسم هذا الملف أو أي Prompt أو تقرير أو سجل رحلات أعلى سلطة من المستودع الحاكم.

## 0. المدخلات

```text
المستودع: <OWNER/REPOSITORY>
الفرع أو المرجع: <BRANCH_OR_REF>
اسم الحزمة: <TASK_NAME>
نوع نقطة البداية: <JOURNEY | APPLICATION | SURFACE | SECTION | PAGE | FEATURE | FILE | SERVICE | DOMAIN | OTHER>
نقطة البداية: <TARGET>
النتيجة التشغيلية المطلوبة: <MEASURABLE_OBJECTIVE>
تفويض التسليم: <NO_COMMIT | COMMIT | COMMIT_AND_PUSH>
```

نفّذ **مرحلة التشخيص والتخطيط وإعداد الحزمة فقط**. لا تعدّل في هذه المرحلة كود المنتج أو العقود أو قواعد البيانات أو الهجرات أو Runtime أو الاختبارات أو الحوكمة خارج مجلد الحزمة.

الهدف هو حزمة مكتفية ذاتيًا يستطيع منفذ آخر استخدامها دون إعادة اكتشاف النطاق أو تخمين مالك الحقيقة أو اختراع الاختبارات أو شروط الإغلاق.

## 1. معيار الدقة ونموذج العمل

استخدم `CODE_BASED_LEAN`:

```text
أصغر فحص كامل يكشف السبب الجذري
→ توسع مثبت بالأدلة فقط
→ خطة ذرية غير متداخلة
→ تحقق متناسب مع الادعاء
```

عبارات مثل «عميق»، «شامل» أو «100%» ترفع معيار الدليل؛ لا تبرر تلقائيًا قراءة كل ملف أو كل حوكمة أو تشغيل Full Graphify أو Full Nx أو كامل typecheck/build/test/guards.

اعتبر النجاح الشكلي ممنوعًا:

```text
ZERO_FALSE_SUCCESS
ZERO_UNASSESSED_REQUIRED_COVERAGE
ZERO_UNMAPPED_RELATED_CONCERN
ZERO_UNOWNED_WRITE_PATH
ZERO_UNJUSTIFIED_PARALLEL_TRUTH
ZERO_UNPROVEN_CLOSURE
```

واستخدم عند التشخيص:

```text
DISCOVER → DIAGNOSE → CROSS-CHECK → CHALLENGE → RE-DIAGNOSE → PLAN → VERIFY_PLAN
```

## 2. تثبيت الحقيقة الريموت وقدرات المضيف

قبل أي ادعاء أو كتابة:

1. تحقق من المستودع والفرع/المرجع المطلوبين.
2. اجلب أحدث رأس ريموت وثبّت SHA كاملًا بطول 40 حرفًا باسم `PINNED_REMOTE_SHA`.
3. ابنِ الأدلة على هذا الـSHA فقط؛ لا تعتمد على الذاكرة أو نسخة محلية أو محادثة أو تقرير سابق لإثبات واقع الريموت.
4. أعد حل المرجع قبل أي دفعة كتابة، وإذا تحرك الفرع فلا تكتب فوق عمل أحدث؛ حل الانحراف أولًا.
5. لا تضع SHA ثابتًا داخل هذا الأمر الدائم.

نفّذ Capability Preflight وسجّل ما هو متاح فعلًا:

```text
CAN_READ_REPOSITORY
CAN_WRITE_REPOSITORY
CAN_EXECUTE_SHELL
CAN_RUN_NODE
CAN_RUN_VALIDATOR
CAN_COMMIT
CAN_PUSH
```

إذا كان المضيف GitHub Remote/API بلا Shell، لا تدّع تشغيل `new-package.mjs` أو `new-unit.mjs` أو `validate-package.mjs`. إن سمحت المهمة الحالية بالكتابة الريموت فقط، يجوز إنشاء ناتج مطابق حرفيًا للمولد والقوالب الحالية عبر GitHub، لكن لا تخترع schema أو حقولًا أو enums، وتبقى نتيجة التحقق `NEEDS_EVIDENCE` حتى يُشغّل `--strict` فعليًا في بيئة قابلة للتنفيذ. إذا كانت المهمة تشترط تشغيل المولد نفسه ولا توجد قدرة تنفيذ، استخدم `BLOCKED_EXTERNAL` بدل التحايل.

## 3. السلطة مقابل الواقع

لا تخترع ترتيب سلطة ثابتًا؛ اقرأ `governance/authority/authority-precedence.json` على SHA المثبت وطبّقه. كحد أدنى افصل بين:

```text
AUTHORITY / NORMATIVE TRUTH
من يملك السياسة والقرار والبيانات والعقد وما الذي يجب أن يكون.

IMPLEMENTATION TRUTH
ما يفعله المصدر والعقود والمخططات والإعدادات والاختبارات على SHA المثبت.

RUNTIME TRUTH
ما يحدث فعليًا عند التشغيل عندما يكون الادعاء تشغيليًا.
```

اقرأ فقط المصادر الحاكمة المنطبقة فعليًا. لا تسمح للكود أن يمنح نفسه ملكية تخالف سلطة أعلى، ولا تسمح لمصدر مشتق أن يصبح حقيقة حاكمة لمجرد اسمه.

استخدم عند الانطباق كمصادر مساعدة لا كسلطة مستقلة:

```text
tools/BThwani-unified-execution-command-final-authoritative.md
governance/operational_journey_protocol_package/
governance/operational_journey_protocol_package/smsm-dsh-wlt-journeys/
journey registries / plans / reports / historical artifacts
```

كل ادعاء مادي منها يُثبت مقابل المصادر الأعلى والكود والعقود والبيانات وRuntime. صنّفه تشخيصيًا عند الحاجة إلى:

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

هذه تصنيفات نصية للتشخيص وليست enums جديدة لـ`COVERAGE.json`.

خصوصًا `smsm-dsh-wlt-journeys`: لا تفترض عدد الرحلات أو ترتيبها أو اكتمالها أو وجوب 24 شريحة حرفيًا. استخدمها عدسة اكتشاف ومقارنة فقط، ثم أثبت كل ما يهم على المرجع الحالي.

## 4. إنشاء الحزمة من الإطار الحالي

المسار الوحيد:

```text
tools/diagnose-implementing/<TASK_NAME>/
```

اقرأ واستخدم الإطار الموجود فعليًا على SHA المثبت:

```text
tools/diagnose-implementing/_template/
tools/diagnose-implementing/new-package.mjs
tools/diagnose-implementing/new-unit.mjs
tools/diagnose-implementing/validate-package.mjs
```

عند توفر التنفيذ استخدم:

```powershell
node tools/diagnose-implementing/new-package.mjs `
  --name <TASK_NAME> `
  --branch <BRANCH_OR_REF> `
  --sha <PINNED_REMOTE_SHA> `
  --surface "<TARGET>" `
  --objective "<TARGET_KIND>: <MEASURABLE_OBJECTIVE>" `
  --repository <OWNER/REPOSITORY>
```

`--surface` اسم تقني لمدخل المولد الحالي ولا يعني أن الهدف Surface. سجّل نوع الهدف الحقيقي داخل المواضع التي يسمح بها المخطط الحالي دون تغيير `schemaVersion`.

يُمنع إنشاء Framework موازٍ أو إعادة أشجار `topics/contexts/journeys` المستقلة. `COVERAGE.json` هو سجل التغطية المنظم الوحيد.

أنواع الوحدات المدعومة حاليًا فقط:

```text
TOPIC | CONTEXT | JOURNEY | FOUNDATION | MIGRATION | CLEANUP | VERIFICATION
```

## 5. نطاق التشخيص ونطاق التنفيذ

طبّق:

```text
COVERAGE_SCOPE
= قيّم كل عناصر COVERAGE.json المولدة، بمستوى مضغوط حيث يكفي الدليل.

DEEP_DIAGNOSIS_SCOPE
= الهدف + كل concern يثبت ارتباطه أو مخاطره أو حاجته لدليل أعمق.

EXECUTION_SCOPE
= الهدف + كل اعتماد مباشر/انتقالي مثبت
  + كل Foundation أو Shared prerequisite لازم لإغلاقه.
```

قيّم كل seeded coverage entry، لكن لا تفحص كل ملف تفصيليًا بلا سبب. توسع إلى المسار/الرمز/القارئ/الكاتب/الحالة/الرحلة فقط عندما يثبت الارتباط أو العيب المادي.

يصبح العنصر مرتبطًا عندما يثبت أنه يملك الحقيقة أو الكتابة، يقرأ/يكتب الحالة، يبدأ أو يكمل رحلة، يعتمد على نتيجتها، يعرضها على Surface آخر، يستهلك العقد/الخدمة/الجدول/الحدث نفسه، يعتمد على الهوية/الصلاحية/التكليف/النطاق نفسه، يحمل أثرًا تشغيليًا/ماليًا/أمنيًا/تدقيقيًا، يحتوي نسخة قديمة أو موازية من الحقيقة، أو يلزم اختباره لإثبات الإغلاق.

استخدم **فقط** assessments الحالية في `COVERAGE.json`:

```text
UNASSESSED
RELATED
NOT_RELATED_WITH_EVIDENCE
DEFECT_OUTSIDE_EXECUTION_SCOPE
EXTERNAL_DEPENDENCY
```

العنصر `RELATED` يجب أن يربط دليلًا ووحدة. الاستبعاد يحتاج دليلًا وسببًا و`reopenTrigger`. الصمت ليس استبعادًا.

## 6. التشخيص متعدد العدسات والمضاد

نفّذ فقط العدسات المنطبقة، وبالعمق الذي يتطلبه الدليل:

- المعمارية: Domain boundaries، Truth owners، write authority، dependency direction، imports، parallel truths، Shared Brains.
- المنتج والتشغيل: Actors، outcomes، states، invariants، predecessors/successors، failure/compensation.
- Identity/Security: session/device، roles، permissions، assignments، trusted scopes، object authorization، IDOR، privilege escalation، isolation، audit.
- العقود والعملاء: OpenAPI/schema، request/response/errors، generated clients، provenance، compatibility، handwritten parallel types.
- Backend: handlers، commands/queries، domain policy، state machines، repositories، transactions، validation، idempotency/concurrency.
- PostgreSQL: migrations، schema، constraints، keys، indexes، integrity، backfill، compatibility، rollback/compensation.
- Events/Jobs/Integrations: outbox/inbox، queues، DLQ، retries، dedupe، provider failure، timeout، unknown result، recovery.
- Surfaces/UI: routes/screens/pages/controls/forms/navigation/deep links وكل الحالات المرئية المرتبطة.
- Runtime/Observability: env، Docker، ports، health/readiness، logs/metrics/traces، startup/recovery.
- Tests: ماذا يثبت كل اختبار؟ ماذا لا يثبت؟ وهل يمكن أن يمر والمنتج مكسور؟
- Cleanup: dead code، stale routes، backups، duplicated contracts/state machines، legacy endpoints، mocks/fixtures/fallbacks في المسارات الحية.

بعد فرض Root Cause، حاول إثبات أنه خاطئ: ابحث عن writer/reader/contract/state/runtime path بديل، وحدد هل المشكلة عرض أم سبب، وهل الحل سيكسر رحلة أو Surface آخر. لا تعتمد السبب الجذري قبل استبعاد البدائل المادية المعقولة.

## 7. PHASE-00 — BASELINE_STABILIZATION

ابدأ الخطة بخط أساس **مرتبط بالمهمة فقط**؛ ليس الهدف إصلاح المستودع كله.

افحص عند الانطباق: authority consistency، canonical ownership، identity/security/trusted scope، database/migration integrity، contracts/generated clients، service boundaries، shared state machines/brains، shared reads/writes، events/jobs، runtime health/readiness، foundational guards/tests، parallel truths.

صنّف الفجوات تشخيصيًا:

```text
FOUNDATION_BLOCKER
SHARED_PREREQUISITE
JOURNEY_PREREQUISITE
JOURNEY_LOCAL
SHARED_OPTIMIZATION
NON_BLOCKING_DEBT
EXTERNAL_DEPENDENCY
```

أي خلل يضرب عدة رحلات/أسطح أو مصدر حقيقة مركزي يُرفع إلى وحدة مشتركة `FOUNDATION` أو `MIGRATION`؛ ممنوع إصلاح السبب المركزي مرة في كل رحلة.

أنشئ وحدة `VERIFICATION` تمثل `FOUNDATION_CLOSURE_GATE` وتعتمد على وحدات الأساس المنطبقة. حتى إن لم توجد فجوة تأسيسية، يجب أن تثبت البوابة صلاحية الأساس. كل Journey مرتبطة يجب أن تعتمد عليها مباشرة أو انتقاليًا.

خطط لتشغيل `pnpm run guard:foundation` فقط عندما يكون موجودًا ومنطبقًا: baseline أولي، بعد إصلاح الأساس، قبل أول Journey، بعد أي تغيير تأسيسي لاحق، وقبل الإغلاق الذي يدعي صلاحية الأساس.

## 8. الرحلات والأسطح العابرة

استخرج الرحلات من الحوكمة/السجلات **ومن الواقع**: contracts، code، database، surfaces، runtime، tests، events/jobs. ابحث عن documented/undocumented، registry-only، code-only، duplicate، stale، partial، closed-without-evidence، inbound/outbound journeys.

لكل رحلة مرتبطة تتبع عند الانطباق:

```text
Actor → Intent → Entry point → Route/Screen/Page → Visible Control
→ Input validation → Identity/Session/Permission/Assignment/Trusted Scope/Object Authorization
→ Command/Query → Canonical Contract → Generated Client → API → Handler
→ Domain Policy/State Machine → Transaction → Database
→ Event/Job/Integration → Operational/Financial Effect
→ Persisted Readback → All Consuming Surfaces → Audit/Observability → Evidence
```

غطِّ success، validation failure، denied/forbidden، conflict، duplicate، race، timeout، unknown result، offline، retry، reconnect، recovery، rollback، compensation، dependency degradation.

استخدم شرائح `SL-01..SL-24` من SMSM فقط كعدسات فحص إذا ثبت انطباقها؛ لا تنشئ لها Schema موازية ولا تفترض وجوبها جميعًا.

لكل Surface مرتبط اجرد controls ذات الصلة: routes/screens/pages/layouts/tabs/lists/cards/tables/buttons/links/icons/gestures/modals/drawers/forms/fields/filters/sort/pagination/refresh/import/export/upload/download/deep links/notifications/confirmation/back/state restoration. تحقق من visibility/enablement/permission/scope/validation/real contract/API/persisted effect/readback/duplicate interaction والحالات Loading/Empty/Partial/Success/Error/Denied/Blocked/Not Ready/Conflict/Stale/Offline/Unknown/Retry/Recovery، إضافة إلى RTL/localization/accessibility/focus/screen reader/large text/responsiveness/performance.

لا تعتبر UI مكتملًا لمجرد ظهوره أو نجاح التنقل، ولا تقبل Mock/Fixture/constant/local state/manual parallel contract/legacy path/silent fallback كحقيقة تشغيلية.

## 9. الوحدات والمهام والتحقق

أنشئ وحدة واحدة لكل `executionConcern` مستقل غير متداخل. قد تخدم الوحدة عدة topics/contexts/journeys/surfaces إذا كان Root Cause وTruth Owner واحدًا. ممنوع duplicate concern أو dependency cycle أو gap بلا unit.

في `DIAGNOSIS.md` وثّق: الواقع، الأدلة، الفرضيات البديلة التي اختُبرت، Root Cause، Truth Owner، writers/readers/consumers، surfaces/journeys، التصنيف، dependencies، ما الذي تفتحه الوحدة، الحدود و`must-not-change`، ولماذا الحل أفضل من البدائل.

حافظ على schema الحالي لـ`EXECUTION.json`. كل Task يجب أن يحدد فعليًا:

```text
taskId / order / objective / paths / symbols / action
currentProblem / requiredChange / targetState / mustNotChange
acceptanceCriteria / verificationIds / rollback / commitBoundary
```

يُمنع استخدام «أصلح/راجع/حسّن/نظف/اربط/أكمل» وحدها دون أين وماذا ولماذا والحالة النهائية والتحقق.

في `VERIFICATION.json` عرّف لكل check:

```text
verificationId / type / command / required / prerequisites
passCriteria / failCriteria / proves / doesNotProve
```

لا تجعل فحصًا يثبت أكثر مما يستطيع إثباته.

## 10. ترتيب التنفيذ والسرعة

استخدم `dependsOn` كرسم اعتماديات بلا دورات. الأولوية:

```text
1 hard dependencies
2 foundation blockers
3 critical path
4 opens most journeys
5 opens most surfaces
6 central/shared fix preventing repeated work
7 high-risk/high-uncertainty early
8 small high-impact fix
9 minimize reopening stabilized contract/schema/files
10 batch contract generation/client regeneration
11 cleanup/non-blocking debt last
```

وثّق سبب ترتيب كل وحدة وما تمنعه وما تفتحه. لا ترتب حسب رقم الوحدة فقط.

يمكن توازي القراءة والبحث وتحليل العلاقات وجمع الأدلة والفحوص المستقلة. تبقى الكتابات المتعارضة، مصادر الحقيقة المشتركة، migrations/backfill، العقود والعملاء، shared schema، commits وتحديث حالات الوحدات متسلسلة. لا تخطط لأكثر من وحدة كتابة واحدة `IN_PROGRESS`.

## 11. التحقق وإبطال الأدلة

خطط Affected-First:

```text
nearest targeted check
→ unit/package test
→ related integration
→ affected lint/typecheck/test/build
→ applicable targeted guards
→ checkpoint-wide checks عند الحاجة
→ runtime/smoke/E2E/manual acceptance/readback/observability فقط عندما يكون الادعاء يتطلبها
```

أي تغيير في canonical truth أو identity/auth أو contract/generated client أو schema/migration أو shared state machine/brain أو foundational runtime يجب أن يحدد الأدلة التي أصبحت stale والوحدات والفحوص التي يجب إعادتها، وهل يجب إعادة فتح Foundation. لا تغلق بدليل أقدم من التغيير الذي أبطل معناه.

إذا ظهرت فجوة تأسيسية أثناء Journey لاحقًا:

```text
STOP affected path safely
→ classify evidence
→ reopen/create owning foundation unit
→ invalidate downstream evidence
→ recompute dependencies/critical path
→ fix foundation
→ rerun foundation verification
→ rerun affected checks
→ resume
```

## 12. PostgreSQL والأمن عند الانطباق

كل تغيير PostgreSQL مخطط يجب أن يحدد SQL migration متسلسلة وحتمية، transaction عند إمكانها، compatibility، backfill، constraints/indexes، انتقال readers/writers، اختبارًا على PostgreSQL فعلي، invariant checks، rollback/compensation، وإزالة القديم بعد ترحيل المستهلكين.

لا تقبل ID أو Scope مرسلًا من العميل كإثبات صلاحية. الخدمة المالكة تملك منطق المجال وسلطة الكتابة، والبيانات المخزنة تُدار من مصدرها القانوني، ويجب منع IDOR وتسرب النطاق ورفع الصلاحية وفق القواعد الحاكمة المنطبقة.

## 13. الأدوات والبحث الخارجي

استخدم سلم الأدوات عند الحاجة:

```text
direct scoped inspection
→ focused search / existing command
→ targeted registered guard
→ small helper for proven repetition
→ Nx affected عند الحاجة لحساب الأثر
→ LeanCTX إذا خفّض إعادة القراءة/الضوضاء فعليًا
→ Graphify فقط إذا بقيت الملكية/الاعتماديات/التكرار/dead-code غامضة
→ OpenCodeReview فقط لمراجعة diff/commit/range محدد
→ runtime tooling عندما يتغير السلوك التشغيلي أو يُدّعى
```

عند غموض تقني مادي لا يحسمه المستودع، استخدم الوثائق/المواصفات/المصدر/الإصدارات الرسمية الحالية وOWASP عند الأمن. تحقق من إصدار المشروع. المصدر الخارجي يساعد على تنفيذ الحقيقة الحاكمة؛ لا يعيد تعريفها.

## 14. جاهزية الحزمة وتسليمها

قبل اعتبار الخطة جاهزة يجب أن تكون، وفق schema الحالي:

```text
MANIFEST.status.diagnosis = COMPLETE
MANIFEST.status.plan = READY
COVERAGE.assessmentStatus = COMPLETE
EXECUTION-ORDER.status = READY
```

والوحدات `READY` أو `DONE` فقط بدليل صالح لم يُبطل، مع zero `UNASSESSED`، no missing/cyclic dependencies، no duplicated `executionConcern`، no vague tasks، no unknown verification IDs، bidirectional coverage links، no unresolved template markers أو secrets/production/personal data.

عند توفر Shell شغّل فعليًا:

```powershell
node tools/diagnose-implementing/validate-package.mjs `
  tools/diagnose-implementing/<TASK_NAME> `
  --strict
```

يجب أن تصبح:

```text
Validation summary: 0 error(s)
```

الفاحص الحالي يدعم `--strict` و`--strict --closure` فقط؛ **لا تستخدم `--disposal`** ولا تحذف الحزمة تلقائيًا.

طبّق التفويض فقط:

```text
NO_COMMIT      = لا Commit ولا Push
COMMIT         = Commit للحزمة فقط
COMMIT_AND_PUSH = Commit وPush للحزمة فقط
```

لا PR أو Merge أو Release أو Production دون طلب صريح.

قدّم في النهاية:

```text
repository / branch-ref / pinned remote SHA
package path / package commit SHA إن وجد
target kind / target / objective
authority sources / derived sources / external sources used
coverage counts and exclusions
foundation/migration/shared/journey/verification units
related journeys/surfaces/control-panel sections
critical path and planned order
major root causes / truth owners / parallel truths / legacy paths
strict validation command + actual result
confirmation that no operational project file was modified
resume point if incomplete
```

استخدم مفردات `governance/contracts/decision-vocabulary.json` الحالية فقط:

- `PASS` إذا اكتملت الحزمة ونجح `--strict` فعليًا على النسخة المسلّمة.
- `NEEDS_EVIDENCE` إذا كانت الحزمة معدة لكن دليلًا إلزاميًا مثل تشغيل validator غير متاح أو stale.
- `BLOCKED_EXTERNAL` إذا منع عامل خارجي حقيقي الإنشاء/التسليم/التحقق بعد إنجاز الممكن داخليًا.
- `PROTOCOL_VIOLATION` إذا تعذر الالتزام بقاعدة حاكمة ولم يُصحح الانتهاك.

لا تخترع قرارًا حاكمًا جديدًا، ولا تدّع تشغيل مولد أو فاحص أو Push لم يحدث فعليًا.
