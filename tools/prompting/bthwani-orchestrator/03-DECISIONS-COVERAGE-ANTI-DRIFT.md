# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/03-DECISIONS-COVERAGE-ANTI-DRIFT.md`

هذا الملف يملك نظام منع النسيان والانحراف، محاسبة التغطية، Findings، Scope Delta، Decision Boundary، Re-Diagnosis، Wave Gates، وGovernance Candidates.

## 1) القاعدة الدستورية

```text
EVERY DISCOVERED MATERIAL THING → RELATION GRAPH.
EVERY MATERIAL GRAPH NODE → COVERAGE STATUS.
EVERY MATERIAL DEFECT/GAP/CONTRADICTION → FINDING.
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA CLASSIFICATION.
EVERY TRUE DECISION → DECISION LEDGER.
EVERY USER DECISION → IMPACT PROPAGATION + RE-DIAGNOSIS.
EVERY DURABLE RESOLVED RULE → GOVERNANCE CANDIDATE / PROMOTION PATH.
EVERY WAVE → MODE-SPECIFIC EXIT GATE BEFORE NEXT WAVE.
NO PHASE TRANSITION WITH A SILENT OR UNCLASSIFIED MATERIAL ELEMENT.
```

## 2) Universe Inventory

قبل ادعاء Discovery Complete احصر العناصر المكتشفة ذات الصلة:

```text
Domains
Journeys
Actors
Surfaces
Routes
States
Actions
Transitions
Handoffs
Contracts
Services
Data Owners
Writers/Readers/Consumers
Runtime Paths
Configs/Dependencies
Verification owners
```

كل عنصر مادي يحصل على ID ثابت داخل حزمة المهمة.

## 3) Coverage Status

الحالات الدنيا:

```text
UNVISITED
IN_PROGRESS
PROVEN
CONTRADICTED
DECISION_REQUIRED
BLOCKED_EXTERNAL
NOT_APPLICABLE_WITH_PROOF
```

`UNVISITED` مادي واحد يمنع **Global `COVERAGE_COMPLETE`**، لكنه لا يمنع تنفيذ Wave مستقلة في `EXECUTE_END_TO_END` إذا كانت الـWave نفسها وجميع Dependencies المطلوبة لها مغلقة تشخيصيًا وقرارياً ولم تعتمد على الجزء غير المغطى.

`NOT_APPLICABLE_WITH_PROOF` يحتاج evidence + reason + reopen trigger، وليس مجرد تقدير.

## 4) Bidirectional Traceability

لا يكفي:

```text
Journey → Code
```

يجب أيضًا:

```text
Route/Contract/State/Writer/Reader/Config/Runtime path → Journey/Capability/Consumer
```

الهدف كشف orphan paths، APIs بلا Surface، state بلا consumer، hidden writer، أو code لا يظهر من قراءة الرحلات الأمامية فقط.

## 5) Scope Delta Ledger

كل عنصر جديد مرتبط يُعامل هكذا:

```text
DISCOVERED
→ CLASSIFY RELATION
→ ADD TO GRAPH
→ IMPACT ANALYSIS
→ IN_SCOPE | SUPPORTED_EXCLUSION | MATERIAL_UNCERTAIN
→ COVER
```

ممنوع اكتشاف Dependency ثم تركها خارج النطاق بصمت.

أي Supported Exclusion يحتوي:

```text
item
reason
evidence
why not required for current outcome
reopen trigger
```

## 6) Findings Ledger

لكل Finding مادي:

```text
FINDING_ID
journey/surface/path/symbol
category/severity
observed behavior
ACTUAL / INTENDED / DESIRED / CONFLICT
exact evidence
competing hypothesis checked
root cause or missing proof
canonical owner
writers/readers/consumers
blast radius
states/transitions/actions/handoffs affected
cross-surface/cross-layer impact
security/data/finance/operational/design risk
confidence
status
required decision/fix/verification
reopen trigger
```

الثقة الدنيا:

```text
PROVEN
STRONG
UNCERTAIN
CONTRADICTED
```

الحالة التنفيذية الدنيا:

```text
OPEN
FIXED_PENDING_VERIFY
PROVEN_CLOSED
NOT_APPLICABLE_WITH_PROOF
```

Finding لا يُحذف لأنه اختفى من آخر log؛ يغلق فقط بدليل صالح على Candidate صحيح.

## 7) Decision Candidate vs True Decision

أي سؤال محتمل يبدأ داخليًا كـ`QUESTION_CANDIDATE`. حاول حسمه من:

```text
Authority/Product Truth
Code
State Machine
Contracts
Data
Permissions
Other Surfaces
Control Panel
Tests
Runtime/Persisted Readback
```

إذا أمكن اشتقاقه = `DERIVABLE_FACT` ويُحسم بلا سؤال.

لا يصل للمستخدم إلا إذا بقي واحد من:

```text
CONTRADICTION
AMBIGUITY
MISSING_PRODUCT_OR_OPERATIONAL_DECISION
MULTIPLE_VALID_BEHAVIORS
```

`EXTERNAL_EVIDENCE_GAP` ليس Product decision؛ يسجل blocker/evidence gap.

## 8) Sequential Decision Discipline

الأسئلة نفسها تتبع ترتيب Dependency/Wave، ولا تؤجل افتراضيًا حتى نهاية تشخيص الهدف كله:

```text
diagnose current wave to evidence limit
→ collect only true decision boundaries for this wave/dependencies
→ deduplicate and batch only tightly related questions
→ ask the smallest set that unlocks the wave
→ bind answers to Decision IDs
→ propagate impact
→ re-diagnose affected scope
→ prove current wave solution-ready
→ apply MODE-specific wave behavior
→ then select next wave
```

قرار غير محسوم يمنع الـWave المتأثرة وأي dependent Wave. لا يجوز القفز فوقه ثم تصميم/تنفيذ ما يعتمد عليه. يمكن فقط متابعة عنصر مستقل مثبت أنه غير متأثر إذا كان ذلك لا يكسر الترتيب الحاكم أو يخلق تضاربًا.

## 9) Macro Decision Gate

بعد Macro Blueprint وقبل التشخيص المجهري واسع الكلفة، اعرض فقط الخطوط الكبرى التي يتغير بسببها اتجاه النظام:

```text
Actors/Responsibilities
Major Journeys
Canonical States
Truth Owners
Major Handoffs
Core Invariants
Macro Contradictions
```

العناصر المثبتة لا تحتاج سؤالًا. العناصر `DECISION_REQUIRED` فقط تدخل Decision Boundary. بعد الحسم أعد تشخيص أثر القرار قبل اختيار/تنفيذ الـWaves التابعة له.

## 10) Decision Ledger

لكل قرار حقيقي:

```text
DECISION_ID
journey/actor/surface/state affected
exact decision required
why evidence cannot resolve it
contradicting/missing evidence
Option A + tradeoffs
Option B + tradeoffs
Option C only if genuinely distinct
Recommendation
Why recommended
Impact of each option
Affected graph nodes/edges
status
explicit user/authority decision
```

قواعد الأسئلة:

```text
merge overlapping questions
remove duplicates
remove derivative questions answerable by a parent decision
batch only related questions
order by dependency/unlock value
ask the smallest number that resolves the largest material ambiguity for the current wave/cluster
```

التوصية ليست قرارًا نهائيًا إن كانت السلطة للمستخدم أو Product authority.

## 11) Decision Impact Propagation

بعد كل قرار:

```text
bind answer to DECISION_ID
→ update desired behavior/invariants
→ traverse affected graph
→ re-evaluate assumptions
→ re-diagnose affected journeys
→ recheck actor/responsibility
→ recheck states/transitions/actions/preconditions
→ recheck handoffs
→ recheck cross-surface meaning
→ recheck cross-layer consistency
→ recheck success/failure/recovery/temporal behavior
→ adversarial recheck
→ discover new findings/decisions if any
```

لا تنتقل مباشرة من جواب المستخدم إلى تنفيذ أو Wave preparation؛ يجب أن يمر القرار عبر Re-Diagnosis أولًا.

## 12) Governance Delta Candidates

