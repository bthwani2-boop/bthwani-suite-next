# الأمر 4 — التشخيص التشغيلي العميق Journey-by-Journey × Multi-Surface × Cross-Layer

**BRANCH: `A`**  
**TARGET: `____________________________`**

استخدم إلزاميًا، حسب السياق والانطباق، `tools/prompting/01-diagnose-plan-package.md` و`tools/prompting/02-execute-verify-close.md` و`tools/prompting/03-end-to-end-fail-closed.md`، واكتشف واستخدم تلقائيًا جميع قدرات وأدوات وإضافات وتكاملات Codex الملائمة التي تستطيع تحسين التشخيص أو كشف العلاقات أو اختبار الفرضيات أو التحقق من السلوك، ولا تدّع استخدام Tool/Test/Validator لم يُنفذ فعليًا.

## 0) الهدف الحاكم

قبل أي إنشاء للحزمة أو أي تنفيذ على المنتج، نفّذ **تشخيصًا استقصائيًا FAIL-CLOSED شديد العمق والشمول من الألف إلى الياء ومن الإبرة إلى الصاروخ** للنطاق `TARGET`، مع جعل **تجربة المستخدم + المنطق التشغيلي/الوظيفي + الرحلات والتدفقات + الحالات والانتقالات + التسليم بين الأطراف والأسطح** هي النموذج الحاكم لفهم النظام.

لا تجعل التشخيص Audit تقنيًا عامًا بلا محور؛ استخدم التقنية والمعمارية والعقود والبيانات والصلاحيات والـRuntime بقدر ما يلزم **لإثبات الحقيقة التشغيلية الفعلية للرحلات** وكشف أسباب الخلل وآثاره.

الحالة الافتراضية لأي جزء غير مثبت أو غير مفهوم أو متناقض:

```text
OPEN
```

ولا تعتبر Journey مفهومة لمجرد معرفة Happy Path أو نجاح شاشة أو API أو Test منفرد.

---

# 1) المنهجية الحاكمة — موجات تشخيصية لا أسئلة عشوائية

نفّذ العمل بهذه الدورة الإلزامية:

```text
BROAD DISCOVERY
→ RECONSTRUCT ACTUAL JOURNEYS
→ MAP ACTORS / RESPONSIBILITIES / STATES / ACTIONS / TRANSITIONS / HANDOFFS
→ PRIORITIZE BY DEPENDENCY
→ DEEP DIAGNOSIS WAVE
→ RESOLVE EVERYTHING DERIVABLE FROM EVIDENCE
→ RECORD CONTRADICTIONS / UNKNOWNS
→ CONTINUE UNTIL A TRUE DECISION BOUNDARY
→ PRESENT DIAGNOSIS SUMMARY
→ ASK DECISION QUESTIONS AS A BATCH
→ USER DECISIONS
→ RE-DIAGNOSE ALL AFFECTED JOURNEYS
→ NEXT DIAGNOSIS WAVE
→ REPEAT UNTIL DECISION-COMPLETE
→ CREATE / UPDATE PACKAGE ONLY AFTER READINESS GATE
```

### ممنوع منهجيًا

```text
questions-first
screen-by-screen diagnosis in isolation
application-by-application diagnosis in isolation
ask-after-every-finding
full-repository wandering without proven relation
create package before decision completeness
jump from user answer directly to package creation
```

المطلوب هو **تشخيص استكشافي واسع أولًا، ثم تشخيص عميق Journey-by-Journey حسب الاعتماديات، مع فحص جميع الأسطح والطبقات المؤثرة لنفس Journey في الوقت نفسه**.

---

# 2) تحديد النطاق الحقيقي

`TARGET` نقطة بدء، وليس حدًا مصطنعًا ولا تصريحًا تلقائيًا لمسح المستودع كله.

وسّع النطاق فقط بعلاقة مثبتة عبر:

```text
TARGET
→ Journeys
→ Actors
→ States
→ Actions
→ Handoffs
→ Consumers
→ Contracts
→ Data/Permissions
→ Runtime Path
→ Proven Dependencies
→ Blast Radius
```

أي Surface/Service/Control-Panel section/Backend path خارج الاسم الأولي لكنه مشارك فعليًا في Journey أو Handoff أو State أو Consumer أو Runtime Path يدخل نطاق التشخيص.

