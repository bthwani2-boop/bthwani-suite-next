# الأمر الثاني — التنفيذ الجذري حتى الإغلاق المثبت

> **التصنيف وحدود السلطة:** هذا الملف Prompt تنفيذي مشتق وقابل لإعادة الاستخدام. لا يملك سياسة أو حقيقة منتج أو بيانات أو عقود أو موافقات، ولا يتجاوز تعليمات المهمة الحالية أو `governance/authority/authority-precedence.json` أو `AGENTS.md` أو المصادر الحاكمة على المرجع الجاري تنفيذه. لا يمنح نفسه أو الوكيل صلاحية Push أو Merge أو Release أو Production أو موافقة مستقلة لم يطلبها المستخدم أو تمنحها الحوكمة.

## 0. المدخلات

```text
المستودع: <OWNER/REPOSITORY>
الفرع أو المرجع: <BRANCH_OR_REF>
مسار الحزمة: <PACKAGE_PATH | NONE>
المهمة المباشرة عند عدم وجود حزمة: <DIRECT_TASK | NONE>
التفويض: <LOCAL_ONLY | COMMIT | COMMIT_AND_PUSH>
```

نفّذ المهمة فعليًا من سببها الجذري حتى أقصى نتيجة مثبتة بالأدلة. لا تستخدم كثرة التعديلات أو نجاح Build/Typecheck أو ظهور الشاشة أو نجاح Happy Path منفرد كدليل اكتمال.

استخدم الدورة:

```text
DISCOVER → DIAGNOSE → CHALLENGE → FIX → VERIFY
→ BREAK → RE-DIAGNOSE → RE-FIX → RE-VERIFY → CLOSE
```

المشكلة الداخلية القابلة للإصلاح دليل جديد، وليست سببًا للتوقف.

## 1. السلطة ونموذج التنفيذ

احسم السلطة من المرجع الحالي نفسه:

```text
تعليمات المهمة الحالية والتفويض
→ governance/authority/authority-precedence.json
→ AGENTS.md
→ ACTIVE_CANONICAL المسجلة في السجل
→ MACHINE_READABLE_CONTRACT المنطبقة
→ أصغر governed skill منطبق
→ tool adapters
→ DERIVED_SUPPORT
→ history كدليل فقط
```

لا ترفع Product Truth أو Prompt أو سجل رحلة أو تقريرًا مشتقًا إلى رتبة لا يمنحها له السجل الحاكم.

استخدم `CODE_BASED_LEAN`:

- افحص أصغر سطح كامل يمكنه كشف السبب الجذري.
- نفّذ أصغر تغيير آمن **كامل** يغلق النطاق المطلوب.
- تحقق من السلوك والمخاطر المتأثرة أولًا.
- وسّع فقط عندما تثبت الملكية أو الاعتماديات أو المنتج أو الأمن أو الأدلة أن ذلك لازم.
- كلمات «عميق/شامل/100%» لا تبرر Full repository scan أو Full tool suite تلقائيًا.

عند كل قرار مادي فرّق بين:

```text
AUTHORITY / NORMATIVE TRUTH
IMPLEMENTATION TRUTH
RUNTIME TRUTH
```

إذا تعارضت، حدد سبب التعارض ومالك التصحيح؛ لا تختَر المصدر الأسهل ولا تغيّر المصدر الأعلى لتبرير الكود الحالي.

## 2. Capability Preflight وحماية المستودع

قبل الادعاء بأي فعل، حدد هل المضيف يملك فعلًا:

```text
repository read/write
shell/process execution
runtime access
database access
device/browser access
commit/push authority
independent review/approval capability
```

إذا كان المضيف GitHub Remote بلا Shell، لا تدّع تشغيل Build/Test/Guard/Validator/Runtime. نفّذ ما تسمح به قدراته وسجل الباقي `NEEDS_EVIDENCE` أو `BLOCKED_EXTERNAL` بحسب طبيعة النقص. غياب أداة ليس `PASS`.

قبل أي كتابة:

1. اجلب أحدث رأس ريموت وثبّت `STARTING_REMOTE_SHA`.
2. افحص Working Tree/التغييرات السابقة عند العمل المحلي.
3. لا تحذف أو تعكس أو تستبدل عملًا غير مرتبط.
4. أعد حل رأس الفرع قبل دفعات الكتابة وبعد Push.
5. إذا تحرك الفرع، حل الانحراف بدل overwrite.

يُمنع دون تفويض صريح:

