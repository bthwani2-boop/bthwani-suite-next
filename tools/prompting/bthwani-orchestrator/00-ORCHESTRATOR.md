# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

هذه الحزمة منهجية توثيقية فقط تحت `tools/prompting/**`. ليست Product Code ولا Runtime Code ولا Product Truth ولا Proof of implementation/closure. بيانات المهمة المشتقة تكتب تحت `plans/diagnose-implementing/<TASK_NAME>/`، والحقيقة الدائمة تترقى إلى مالكها الحاكم داخل `governance/**`/العقود/الكود الحي عندما يسمح الـMODE والسلطة بذلك.

## 0) الاستدعاء

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>` — استخدم `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` كنقطة الدخول الوحيدة ونفّذ المسار الحاكم كاملًا FAIL-CLOSED دون تخطي أي Gate.
```

القيم الوحيدة للـMODE: `PREPARE_ONLY` و`EXECUTE_END_TO_END`.

## 1) المبدأ الحاكم

النمطان يستخدمان نفس منهج التشخيص والقرار وإعادة التشخيص وترتيب الاعتماديات. الفرق هو سلطة الكتابة بعد أن يصبح التسلسل الحالي مفهومًا ومحدد الحل بلا تخمين.

```text
DISCOVER GLOBALLY
→ MACRO BLUEPRINT
→ RELATION / DEPENDENCY GRAPH
→ DERIVE NEXT COHERENT EXECUTION SEQUENCE
→ DIAGNOSE
→ FINDINGS / ROOT CAUSE / BLAST RADIUS
→ RESOLVE DERIVABLE FACTS
→ TRUE DECISION BOUNDARY when required
→ USER/AUTHORITY DECISION
→ IMPACT PROPAGATION + RE-DIAGNOSIS
→ DEFINE EXACT TARGET STATE / CONSUMERS / GOVERNANCE / CLEANUP / VERIFICATION
→ SEQUENCE_SOLUTION_READY
```

ممنوع questions-first، app-by-app ordering، pre-creating future sequences، أو الانتقال لتسلسل تابع مع نقص مادي معروف في التسلسل الحالي.

### PREPARE_ONLY

```text
DOCUMENT EXACT ROOT SOLUTION
→ DOCUMENT EXECUTION / CONSUMERS / GOVERNANCE PROMOTION / CLEANUP / VERIFICATION
→ SEQUENCE_STATUS=PREPARED
→ SEQUENCE EXIT GATE
→ DERIVE NEXT SEQUENCE
```

لا Product/Governance/Runtime/Data/Provider mutation ولا migration application ولا implementation commit. كل حقيقة دائمة تسجل `GOVERNANCE_PROMOTION_PENDING` مع exact canonical owner + exact semantic change.

### EXECUTE_END_TO_END

```text
SEQUENCE WRITE GATE
→ Governance Promotion when required
→ Root-Cause implementation
→ migrate writers/readers/consumers
→ remove obsolete/parallel path
→ local cleanup
→ required verification/runtime readback
→ update sequence record
→ SEQUENCE_STATUS=COMPLETE
→ SEQUENCE EXIT GATE
→ DERIVE NEXT SEQUENCE
```

لا يشترط اكتمال تشخيص كامل TARGET عالميًا قبل أول write؛ يشترط اكتمال التسلسل الحالي فقط. لا ينتقل للتالي قبل إغلاق الحالي حسب الـMODE.

## 2) Package Schema V2 — Adaptive Sequential Package

الحزمة ليست ثلاثة ملفات ثابتة، وليست شجرة Domains ثابتة. بنيتها مشتقة من:

```text
TARGET + DISCOVERY + DEPENDENCY GRAPH + ROOT-CAUSE / OWNERSHIP / VERIFICATION BOUNDARIES
```

