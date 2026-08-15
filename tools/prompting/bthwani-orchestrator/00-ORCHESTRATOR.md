# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

هذه الحزمة منهجية توثيقية تحت `tools/prompting/**`. ليست Product Code ولا Runtime Code ولا Product Truth ولا Proof of implementation/closure. بيانات المهمة المشتقة تكتب تحت `plans/diagnose-implementing/<TASK_NAME>/`، والحقيقة الدائمة تترقى إلى مالكها الحاكم داخل `governance/**`/العقود/الكود الحي عندما يسمح الـMODE والسلطة بذلك.

## 0) الاستدعاء

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>` — استخدم `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` كنقطة الدخول الوحيدة ونفّذ المسار الحاكم كاملًا FAIL-CLOSED دون تخطي أي Gate.
```

القيم الوحيدة للـMODE: `PREPARE_ONLY` و`EXECUTE_END_TO_END`.

## 1) المبدأ الحاكم

```text
THE GRAPH GOVERNS MOVEMENT.
ROOT CAUSE GOVERNS SCOPE.
LEDGERS PREVENT SILENT LOSS.
DEPENDENCIES GOVERN ORDER.
INDEPENDENCE GOVERNS PARALLELISM.
LATEST HEAD GOVERNS WRITES.
ONE INTEGRATION OWNER GOVERNS TARGET-BRANCH MUTATION.
EVIDENCE GOVERNS CLOSURE.
```

التشخيص/التحليل/انتشار الأثر **شبكي وغير خطي**: رأسي/أفقي/عكسي/عبر الطبقات والأسطح والخدمات والبيانات والعقود والـRuntime، مع قفز منطقي إلى Root Cause أو Dependency أعمق ثم عودة منظمة. أرقام Sequences تسجل وحدات الإغلاق ولا تفرض مسارًا خطيًا مصطنعًا.

المسار المشترك:

```text
PIN LATEST TRUTH
→ CAPABILITY PREFLIGHT
→ CREATE/RESUME OVERVIEW
→ GLOBAL DISCOVERY
→ RELATION / DEPENDENCY GRAPH
→ ACCOUNT EVERY MATERIAL NODE
→ ROOT-CAUSE CORRELATION
→ DERIVE PROVEN EXECUTION FRONTIER
→ DIAGNOSE / DECIDE / PROPAGATE / RE-DIAGNOSE
→ DEFINE EXACT TARGET STATE / CUTOVER / CLEANUP / VERIFICATION
→ MODE-SPECIFIC EXECUTION OR HANDOFF
→ RECONCILE GRAPH ON LATEST HEAD
```

لا questions-first، ولا app-by-app ordering، ولا إصلاح أعراض معروفة وترك Root Cause مثبت، ولا إسقاط Finding/Dependency/Consumer/Scope Delta لأن موقعه في التسلسل لم يأت بعد.