```text
git reset --hard
git clean
force push
history rewrite
destructive replacement of unrelated work
merge
release
production deployment
```

## 3. المصادر المشتقة وTriangulation

استخدم عند الانطباق كمصادر مساعدة وفق تصنيفها الحالي فقط:

```text
tools/BThwani-unified-execution-command-final-authoritative.md
governance/operational_journey_protocol_package/
governance/operational_journey_protocol_package/smsm-dsh-wlt-journeys/
journey registries / plans / reports / historical artifacts
```

لا تفترض أن عدد الرحلات أو ترتيبها أو اكتمالها أو الـ24 slice ثابتة أو صحيحة. تحقق من كل ادعاء مادي مقابل السلطة الحاكمة والعقود والكود والبيانات وRuntime والأسطح والاختبارات.

يمكن تصنيف ادعاء مشتق تشخيصيًا إلى:

```text
CONFIRMED
PARTIALLY_CONFIRMED
STALE
CONTRADICTED
INCOMPLETE
UNPROVEN
NOT_APPLICABLE
```

استخدم SL-01..SL-24 كعدسات عند ثبوت انطباقها، لا كـSchema أو حقيقة موازية.

## 4. وضع الحزمة ووضع المهمة المباشرة

### عند وجود حزمة

اقرأ بالترتيب:

```text
START-HERE.md
→ MANIFEST.json
→ GLOBAL-DIAGNOSIS.md
→ COVERAGE.json
→ EXECUTION-ORDER.json
→ unit/DIAGNOSIS.md
→ unit/EXECUTION.json
→ unit/VERIFICATION.json
→ unit/RESULT.json
```

إذا كان Shell متاحًا شغّل قبل تعديل المنتج:

```powershell
node tools/diagnose-implementing/validate-package.mjs `
  <PACKAGE_PATH> `
  --strict
```

لا تبدأ تنفيذ الحزمة إذا فشل `--strict`; أصلح تناقض الحزمة دون تغيير الهدف أو تخفيف acceptance criteria.

قارن `pinnedStartSha` و`latestObservedRemoteSha` بالرأس الحالي. عند drift:

1. افحص الفرق من pinned SHA إلى الرأس الحالي.
2. حدد أثره فقط على paths/symbols/contracts/generated clients/schema/migrations/owners/dependencies/journeys/units/verifications.
3. حدّث evidence/coverage/units/dependency order المتأثرة.
4. أعد `--strict`.
5. لا تعِد تشخيص المستودع من الصفر إلا إذا تغيرت الملكية أو المعمارية أو شبكة الرحلات أو نطاق التنفيذ جوهريًا.

### عند عدم وجود حزمة

نفّذ تشخيصًا مستهدفًا يثبت:

```text
root cause
truth owner
affected paths/symbols
writers/readers/consumers
affected surfaces
inbound/outbound journeys
foundation prerequisites
required verification
```

نفّذ مباشرة فقط إذا كانت المهمة محدودة ويمكن إغلاقها بأمان. إذا اتضح أنها متعددة المجالات/الأسطح/الرحلات، أو تحتوي عدة Root Causes مستقلة، أو تحتاج Foundation/Migration مركزية أو إعادة تنظيم مصدر حقيقة، أنشئ حزمة بالأمر الأول ثم أكمل منها بدل تعديلات عشوائية.

## 5. PHASE-00 — Foundation Gate

عند مهمة Journey/Application/Surface/Feature عابرة للأسطح، لا تبدأ Journey قبل استقرار الأساس **المرتبط بالمهمة**.

عند وجوده وانطباقه شغّل:

```powershell
pnpm run guard:foundation
```

فشله الأولي `DIAGNOSTIC EVIDENCE` وليس مخرجًا مبكرًا. نفّذ أولًا وحدات `FOUNDATION` و`MIGRATION` والمتطلبات المشتركة، ثم Foundation Verification Gate، ثم أعد الفحوص المنطبقة.

لا تبدأ Journey إذا بقي متعلقًا بالمهمة:

```text
FOUNDATION_BLOCKER
blocking SHARED_PREREQUISITE
parallel canonical truth
unowned write
untrusted authorization/scope path
broken central contract
drifted generated client
required migration without proof
cross-surface shared-state contradiction
forbidden dependency
foundational runtime failure
unmapped foundation dependency
foundation unit without required verification
```

وثّق SHA الذي اجتاز بوابة الأساس بوصفه قاعدة الرحلات في ملفات النتائج الحالية دون اختراع schema جديد.

