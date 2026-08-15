# 02 — Discovery & Diagnosis

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/02-DISCOVERY-DIAGNOSIS.md`

هذا الملف يملك منهج الاكتشاف والتشخيص. الحقيقة/السلطة/الكتابة في `01-CORE-CONTRACT.md`، والقرارات/التغطية/المحاسبة في `03-DECISIONS-COVERAGE-ANTI-DRIFT.md`.

## 1) المنهج الحاكم

```text
CREATE/RESUME LIVING OVERVIEW EARLY
→ BROAD DISCOVERY FROM ORCHESTRATION_ROOT
→ BUILD MULTI-DIRECTIONAL RELATION / DEPENDENCY / IMPACT GRAPH
→ MACRO OPERATIONAL BLUEPRINT
→ TARGET-WIDE GAP & ROOT-CAUSE LANDSCAPE
→ ROOT-CAUSE CLUSTERING / CORRELATION
→ PRIORITY / SYSTEMIC-LEVERAGE MODEL
→ LANDSCAPE ADVERSARIAL CHALLENGE
→ MACRO DECISION GATE
→ DERIVE HIGHEST-LEVERAGE PROVEN EXECUTION FRONTIER
→ DEEP GRAPH-DRIVEN JOURNEY DIAGNOSIS
→ RESOLVE DERIVABLE FACTS
→ RECORD/ACCOUNT FINDINGS / CONTRADICTIONS / UNKNOWNS / SCOPE DELTAS
→ TRUE DECISION BOUNDARY when necessary
→ FULL IMPACT PROPAGATION + RE-DIAGNOSIS + RE-RANK WHEN AFFECTED
→ ADVERSARIAL COMPLETENESS
```

`00-OVERVIEW.md` يُنشأ/يُستأنف مبكرًا كسجل مشتق حي. ملفات Sequences فقط هي Just-In-Time بعد إثبات Closure Boundary من الرسم **وبعد مرور Root-Cause Landscape/Priority Gate**. ممنوع questions-first، app-by-app isolation، screen-by-screen isolation، full-repo wandering بلا علاقة، ask-after-every-finding، أو إنشاء Sequences مستقبلية بالتخمين.

## 2) Broad Discovery

ابدأ دون أسئلة للمستخدم واكتشف بقدر الانطباق:

```text
Domains / Actors / Responsibilities / Journeys / Entry Points
Surfaces / Routes / Screens / Controls
States / Actions / Transitions / Handoffs / Outcomes / Failure-Recovery
Canonical owners / Writers / Readers / Consumers
Contracts / APIs / Bindings / Generated clients
Data owners / schemas / migrations
Permissions / scopes
Events / jobs / providers
Control-Panel interventions
Runtime / readback paths
Configs / env / dependencies
Tests / guards / observability
Structural residue / cleanup candidates
```

الهدف: bounded material universe + relation graph، لا مستند ضخم ولا افتراض شمول بلا قياس.

## 3) Relation / Dependency / Impact Graph

العقد الممكنة:

```text
Journey | Actor | State | Action | Surface | Route | Contract | Data Owner
Service | Runtime Path | Config | Dependency | Writer | Reader | Consumer | Evidence
```

العلاقات حسب الانطباق:

```text
DEPENDS_ON / BLOCKS / UNLOCKS
READS_FROM / WRITES_TO / TRIGGERS / HANDOFF_TO / CONSUMED_BY
VISIBLE_ON / AUTHORIZED_BY / OWNS / IMPLEMENTS / VERIFIED_BY / INVALIDATES
```

كل علاقة مادية تحتاج Evidence أو Status يوضح أنها فرضية قيد الإثبات. الحركة عبر الرسم قد تكون forward/reverse/vertical/horizontal/cross-layer/cross-surface/jump-to-root.

## 4) Macro Operational Blueprint

قبل الاستنتاجات المجهرية كوّن:

```text
Major domains / actors / responsibilities / journeys
Canonical states / state-data owners / handoffs / sources of truth
Major dependencies / core invariants / macro contradictions
```

صنف: `PROVEN / INFERRED / CONTRADICTED / DECISION_REQUIRED`.

لا تبنِ سلسلة تنفيذ طويلة على Macro Model غير محسوم؛ القرار المؤثر يمر Decision Gate ثم ينتشر أثره عبر الرسم ويعاد التشخيص.

## 5) Target-Wide Gap & Root-Cause Landscape + Priority

هذه مرحلة **إلزامية قبل أول تنفيذ**، وعلى أي `TARGET` واسع أو ضيق بحسب النطاق المصرح به.

### 5.1 حصر Landscape

اجمع كل Material gap/defect/contradiction/regression/missing behavior/duplicate truth/structural debt المكتشف في Broad Discovery، ولا تتعامل معها كقائمة Bugs مستقلة مباشرة.

كل Finding مادية يجب أن تصبح واحدة من:

```text
ASSIGNED_TO_ROOT_CAUSE_CLUSTER (RC-NNN)
SUPPORTED_EXCLUSION_WITH_PROOF
REQUIRES_MORE_DIAGNOSIS before execution
```

قبل اختيار Frontier:

```text
UNCLUSTERED_MATERIAL_FINDINGS = 0
```

هذا لا يعني أن كل Finding عميقة أُغلقت؛ يعني أن كل ما اكتُشف ماديًا تم وضعه في مكان سببي/استبعادي واضح بدل أن يضيع أو يتحول تلقائيًا إلى Sequence.

### 5.2 Correlation / Clustering

اربط الأعراض التي تتشارك في Root Cause / Canonical Owner / State Model / Contract / Data Owner / Dependency / Migration / Verification boundary.

مثال منطقي:

```text
client mismatch
+ partner mismatch
+ captain mismatch
+ control-panel mismatch
+ API branches
+ stale DB values
→ investigate shared state ownership
→ one proven canonical-state Root Cause cluster
```

`20 Findings ≠ 20 Sequences` إذا كانت أعراضًا لجذر واحد.

### 5.3 Systemic-Leverage Priority

الأولوية **ليست عدد Findings فقط**. قارن Root-Cause Clusters بالأدلة وفق:

```text
1. UPSTREAM / ROOT-CAUSE DEPTH
2. BLOCKING POWER
3. CANONICAL / FOUNDATION IMPORTANCE
4. BLAST RADIUS
5. RISK / SEVERITY
6. UNLOCK VALUE
7. FINDING DENSITY / RECURRENCE
8. STRUCTURAL-DEBT MULTIPLIER
```

لا تجمعها كـscore حسابي أعمى؛ استخدم مقارنة سببية موثقة. `Finding density` عامل مهم لكنه تابع: Cluster بأعراض أقل قد يكون الأول إذا كان upstream foundation ويغلق عشرات النتائج downstream.

محظور أن تصبح الأولوية بسبب:

```text
MOST RECENT
MOST FILES CHANGED
MOST FINDINGS ALONE
EASIEST FIX
LAST SESSION TOPIC
SEQUENCE NUMBER
```

القاعدة:

```text
PRIORITY = HIGHEST PROVEN SYSTEMIC LEVERAGE
```

إذا كانت uncertainty عالية بحيث قد تقلب ترتيب الجذور، لا تبدأ write؛ زد التشخيص حتى تصبح المقارنة قابلة للدفاع بالأدلة.

### 5.4 Priority Classes

استخدم عند اشتقاق Sequence:

```text
PRIMARY_SYSTEMIC
UPSTREAM_FOUNDATION
INDEPENDENT_PARALLEL
DEPENDENT_SECONDARY
LEAF_LOCAL
```

`LEAF_LOCAL` لا يتقدم على Root Cause أعلى لمجرد سهولته. `INDEPENDENT_PARALLEL` مسموح فقط إذا أثبت الرسم استقلال conflict domains/owners/contracts/data/runtime authority.

### 5.5 Landscape Adversarial Pass

قبل أول Frontier، حاول إسقاط ترتيبك:

```text
search missing upstream owner
search hidden writers/readers
search duplicate canonical truth
search unclustered findings
search cluster split/merge mistakes
search high-risk low-frequency defects
search cross-surface symptoms falsely treated as local
search dependency that would invert priority
```

عندما تكون الأدلة كافية:

```text
TARGET_LANDSCAPE_COMPLETE=YES
LANDSCAPE_RECONCILED_SHA=LATEST_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE=YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED=YES
UNCLUSTERED_MATERIAL_FINDINGS=0
PRIORITY_MODEL_COMPLETE=YES
PRIORITY_DERIVATION_SOURCE=ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS=0
PRIMARY_FRONTIER_JUSTIFIED=YES
LANDSCAPE_ADVERSARIAL_PASS=YES
```

أي اكتشاف جديد يخلق/يدمج/يفصل Root-Cause Cluster أو يغيّر dependency/blast radius/risk/unlock value يبطل ترتيب الجزء المتأثر ويعيد `PRIORITY_MODEL_COMPLETE=NO` و`PRIMARY_FRONTIER_JUSTIFIED=NO` حتى إعادة المصالحة.

## 6) الوحدة الأساسية

```text
Journey-by-Journey × Multi-Surface × Cross-Layer
```

Journey Matrix المنطقية تعرف عند الانطباق:

```text
Journey ID/Name / Actor / Entry/Context / Preconditions
Available Action / Validation / Decision Rule / Authorization/Scope
Current State / Transition / Next State / Side Effects
Handoff / Next Actor / Surface visibility / Outcome
Failure / Recovery / Later Readback / Canonical Owner / Evidence/Confidence
```

Cross-Surface:

```text
Client ↔ Partner ↔ Captain ↔ Field ↔ Control Panel ↔ Backend/Domain/Data/Runtime
```

Cross-Layer:

```text
Product Truth
→ Actor/Service Identity
→ Session/Device/Trusted Context
→ Role/Permission/Object Authorization
→ UX/UI / Surface / Route / Control
→ Surface State / Client Logic / Controller / Adapter
→ Contract / Binding / Generated Client
→ API
→ Validation / Transformation
→ Domain / Business Logic / State Machine
→ Transaction / Data / Persistence
→ Cache / Idempotency
→ Events / Jobs / Providers / Integrations
→ Networking / Response
→ Persisted Canonical Readback
→ Every Required Consumer / Surface
→ Observable Operational Result
→ Audit / Observability / Runtime Evidence
```

لا تسقط enforcement/writer/reader/persistence/consumer ماديًا.

## 7) Core Diagnostic Pass

لكل Journey/Cluster مادي بحسب الانطباق:

```text
Logical
→ State/Transition
→ Forward Trace
→ Reverse Trace
→ Cross-Surface Differential
→ Cross-Layer Vertical
→ Failure/Recovery
```

وفعّل حسب Risk/Signal:

```text
Temporal / Actor-Responsibility / Invariant / Counterfactual
Negative-Space / Experimental / Adversarial
Concurrency-Idempotency / Security-Isolation / Finance
Offline-Reconnect / Performance-Fanout / Provider Failure
Migration-Compatibility
```

## 8) Logical / State Analysis

بالدليل: هل Action مسموحة؟ Preconditions كافية؟ Validation/Authorization في المالك الصحيح؟ Transition قانونية؟ Outcome منطقية؟ هل توجد State ممنوعة قابلة للوصول؟ هل State معرفة في أكثر من Truth owner؟

## 9) Forward + Reverse + Temporal

```text
Forward: Entry → Preconditions → Action → Validation → Decision → State → Transition → Handoff → Outcome
Reverse: Outcome → Handoff → Transition → State → Decision → Validation → Action → Actor/Entry
Temporal: Before → Trigger → During → Pending → Completed/Failed → Recovery → Later Readback
```

افحص timeout/retry/stale state/restart/delayed events/late propagation/version mismatch.

## 10) Actor / Responsibility / Ownership

لكل خطوة: من يبدأ؟ من يقرر؟ من ينفذ؟ من يملك durable truth؟ من يلغي/يعكس/يتدخل؟ من يستلم بعد ذلك؟ من ينتظر من؟ Wrong owner/orphan handoff/responsibility gap/hidden writer = Finding.

## 11) Cross-Surface Differential

قارن نفس Entity/State/Event:

```text
canonical backend/domain meaning
↔ client ↔ partner ↔ captain ↔ field ↔ control-panel meaning
```

أي اختلاف غير مبرر في المعنى/Action/timing/visibility/responsibility = Finding حتى لو API لا يفشل.

## 12) UX / Decision Clarity

افحص عند الانطباق: Entry/Discoverability, Loading, Empty, Partial, Ready, Success, Error, Denied, Conflict, Stale, Pending, Timeout, Retry, Offline/Reconnect, Cancelled, Recovery, Completed, Later Readback. يجب أن يعرف المستخدم الحالة، ما حدث، ماذا ينتظر، الإجراء التالي، سبب المنع/الفشل وكيف يسترد.

## 13) Invariants

استخرج قواعد لا يجب كسرها مثل ترتيب States، حدود actor/action، prerequisite قبل handoff، canonical owner، recovery rule. ثم حاول كسرها عمدًا.

## 14) Negative Space

ابحث عما ينبغي أن يوجد لكنه مفقود:

```text
journey/state/transition/action/validation
feedback/handoff/recovery
control-panel intervention
cross-surface visibility
owner/consumer/writer/reader
decision rule/failure path
```

عدم وجود code قد يكون Requirement gap.

## 15) Hypothesis-Driven Evidence

```text
Observation → Hypothesis → Cheapest discriminating evidence → Confirm/Reject → Next hypothesis
```

توقف عند أول Failure سببي ثم عمّق Root Cause/Blast Radius بدل Checks عشوائية.

## 16) Experimental Validation

عندما تتوفر القدرة:

```text
falsifiable hypothesis → smallest real check → runtime/readback
→ compare expected → refine/reject
```

لا تدّع Runtime/E2E/Visual proof إن لم يُنفذ.

## 17) Full-Stack Failure Matrix

غطِّ حسب الخطر:

```text
success / empty-missing / invalid input / unauthenticated-denied
wrong role/scope/IDOR / forbidden state / not found / conflict-stale
duplicate-replay-idempotency / boundary / race-concurrency / partial failure
dependency-DB-network failure / timeout-unknown result / retry-backoff-DLQ
offline-reconnect / restart-recovery / old-new data / mixed-version migration
rollback-roll-forward / compensation-reconciliation
```

## 18) Reuse Before Create

قبل File/Helper/Contract/State/Config/Abstraction/Source-of-Truth جديد:

```text
search exact name + semantics
→ imports/exports/re-exports
→ routes/navigation/registries/manifests
→ callers/consumers/writers/readers
→ API/DB/tests/bindings
→ configs/env/scripts/generated references
→ relationship/dependency tools
```

ثم: `REUSE → EXTEND → MERGE → MOVE_TO_OWNER → SPLIT → CREATE_NEW`. Create New هو الأخير.

## 19) Structural / Hygiene Diagnosis

من السطر حتى النظام ابحث عن dead/unreachable/stale/legacy/superseded code، duplicate implementation/truth، unused imports/exports/deps، obsolete routes/contracts/schemas/models، stale config/env/flags/scripts، TODO/FIXME/HACK/workarounds/fallbacks، orphan references، wrong placement/naming/ownership، unnecessary compatibility، debug/generated noise، files/folders بلا Purpose/Consumer/Responsibility.

مستويات الفحص:

```text
line/expression/condition/branch/block
→ function/method/type/class/component/helper/constant
→ file/group/folder/module/package
→ service/surface/domain
→ contract/route/config/dependency
```

لا تحذف/تبقِ بالحدس؛ أثبت Responsibility + Purpose + Consumer + Requirement + Architectural Reason، وتتبع Blast Radius والمراجع بالاتجاهين.

## 20) Adversarial Diagnosis / Accounting Challenge

حاول إثبات أن التشخيص **ناقص** عبر unmapped routes/states/APIs، hidden writers/readers، jobs/events/admin/fallback/legacy، unreachable error paths، race/partial transaction، permissions/cross-scope، contract/schema/data drift، stale runtime/config، orphan refs، missing recovery، weak tests.

كل Material discovery جديدة يجب أن تصبح Graph Node/Finding/Root-Cause Cluster/Scope Delta/Decision/Consumer/Evidence/Cleanup disposition. Finding جديد يعيد فتح Coverage والعقد/الترتيب المتأثر؛ لا يختفي بسبب أن Sequence أخرى كانت قد أغلقت.

## 21) شرط فهم Journey / Cluster

لا تعتبرها مفهومة إذا لم تستطع الإجابة بلا تخمين عن Actor، Entry، visible state، allowed actions، Preconditions، Authorization/Scope، Decision Rule، current/next State، side effects، truth owner، Handoff، cross-surface visibility، success/failure/recovery، later readback، وحفظ نفس المعنى عبر UI/API/Domain/Data/Runtime.
