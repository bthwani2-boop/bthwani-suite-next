# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

هذه الحزمة منهجية تشغيل/توثيق فقط. ليست Product/Runtime Truth ولا Proof of implementation/closure. بيانات المهمة المشتقة تكتب تحت `plans/diagnose-implementing/<TASK_NAME>/`، والحقيقة الدائمة تترقى إلى مالكها الحاكم عندما يسمح الـMODE والسلطة.

## 0) الاستدعاء

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>` — استخدم هذا الملف كنقطة الدخول الوحيدة ونفّذ المسار الحاكم كاملًا FAIL-CLOSED.
```

القيم الوحيدة للـMODE: `PREPARE_ONLY` و`EXECUTE_END_TO_END`.

## 1) Invocation / Package Constitution

```text
NEW ORCHESTRATOR INVOCATION = NEW TASK PACKAGE BY DEFAULT.
EXISTING PACKAGE RESUME = EXPLICIT USER REQUEST ONLY.
PACKAGE HISTORY = REUSABLE EVIDENCE, NEVER IMPLICIT CONTINUATION AUTHORITY.
```

عند كل Invocation جديد:

```text
resolve latest integration-target HEAD
→ derive unique TASK_ID / TASK_NAME
→ create dedicated TASK_BRANCH from that exact HEAD
→ create isolated workspace:
   LOCAL_SHELL => dedicated Git worktree on TASK_BRANCH
   REMOTE/API_ONLY => dedicated TASK_BRANCH is the isolation boundary
→ create NEW package on TASK_BRANCH
→ lock TARGET / ORCHESTRATION_ROOT
→ perform Root/Macro reconciliation
→ classify prior packages/evidence and foreign deltas
→ build target-wide gap/root-cause landscape
→ derive this package's graph/frontier only after priority gates pass
```

ممنوع البحث عن "آخر حزمة مفتوحة" واستئنافها تلقائيًا. الاستئناف مسموح فقط عندما يطلب المستخدم صراحةً متابعة حزمة محددة، وعندها يجب التحقق من الحزمة/الفرع/الجذر/الـMODE وإعادة المصالحة قبل أي متابعة.

## 2) Task Isolation Constitution

```text
THIS TASK / THIS PACKAGE / THIS ROOT / THIS GRAPH GOVERN DIRECTION.
FOREIGN DELTA IS INPUT, NOT INSTRUCTION.
INTEGRATION TARGET IS TRUTH + FINAL DELIVERY TARGET, NOT WORKING CONTEXT.
DIRECT TARGET-BRANCH WRITES ARE FORBIDDEN EXCEPT THE SERIALIZED INTEGRATION OWNER.
```

كل حزمة تسجل:

```text
PACKAGE_ORIGIN
RESUME_POLICY = EXPLICIT_USER_REQUEST_ONLY
TASK_CONTEXT_POLICY = ISOLATED_CURRENT_TASK_ONLY
FOREIGN_DELTA_POLICY = INPUT_NOT_INSTRUCTION
INTEGRATION_TARGET
TASK_BRANCH
TASK_BRANCH_BASE_SHA
TASK_BRANCH_READY
WORKSPACE_ISOLATION_POLICY
WORKSPACE_ISOLATION_MODE
WORKTREE_PATH
WORKSPACE_ISOLATION_READY
DIRECT_INTEGRATION_TARGET_WRITES = FORBIDDEN_EXCEPT_INTEGRATION_OWNER
INTEGRATION_COMPLETE
```

قواعد العزل:

```text
LOCAL WRITE => one dedicated TASK_BRANCH + one dedicated worktree.
REMOTE/API WRITE => dedicated TASK_BRANCH; every API write targets TASK_BRANCH, never INTEGRATION_TARGET directly.
READ-ONLY agents may inspect pinned refs without their own worktree.
ONE WRITING WORKER = ONE isolated workspace + owned conflict domain.
ONE integration owner mutates INTEGRATION_TARGET at a time.
```

## 3) Root-Anchored Constitutional Rule

```text
ORCHESTRATION_ROOT = RESOLVED TARGET
LATEST_HEAD = TRUTH + INTEGRATION BASELINE ONLY
LATEST_COMMIT ≠ TASK DIRECTION
PERSISTED_FRONTIER ≠ AUTOMATIC RESUME AUTHORITY
```

في كل Invocation جديد أو explicit Resume:

```text
resolve latest integration-target HEAD
→ restore ORCHESTRATION_ROOT from TARGET/task identity
→ ROOT / MACRO ORIENTATION CHECK
→ reuse still-valid prior diagnosis/evidence
→ classify concurrent/foreign deltas
→ rebuild/reconcile Macro Blueprint + Relation/Dependency/Impact Graph
→ build/reconcile target-wide Gap & Root-Cause Landscape
→ only then derive/revalidate ACTIVE_EXECUTION_FRONTIER
```

ممنوع استنتاج نقطة البدء أو الـFrontier أو Next Action من أحدث Commit/commit message/آخر جلسة/آخر ملف متغير.

القواعد الحاكمة:

```text
TARGET ROOT GOVERNS ORIENTATION.
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
SYSTEMIC LEVERAGE GOVERNS PRIORITY.
LEDGERS PREVENT SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
LATEST HEAD GOVERNS TRUTH AND INTEGRATION — NOT NAVIGATION.
TASK ISOLATION GOVERNS WRITES.
ONE INTEGRATION OWNER GOVERNS TARGET-BRANCH MUTATION.
EVIDENCE GOVERNS CLOSURE.
```

## 4) Root-to-Detail Orientation, Graph-Driven Movement

البدء من الرأس المنطقي الأعلى ثم النزول حسب الحقيقة:

```text
ORCHESTRATION_ROOT
→ Macro Product/System Model
→ Canonical Owners / Foundations / Invariants
→ Domains / Services / Shared Contracts / Data Owners
→ Journeys / States / Handoffs
→ Surfaces / Consumers
→ implementation/runtime details
```

هذا Orientation وليس مسارًا خطيًا. بعد تثبيت الـMacro Graph تكون الحركة رأسية/أفقية/عكسية/Cross-Layer/Cross-Surface/Jump-to-Root مع Structured Backtracking.

```text
START FROM ROOT ≠ REDIAGNOSE EVERYTHING FROM ZERO
```

أعد استخدام ما بقي صالحًا؛ أعد فقط ما أبطلته الحقيقة الجديدة.

## 5) Target-Wide Gap & Root-Cause Landscape — Mandatory Before Execution

قبل أول Frontier تنفيذية، وقبل إعادة ترتيب Frontier بعد أي اكتشاف مادي يغيّر الصورة، يجب بناء Landscape على كامل `TARGET` المصرح به:

```text
material gaps / defects / contradictions / regressions / missing states
+ duplicate/parallel truth
+ structural/cleanup debt
+ missing owners/consumers/contracts/data/runtime paths
→ correlate symptoms
→ ROOT-CAUSE CLUSTERS (RC-NNN)
→ dependency / impact placement
→ comparative systemic-priority model
→ adversarial challenge of missing/unclustered/unranked material work
```

لا تبدأ بالأكثر عددًا فقط. كثرة Findings هي **إشارة Correlation** وليست Priority مطلقة. قد يتقدم Root Cause له 3 أعراض على Cluster له 40 عرضًا إذا كان الأول أعلى في dependency graph أو يملك foundation/canonical truth أو يحجب النظام أو أثره/مخاطره/قيمة فتحه أكبر.

ترتيب المقارنة الحاكم، مع استخدام الأدلة لا جمع نقاط ميكانيكي أعمى:

```text
UPSTREAM / ROOT-CAUSE DEPTH
→ BLOCKING POWER
→ CANONICAL / FOUNDATION IMPORTANCE
→ BLAST RADIUS
→ RISK / SEVERITY
→ UNLOCK VALUE
→ FINDING DENSITY / RECURRENCE
→ STRUCTURAL-DEBT MULTIPLIER
```

إذا كانت الأدلة غير كافية لتحديد Root Cause أو ترتيب Cluster قد يغير التنفيذ، الأولوية تصبح **لمزيد من التشخيص** لا لكتابة إصلاح غير مثبت.