وأي جزء لا توجد له علاقة تشغيلية أو سببية مثبتة لا يُسحب إلى المهمة لمجرد وجوده.

---

# 3) Broad Discovery — المسح الاستكشافي الشامل أولًا

ابدأ **بدون أسئلة للمستخدم** باكتشاف الصورة الكلية للنطاق:

```text
Actors
Journeys
Entry Points
Surfaces
Routes/Screens/Controls
Operational Roles
States
Actions
Transitions
Handoffs
Outcomes
Failure/Recovery Paths
Consumers
Dependencies
Control-Panel intervention points
Canonical contracts/state/data owners
Runtime readback points
```

الهدف من هذه المرحلة هو بناء خريطة النظام والرحلات والاعتماديات وترتيب التشخيص، لا الادعاء بأن كل تفصيلة حُسمت.

لا تسأل المستخدم عن حقيقة يمكن العثور عليها في الكود أو العقد أو State Machine أو Surface أخرى أو Runtime behavior أو Evidence حي.

---

# 4) الوحدة الأساسية — Journey-by-Journey × Multi-Surface × Cross-Layer

لا تفحص كل تطبيق بمعزل عن البقية. لكل Journey تعامل معها كوحدة تشغيلية واحدة عبر **كل Actors والأسطح والطبقات المشاركة في اللحظة نفسها**.

لكل Journey ابنِ Journey Matrix إلزامية:

```text
Journey ID / Name
Actor
Entry
Current Context
Preconditions
Available Action
Validation
Decision Rule
Authorization/Scope
Current State
Transition
Next State
Side Effects
Persisted Change
Handoff
Next Actor / Surface
What each Surface sees
Outcome
Failure Path
Recovery Path
Later Readback
Canonical Owner / Source
Evidence / Confidence
```

وتتبع الرحلة مثلًا عبر:

```text
Client
↔ Partner
↔ Captain
↔ Field
↔ Control Panel
↔ Backend / Domain State
↔ Data / Integrations / Runtime
```

بحسب ما ينطبق فعليًا.

**نفس الـJourney تُفحص عبر كل Surface المشاركة قبل اعتبار فهمها مكتملًا.** نجاح Surface منفردة لا يثبت صحة الرحلة.

---

# 5) التحليل متعدد الاتجاهات والطبقات — إلزامي لكل Journey

لا تعتمد على تحليل خطي واحد. نفّذ، بقدر الانطباق، جميع الزوايا التالية:

## 5.1 Logical Analysis

افحص الاتساق المنطقي للقواعد:

```text
هل Action منطقية في هذه State؟
هل Preconditions كافية؟
هل Transition صحيحة؟
هل Outcome تترتب منطقيًا على القرار؟
هل يوجد مسار يسمح بنتيجة ممنوعة؟
هل توجد خطوة لا سبب تشغيليًا لها؟
```

## 5.2 Causal / Root-Cause Analysis

```text
Observed Behavior
→ Immediate Cause
→ Canonical Owner / Writer
→ Root Cause
→ Consumers
→ Blast Radius
→ Correct Target Behavior
```

لا تخلط بين العرض والسبب.

## 5.3 Forward Trace

```text
Entry
→ Preconditions
→ Action
→ Validation
→ Decision
→ State
→ Transition
→ Handoff
→ Outcome
```

## 5.4 Reverse Trace

ابدأ من النتيجة أو الحالة المرصودة وعد عكسيًا:

```text
Outcome
→ Handoff
→ Transition
→ State
→ Decision
→ Validation
→ Action
→ Actor / Entry
```

استخدمه لكشف القفزات والافتراضات والعلاقات المفقودة التي قد يخفيها المسار الأمامي.

## 5.5 Temporal Analysis

لا تفحص Snapshot فقط. تتبع الزمن:

```text
Before
→ Trigger
→ During
→ Pending
→ Completed / Failed
→ Recovery
→ Later Readback
```

وافحص حالات التأخير، Timeout، Retry، العودة بعد إغلاق التطبيق، stale state، تغير الحقيقة أثناء الإجراء، restart/recovery، والتأخر بين Surface وأخرى.