إذا لم تكن المهمة المباشرة الصغيرة رحلة أو أثرًا مشتركًا، لا تحولها إلى إصلاح شامل للمستودع؛ افحص فقط Foundation prerequisites المرتبطة بها.

## 6. المجدول التنفيذي والتوازي

لا تتبع رقم الوحدة فقط. من الوحدات الجاهزة اختر:

```text
1 hard dependencies
2 critical path
3 opens most journeys
4 opens most surfaces
5 shared central repair preventing repeated work
6 high-risk/high-uncertainty early
7 small high-impact work
8 minimize reopening stabilized contracts/schema/files
9 lower verification cost when otherwise equivalent
10 cleanup/non-blocking debt last
```

حافظ على وحدة كتابة واحدة `IN_PROGRESS` فقط.

يمكن توازي: القراءة، البحث، dependency analysis، evidence gathering، independent static checks/tests.

لا توازِ: conflicting writes، shared truth changes، contract generation، migrations/backfills، shared schema changes، commits أو unit-state updates.

## 7. دورة تنفيذ كل وحدة

### Preflight

تحقق من current SHA، paths/symbols، truth owner، coverage links، dependencies، evidence freshness، و`mustNotChange`.

### التنفيذ

لكل Task حسب `order`:

1. أثبت `currentProblem` وRoot Cause الحاليين.
2. نفّذ `requiredChange` عند المالك القانوني، لا عند العرض الظاهر فقط.
3. حقق `targetState` مع الحفاظ على `mustNotChange`.
4. حدّث كل writers/readers/consumers المتأثرين.
5. رحّل المستهلكين والبيانات قبل إزالة القديم.
6. أزل imports/contracts/config/tests/docs/legacy paths والبقايا التي أصبحت غير صحيحة.
7. نفّذ `verificationIds` الفعلية.
8. لا تنتقل مع فشل مانع قابل للمعالجة.

لا تجعل الوحدة `DONE` قبل اكتمال المهام ونجاح checks المطلوبة ووجود resulting SHA صالح وخلو blockers/deviations وقرار `PASS` للوحدة.

يُمنع:

```text
temporary patch
silent fallback
duplicate/parallel truth
manual parallel contract/type
duplicated business logic/state machine
runtime mock/fixture as truth
fake UI/button without effect
test weakening/guard disabling
acceptance-criteria weakening
removing source before consumer migration
legacy path left reachable
claiming closure without persisted effect/readback
```

إذا كانت عدة شاشات أو رحلات مكسورة بسبب Contract/State/Owner مركزي واحد، أصلح المصدر المركزي مرة واحدة ثم رحّل المستهلكين؛ لا ترقيع شاشة بشاشة.

## 8. الإغلاق متعدد الأسطح والرحلات

اعتبر اسم التطبيق/السطح/الصفحة/الرحلة نقطة بدء لا حدًا للنطاق. وسّع فقط بالارتباط المثبت.

تتبع عند الانطباق:

```text
Actor → Intent → Entry point → UI Control → Validation
→ Identity/Session/Role/Permission/Assignment/Trusted Scope/Object Authorization
→ Command/Query → Canonical Contract → Generated Client → API/Handler
→ Domain Policy/State Machine → Transaction/Database
→ Event/Job/Integration → Operational/Financial Effect
→ Persisted Readback → All Consuming Surfaces → Audit/Observability
```

غطِّ success، validation failure، denied/forbidden، conflict، duplicate، race، idempotency، timeout، lost response، unknown result، offline، retry/reconnect/recovery، rollback/compensation، dependency degradation.

الإجراء في Surface واحد لا يعتبر مغلقًا إذا كان أثره يجب أن يظهر في Surface/Control Panel/Domain آخر ولم يُتحقق منه هناك.

## 9. UI/UX والتفاعل الحقيقي

لكل عنصر مرتبط افحص: route/screen/page/layout/tab/list/card/table/button/link/icon/gesture/modal/drawer/form/field/filter/sort/pagination/refresh/import/export/upload/download/deep link/notification/confirmation/back/state restoration.

تحقق من:

```text
visibility / enablement / permission / trusted scope
input validation / confirmation
real canonical contract + API
real persisted effect + readback
duplicate interaction
Loading / Empty / Partial / Success / Error
Denied / Blocked / Not Ready / Conflict / Stale
Offline / Unknown Result / Retry / Recovery / restart persistence
RTL / localization / accessibility / focus / screen reader
large text / responsive layout / performance
```