ممنوع اختيار Frontier بسبب:

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
PRIORITY = HIGHEST PROVEN SYSTEMIC LEVERAGE.
```

Machine gates قبل اشتقاق/تنفيذ Frontier:

```text
TARGET_LANDSCAPE_COMPLETE = YES
LANDSCAPE_RECONCILED_SHA = LATEST_RECONCILED_SHA
ROOT_CAUSE_CLUSTERING_COMPLETE = YES
ROOT_CAUSE_CLUSTERS_ACCOUNTED = YES
UNCLUSTERED_MATERIAL_FINDINGS = 0
PRIORITY_MODEL_COMPLETE = YES
PRIORITY_DERIVATION_SOURCE = ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS = 0
PRIMARY_FRONTIER_JUSTIFIED = YES
LANDSCAPE_ADVERSARIAL_PASS = YES
PRIORITY_POLICY = HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
```

أي Finding/Scope Delta/Decision/foreign truth جديد يخلق Root Cause جديدًا أو يغير dependency/blast radius/risk/unlock value يعيد `PRIORITY_MODEL_COMPLETE=NO` و`PRIMARY_FRONTIER_JUSTIFIED=NO` حتى إعادة clustering/ranking. لا يلزم إعادة landscape غير المتأثرة بلا سبب.

## 6) Foreign / Concurrent Delta Policy

أي حركة منذ آخر baseline تصنف قبل أن تؤثر على الاتجاه:

```text
UNRELATED
→ preserve
→ do not follow
→ no frontier change

RELATED_NON_BLOCKING
→ attach to correct graph node/root-cause cluster
→ update affected assumptions/evidence
→ do not promote by recency

UPSTREAM_OR_ROOT_CHANGING
→ root/macro reconciliation
→ structured backtrack if proven

BLOCKING
→ adjust only affected frontier/dependency

AUTHORITY_OR_CANONICAL_TRUTH_CHANGE
→ reread authority/truth
→ re-diagnose affected graph/landscape

DIRECT_CONFLICT
→ block affected conflict domain only
```

**Recency is never priority.**

## 7) Package Schema V2

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
├── 002-<proven-sequence>.md
└── ...
```

```text
ONE FILE = ONE COHERENT ROOT-CAUSE / EXECUTION / VERIFICATION / CLOSURE UNIT
SEQUENCES COME FROM THE ROOT-RECONCILED + PRIORITIZED PROVEN GRAPH
CREATE SEQUENCES JUST-IN-TIME
SEQUENCE NUMBER ≠ FORCED EXECUTION ORDER
NO SPECULATIVE FUTURE SEQUENCES
NO FIXED DOMAIN TREE
NO DIAGNOSIS/EXECUTION/VERIFICATION SPLIT
```

`00-OVERVIEW.md` يمتلك Task isolation + Root Anchor + Macro Graph + Root-Cause Landscape/Priority + frontier + registry + accounting + closure state فقط.

## 8) Root / Landscape / Frontier Machine Fields

```text
ORCHESTRATION_ROOT
NAVIGATION_POLICY = ROOT_ANCHORED_GRAPH_ONLY
LATEST_HEAD_ROLE = TRUTH_INTEGRATION_BASELINE_ONLY
ROOT_RECONCILIATION_REQUIRED = YES|NO
ROOT_RECONCILED_SHA = UNSET|<sha>
TARGET_LANDSCAPE_COMPLETE = YES|NO
LANDSCAPE_RECONCILED_SHA = UNSET|<sha>
ROOT_CAUSE_CLUSTERING_COMPLETE = YES|NO
ROOT_CAUSE_CLUSTERS_ACCOUNTED = YES|NO
UNCLUSTERED_MATERIAL_FINDINGS = UNSET|0|<positive-int>
PRIORITY_MODEL_COMPLETE = YES|NO
PRIORITY_DERIVATION_SOURCE = UNSET|ROOT_CAUSE_LANDSCAPE
UNRANKED_MATERIAL_CLUSTERS = UNSET|0|<positive-int>
PRIMARY_FRONTIER_JUSTIFIED = YES|NO
LANDSCAPE_ADVERSARIAL_PASS = YES|NO
PRIORITY_POLICY = HIGHEST_PROVEN_SYSTEMIC_LEVERAGE
FRONTIER_DERIVATION_SOURCE = UNSET|ROOT_GRAPH
FRONTIER_VALID = YES|NO
```

قبل إنشاء/استئناف/تنفيذ Sequence يجب أن تمر Root + Landscape/Priority + Isolation gates على آخر truth ذات الصلة.

## 9) Accounting / Decisions / Root Cause

كل Material Node/Finding/Root-Cause Cluster/Scope Delta/Decision/Consumer/Evidence/Cleanup item يجب أن يكون قابلًا للتتبع والتصرف. لا `IGNORE` ولا silent TODO.