## 5.6 Actor / Responsibility Analysis

لكل خطوة احسم:

```text
من يبدأ؟
من يقرر؟
من ينفذ؟
من يستطيع الإلغاء أو التراجع؟
من يملك الحقيقة؟
من يحق له التدخل؟
من يستلم بعدها؟
من ينتظر من؟
```

Wrong Ownership أو Responsibility Gap أو Handoff غير مملوك = Finding.

## 5.7 Cross-Layer Vertical Trace

تتبع نفس المعنى التشغيلي رأسيًا:

```text
UX/UI
→ Surface State
→ Client Logic
→ Controller/Adapter
→ Contract/Binding/Generated Client
→ API
→ Domain / Business Logic
→ State Machine
→ Data / Persistence
→ Events / Integrations when applicable
→ Runtime
→ Persisted Readback
→ Observable Result
```

لا يكفي أن تكون كل طبقة صحيحة تقنيًا منفردة؛ يجب أن يظل **المعنى التشغيلي نفسه** محفوظًا بين الطبقات.

## 5.8 Differential Cross-Surface Horizontal Analysis

شغّل أو أعد بناء السيناريو نفسه ذهنيًا/تجريبيًا عبر جميع الأسطح وقارن:

```text
same Entity / Actor / State / Event
→ Client meaning
→ Partner meaning
→ Captain meaning
→ Field meaning
→ Control Panel meaning
→ Backend canonical meaning
```

أي اختلاف غير مبرر في المعنى أو التوقيت أو Action أو State أو Responsibility = Finding حتى لو كانت القيم التقنية متشابهة.

## 5.9 Invariant Analysis

استخرج القواعد التي **يجب ألا تُكسر**، مثل:

```text
State C cannot precede State B
Actor X cannot perform Action Y in State Z
Handoff cannot occur before prerequisite P
one canonical owner must decide this state
completed outcome cannot revert without explicit recovery rule
```

ثم حاول عمدًا كسر كل Invariant.

## 5.10 Counterfactual / What-if Analysis

اسأل لكل Journey:

```text
ماذا لو حدث X بدل Y؟
ماذا لو لم يستجب الطرف التالي؟
ماذا لو تغيرت State بين العرض والضغط؟
ماذا لو تكرر Action؟
ماذا لو وصل Event متأخرًا أو مكررًا؟
ماذا لو أُغلق التطبيق وأعيد فتحه؟
ماذا لو اختلفت نسختان من الأسطح في التوقيت؟
```

## 5.11 Negative-Space Analysis

لا تبحث فقط عن الخطأ الموجود؛ ابحث عما **ينبغي أن يوجد لكنه مفقود بالكامل**:

```text
Missing Journey
Missing State
Missing Transition
Missing Action
Missing Validation
Missing Feedback
Missing Handoff
Missing Recovery
Missing Control-Panel intervention
Missing Cross-Surface visibility
Missing Ownership
Missing decision rule
```

## 5.12 Experimental Validation

عندما تتوفر الأدوات والبيئة، لا تكتفِ بقراءة الكود:

```text
form hypothesis
→ identify falsifiable behavior
→ execute the smallest useful real check
→ observe runtime/readback
→ compare with expected journey/state
→ refine or reject hypothesis
```

لا تدّع Runtime/E2E/visual/experimental proof إذا لم يُنفذ فعليًا.

## 5.13 Adversarial Diagnosis

بعد أن يبدو الفهم صحيحًا، افترض أنه ما يزال ناقصًا أو خاطئًا وابحث عمدًا عن:

```text
Contradictions
Hidden Behaviors
Hidden Writers/Readers
Missing Consumers
Silent Failures
Hidden Fallbacks
Unreachable Error Paths
Race / Concurrency
Stale State
Partial Failure
Contract Drift
State/Data Drift
Wrong Ownership
Wrong Handoff
Legacy Paths
Unvalidated Actions
Missing Edge Cases
Inconsistent Cross-Surface Behavior
Operational Regressions
```

لا تعتبر التشخيص قويًا حتى يصمد أمام **Forward + Reverse + Temporal + Cross-Layer + Cross-Surface + Experimental + Adversarial** scrutiny.

---

# 6) حالات UX التي يجب ألا تسقط