لا تعتبر UI مكتملًا لمجرد ظهوره، ولا تعتمد Mock/Fixture/constant/local authoritative state/manual parallel contract/legacy path/silent fallback في المسار الحي.

## 10. العقود والهوية والأمن

طبّق القواعد الحاكمة المنطبقة، ومنها:

- الخدمة المالكة تملك Domain logic وwrite authority.
- الأسطح تستهلك canonical contracts/generated clients بدل نسخ محلية موازية.
- الهوية والصلاحية والنطاق تُشتق من سياق موثوق لا من IDs يرسلها العميل كدليل صلاحية.
- افحص object-level authorization وIDOR وcross-scope leakage وprivilege escalation وservice identity.
- سجل القرارات/الكتابات الحساسة وفق متطلبات التدقيق.
- اختبر negative/security paths المتأثرة؛ لا تجعل نجاح Happy Path دليل أمن.

عند DSH/WLT أو أثر مالي، أعد إثبات المالك المالي وحدود الاتصال من المصادر الحاكمة الحالية؛ لا تنقل قاعدة تاريخية لمجرد وجودها في Prompt مشتق. امنع الحقيقة المالية المكررة وتحقق من idempotency/ledger/readback/reconciliation/compensation عندما تنطبق.

## 11. PostgreSQL والأنظمة الموزعة

أي Schema change يجب أن يمر عبر migration SQL متسلسلة وحتمية، مع transaction عند الإمكان، compatibility، backfill، constraints/indexes، reader/writer transition، اختبار PostgreSQL فعلي، invariants، rollback أو compensation، ثم cleanup بعد ترحيل المستهلكين. لا تعدّل schema حيًا يدويًا خارج migrations.

عند events/jobs/providers اختبر حسب الأثر:

```text
idempotency / duplicate delivery / race / timeout / retry/backoff
outbox / inbox / DLQ / partial failure / unknown result
compensation / reconciliation / recovery after restart
```

## 12. الاختبار والأدوات — Affected First

بعد كل Task:

```text
nearest file/symbol check
→ unit/package test
→ related integration
→ affected typecheck/lint/test/build
```

بعد Unit:

```text
unit verifications
→ affected guards
→ affected contract/db/security checks
```

عند Checkpoint أو عندما يتطلب الادعاء:

```text
broader affected checks
→ build
→ runtime + health/readiness
→ smoke
→ cross-surface E2E
→ manual operational/visual acceptance
→ persisted readback
→ observability/audit
```

لا تشغّل المستودع كاملًا بعد كل تعديل، ولا تؤجل التحقق كله إلى النهاية.

استخدم سلم الأدوات:

```text
direct scoped inspection
→ focused search / existing command
→ targeted registered guard
→ small helper for proven repetition
→ Nx affected عند الحاجة
→ LeanCTX إذا خفّض إعادة القراءة/الضوضاء فعليًا
→ Graphify فقط عند بقاء ownership/dependency/duplication/dead-code غامضة
→ OpenCodeReview فقط لمراجعة bounded diff/commit/range
→ runtime tooling عندما يتغير runtime behavior أو يُدّعى
```

الحراس المعروفة حاليًا تُشغّل **فقط عند انطباقها ووجودها**:

```powershell
pnpm run guard:foundation
pnpm run guard:journey
pnpm run guard:journey-runtime
pnpm run guard:journey:full
```

لا تدّع Guard أو Build أو Test أو Review لم يُشغّل.

عند غموض Framework/Library/API/DB/Security مادي، استخدم الوثائق والمواصفات والمصدر والإصدارات الرسمية الحالية وOWASP عند الأمن، مع مطابقة إصدار المشروع. لا تجعل البحث الخارجي يعيد تعريف الحقيقة المعيارية للمنتج.

## 13. Manual Acceptance والأدلة

عندما يكون الادعاء Runtime/Visual/Operational، لا يكفي static success أو screenshot منفرد. اختبر Actor الحقيقي إلى persisted effect/readback وفق ما ينطبق: actor صحيح، ناقص الصلاحية، خارج النطاق، success/empty/blocked/conflict/stale، slow network/offline، duplicate interaction، reconnect/restart.

اربط الدليل عند توفره بـoperation/request/correlation ID/persisted record/readback/surface result.

## 14. Evidence Invalidation وإعادة فتح Foundation