## 2) Package Schema V2 — Graph-Driven Adaptive Package

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
├── 002-<proven-sequence>.md
└── ...
```

قواعد دستورية:

```text
ONE FILE = ONE COHERENT ROOT-CAUSE / EXECUTION / VERIFICATION / CLOSURE UNIT
SEQUENCES COME FROM THE PROVEN GRAPH
CREATE SEQUENCES JUST-IN-TIME
NO FIXED NUMBER OF SEQUENCES
NO FIXED DOMAIN DIRECTORY TREE
NO SUBDIRECTORIES INSIDE V2 PACKAGE
NO DIAGNOSIS/EXECUTION/VERIFICATION SPLIT
NO FILE WITHOUT DISTINCT PURPOSE
NO SPLIT BY LINE COUNT ALONE
NO MERGE OF UNRELATED CLOSURE BOUNDARIES
```

`00-OVERVIEW.md` هو Control/Accounting layer صغير: Task/SHA/Macro Graph/Execution Frontier/Sequence Registry/Global Decisions/Accounting/Final Closure فقط. لا يكرر تفاصيل Sequences.

## 3) Accounting Machine — منع النسيان

كل شيء مادي يجب أن يملك هوية وحالة:

```text
DISCOVERED MATERIAL NODE → GRAPH NODE + COVERAGE STATUS
DEFECT/GAP/CONTRADICTION → FINDING ID
NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA ID
TRUE DECISION → DECISION ID
EXECUTION/CLOSURE UNIT → SEQUENCE ID
TEST/RUNTIME/READBACK/REVIEW → EVIDENCE ID
CLEANUP RESIDUE → CLEANUP DISPOSITION
```

ممنوع `IGNORE`, silent TODO, أو عنصر مادي بلا disposition. قبل handoff/closure يلزم:

```text
FINDINGS_ACCOUNTED = YES
SCOPE_DELTAS_ACCOUNTED = YES
DECISIONS_ACCOUNTED = YES
CONSUMERS_ACCOUNTED = YES
EVIDENCE_ACCOUNTED = YES
CLEANUP_ACCOUNTED = YES
ACCOUNTING_COMPLETE = YES
```

`ACCOUNTING_COMPLETE` لا يعني “لم نجد مشاكل”، بل يعني أن كل ما اكتُشف ماديًا مصنف ومربوط ومغلق أو مستبعد بدليل.

## 4) Decision / Root-Cause Propagation

أي قرار أو Root Cause مثبت ينتشر فورًا عبر **كامل Proven Impact Graph**:

```text
writers → readers → consumers → contracts → states → data → surfaces
→ permissions → jobs/events/providers → governance → runtime/evidence
```

الانتشار فوري؛ التنفيذ يبقى dependency-ordered. لا تغلق Sequence إذا بقي Consumer/parallel truth/migration/legacy path/workaround لازم لصحة الـcoherent cutover.

أي Finding جديدة يجب أن تصبح واحدة من:

```text
SAME_ROOT_CAUSE → fix in current closure unit
UPSTREAM/BLOCKER → structured backtrack
INDEPENDENT_IN_SCOPE → proven later/parallel Sequence
SUPPORTED_EXCLUSION → proof + reopen trigger
```

لا يوجد `IGNORE`.

## 5) Graph-Driven Movement + Structured Backtracking

الحركة قد تكون:

```text
vertical / horizontal / reverse / cross-layer / cross-surface / cross-domain / jump-to-root
```

إذا اكتشف `SEQ-A` اعتمادًا أعمق:

```text
SEQ-A → SUSPENDED_BY_DEPENDENCY
→ derive/open upstream SEQ-B
→ finish/prepare B
→ invalidate affected assumptions/evidence in A
→ REOPEN/RESUME A
→ re-diagnose before continuing
```

يمكن أن توجد Sequences معلقة أو معاد فتحها. **الممنوع هو تنفيذ متضارب بلا ملكية**، وليس وجود أكثر من عقدة غير terminal.

## 6) Multi-Agent Orchestration

التوازي ديناميكي حسب الـGraph، لا حسب عدد الوكلاء المرغوب:

```text
ORCHESTRATOR ROLE
→ owns graph/accounting/dedup/root-cause correlation/assignment/gates

DISCOVERY/DIAGNOSIS WORKERS
→ parallel read/analysis probes on scoped graph regions

EXECUTION WORKERS
→ may work in parallel only on graph-proven independent conflict domains

VERIFICATION / ADVERSARIAL WORKERS
→ challenge root cause, missed consumers, stale paths, weak tests, closure claims

