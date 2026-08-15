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
→ derive this package's graph/frontier
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
→ only then derive/revalidate ACTIVE_EXECUTION_FRONTIER
```

ممنوع استنتاج نقطة البدء أو الـFrontier أو Next Action من أحدث Commit/commit message/آخر جلسة/آخر ملف متغير.

القواعد الحاكمة:

```text
TARGET ROOT GOVERNS ORIENTATION.
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
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

## 5) Foreign / Concurrent Delta Policy

أي حركة منذ آخر baseline تصنف قبل أن تؤثر على الاتجاه:

```text
UNRELATED
→ preserve
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

## 6) Package Schema V2

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

`00-OVERVIEW.md` يمتلك Task isolation + Root Anchor + latest truth baseline + Macro Graph + frontier + registry + accounting + closure state فقط.

## 7) Root Reconciliation Machine Fields

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
TASK_BRANCH_READY = YES
WORKSPACE_ISOLATION_READY = YES
```

أي integration-target head drift مادي يعيد Root Orientation Check للـcone المتأثر؛ إذا تغيرت الحقيقة المؤثرة تصبح root/frontier provenance stale حتى إعادة الاشتقاق.

## 8) Accounting / Decisions / Root Cause

كل Material Node/Finding/Scope Delta/Decision/Consumer/Evidence/Cleanup item يجب أن يكون قابلًا للتتبع والتصرف. لا `IGNORE` ولا silent TODO.

أي قرار أو Root Cause مثبت:

```text
→ full proven impact propagation
→ writers/readers/consumers/contracts/states/data/surfaces
→ permissions/jobs/events/providers/governance/runtime/evidence
→ affected re-diagnosis
```

Finding جديدة = `SAME_ROOT_CAUSE | UPSTREAM/BLOCKER | INDEPENDENT_IN_SCOPE | SUPPORTED_EXCLUSION_WITH_PROOF`.

## 9) Multi-Agent / Backtracking

```text
ORCHESTRATOR → root/graph/accounting/dedup/assignment/gates
DISCOVERY/DIAGNOSIS WORKERS → scoped read-only/isolated probes
EXECUTION WORKERS → proven-independent conflict domains in isolated workspaces
VERIFICATION/ADVERSARIAL WORKERS → challenge completeness/candidate
INTEGRATION OWNER → sole integration-target mutation owner
```

إذا ظهر upstream dependency:

```text
current → SUSPENDED_BY_DEPENDENCY
→ open upstream JIT
→ fix/verify upstream
→ invalidate affected descendants
→ REOPEN/RESUME descendant after root/graph reconciliation
```

## 10) MODE

### PREPARE_ONLY

Diagnose/decide/propagate/re-diagnose from root-derived graph → exact treatment/cutover/consumers/governance/cleanup/verification → `PREPARED`. لا live Product/Runtime/Data mutation. Package/workspace writes remain isolated on TASK_BRANCH.

### EXECUTE_END_TO_END

بعد Root + Task-Isolation + Frontier gates:

```text
root fix/refactor/redesign/rebuild
→ required consumers
→ contract/data/generated sync
→ obsolete/parallel truth removal
→ cleanup
→ verify/readback
→ COMPLETE
```

لا partial cutover.

## 11) Mandatory Gates

Root provenance:

```text
node plans/diagnose-implementing/root-anchor-gate.mjs <package> --latest-sha <LIVE_INTEGRATION_TARGET_SHA> --phase <derive|frontier|closure>
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

هذه الـGates تثبت provenance/isolation فقط، لا Product correctness.

## 12) Integration / Final Candidate

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

## 13) Final Closure

`SEQUENCE_COMPLETE/PREPARED` لا تعني TARGET closure. يلزم global graph/accounting reconciliation + final cleanup + governance reconciliation + latest-head reconciliation + task integration + evidence invalidation/reacquisition + adversarial completeness + final read-only verification.

Final closure ممنوعة إذا:
- root/frontier provenance stale؛
- task/workspace isolation غير مثبت؛
- `INTEGRATION_COMPLETE != YES`؛
- أي Material Node/Accounting category غير مغلقة؛
- final candidate ليس HEAD الحالي للـIntegration Target.
