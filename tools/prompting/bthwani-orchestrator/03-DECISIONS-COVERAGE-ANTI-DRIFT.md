# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/03-DECISIONS-COVERAGE-ANTI-DRIFT.md`

هذا الملف يملك نظام منع النسيان والانحراف، محاسبة التغطية، Findings، Scope Delta، Decision Boundary، Re-Diagnosis، وGovernance Candidates.

## 1) القاعدة الدستورية

```text
EVERY DISCOVERED MATERIAL THING → RELATION GRAPH.
EVERY MATERIAL GRAPH NODE → COVERAGE STATUS.
EVERY MATERIAL DEFECT/GAP/CONTRADICTION → FINDING.
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA CLASSIFICATION.
EVERY TRUE DECISION → DECISION LEDGER.
EVERY USER DECISION → IMPACT PROPAGATION + RE-DIAGNOSIS.
EVERY DURABLE RESOLVED RULE → GOVERNANCE CANDIDATE / PROMOTION PATH.
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

`UNVISITED` مادي واحد يمنع `COVERAGE_COMPLETE`.

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

## 8) Macro Decision Gate

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

العناصر المثبتة لا تحتاج سؤالًا. العناصر `DECISION_REQUIRED` فقط تدخل Decision Boundary.

## 9) Decision Ledger

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
batch related questions
order by dependency/unlock value
ask the smallest number that resolves the largest material ambiguity
```

التوصية ليست قرارًا نهائيًا إن كانت السلطة للمستخدم أو Product authority.

## 10) Decision Impact Propagation

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

لا تنتقل مباشرة من جواب المستخدم إلى Package creation.

## 11) Governance Delta Candidates

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
status = GOVERNANCE_PROMOTION_PENDING
NO governance mutation
```

في `EXECUTE_END_TO_END`، بعد حسم القرار وبحسب `04-PACKAGE-EXECUTION.md`، تُرقّى الحقيقة الدائمة إلى Owner الحالي الصحيح قبل/مع التنفيذ المناسب.

لا تحول Governance إلى سجل تاريخي للمهمة؛ Git history هو الأرشيف، وGovernance تقول القانون الحالي فقط.

## 12) Wave Exit Gate

لا تنتقل للموجة التالية لمجرد نفاد القراءة. يجب أن يكون:

```text
all material nodes discovered in this wave classified
all material findings recorded
proven dependencies followed or explicitly excluded with proof
new scope deltas classified
true decisions resolved or explicitly blocking
coverage statuses updated
```

## 13) Periodic Reconciliation

بعد كل Connected Cluster أو عدة Journeys مترابطة، قارن:

```text
Journey ↔ Journey
Surface ↔ Surface
State ↔ State
Owner ↔ Consumer
Contract ↔ Client/Backend
Governance ↔ Product Truth ↔ Implementation
```

الهدف كشف التناقضات التي لا تظهر داخل Journey منفردة.

## 14) Independent Adversarial Completeness Pass

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
→ rerun completeness pass
```

## 15) Fresh-Head Drift Gate

قبل Package Ready، وقبل أي execution write، وقبل final closure:

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

## 16) Gates

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
ZERO unresolved material decision required to plan safely
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

فشل أي Gate = لا Package Ready.

## 17) Final Completeness Equation

```text
ZERO UNVISITED
+ ZERO UNCLASSIFIED
+ ZERO UNTRACED
+ ZERO UNOWNED
+ ZERO UNRESOLVED MATERIAL CONTRADICTION
+ ZERO UNRESOLVED REQUIRED DECISION
+ ZERO SILENT SCOPE DELTA
+ ZERO MATERIAL FRESH-HEAD DRIFT
+ ADVERSARIAL COMPLETENESS PASS = NO NEW MATERIAL NODE
```

هذه المعادلة لا تدعي استحالة وجود عيب غير مكتشف؛ بل تمنع الادعاء بالشمول اعتمادًا على `ZERO known findings` وحدها.