بعد تغيير canonical truth أو identity/permission أو contract/generated client أو schema/migration أو shared state machine/brain أو foundational runtime:

1. حدد dependent units.
2. حدد checks/runtime/manual evidence التي أصبحت stale.
3. أعد الوحدات المتأثرة إلى حالة غير مغلقة عند الحاجة.
4. أعد الفحوص المناسبة.
5. لا تستخدم PASS أقدم من التغيير الذي أبطل معناه.

إذا اكتُشف Foundation defect أثناء Journey:

```text
stop affected journey safely
→ capture/classify evidence
→ reopen/create owning foundation unit
→ invalidate downstream evidence
→ recompute critical path
→ repair foundation
→ rerun foundation gate and affected checks
→ resume from last valid checkpoint
```

## 15. أقصى تقدم والعوائق

الخلل الداخلي القابل للإصلاح لا يبرر الحجب النهائي:

```text
Bug / Build/Test/Lint/Type/Guard failure
fixable migration/runtime configuration
contract mismatch / UI gap / missing implementation
cross-surface gap / incomplete plan / newly discovered internal defect
```

هذه كلها:

```text
DIAGNOSE → FIX → VERIFY → REPEAT
```

إذا وُجد مانع خارجي في مسار واحد، جمّد المسار المتأثر فقط، أعد حساب الوحدات الجاهزة، ونفّذ كل العمل المستقل الممكن.

استخدم `BLOCKED_EXTERNAL` فقط إذا ثبت أن الإكمال يعتمد على access/approval/infrastructure/provider/device/secret/authority/evidence خارج حدود التنفيذ ولا يوجد workaround آمن، وبعد إنجاز كل العمل الداخلي المستقل الممكن. وثّق المالك الخارجي والدليل والمحاولات وأقل خطوة لإلغاء الحجب و`resumePoint`.

إذا كان التنفيذ قد يكون صحيحًا لكن الدليل المطلوب مفقودًا أو stale، استخدم `NEEDS_EVIDENCE` بدل الحجب متى كان ذلك أدق.

## 16. تحديث الحزمة عند استخدامها

بعد كل Unit حدّث schema الحالي فقط:

### `RESULT.json`

```text
status
baselineSha
resultingSha
completedTaskIds
modifiedPaths
checkResults
blockers
deviations
decision
```

لا تجعل `decision: PASS` مع blocker/deviation أو required check غير ناجح.

حدّث `EXECUTION.json` و`EXECUTION-ORDER.json` بالحالة الفعلية، ولا تسمح بأكثر من `IN_PROGRESS`. حدّث `MANIFEST.json` بما يسمح به schema الحالي: `latestObservedRemoteSha` وحالات implementation/verification/decision وفق الحقيقة.

إذا كان هناك مانع أو نقص دليل، لا تزور `DONE/PASS`. يمكن استخدام `--strict` للتحقق من سلامة خطة جاهزة، لكن نجاحه لا يثبت closure.

## 17. Commit وPush

أنشئ Commit عند حد منطقي بعد نجاح الفحوص اللازمة لذلك الحد. طبّق التفويض فقط:

```text
LOCAL_ONLY      = لا Commit ولا Push
COMMIT          = Commit فقط
COMMIT_AND_PUSH = Commit وPush إلى الفرع المحدد
```

لا PR/Merge/Release/Production دون طلب صريح. بعد Push أعد حل رأس الفرع وأثبت SHA الناتج.

## 18. جولة إغلاق عدائية مستقلة

بعد اعتقادك أن التنفيذ اكتمل، لا تغلق فورًا. راجع من جديد كأنك مراجع لم يرَ التنفيذ، وابحث عن:

```text
unfixed root cause
parallel truth / stale contract / legacy route
hidden writer/reader/consumer
missing migration
journey/surface/control gap
security bypass / missing negative path
retry/recovery gap
runtime-only defect
stale evidence
observability/audit gap
```

حاول كسر الإصلاح. أي خلل داخلي جديد يعيد الدورة `REOPEN → DIAGNOSE → FIX → VERIFY`.

## 19. الموافقات والأدلة المستقلة

لا يمنح الوكيل نفسه موافقة بشرية أو مستقلة، ولا ينتحل دور Product/QA/Security/Finance/Release/Production أو المراجع المستقل.