الشكل الحاكم:

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
├── 002-<proven-sequence>.md
└── ...
```

قواعد دستورية:

```text
ONE FILE = ONE COHERENT EXECUTION/CLOSURE SEQUENCE
SEQUENCES ARE DERIVED FROM THE DEPENDENCY GRAPH
SEQUENCES ARE CREATED JUST-IN-TIME
NO PRECREATED FUTURE SEQUENCES
NO FIXED NUMBER OF SEQUENCES
NO FIXED DOMAIN DIRECTORY TREE
NO SUBDIRECTORIES INSIDE A V2 TASK PACKAGE
NO SPLIT BY DIAGNOSIS / EXECUTION / VERIFICATION
NO FILE WITHOUT DISTINCT PURPOSE
NO SPLIT BY LINE COUNT ALONE
NO MERGE OF UNRELATED ROOT-CAUSE/OWNERSHIP/VERIFICATION BOUNDARIES
```

`00-OVERVIEW.md` صغير ومركزي: Task identity, SHA, Macro map, sequence registry/order, global decisions/blockers/coverage/final closure فقط. لا يكرر تفاصيل التسلسلات.

ملف التسلسل نفسه يجمع:

```text
Scope/Context
→ Diagnosis/Findings
→ Root Cause/Blast Radius
→ Decisions/Re-Diagnosis
→ Exact Target State
→ Treatment/Execution
→ Consumers/Contracts/Data/Governance
→ Cleanup
→ Verification/Runtime/Evidence
→ Sequence Exit Gate/Reopen
```

إذا أصبح ملف واحد يحتوي Closure Boundaries مستقلة حقيقية، قسّمه إلى تسلسلين أو أكثر في الرسم البياني نفسه، لا إلى ملفات مساعدة اعتباطية.

## 3) Just-In-Time Sequence Lifecycle

```text
CREATE/RESUME 00-OVERVIEW.md
→ BROAD DISCOVERY / MACRO GRAPH
→ prove first sequence boundary
→ create 001-<name>.md
→ complete according to MODE
→ reconcile graph
→ only then derive/create 002-<name>.md
```

لا تنشئ `002` لأنك تتوقعه؛ أنشئه فقط عندما يصبح نطاقه/اعتماده/سبب فصله مثبتًا. إصلاح Sequence سابقة قد يلغي Sequences كانت مجرد أعراض.

## 4) كيف يُشتق Sequence مستقل؟

Sequence هو أصغر وحدة منطقية يمكن فهمها ومعالجتها والتحقق منها وإغلاقها بصورة متماسكة. الفصل مبرر عند وجود Boundary مثبت مثل:

```text
distinct root-cause cluster
different canonical owner/source of truth
hard dependency boundary
independent state-machine or operational journey boundary
materially distinct verification/runtime boundary
different protected/risk domain
independent consumer migration set
different durable governance decision boundary
```

إذا كانت Backend/Frontend/DB/Control Panel آثارًا لنفس Root Cause وOwner وVerification Boundary، فهي Sequence واحدة لا أربع.

## 5) State Machine

```text
INIT
→ PIN_TRUTH
→ CAPABILITY_PREFLIGHT
→ CREATE_OR_RESUME_V2_OVERVIEW
→ BROAD_DISCOVERY
→ BUILD_RELATION_GRAPH
→ MACRO_BLUEPRINT
↔ MACRO_DECISION_GATE
↔ USER/AUTHORITY_DECISION
↔ IMPACT_PROPAGATION_AND_RE_DIAGNOSIS
→ PRIORITIZE_FOUNDATIONS_AND_CONNECTED_CLUSTERS

LOOP:
  DERIVE_NEXT_SEQUENCE_FROM_GRAPH
  → CREATE_SEQUENCE_JUST_IN_TIME
  → DIAGNOSE_SEQUENCE
  → ROOT_CAUSE / BLAST_RADIUS
  ↔ TRUE_DECISION_BOUNDARY
  ↔ USER/AUTHORITY_DECISION
  ↔ IMPACT_PROPAGATION_AND_RE_DIAGNOSIS
  → SEQUENCE_SOLUTION_READY

  PREPARE_ONLY:
    → DOCUMENT_EXECUTION_READY_HANDOFF
    → SEQUENCE_PREPARED_GATE
    → CLEAR_CURRENT_SEQUENCE
    → RECONCILE_GRAPH
    → NEXT

  EXECUTE_END_TO_END:
    → SEQUENCE_WRITE_GATE
    → GOVERNANCE_PROMOTION_WHERE_REQUIRED
    → EXECUTE_ROOT_CAUSE
    → MIGRATE_CONSUMERS
    → LOCAL_CLEANUP
    → VERIFY / RUNTIME_READBACK
    → SEQUENCE_COMPLETE_GATE
    → CLEAR_CURRENT_SEQUENCE
    → RECONCILE_GRAPH
    → NEXT