لكل Surface/Actor ضمن Journey افحص، حسب الانطباق:

```text
Entry / Discoverability
Loading
Empty
Partial
Ready
Success
Error
Denied / Forbidden
Conflict
Stale
Pending
Timeout
Retry
Offline / Reconnect
Cancelled
Recovery
Completed
Later Readback
```

وافحص **وضوح القرار للمستخدم**:

```text
هل يعرف أين هو؟
هل يعرف ماذا حدث؟
هل يعرف ماذا ينتظر؟
هل يعرف من ينتظر من؟
هل يعرف ما الإجراء التالي؟
هل يرى سبب المنع/الفشل بشكل صحيح؟
هل يمكنه التصحيح أو الاسترداد عندما يجب؟
هل UI تعرض Action لا يملكها تشغيليًا؟
هل UI تخفي Action يجب أن يملكها؟
هل الـfeedback يعكس الحقيقة التشغيلية لا مجرد نجاح request؟
```

---

# 7) Findings Ledger — لا تضيع أي فجوة

لكل Finding مادي سجّل:

```text
Finding ID
Journey
Actor / Surface
Category
Observed behavior
Expected/target behavior when derivable
Exact evidence
Root cause or missing proof
Affected states/transitions/actions/handoffs
Cross-surface impact
Blast radius
Canonical owner
Severity / operational impact
Confidence
Status
Required decision or verification
```

التصنيفات الدنيا للثقة:

```text
PROVEN
STRONG
UNCERTAIN
CONTRADICTED
```

لا تحول `STRONG` أو `UNCERTAIN` إلى حقيقة لمجرد أنها تبدو معقولة.

ولا تحذف Finding لأنه اختفى من آخر شاشة أو Log؛ أغلقه فقط عندما أصبح تفسيره أو تصنيفه أو القرار المطلوب منه مثبتًا.

---

# 8) ترتيب الأدلة عند التناقض

افصل دائمًا:

```text
ACTUAL BEHAVIOR
INTENDED / AUTHORIZED BEHAVIOR
CONFLICT
```

وعند اختلاف UI أو Code أو Contract أو Runtime أو docs/plans، لا تختَر عشوائيًا ولا تجعل الأغلبية دليلًا.

استخرج الحقيقة من أعلى مصدر حاكم صالح + أحدث دليل حي قابل للإثبات.

تعامل مع:

```text
plans/**
plans/diagnose-implementing/**
Prompts
Reports
Historical docs/statuses
```

كـ`DERIVED/HISTORICAL SUPPORT` فقط؛ قد تكون ناقصة أو قديمة أو خاطئة، وليست Live Code ولا Runtime Truth ولا Proof of PASS/DONE ولا Canonical Source of Truth.

ممنوع نسخ أو اعتماد Claim أو تصميم أو قرار أو حالة منها تلقائيًا. أعد إثبات كل ما يؤثر في الرحلة من الحقيقة الحية، وسجّل التعارض نفسه كـFinding.

---

# 9) الأسئلة لا تبدأ مبكرًا — Decision Boundary فقط

**ممنوع بدء المهمة بالأسئلة.**

أثناء التشخيص قد تكتشف سؤالًا محتملًا؛ لا تقاطع المستخدم فورًا. سجله مؤقتًا في Decision Ledger واستمر في البحث في:

```text
Product/Authority Truth
Code
State Machine
Contracts
Data
Permissions
Other Surfaces
Control Panel
Tests
Runtime Behavior
Persisted Readback
```

إذا وجدت الإجابة، احسمها بنفسك واحذف الحاجة للسؤال.

إذا استنفدت الأدلة وبقيت نقطة لا يمكن حسمها دون قرار حقيقي، تبقى OPEN.

### لا تسأل إلا في أربع حالات

```text
CONTRADICTION
AMBIGUITY
MISSING PRODUCT / OPERATIONAL DECISION
MULTIPLE VALID BEHAVIORS
```

ولا تسأل عن حقيقة تقنية قابلة للاكتشاف.

---

# 10) متى تتوقف لتسأل؟ — True Decision Boundary

لا تنتظر بالضرورة حتى إكمال كل تفاصيل المشروع، ولا تسأل بعد كل Finding.