قبل `CLOSED_WITH_EVIDENCE` اقرأ `governance/contracts/decision-vocabulary.json` والسلطات الحالية وحدد **كل evidence scope منطبق**. الإغلاق النهائي يتطلب الأدلة المنطبقة على **نفس الالتزام غير القابل للتغيير**، بما قد يشمل:

```text
static
product
runtime
visual
qa
security
finance
isolation
governance
ci
release
production
```

مع الموافقات المستقلة المطلوبة وعدم وجود fail/blocked/pending. إذا كانت التغييرات جاهزة لكن مراجعة أو موافقة مستقلة لازمة لم تحصل، استخدم `READY_FOR_REVIEW` أو `NEEDS_EVIDENCE` أو قرار الحجب المنطبق، لا `CLOSED_WITH_EVIDENCE`.

## 20. Package Closure

عند استخدام حزمة لا تستخدم `CLOSED_WITH_EVIDENCE` إلا عندما يثبت فعليًا:

```text
all in-scope units DONE
all required checks PASS on recorded SHAs
RESULT.decision = PASS for each completed unit
RESULT.blockers = []
RESULT.deviations = []
valid resultingSha for each unit
root causes removed
required foundation closed
no relevant parallel truth
owners/contracts/clients/migrations aligned
writers/readers/consumers migrated
relevant journeys and consuming surfaces closed
security/negative/retry/recovery evidence where applicable
runtime/readback evidence where applicable
no stale evidence
no internal fixable related defect
```

ثم حدّث Manifest إلى الحالة الحقيقية المطلوبة للإغلاق وأكمل `CLOSURE.md`، وشغّل فعليًا عند توفر Shell:

```powershell
node tools/diagnose-implementing/validate-package.mjs `
  <PACKAGE_PATH> `
  --strict `
  --closure
```

يجب أن تكون:

```text
Validation summary: 0 error(s)
```

الفاحص الحالي لا يدعم `--disposal`. لا تحذف الحزمة تلقائيًا؛ الحذف يحتاج طلبًا صريحًا وإثبات عدم اعتماد Runtime/Build/CI/Migrations/Governance/Operations عليها ونقل النتائج الدائمة إلى ملاكها الحقيقيين.

## 21. تقرير التسليم والقرار

قدّم:

```text
repository / branch-ref
starting remote SHA / package pinned SHA
foundation/resulting SHAs / final implementation SHA / final verification SHA
authority and derived sources used
external research used
root causes found/fixed
truth owners confirmed/corrected / parallel truths removed
executed foundation/migration/shared/journey/cleanup units
critical path and actual execution order
modified/added/moved/removed paths
contracts/generated clients/migrations/backfills/data integrity
surfaces/inbound/outbound journeys/cross-surface readback
security/negative/runtime/health/readiness/smoke/E2E/manual evidence
invalidated evidence and rerun checks
commits / push result
remaining external blocker or unavailable evidence
resume point
final decision
```

استخدم **فقط** مفردات القرار الحاكمة الحالية، ومنها بحسب الحالة:

```text
PASS
FIX_REQUIRED
BLOCKED_EXTERNAL
NEEDS_EVIDENCE
READY_FOR_REVIEW
OUT_OF_SCOPE_FOR_THIS_JOURNEY
QA_BLOCK
SECURITY_BLOCK
RELEASE_BLOCK
PROTOCOL_VIOLATION
CLOSED_WITH_EVIDENCE
```

القواعد:

- `PASS` يخص evidence scope معلنًا ولا يعني الإغلاق النهائي.
- `FIX_REQUIRED` لأي شرط داخلي منطبق فشل وما زال قابلًا للإصلاح.
- `NEEDS_EVIDENCE` عندما التنفيذ قد يكون موجودًا لكن الدليل اللازم مفقود أو stale.
- `BLOCKED_EXTERNAL` لمانع خارجي حقيقي بعد استنفاد العمل الداخلي الممكن.
- `READY_FOR_REVIEW` عندما أصبحت التغييرات والفحوص المستهدفة جاهزة لمراجعة مستقلة مطلوبة.
- `CLOSED_WITH_EVIDENCE` فقط عندما نجحت كل evidence scopes والموافقات المنطبقة على نفس الالتزام ولا يوجد fail/blocked/pending.

لا تتوقف عند مشكلة داخلية؛ حوّلها إلى دليل ثم سبب جذري ثم إصلاح عند مالك الحقيقة ثم تحقق ومحاولة كسر وإعادة تحقق، دون توسع بلا دليل ودون ادعاء فحص أو Runtime أو موافقة لم تحدث فعليًا.