AFTER MATERIAL UNIVERSE COVERED:
→ GLOBAL CROSS-SEQUENCE / CROSS-JOURNEY / CROSS-SURFACE / CROSS-STATE / OWNER RECONCILIATION
→ DISCOVERY_COMPLETE
→ DIAGNOSIS_COMPLETE
→ DECISION_COMPLETE
→ COVERAGE_COMPLETE
→ FINAL_ADVERSARIAL_COMPLETENESS
→ PACKAGE_READY
```

Structured Backtracking يبقى حاكمًا: `A → B → C → finish/prepare C → return B → return A`.

## 6) Global Gates

هذه عالمية فقط للتسليم النهائي في PREPARE وللإغلاق النهائي في EXECUTE:

```text
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
PACKAGE_READY
```

وجود Overview أو Sequence files لا يثبت أي Gate.

## 7) Sequence Gates

### Solution Ready — مشتركة

```text
ROOT_CAUSE_PROVEN = YES
DECISIONS_RESOLVED = YES
REDIAGNOSIS_COMPLETE = YES
IMPACT_MAPPED = YES
VERIFICATION_DEFINED = YES
SOLUTION_READY = YES
```

### PREPARE_ONLY Exit

```text
SEQUENCE_STATUS = PREPARED
exact target state defined
execution steps actionable
all affected consumers mapped/dispositioned
governance promotion requirements exact
cleanup exact
verification/acceptance exact
IMPLEMENTATION_COMPLETE = NO
```

### EXECUTE_END_TO_END Exit

```text
SEQUENCE_STATUS = COMPLETE
IMPLEMENTATION_COMPLETE = YES
CONSUMERS_RECONCILED = YES
LOCAL_CLEANUP_COMPLETE = YES
VERIFICATION_PASS = YES
GOVERNANCE_SYNC = YES | NOT_APPLICABLE
SCOPE_DELTA_CLASSIFIED = YES
```

## 8) Anti-Drift

```text
EVERY MATERIAL DISCOVERY → GRAPH
EVERY MATERIAL GRAPH NODE → COVERAGE
EVERY DEFECT/GAP/CONTRADICTION → FINDING
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA
EVERY TRUE DECISION → DECISION RECORD
EVERY DECISION → IMPACT PROPAGATION + RE-DIAGNOSIS
EVERY PROVEN SEQUENCE → ONE REGISTRY ENTRY + ONE FILE
EVERY SEQUENCE FILE → PURPOSE + SCOPE + DERIVATION BASIS + DEPENDENCIES + REOPEN TRIGGER
EVERY WRITE → INVALIDATE AFFECTED EVIDENCE
EVERY FINAL CLAIM → EXACT CANDIDATE/HEAD PROVENANCE
```

## 9) Governance Promotion

PREPARE_ONLY يسجل pending owner/semantic change. EXECUTE يرقّي الحقيقة الدائمة ويثبت `Governance ↔ Product Truth ↔ Machine Contract ↔ Implementation ↔ Consumers ↔ Runtime`.

## 10) Final Closure

`SEQUENCE_COMPLETE` أو `SEQUENCE_PREPARED` لا تعني `TARGET_CLOSED/PACKAGE_READY`.

بعد كل Sequences:

```text
global reconciliation
→ duplicate truth search
→ final structural cleanup
→ governance reconciliation
→ fresh HEAD
→ evidence invalidation/reacquisition
→ final adversarial completeness
→ final read-only verification
```

وفي EXECUTE لا يصدر القرار النهائي إلا إذا `HEAD_AT_DECISION == FINAL_CANDIDATE_SHA` و`FINAL_DECISION == current governance closureRules.closedDecision` وكل global gates المطلوبة = YES.

## 11) الوحدات الحاكمة

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