توقف عند **Decision Boundary** فقط: عندما تصبح مجموعة مترابطة من Journeys أو States أو Handoffs غير قابلة لمواصلة التشخيص الصحيح دون حسم قرار أو عدة قرارات.

قبل طرح أي سؤال، اعرض موجز الموجة التشخيصية بهذا الترتيب:

```text
ما تم فحصه
→ ما تم إثباته
→ الحقيقة التشغيلية الحالية
→ الفجوات والنقص
→ التناقضات
→ ما تم حسمه ذاتيًا من الأدلة
→ ما بقي غير قابل للحسم ولماذا
→ الأسئلة المطلوبة فقط
```

---

# 11) Decision Ledger — الأسئلة المجمعة عالية القيمة

لكل سؤال حقيقي سجّل:

```text
Decision ID
Journey / Actor / Surface / State affected
Exact decision required
Why evidence cannot resolve it
Contradicting / missing evidence
Option A
Option B
Option C when genuinely distinct
Recommended option
Why recommended
Impact / tradeoffs of each option
Affected journeys/states/handoffs if chosen
```

القواعد:

```text
merge overlapping questions
remove duplicates
remove derivative questions answerable by one parent decision
ask the smallest number of questions that resolves the largest material ambiguity
batch related questions together
order by dependency / unlock value
```

بعد إجابة المستخدم، اعتبر القرار Constraint حاكمًا لبقية التشخيص ما دام لا يتعارض مع سلطة أعلى أو دليل جديد مادي.

لا تعِد السؤال إلا إذا ظهر دليل جديد يغير Root Cause أو Blast Radius أو يبطل الافتراض الذي بُني عليه القرار، وعندها اشرح سبب إعادة الفتح صراحة.

---

# 12) Re-Diagnosis إلزامي بعد كل مجموعة قرارات

ممنوع الانتقال مباشرة من جواب المستخدم إلى إنشاء الحزمة.

بعد كل مجموعة قرارات:

```text
USER DECISIONS
→ RE-DIAGNOSE affected Journeys
→ REBUILD Actor/Responsibility Map
→ REBUILD State/Transition Map
→ RECHECK Actions/Preconditions
→ RECHECK Handoffs
→ RECHECK Cross-Surface meaning
→ RECHECK Cross-Layer consistency
→ RECHECK Success/Failure/Recovery
→ RECHECK Temporal behavior
→ RECHECK Invariants / Counterfactuals / Negative Space
→ ADVERSARIAL RECHECK
→ discover new Findings / Decisions if any
```

قد يحسم قرار واحد عشرات الأسئلة أو يكشف تناقضًا جديدًا؛ لذلك Re-Diagnosis جزء من الحسم وليس خطوة اختيارية.

---

# 13) ترتيب الرحلات — حسب الاعتماد لا حسب المجلدات

بعد Broad Discovery، رتب Deep Diagnosis Waves وفق الاعتماد التشغيلي الحقيقي، مثلًا حسب الانطباق:

```text
Identity / Actor availability
→ Entry / Activation / Eligibility
→ Core operational state
→ Primary actions
→ Handoffs
→ Cross-surface propagation
→ Completion
→ Cancellation / Failure
→ Recovery / Reconciliation
→ Historical readback / audit
```

لا تجعل ترتيب مجلدات الكود أو أسماء التطبيقات هو ترتيب التشخيص إذا كانت الرحلة تعبر بينها.

---

# 14) شرط فهم Journey

لا تعتبر Journey مفهومة إلا إذا كان بإمكانك الإجابة بلا تخمين عن:

```text
من Actor؟
كيف يدخل الرحلة؟
ماذا يرى؟
ماذا يستطيع أن يفعل؟
متى يستطيع فعله؟
بأي صلاحية/Scope؟
ما Preconditions؟
ما قاعدة القرار؟
ما Current State؟
إلى أي State تنتقل؟
ما Side Effects؟
من يملك الحقيقة؟
من يستلم بعدها؟
ماذا ترى بقية الأسطح؟
ماذا يحدث عند النجاح؟
ماذا يحدث عند الرفض/الفشل/التأخير/التكرار/التعارض؟
كيف تتعافى العملية؟
ما Later Readback؟
هل المعنى نفسه محفوظ بين UI/API/Domain/Data/Runtime؟
```