INTEGRATION OWNER
→ the only owner allowed to mutate/integrate the target branch at a time
```

كل عامل يجب أن يملك:

```text
MISSION + GRAPH_SCOPE + INPUT_SHA + READ/WRITE_AUTHORITY
+ CONFLICT_DOMAIN + EXPECTED_OUTPUT + HANDOFF + INVALIDATION_TRIGGER
```

قواعد:

```text
NO AGENT WITHOUT OWNED QUESTION/SCOPE
NO DUPLICATE INVESTIGATION WITHOUT INDEPENDENCE PURPOSE
NO PARALLEL WRITES TO SAME SEMANTIC OWNER/CONFLICT DOMAIN
MULTIPLE INDEPENDENT EXECUTION FRONTS ARE ALLOWED
TARGET-BRANCH INTEGRATION REMAINS SERIALIZED
```

## 7) Sequence States

Allowed conceptual states:

```text
DIAGNOSING
DECISION_REQUIRED
SOLUTION_READY
READY_TO_EXECUTE
EXECUTING
VERIFYING
SUSPENDED_BY_DEPENDENCY
REOPENED
BLOCKED_EXTERNAL
PREPARED
COMPLETE
```

كل Sequence تسجل: `DEPENDS_ON / BLOCKS / UNLOCKS / CONFLICT_DOMAIN / EXECUTION_OWNER / SUSPENDED_BY / RESUME_AFTER / INVALIDATES / REOPEN_TRIGGER`.

## 8) PREPARE_ONLY

لكل Sequence:

```text
diagnose → decisions → full impact propagation → re-diagnose
→ exact root treatment/cutover → consumers/governance/cleanup/verification
→ findings/dependencies dispositioned
→ SEQUENCE_STATUS=PREPARED
```

لا Product/Governance/Runtime/Data/Provider mutation. يسمح بتوازي الاستكشاف/التشخيص المستقل، لكن لا live product write.

## 9) EXECUTE_END_TO_END

قبل live write لأي Sequence:

```text
ROOT_CAUSE_PROVEN = YES
DECISIONS_RESOLVED = YES
DECISION_IMPACT_PROPAGATED = YES
REDIAGNOSIS_COMPLETE = YES
IMPACT_MAPPED = YES
FINDINGS_DISPOSITIONED = YES
DEPENDENCIES_DISPOSITIONED = YES
VERIFICATION_DEFINED = YES
SOLUTION_READY = YES
RECONCILED_HEAD_SHA = latest reconciled head
EXECUTION_OWNER assigned
CONFLICT_DOMAIN classified
```

ثم:

```text
root fix/refactor/redesign/rebuild
→ migrate every required consumer
→ synchronize contracts/data/generated state
→ remove obsolete/parallel truth
→ local cleanup
→ verify/readback
→ SEQUENCE_STATUS=COMPLETE
```

لا إغلاق جزئي للـcutover.

## 10) Continuous Latest-Head Execution

العمل دائمًا على أحدث رأس دون تعطيل الحملة كلها:

```text
before sequence creation / semantic write / integration / push / final decision:
resolve LATEST_REMOTE_SHA
→ compare prior base → latest
→ classify semantic delta
```

```text
DISJOINT → adopt latest head automatically; retain valid evidence
RELATED_NON_CONFLICTING → reconcile affected assumptions/checks
SEMANTIC_OVERLAP → pause/re-diagnose affected node only
DIRECT_CONFLICT → block conflicting node only; independent graph work continues
AUTHORITY_OR_TRUTH_CHANGE → invalidate affected model and reread authority/truth
```

Git clean merge ≠ semantic safety. لا stale push ولا force push. Target branch mutation = one Integration Owner + fast-forward-safe update on latest reconciled head.

## 11) Global Closure

`SEQUENCE_COMPLETE/PREPARED` لا تعني TARGET closure. بعد تغطية Material Universe:

```text
global graph/accounting reconciliation
→ cross-sequence/journey/surface/state/owner reconciliation
→ duplicate truth / hidden writer / legacy path search
→ final structural cleanup
→ governance reconciliation
→ latest HEAD reconciliation
→ evidence invalidation/reacquisition
→ independent adversarial completeness
→ final read-only verification
```

Global gates:

```text
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
ACCOUNTING_COMPLETE
PACKAGE_READY
```

وفي EXECUTE يضاف implementation/evidence/cleanup/governance/fresh-head/adversarial gates، ولا يصدر القرار النهائي إلا على نفس immutable candidate وبحسب current governance decision vocabulary.

## 12) الوحدات الحاكمة

```text
01-CORE-CONTRACT.md
02-DISCOVERY-DIAGNOSIS.md
03-DECISIONS-COVERAGE-ANTI-DRIFT.md
04-PACKAGE-EXECUTION.md
05-VERIFICATION-CLEANUP-CLOSURE.md
06-CONCURRENCY-RESUME-RECOVERY.md
contracts/OVERVIEW-CONTRACT.md
contracts/SEQUENCE-CONTRACT.md
contracts/DECISION-OUTPUT-CONTRACT.md
contracts/EVIDENCE-CONTRACT.md
contracts/CLOSURE-CONTRACT.md
```

`source-map/SOURCE-RULE-TRACEABILITY.md` يثبت مصدر القواعد. أي Source SHA drift أو تغيير منهجي مادي يعيد فتح Source Coverage حتى المصالحة.
