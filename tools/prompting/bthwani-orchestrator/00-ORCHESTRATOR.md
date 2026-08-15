# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

هذه الحزمة منهجية تشغيل/توثيق فقط. ليست Product/Runtime Truth ولا Proof of implementation/closure. بيانات المهمة المشتقة تكتب تحت `plans/diagnose-implementing/<TASK_NAME>/`، والحقيقة الدائمة تترقى إلى مالكها الحاكم عندما يسمح الـMODE والسلطة.

## 0) الاستدعاء

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>` — استخدم هذا الملف كنقطة الدخول الوحيدة ونفّذ المسار الحاكم كاملًا FAIL-CLOSED.
```

القيم الوحيدة للـMODE: `PREPARE_ONLY` و`EXECUTE_END_TO_END`.

## 1) Root-Anchored Constitutional Rule

```text
ORCHESTRATION_ROOT = RESOLVED TARGET
LATEST_HEAD = TRUTH + INTEGRATION BASELINE ONLY
LATEST_COMMIT ≠ TASK DIRECTION
PERSISTED_FRONTIER ≠ AUTOMATIC RESUME AUTHORITY
```

في **كل استدعاء جديد أو Resume**:

```text
resolve latest HEAD
→ restore ORCHESTRATION_ROOT from TARGET/task identity
→ perform ROOT / MACRO ORIENTATION CHECK
→ reuse still-valid prior diagnosis/evidence
→ classify concurrent/foreign deltas
→ rebuild/reconcile Macro Blueprint + Relation/Dependency/Impact Graph
→ only then derive/revalidate ACTIVE_EXECUTION_FRONTIER
```

ممنوع استنتاج نقطة البدء أو الـFrontier أو Next Action من أحدث Commit/commit message/آخر جلسة/آخر ملف متغير. تغييرات الآخرين تصبح Graph/Scope Delta inputs فقط.

القواعد الحاكمة:

```text
TARGET ROOT GOVERNS ORIENTATION.
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
LEDGERS PREVENT SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
LATEST HEAD GOVERNS TRUTH AND WRITES — NOT NAVIGATION.
ONE INTEGRATION OWNER GOVERNS TARGET-BRANCH MUTATION.
EVIDENCE GOVERNS CLOSURE.
```

## 2) Root-to-Detail Orientation, Graph-Driven Movement

البدء يكون من الرأس المنطقي الأعلى ثم النزول حسب الحقيقة:

```text
ORCHESTRATION_ROOT
→ Macro Product/System Model
→ Canonical Owners / Foundations / Invariants
→ Domains / Services / Shared Contracts / Data Owners
→ Journeys / States / Handoffs
→ Surfaces / Consumers
→ implementation details
```

هذا **Orientation** وليس مسارًا خطيًا. بعد تثبيت الـMacro Graph تكون الحركة رأسية/أفقية/عكسية/Cross-Layer/Cross-Surface/Jump-to-Root مع Structured Backtracking.

```text
START FROM ROOT ≠ REDIAGNOSE EVERYTHING FROM ZERO
```

أعد استخدام ما بقي صالحًا؛ أعد فقط ما أبطلته الحقيقة الجديدة.

## 3) Foreign / Concurrent Delta Policy

أي حركة منذ آخر baseline تصنف قبل أن تؤثر على الاتجاه:

```text
UNRELATED
→ preserve on latest head
→ do not follow
→ no frontier change

RELATED_NON_BLOCKING
→ attach to correct graph node
→ update affected assumptions/evidence
→ do not promote by recency

UPSTREAM_OR_ROOT_CHANGING
→ root/macro reconciliation
→ structured backtrack if proven

BLOCKING
→ adjust only affected frontier/dependency

AUTHORITY_OR_CANONICAL_TRUTH_CHANGE
→ reread authority/truth
→ re-diagnose affected graph

DIRECT_CONFLICT
→ block affected conflict domain only
```

**Recency is never priority.** Priority comes from Root Cause + Dependency + Canonical Owner + Blast Radius + Blocking Power + Risk + Unlock Value.