---

# 15) بوابة الجاهزية قبل إنشاء/تحديث الحزمة

**ممنوع إنشاء أو تحديث الحزمة داخل `plans/diagnose-implementing` قبل إثبات جميع البنود المنطبقة التالية:**

```text
ZERO known unresolved Journey
ZERO known ambiguous Actor/Responsibility
ZERO known undefined State
ZERO known unresolved Transition
ZERO known Action without a clear Rule/Precondition/Authorization
ZERO known unresolved Handoff
ZERO known unexplained Cross-Surface semantic mismatch
ZERO known Cross-Layer semantic contradiction
ZERO known material Success/Failure/Recovery unknown
ZERO known material Temporal/Retry/Restart unknown
ZERO known broken Invariant not classified
ZERO known Negative-Space gap not classified
ZERO known Product/Operational Decision required but unresolved
ZERO known Contradiction without disposition
ZERO known Finding unrecorded/unclassified
ZERO question that could still be answered from available evidence
```

وكل تناقض معروف يجب أن يكون واحدًا من:

```text
RESOLVED_BY_EVIDENCE
RESOLVED_BY_EXPLICIT_USER_DECISION
PROVEN_NOT_APPLICABLE
EXTERNAL_BLOCKER_EXPLICITLY_RECORDED
```

إذا بقيت نقطة مادية `UNCERTAIN` أو `CONTRADICTED` وتؤثر في التصميم أو السلوك المطلوب، فالحالة:

```text
OPEN
```

ولا تُنشأ الحزمة بعد.

---

# 16) إنشاء/تحديث الحزمة بعد الإغلاق المعرفي فقط

عند اجتياز بوابة الجاهزية فقط، استخدم `01-diagnose-plan-package.md` لإنشاء أو تحديث الحزمة المناسبة تحت:

```text
plans/diagnose-implementing/<TASK_NAME>/
```

ويجب أن تعكس الحزمة:

```text
proven operational truth
Journey Matrixes
Actors / responsibilities
States / transitions
Actions / preconditions
Handoffs
Cross-surface behavior
Cross-layer implications
Success / failure / recovery
resolved contradictions
Decision Ledger + explicit decisions
Findings + root causes
required technical implementation derived from the operational model
verification/readback needed to prove closure
```

لا تسمح للتنفيذ لاحقًا بإعادة اختراع Product/Operational decisions التي حُسمت هنا.

عند التنفيذ استخدم `02-execute-verify-close.md` تحت العقد الحاكم في `03-end-to-end-fail-closed.md`، مع إعادة التحقق من أن القرارات والحزمة ما تزال صالحة على أحدث حقيقة حية قبل أي Product/Runtime write.

---

# 17) القاعدة الذهبية

```text
DIAGNOSE BEFORE ASKING.
DISCOVER BEFORE ASSUMING.
JOURNEY FIRST; FILES ARE EVIDENCE.
JOURNEY-BY-JOURNEY, MULTI-SURFACE AT THE SAME TIME.
CROSS-LAYER AND CROSS-SURFACE MEANING MUST MATCH.
FORWARD TRACE IS NOT ENOUGH; REVERSE TRACE TOO.
HAPPY PATH IS NOT ENOUGH; FAILURE/RECOVERY TOO.
CURRENT STATE IS NOT ENOUGH; TEMPORAL BEHAVIOR TOO.
EXISTING THINGS ARE NOT ENOUGH; SEARCH THE NEGATIVE SPACE.
ONE HYPOTHESIS IS NOT ENOUGH; TRY TO FALSIFY IT.
QUESTIONS ARE FOR TRUE DECISIONS, NOT DISCOVERABLE FACTS.
ASK IN BATCHES AT DECISION BOUNDARIES, NOT AFTER EVERY FINDING.
EVERY USER DECISION MUST TRIGGER RE-DIAGNOSIS.
PLANS ARE DERIVED SUPPORT, NOT LIVE TRUTH.
NO PACKAGE BEFORE DECISION COMPLETENESS.
NO KNOWN MATERIAL JOURNEY GAP MAY BE SILENTLY CARRIED INTO EXECUTION.
```