أي قرار أو Root Cause مثبت:

```text
→ full proven impact propagation
→ writers/readers/consumers/contracts/states/data/surfaces
→ permissions/jobs/events/providers/governance/runtime/evidence
→ affected re-diagnosis
→ affected cluster/priority re-evaluation
```

Finding جديدة = `SAME_ROOT_CAUSE | UPSTREAM/BLOCKER | INDEPENDENT_IN_SCOPE | SUPPORTED_EXCLUSION_WITH_PROOF`.

## 10) Multi-Agent / Backtracking

```text
ORCHESTRATOR → root/graph/landscape/clustering/priority/accounting/dedup/assignment/gates
DISCOVERY/DIAGNOSIS WORKERS → scoped read-only/isolated probes across different diagnostic angles
EXECUTION WORKERS → proven-independent conflict domains in isolated workspaces
VERIFICATION/ADVERSARIAL WORKERS → challenge completeness/candidate/landscape priority
INTEGRATION OWNER → sole integration-target mutation owner
```

إذا ظهر upstream dependency:

```text
current → SUSPENDED_BY_DEPENDENCY
→ update cluster/dependency landscape
→ rerank affected material clusters
→ open upstream JIT if it becomes proven frontier
→ fix/verify upstream
→ invalidate affected descendants
→ REOPEN/RESUME descendant after root/graph/priority reconciliation
```

## 11) MODE

### PREPARE_ONLY

Diagnose/cluster/rank/decide/propagate/re-diagnose from root-derived graph → exact treatment/cutover/consumers/governance/cleanup/verification → `PREPARED`. لا live Product/Runtime/Data mutation. Package/workspace writes remain isolated on TASK_BRANCH.

### EXECUTE_END_TO_END

بعد Root + Landscape/Priority + Task-Isolation + Frontier gates:

```text
highest-leverage proven root fix/refactor/redesign/rebuild
→ required consumers
→ contract/data/generated sync
→ obsolete/parallel truth removal
→ cleanup
→ verify/readback
→ COMPLETE
→ reconcile/rerank landscape
→ next proven frontier
```

لا partial cutover.

## 12) Mandatory Gates

Root provenance:

```text
node plans/diagnose-implementing/root-anchor-gate.mjs <package> --latest-sha <LIVE_INTEGRATION_TARGET_SHA> --phase <derive|frontier|closure>
```

Root-cause landscape / priority:

```text
node plans/diagnose-implementing/root-cause-priority-gate.mjs <package> --latest-sha <LIVE_INTEGRATION_TARGET_SHA> --phase <derive|frontier|closure>
```

Task isolation:

```text
node plans/diagnose-implementing/task-isolation-gate.mjs <package> \
  --latest-target-sha <LIVE_INTEGRATION_TARGET_SHA> \
  --phase <write|resume|integrate> \
  --runtime <local|remote-api> \
  [--explicit-resume YES] \
  [--current-branch <branch>]
```

هذه الـGates تثبت provenance/isolation/priority accounting فقط، لا Product correctness.

## 13) Integration / Final Candidate

لا يصبح نجاح TASK_BRANCH إغلاقًا للـTARGET.

```text
task branch result
→ resolve latest INTEGRATION_TARGET
→ classify foreign delta
→ reconcile/rebase/rebuild semantically
→ rerun invalidated checks
→ Integration Owner only
→ fast-forward-safe/non-force integration
→ INTEGRATION_COMPLETE=YES
→ freeze exact integration-target candidate
→ final read-only verification
```

`A` أو أي Integration Target يبقى **latest truth + final delivery target**؛ لا يستخدم كـshared working context.

## 14) Final Closure

`SEQUENCE_COMPLETE/PREPARED` لا تعني TARGET closure. يلزم global graph + root-cause landscape/priority + accounting reconciliation + final cleanup + governance reconciliation + latest-head reconciliation + task integration + evidence invalidation/reacquisition + adversarial completeness + final read-only verification.

Final closure ممنوعة إذا:
- root/frontier/landscape/priority provenance stale؛
- material Finding غير clustered/dispositioned أو material Cluster غير ranked؛
- task/workspace isolation غير مثبت؛
- `INTEGRATION_COMPLETE != YES`؛
- أي Material Node/Accounting category غير مغلقة؛
- final candidate ليس HEAD الحالي للـIntegration Target.