كل قرار/حقيقة مادية تُصنف من حيث الديمومة:

```text
TASK_LOCAL
IMPLEMENTATION_DETAIL
PRODUCT_CAPABILITY_TRUTH
PLATFORM_PRODUCT_TRUTH
ENGINEERING_POLICY
SECURITY_POLICY
DELIVERY_POLICY
AUTHORITY_RULE
MACHINE_CONTRACT
REGISTRY
```

في `PREPARE_ONLY`:

```text
record candidate
record exact existing canonical owner when identifiable
record exact semantic change required
status = GOVERNANCE_PROMOTION_PENDING
NO governance mutation
```

في `EXECUTE_END_TO_END`، بعد حسم القرار وإعادة التشخيص، تُرقّى الحقيقة الدائمة إلى Owner الحالي الصحيح قبل/مع تنفيذ الـWave التي تعتمد عليها وفق `04-PACKAGE-EXECUTION.md`.

لا تحول Governance إلى سجل تاريخي للمهمة؛ Git history هو الأرشيف، وGovernance تقول القانون الحالي فقط.

## 13) Current Wave Solution-Ready Gate

قبل أن يختلف المسار حسب MODE، يجب للـWave الحالية إثبات:

```text
all material nodes discovered for this wave classified
all material findings recorded
root cause proven or explicit blocker/missing-proof classification
canonical owner + exact target state known
proven dependencies followed/closed or explicitly excluded with proof
writers/readers/consumers materially mapped
true decisions required by this wave resolved
all decisions impact-propagated and affected scope re-diagnosed
new scope deltas classified
governance implication classified
cleanup requirements identified
verification strategy/acquisition path defined
latest relevant head/base reconciled
```

إذا فشل أي بند = `CURRENT_WAVE_SOLUTION_READY = NO`.

## 14) Mode-Specific Wave Exit Gate

### PREPARE_ONLY

لا تنتقل للـWave التالية حتى يصبح الحل الموثق للـWave الحالية قابلًا للتنفيذ دون تخمين:

```text
CURRENT_WAVE_SOLUTION_READY = YES
EXACT_ROOT_FIX_DESIGNED = YES
AFFECTED_CONSUMERS_AND_DEPENDENCIES_DOCUMENTED = YES
GOVERNANCE_PROMOTION_REQUIREMENT_DOCUMENTED = YES | NOT_APPLICABLE
OBSOLETE_PATH/CLEANUP_ACTION_DOCUMENTED = YES | NOT_APPLICABLE
EXACT_ACCEPTANCE_AND_VERIFICATION_DEFINED = YES
WAVE_PREPARED = YES
```

لا Product/Governance/Runtime write.

### EXECUTE_END_TO_END — Pre-Write

لا كتابة حية قبل:

```text
CURRENT_WAVE_SOLUTION_READY = YES
CURRENT_WAVE_ROOT_CAUSE_PROVEN = YES
CURRENT_WAVE_DECISIONS_RESOLVED = YES
CURRENT_WAVE_REDIAGNOSIS_COMPLETE = YES
CURRENT_WAVE_IMPACT_MAPPED = YES
CURRENT_WAVE_VERIFICATION_DEFINED = YES
CURRENT_WAVE_READY_TO_EXECUTE = YES
```

### EXECUTE_END_TO_END — Complete Before Next

بعد التنفيذ لا تنتقل للـWave التالية حتى:

```text
CURRENT_WAVE_IMPLEMENTATION_COMPLETE = YES
CURRENT_WAVE_CONSUMERS_RECONCILED = YES
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE = YES
CURRENT_WAVE_VERIFICATION_PASS = YES
CURRENT_WAVE_GOVERNANCE_SYNC = YES | NOT_APPLICABLE
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED = YES
CURRENT_WAVE_STATUS = COMPLETE
```

`PASS` هنا يعني جميع evidence scopes المطلوبة للـWave نفسها حسب الخطر/الادعاء، وليس Final Task Closure.

## 15) Periodic Reconciliation

بعد كل Connected Cluster أو عدة Journeys مترابطة، قارن:

