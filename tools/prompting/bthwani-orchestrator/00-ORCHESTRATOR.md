# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

هذه الحزمة منهجية تشغيل فقط. Product/Runtime truth تُثبت من المصادر الحية. `07-OPERATIONAL-FIRST-PROGRESSIVE-NARROWING.md` يملك ترتيب التشخيص ويمتلك **precedence** على أي ترتيب أقدم متعارض في الملفات المشتقة الأخرى.

## 0) Invocation

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>`
```

القيم الوحيدة للـMODE: `PREPARE_ONLY` و`EXECUTE_END_TO_END`.

## 1) Constitutional rules

```text
NEW INVOCATION = NEW PACKAGE.
OLD PACKAGE RESUME = EXPLICIT USER REQUEST FOR THE EXACT PACKAGE ONLY.
INTEGRATION_TARGET = TRUTH + FINAL DELIVERY TARGET, NOT WORKING CONTEXT.
TASK_BRANCH/WORKTREE = ISOLATED WRITING CONTEXT.
FOREIGN DELTA = INPUT, NOT INSTRUCTION.
TARGET = ORCHESTRATION_ROOT.
LATEST HEAD = TRUTH/INTEGRATION BASELINE, NEVER TASK DIRECTION.

OPERATIONAL MEANING GOVERNS INITIAL DIAGNOSIS.
TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE.
HIGHER-LEVEL CAUSES MUST BE EXHAUSTED BEFORE LOWER-LAYER DEFECTS MAY GOVERN EXECUTION.
TECHNICAL FINDING = EVIDENCE FIRST, NOT EXECUTION AUTHORITY.
ESCALATE BEFORE FIX.
SYSTEMIC LEVERAGE GOVERNS PRIORITY.
THE GRAPH GOVERNS MOVEMENT.
EVIDENCE GOVERNS CLOSURE.
```

## 2) Mandatory path

```text
PRE-FLIGHT / TASK ISOLATION
→ LOCK DIAGNOSTIC ALTITUDE FROM TARGET
→ OPERATIONAL TRUTH RECONCILIATION
→ ACTORS / AUTHORITY / RESPONSIBILITY
→ END-TO-END JOURNEY UNIVERSE
→ STATES / TRANSITIONS / PRECONDITIONS / INVARIANTS
→ ACTION / DECISION / FAILURE / RECOVERY
→ CROSS-SURFACE HANDOFFS
→ CANONICAL TRUTH / OWNERSHIP
→ DATA / CONTRACT / API / PERSISTENCE / EVENT FLOW
→ SURFACE / SERVICE / IMPLEMENTATION MAPPING
→ RUNTIME / INFRA / SECURITY / CI / OBSERVABILITY / GOVERNANCE
→ OPERATIONAL NEGATIVE-SPACE + ADVERSARIAL PASS
→ MACHINE OPERATIONAL-COVERAGE GATE
→ TARGET-WIDE FINDINGS
→ ROOT-CAUSE CLUSTERING
→ COMPETITIVE DEEPENING OF ROOTS THAT CAN CHANGE PRIORITY
→ SYSTEMIC-LEVERAGE RANKING
→ FRONTIER-DERIVATION GATE
→ EXECUTE HIGHEST PROVEN ROOT
→ VERIFY / RECONCILE / RE-RANK
```

لا يجوز اشتقاق Root-Cause Landscape أو Priority Model أو Sequence أو Execution Frontier من technical/repository graph وحده.

## 3) Progressive narrowing

لا Full Deep Diagnosis لكل شيء قبل أول تنفيذ، ولا leaf-first fixing.

```text
BROAD FROM THE TOP
→ ACCOUNT THE BOUNDED MATERIAL OPERATIONAL UNIVERSE
→ DEEPEN ONLY COMPETING ROOTS THAT CAN:
   - become the highest-leverage root,
   - invalidate the current highest root,
   - block it,
   - materially change ownership/blast-radius/risk.
→ FIX THE HIGHEST PROVEN ROOT
→ RECONCILE / RE-RANK
→ DESCEND
```

## 4) Diagnostic altitude

لكل TARGET ابدأ من أعلى معنى داخله:

```text
TARGET=كل شيء        → SYSTEM / OPERATIONAL ROOT
TARGET=app-captain   → captain responsibility/journeys/handoffs before files
TARGET=checkout      → checkout outcome/actors/states/payment-order truth before implementation
```

`DIAGNOSTIC_BLOCKER` فقط يسمح بهبوط تقني مبكر إذا كان يمنع معرفة الحقيقة نفسها. Test/lint/UI/dependency drift ليس Diagnostic Blocker تلقائيًا.

## 5) Lower-layer holding queue

أي technical finding يظهر قبل إثبات مكانه الأعلى يسجل في `lower-layer-observations.json`:

```text
OBS-NNN
layer / symptom / evidence
parentOperationalNode = UNKNOWN|<ID>
possibleRootCause = UNKNOWN|RC-NNN
status = HOLD|PROMOTED|DISPOSITIONED
```

`HOLD` ممنوع من التنفيذ. promotion يحتاج parent تشغيلي مثبت + root placement + priority justification.

## 6) Machine truth artifacts

كل Package جديدة تحتوي:

```text
00-OVERVIEW.md
operational-root.json
lower-layer-observations.json
root-cause-landscape.json
NNN-<sequence>.md JIT only
```

الـGates لا تثق بـHeader وحده؛ تحسب coverage/priority من JSON registries وتفشل عند missing/unaccounted material entries أو evidence.

Canonical machine gates:

```text
tools/guards/orchestrator/task-isolation-gate.mjs
tools/guards/orchestrator/root-anchor-gate.mjs
tools/guards/orchestrator/operational-root-gate.mjs
tools/guards/orchestrator/root-cause-priority-gate.mjs
tools/guards/orchestrator/frontier-derivation-gate.mjs
```

## 7) Gate order

```text
TASK ISOLATION
→ ROOT ANCHOR
→ OPERATIONAL ROOT
→ ROOT-CAUSE PRIORITY
→ FRONTIER DERIVATION
→ EXECUTION
```

Before live write all applicable gates PASS on the same latest reconciled Integration Target SHA.

## 8) Priority

```text
UPSTREAM / ROOT-CAUSE DEPTH
> BLOCKING POWER
> CANONICAL / FOUNDATION IMPORTANCE
> BLAST RADIUS
> SECURITY / DATA / FINANCE / OPERATIONAL RISK
> UNLOCK VALUE
> CROSS-JOURNEY / CROSS-SURFACE EFFECT
> FINDING DENSITY
> LOCAL LEAF
> COSMETIC / HYGIENE
```

هذا ترتيب سببي افتراضي وليس score حسابيًا أعمى. ممنوع: `RECENCY`, `MOST_FINDINGS_ALONE`, `MOST_CHANGED_FILES`, `EASIEST_FIX`, `LAST_SESSION`, `SEQUENCE_NUMBER`.

## 9) Multi-agent

Read-only breadth workers يمكنهم العمل بالتوازي على Actors/Journeys، States/Handoffs، Canonical owners/flows، Negative-space/adversarial. الكتابة المتوازية فقط على conflict domains مثبتة الاستقلال، وكل writer في workspace معزول. Integration Target له Integration Owner واحد في كل لحظة.

## 10) Resume / foreign work

Resume يعيد:

```text
latest target reconciliation
→ operational root freshness
→ affected coverage invalidation
→ root-cause landscape reconciliation
→ re-rank
→ derive current frontier
```

لا يعود إلى persisted frontier تلقائيًا. Foreign changes تُصنّف وتُرفق بعقدها إن كانت مادية، ولا تُتبع بسبب حداثتها.

## 11) Closure

لا PREPARED/CLOSED إذا كان أي من التالي غير مثبت:

```text
operational-root machine coverage
zero unaccounted material operational nodes
negative-space + adversarial operational passes
all material findings clustered/dispositioned
all material RCs ranked
frontier provenance
root treatment + affected consumers
cleanup/accounting/evidence
task integration into latest target
fresh final candidate + final adversarial/read-only verification
```

لا يوجد ادعاء «اكتشاف كل شيء مطلقًا»؛ المعيار هو **bounded material completeness** مع challenge عدائي و`UNPROVEN=OPEN`.
