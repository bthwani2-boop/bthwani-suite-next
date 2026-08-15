# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / GOVERNING_ENTRYPOINT

هذا الملف هو نقطة الدخول الوحيدة. الوحدات `01–06` عقود مكملة غير متعارضة؛ كل واحدة تملك مسؤولية واحدة. الحقيقة التشغيلية/التنفيذية لا تأتي من هذه الوثائق بل من الأدلة الحية والمصادر الحاكمة.

## 0) Invocation

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>`
```

MODE فقط: `PREPARE_ONLY | EXECUTE_END_TO_END`.

## 1) Constitution

```text
NEW INVOCATION = NEW PACKAGE + DEDICATED TASK BRANCH/WORKSPACE.
OLD PACKAGE RESUME = EXPLICIT USER REQUEST FOR EXACT PACKAGE ONLY.
TARGET = ORCHESTRATION_ROOT.
LATEST HEAD = TRUTH + INTEGRATION BASELINE ONLY; NEVER TASK DIRECTION.
FOREIGN DELTA = INPUT, NOT INSTRUCTION.

OPERATIONAL MEANING GOVERNS INITIAL DIAGNOSIS.
TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE.
ESCALATE BEFORE FIX.
TECHNICAL FINDING = EVIDENCE FIRST, NOT EXECUTION AUTHORITY.
HIGHER MATERIAL CAUSES MUST BE EXHAUSTED BEFORE LOWER-LAYER DEFECTS GOVERN EXECUTION.

THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
SYSTEMIC LEVERAGE GOVERNS PRIORITY.
TASK ISOLATION GOVERNS WRITES.
ONE INTEGRATION OWNER GOVERNS TARGET MUTATION.
LEDGERS PREVENT SILENT LOSS.
EVIDENCE GOVERNS CLOSURE.
UNPROVEN = OPEN.
```

## 2) One mandatory diagnostic path

```text
PRE-FLIGHT / TASK ISOLATION
→ LOCK MINIMUM_DIAGNOSTIC_ALTITUDE FROM TARGET
→ OPERATIONAL TRUTH RECONCILIATION
→ PRODUCT OUTCOMES
→ ACTORS / AUTHORITY / RESPONSIBILITY
→ END-TO-END JOURNEY UNIVERSE
→ STATES / TRANSITIONS / PRECONDITIONS / INVARIANTS
→ ACTION / DECISION / FAILURE / RECOVERY
→ CROSS-SURFACE HANDOFFS
→ CANONICAL TRUTH / OWNERSHIP
→ DATA / CONTRACT / API / PERSISTENCE / EVENT / READBACK FLOW
→ SURFACE / SERVICE / IMPLEMENTATION / RUNTIME BOUNDARIES
→ OPERATIONAL NEGATIVE-SPACE + ADVERSARIAL CHALLENGE
→ MACHINE OPERATIONAL-ROOT GATE
→ TARGET-WIDE FINDINGS
→ ROOT-CAUSE CLUSTERING
→ COMPETITIVE DEEPENING
→ SYSTEMIC-LEVERAGE RANKING
→ MACHINE FRONTIER-DERIVATION GATE
→ EXECUTE HIGHEST PROVEN ROOT
→ VERIFY / RECONCILE / RE-RANK
```

لا يوجد مسار آخر يسمح باشتقاق Landscape/Priority/Sequence/Frontier قبل Operational Root PASS.

## 3) Progressive narrowing

لا Full Deep Scan أعمى لكل leaf قبل أول تنفيذ، ولا leaf-first fixing. Breadth التشغيلي يثبت `bounded material operational universe` أولًا. بعده نعمق فقط root candidates القادرة على:

```text
become the highest-leverage root
OR invalidate the current winner
OR block the current winner
OR materially change authority / dependency / blast-radius / risk / unlock value
```

إذا ثبت أن candidate لا تستطيع ذلك، تبقى محاسبة للمرحلة اللاحقة ولا تستهلك Deep Diagnosis الآن.

## 4) Diagnostic altitude

ابدأ من أعلى معنى تشغيلي داخل TARGET، لا من أعلى مجلد تقني:

```text
TARGET=كل شيء      → SYSTEM_OPERATIONAL_ROOT
TARGET=app-captain → responsibility/journeys/states/handoffs before app files
TARGET=checkout    → outcome/actors/order-payment states/truth before components/APIs
```

الهبوط المبكر مسموح فقط لـ`DIAGNOSTIC_BLOCKER` مثبت يمنع اكتساب الحقيقة نفسها، وبأصغر معالجة لازمة ثم عودة فورية للمسار الأعلى.

## 5) Lower-layer holding queue

أي `UI/Expo/SQL/CI/lint/dependency/file/runtime` defect يظهر قبل parent/root placement يسجل `HOLD`. لا يهمل ولا ينفذ. Promotion يتطلب:

```text
operational parent proven
+ RC-NNN placement proven
+ current comparative priority justified
+ promotion evidence
```

## 6) Machine truth

Package V2 يبقى flat:

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
└── NNN-<sequence>.md
```

Machine evidence منفصلة:

```text
plans/diagnose-implementing/_machine/<TASK_NAME>/
├── operational-root.json
├── lower-layer-observations.json
└── root-cause-landscape.json
```

`00-OVERVIEW.md` ملخص/provenance؛ لا يستطيع `YES` أو `0` مكتوب يدويًا صناعة PASS.

## 7) Canonical gates

```text
tools/guards/orchestrator/task-isolation-gate.mjs
tools/guards/orchestrator/root-anchor-gate.mjs
tools/guards/orchestrator/operational-root-gate.mjs
tools/guards/orchestrator/root-cause-priority-gate.mjs
tools/guards/orchestrator/frontier-derivation-gate.mjs
```

قبل Sequence/live write:

```text
TASK ISOLATION
→ ROOT ANCHOR
→ OPERATIONAL ROOT
→ ROOT-CAUSE PRIORITY
→ FRONTIER DERIVATION
→ SEQUENCE DECISION/IMPACT/SOLUTION/VERIFICATION GATES
```

Compatibility entries تحت `plans/diagnose-implementing/*-gate.mjs` تستدعي canonical gates فقط ولا تملك منطقًا موازيًا.

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

هذا causal default precedence وليس score أعمى. ممنوع أن تحكم الأولوية: `RECENCY / MOST_FINDINGS_ALONE / MOST_CHANGED_FILES / EASIEST_FIX / LAST_SESSION / SEQUENCE_NUMBER`.

## 9) Unit ownership

```text
01-CORE-CONTRACT                  → truth/scope/isolation/gates invariants
02-DISCOVERY-DIAGNOSIS            → operational discovery/deepening/evidence methods
03-DECISIONS-COVERAGE-ANTI-DRIFT  → accounting/decisions/priority/invalidation
04-PACKAGE-EXECUTION              → package/JIT/write/cutover/integration
05-VERIFICATION-CLEANUP-CLOSURE   → evidence/cleanup/fresh-head/final closure
06-CONCURRENCY-RESUME-RECOVERY    → agents/worktrees/resume/backtracking/concurrency
contracts/*                       → machine/document schemas
```

لا تكرر وحدة سلطة وحدة أخرى؛ الإحالة إليها بدل تعريف قاعدة ثانية.

## 10) Closure

لا `PREPARED/CLOSED` إلا بعد Operational Root machine PASS + Root-Cause Priority PASS + Frontier/empty-frontier proof + جميع accounting/cleanup/evidence/governance/integration/fresh-head/adversarial gates في `05`. المعيار `bounded material completeness`; لا ادعاء اكتمال مطلق غير قابل للإثبات.