```text
Journey ↔ Journey
Surface ↔ Surface
State ↔ State
Owner ↔ Consumer
Contract ↔ Client/Backend
Governance ↔ Product Truth ↔ Implementation
```

الهدف كشف التناقضات التي لا تظهر داخل Journey منفردة. في `EXECUTE_END_TO_END` أي تناقض جديد قد يعيد فتح Wave سابقة ويُبطل evidence المتأثر.

## 16) Independent Adversarial Completeness Pass

بعد أن يبدو Discovery/Diagnosis كاملين، ابدأ Pass هدفه الوحيد **إثبات أن التغطية ناقصة**. ابحث من مداخل مختلفة:

```text
unmapped routes/screens/controls
orphan states/transitions
API/contracts without mapped consumers
hidden writers/readers
jobs/events/background paths
admin/control-panel interventions
fallback/legacy/compatibility paths
error/recovery paths
config/env/build/CI references
stale aliases/re-exports/generated bindings
data/migration paths not reached from UI journeys
```

إذا اكتشف Material Node جديدًا:

```text
REOPEN DISCOVERY
→ add graph/scope delta
→ diagnose affected cluster
→ if EXECUTE mode and prior evidence affected: reopen affected wave/evidence
→ rerun completeness pass
```

## 17) Fresh-Head Drift Gate

عند نقاط القرار التالية:

```text
before PREPARE final PACKAGE_READY
before each EXECUTE current-wave write batch
before/after each logical write batch as required by Core Contract
before final closure
```

نفذ:

```text
re-resolve branch HEAD
→ compare against diagnosis/work baseline
→ classify delta:
   DISJOINT
   RELATED_NON_CONFLICTING
   SEMANTIC_OVERLAP
   DIRECT_CONFLICT
   AUTHORITY_OR_TRUTH_CHANGE
→ update graph/coverage
→ invalidate affected evidence
→ re-diagnose affected scope when required
```

لا تعتمد نتائج تشخيص على رأس قديم إذا تغيرت الحقيقة ذات الصلة.

## 18) Global Gates

هذه البوابات تعني اكتمال الهدف **عالميًا**. في `PREPARE_ONLY` تلزم قبل التسليم النهائي. في `EXECUTE_END_TO_END` تلزم قبل Final Closure، لا قبل أول Wave write.

### DISCOVERY_COMPLETE

```text
Universe Inventory materially bounded
all discovered material nodes recorded
all scope deltas classified
adversarial/negative-space discovery performed at required depth
```

### DIAGNOSIS_COMPLETE

```text
all material covered nodes have disposition
root cause or explicit missing-proof classification exists
actual/intended/desired/conflict separated where material
known cross-surface/cross-layer contradictions dispositioned
```

### DECISION_COMPLETE

```text
ZERO unresolved material decision required for the final target
ZERO question still answerable from available evidence
all user decisions propagated and re-diagnosed
```

### COVERAGE_COMPLETE

```text
ZERO material UNVISITED
ZERO material UNCLASSIFIED
ZERO material UNTRACED
ZERO material UNOWNED
ZERO unrecorded finding
ZERO silent scope delta
```

### PACKAGE_READY

```text
all global gates above = YES
all waves accounted/dispositioned
PREPARE_ONLY: every wave has executable handoff design
EXECUTE_END_TO_END: living package reconciles actual work/evidence and final verification path
latest head reconciled
```

## 19) Final Completeness Equation

```text
ZERO UNVISITED
+ ZERO UNCLASSIFIED
+ ZERO UNTRACED
+ ZERO UNOWNED
+ ZERO UNRESOLVED MATERIAL CONTRADICTION
+ ZERO UNRESOLVED REQUIRED DECISION
+ ZERO SILENT SCOPE DELTA
+ ZERO MATERIAL FRESH-HEAD DRIFT
+ EVERY MATERIAL WAVE PASSED ITS MODE-SPECIFIC EXIT GATE
+ ADVERSARIAL COMPLETENESS PASS = NO NEW MATERIAL NODE
```

هذه المعادلة لا تدعي استحالة وجود عيب غير مكتشف؛ بل تمنع الادعاء بالشمول اعتمادًا على `ZERO known findings` وحدها.