## 4) Package Schema V2

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
├── 002-<proven-sequence>.md
└── ...
```

```text
ONE FILE = ONE COHERENT ROOT-CAUSE / EXECUTION / VERIFICATION / CLOSURE UNIT
SEQUENCES COME FROM THE ROOT-RECONCILED PROVEN GRAPH
CREATE SEQUENCES JUST-IN-TIME
SEQUENCE NUMBER ≠ FORCED EXECUTION ORDER
NO SPECULATIVE FUTURE SEQUENCES
NO FIXED DOMAIN TREE
NO DIAGNOSIS/EXECUTION/VERIFICATION SPLIT
```

`00-OVERVIEW.md` يمتلك Root Anchor / latest truth baseline / Macro Graph / frontier / registry / accounting / closure state فقط.

## 5) Root Reconciliation Machine Fields

كل Overview يجب أن يسجل:

```text
ORCHESTRATION_ROOT
NAVIGATION_POLICY = ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE = TRUTH_INTEGRATION_BASELINE_ONLY
ROOT_RECONCILIATION_REQUIRED = YES|NO
ROOT_RECONCILED_SHA = UNSET|<sha>
FRONTIER_DERIVATION_SOURCE = UNSET|ROOT_GRAPH
FRONTIER_VALID = YES|NO
```

قبل إنشاء/استئناف/تنفيذ Sequence:

```text
ROOT_RECONCILIATION_REQUIRED = NO
ROOT_RECONCILED_SHA = LATEST_RECONCILED_SHA
FRONTIER_DERIVATION_SOURCE = ROOT_GRAPH
FRONTIER_VALID = YES
```

للـfirst JIT Sequence: Root reconciliation يجب أن يمر أولًا؛ المولد يجعل `FRONTIER_VALID=YES` عند إنشاء الـFrontier.

أي head drift مادي أو invocation يعيد **Root Orientation Check**؛ وإذا تغيرت الحقيقة المؤثرة، يصبح `ROOT_RECONCILIATION_REQUIRED=YES` و`FRONTIER_VALID=NO` حتى إعادة الاشتقاق.

## 6) Accounting / Decisions / Root Cause

كل Material Node/Finding/Scope Delta/Decision/Consumer/Evidence/Cleanup item يجب أن يكون قابلًا للتتبع والتصرف. لا `IGNORE` ولا silent TODO.

أي قرار أو Root Cause مثبت:

```text
→ full proven impact propagation
→ writers/readers/consumers/contracts/states/data/surfaces
→ permissions/jobs/events/providers/governance/runtime/evidence
→ affected re-diagnosis
```

Finding جديدة = `SAME_ROOT_CAUSE | UPSTREAM/BLOCKER | INDEPENDENT_IN_SCOPE | SUPPORTED_EXCLUSION_WITH_PROOF`.

## 7) Multi-Agent / Backtracking

التوازي Graph-Proven لا Agent-count-driven:

```text
ORCHESTRATOR → root/graph/accounting/dedup/assignment/gates
DISCOVERY/DIAGNOSIS WORKERS → scoped parallel probes
EXECUTION WORKERS → proven-independent conflict domains only
VERIFICATION/ADVERSARIAL WORKERS → challenge completeness
INTEGRATION OWNER → sole target-branch integration owner at a time
```

إذا ظهر upstream dependency:

```text
current → SUSPENDED_BY_DEPENDENCY
→ open upstream JIT
→ fix/verify upstream
→ invalidate affected descendants
→ REOPEN/RESUME descendant after root/graph reconciliation
```

## 8) MODE

### PREPARE_ONLY
Diagnose/decide/propagate/re-diagnose from root-derived graph → exact root treatment/cutover/consumers/governance/cleanup/verification → `PREPARED`. No live Product/Governance/Runtime/Data mutation.

### EXECUTE_END_TO_END
بعد Root/Frontier gate: root fix/refactor/redesign/rebuild → all required consumer migration → contract/data sync → obsolete/parallel truth removal → cleanup → verify/readback → `COMPLETE`.

لا partial cutover.

## 9) Mandatory Root Anchor Gate

قبل `derive/resume/write/complete/closure` استخدم:

```text
node plans/diagnose-implementing/root-anchor-gate.mjs <package> --latest-sha <LIVE_HEAD_SHA> --phase <derive|frontier|closure>
```

هذا Gate لا يثبت Product correctness؛ يثبت فقط أن العمل لم يُختطف بواسطة latest commit وأن الـFrontier مشتق من Root-reconciled graph على آخر حقيقة معروفة.

## 10) Final Closure

`SEQUENCE_COMPLETE/PREPARED` لا تعني TARGET closure. يلزم global graph/accounting reconciliation + final cleanup + governance reconciliation + latest-head reconciliation + evidence invalidation/reacquisition + adversarial completeness + final read-only verification.

Final closure لا تتم إذا Root/Frontier provenance stale أو أي Material Node/Accounting category غير مغلقة.
