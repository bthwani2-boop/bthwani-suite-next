# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

هذه الحزمة منهجية توثيقية فقط تحت `tools/prompting/**`. ليست Product Code ولا Runtime Code ولا Product Truth ولا Proof of implementation/closure. بيانات المهمة الفعلية تكتب فقط في `plans/diagnose-implementing/<TASK_NAME>/`، والحقيقة الدائمة تترقى إلى مالكها الحاكم داخل `governance/**`/العقود/الكود الحي عند السماح بذلك.

## 0) الاستدعاء

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>` — استخدم `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` كنقطة الدخول الوحيدة ونفّذ المسار الحاكم كاملًا FAIL-CLOSED دون تخطي أي Gate.
```

`TARGET` الفارغ لا يعني full-repository scan تلقائيًا؛ استخرج النطاق الحقيقي من الأدلة والعلاقات. إذا كان الهدف صراحةً «كل شيء»، حوّله إلى Universe/Coverage قابلة للتتبع والإثبات.

القيم الوحيدة للـMODE:

```text
PREPARE_ONLY
EXECUTE_END_TO_END
```

أي قيمة أخرى = invocation غير صالح، والحالة التشغيلية تبقى غير مغلقة.

## 1) المبدأ الحاكم للـMODE

**الخياران يستخدمان نفس منهج التفكير والتشخيص والقرارات وإعادة التشخيص والترتيب بالاعتماديات. الاختلاف الوحيد الجوهري هو ما يحدث بعد أن تصبح الـWave الحالية مفهومة ومصممة بلا تخمين.**

المسار المشترك:

```text
DISCOVER GLOBALLY
→ MACRO BLUEPRINT
→ RELATION / DEPENDENCY GRAPH
→ SELECT NEXT FOUNDATION / CONNECTED CLUSTER / JOURNEY
→ DIAGNOSE CURRENT WAVE
→ FINDINGS / ROOT CAUSE / BLAST RADIUS
→ RESOLVE DERIVABLE FACTS
→ TRUE DECISION BOUNDARY when needed
→ USER/AUTHORITY DECISION
→ IMPACT PROPAGATION + RE-DIAGNOSIS
→ DEFINE EXACT ROOT SOLUTION / CONSUMERS / GOVERNANCE / CLEANUP / VERIFICATION
→ CURRENT_WAVE_SOLUTION_READY
```

لا questions-first، ولا تنفيذ قبل حسم القرار المادي المؤثر على الـWave، ولا انتقال للـWave التالية مع نقص مادي معروف في الحالية.

### PREPARE_ONLY

بعد `CURRENT_WAVE_SOLUTION_READY`:

```text
DOCUMENT EXACT ROOT SOLUTION
→ DOCUMENT EXECUTION ORDER / CONSUMERS / GOVERNANCE PROMOTION / CLEANUP / VERIFICATION
→ WAVE_PREPARED
→ WAVE EXIT GATE
→ NEXT WAVE
```

يسمح بالقراءة والتحليل والفحوص غير المتحولة والأسئلة الحقيقية وإنشاء/تحديث حزمة المهمة الحية ذات الملفات الثلاثة فقط. يمنع Product/Governance/Runtime/Data/Provider mutation، migration application، implementation commits، merge/release/deploy/tag، وأي final product closure claim.

الحقيقة الدائمة تسجل `GOVERNANCE_PROMOTION_PENDING` فقط. يجب أن تنتهي كل Wave بخطة جذرية قابلة للتنفيذ من وكيل آخر دون Product/Architecture guessing. بعد جميع الـWaves تُجرى Global Reconciliation + Adversarial Completeness + Final Execution Design reconciliation، ثم فقط `PACKAGE_READY=YES` و`LIFECYCLE_STATE=PREPARED`.

### EXECUTE_END_TO_END

بعد `CURRENT_WAVE_SOLUTION_READY` لا ينتظر اكتمال تشخيص كل الهدف عالميًا. قبل الكتابة الحية للـWave الحالية يجب أن تجتاز **Wave Write Gate** فقط:

```text
CURRENT_WAVE_ROOT_CAUSE_PROVEN = YES
CURRENT_WAVE_DECISIONS_RESOLVED = YES
CURRENT_WAVE_REDIAGNOSIS_COMPLETE = YES
CURRENT_WAVE_IMPACT_MAPPED = YES
CURRENT_WAVE_VERIFICATION_DEFINED = YES
CURRENT_WAVE_READY_TO_EXECUTE = YES
```

ثم:

```text
Governance Promotion when required
→ Root-Cause implementation
→ migrate every affected writer/reader/consumer
→ remove obsolete/parallel path
→ local cleanup
→ affected verification
→ runtime/readback when applicable
→ update living task documentation
→ WAVE COMPLETE GATE
→ NEXT WAVE
```

ولا تنتقل إلى التالية حتى تثبت للـWave الحالية:

```text
CURRENT_WAVE_IMPLEMENTATION_COMPLETE = YES
CURRENT_WAVE_CONSUMERS_RECONCILED = YES
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE = YES
CURRENT_WAVE_VERIFICATION_PASS = YES
CURRENT_WAVE_GOVERNANCE_SYNC = YES | NOT_APPLICABLE
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED = YES
CURRENT_WAVE_STATUS = COMPLETE
```

الـMODE لا يمنح تلقائيًا Merge/Release/Deploy/Production/destructive/irreversible authority.

## 2) الحزمة الحية

بعد تثبيت Task identity وRepository/Branch/START_SHA، أنشئ أو استأنف حزمة المهمة مبكرًا **قبل deep diagnosis waves** حتى تكون سجلًا مشتقًا حيًا لما يثبت ويتقرر ويُنفذ. وجود الحزمة لا يعني readiness أو PASS.

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 01-DIAGNOSIS.md
├── 02-EXECUTION.md
└── 03-VERIFICATION-CLOSURE.md
```

في `PREPARE_ONLY` تتطور الحزمة Wave-by-Wave حتى تصبح حزمة تسليم تنفيذ كاملة. في `EXECUTE_END_TO_END` تتطور بالتوازي مع الحقيقة الحية كسجل توثيقي مشتق فقط. الكود/الحوكمة/العقود/البيانات/Runtime هي الحقيقة الحية، لا الـPlan.

`PACKAGE_READY` لا يعني أن المجلد موجود؛ يعني أن **التغطية العالمية والتشخيص والقرارات وتصميم التنفيذ قد اكتملت وأعيدت مصالحتها**. لذلك:

```text
PREPARE_ONLY: PACKAGE_READY is required before PREPARED handoff.
EXECUTE_END_TO_END: PACKAGE_READY is NOT a prerequisite for the first wave write; it is required before final closure after all waves/global reconciliation.
```

## 3) الوحدات الحاكمة

```text
01-CORE-CONTRACT.md
= truth/authority/scope/SHA/capabilities/FAIL-CLOSED/write boundaries.

02-DISCOVERY-DIAGNOSIS.md
= broad discovery/macro blueprint/graph/journey × multisurface × crosslayer/root-cause diagnosis.

03-DECISIONS-COVERAGE-ANTI-DRIFT.md
= Universe/Coverage/Findings/Scope Delta/Decision Boundary/Re-Diagnosis/Wave Gates/Governance Candidates.

04-PACKAGE-EXECUTION.md
= living three-file task package/wave readiness/governance promotion/root-cause execution/consumer migration.

05-VERIFICATION-CLEANUP-CLOSURE.md
= candidate/evidence/CI/runtime/E2E/approvals/cleanup/governance sync/fresh head/final closure.

06-CONCURRENCY-RESUME-RECOVERY.md
= multi-agent/branch movement/atomic writes/resume/rebaseline/recovery/retention.
```

`01-CORE-CONTRACT.md` حاضر منطقيًا في كل مرحلة. اقرأ الوحدة الحالية وأي وحدة trigger يفرضها الخطر/الاعتماد، لا كل شيء عشوائيًا.

## 4) State Machine

```text
INIT
→ PIN_TRUTH
→ CAPABILITY_PREFLIGHT
→ CREATE_OR_RESUME_LIVING_THREE_FILE_PACKAGE
→ BROAD_DISCOVERY
→ BUILD_RELATION_GRAPH
→ MACRO_BLUEPRINT
↔ MACRO_DECISION_GATE
↔ USER/AUTHORITY_DECISION
↔ IMPACT_PROPAGATION_AND_RE_DIAGNOSIS
→ LOCK_RESOLVED_MACRO_MODEL
→ PRIORITIZE_FOUNDATIONS_AND_CONNECTED_CLUSTERS

LOOP UNTIL MATERIAL UNIVERSE IS COVERED:
  SELECT_NEXT_WAVE_BY_DEPENDENCY
  → DIAGNOSE_CURRENT_WAVE
  → FINDINGS_ROOT_CAUSE_BLAST_RADIUS
  ↔ TRUE_DECISION_BOUNDARY
  ↔ USER/AUTHORITY_DECISION
  ↔ IMPACT_PROPAGATION_AND_RE_DIAGNOSIS
  → CURRENT_WAVE_SOLUTION_READY

  PREPARE_ONLY:
    → DOCUMENT_COMPLETE_EXECUTION_DESIGN
    → WAVE_PREPARED_GATE
    → NEXT_WAVE

  EXECUTE_END_TO_END:
    → CURRENT_WAVE_WRITE_GATE
    → GOVERNANCE_PROMOTION_WHERE_REQUIRED
    → EXECUTE_ROOT_CAUSE
    → MIGRATE_CONSUMERS
    → LOCAL_CLEANUP
    → VERIFY_CURRENT_WAVE
    → RUNTIME_READBACK_WHEN_APPLICABLE
    → UPDATE_LIVING_DOCUMENTATION
    → WAVE_COMPLETE_GATE
    → NEXT_WAVE

AFTER ALL WAVES:
→ GLOBAL_CROSS_JOURNEY/CROSS_SURFACE/CROSS_STATE/CANONICAL_OWNER_RECONCILIATION
→ DISCOVERY_COMPLETE_GATE
→ DIAGNOSIS_COMPLETE_GATE
→ DECISION_COMPLETE_GATE
→ COVERAGE_COMPLETE_GATE
→ FINAL_ADVERSARIAL_COMPLETENESS
→ PACKAGE_READY_GATE

PREPARE_ONLY:
→ LIFECYCLE_STATE=PREPARED
→ STOP_PREPARED

EXECUTE_END_TO_END:
→ FINAL_STRUCTURAL_CLEANUP
→ REVERIFY_INVALIDATED_SCOPE
→ FREEZE_FINAL_CANDIDATE
→ FINAL_READ_ONLY_VERIFICATION
→ GOVERNANCE_RECONCILIATION
→ FRESH_HEAD_DRIFT_GATE
→ FINAL_ADVERSARIAL_COMPLETENESS_RECHECK
→ CLOSURE_GATE
→ LIFECYCLE_STATE=CLOSED only with governed closure decision
```

لا يجوز تخطي مرحلة. فشل Gate يعيد إلى أقرب مرحلة قادرة على إزالة السبب. اكتشاف Foundation أعمق أثناء Wave يفعّل Structured Backtracking: `A → B → C → close C → return B → return A`.

## 5) Transition Contract

كل انتقال يحدد:

```text
INPUT
REQUIRED EVIDENCE
REQUIRED MODULE
REQUIRED TASK-PACKAGE UPDATE
EXIT GATE
NEXT STATE
REOPEN TRIGGER
```

الانتقال لا يحدث لأن الوكيل «أنهى القراءة» بل لأن Exit Gate ثبت.

## 6) Global Completion Gates

هذه Gates عالمية للتسليم النهائي في `PREPARE_ONLY` وللمصالحة النهائية قبل Closure في `EXECUTE_END_TO_END`. **ليست شرطًا لبدء كل Wave في EXECUTE mode.**

```text
DISCOVERY_COMPLETE
= bounded Universe + all material discovered nodes recorded + no silent scope delta + adversarial/negative-space discovery at required depth.

DIAGNOSIS_COMPLETE
= every material covered node dispositioned + root cause or explicit missing proof + ACTUAL/INTENDED/DESIRED/CONFLICT separated + cross-surface/layer contradictions dispositioned.

DECISION_COMPLETE
= zero unresolved required product/operational/architecture/policy decision for the final target + zero discoverable fact still asked of user + all decisions propagated and re-diagnosed.

COVERAGE_COMPLETE
= zero material UNVISITED/UNCLASSIFIED/UNTRACED/UNOWNED + zero unrecorded Finding + zero silent exclusion/delta.

PACKAGE_READY
= all global gates above + exact execution design/actual execution records reconciled + verification path defined + latest head reconciled.
```

## 7) Anti-Drift Constitution

```text
EVERY DISCOVERED MATERIAL THING → GRAPH.
EVERY MATERIAL GRAPH NODE → COVERAGE STATUS.
EVERY MATERIAL DEFECT/GAP/CONTRADICTION → FINDING.
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA.
EVERY TRUE DECISION → DECISION LEDGER.
EVERY DECISION → IMPACT PROPAGATION + RE-DIAGNOSIS.
EVERY DURABLE RESOLVED RULE → GOVERNANCE CANDIDATE / CANONICAL GOVERNANCE OWNER in EXECUTE mode.
EVERY WRITE → INVALIDATE AFFECTED EVIDENCE.
EVERY WAVE → MODE-SPECIFIC EXIT GATE BEFORE NEXT WAVE.
EVERY FINAL CLAIM → EXACT CURRENT CANDIDATE/HEAD PROVENANCE.
```

ممنوع حمل عنصر مادي صامت من مرحلة إلى أخرى.

## 8) Global Breadth + Risk-Adaptive Depth

```text
GLOBAL BREADTH
→ bounded inventory/relevance for the proven universe

LOCAL ADAPTIVE DEPTH
→ deepen the current dependency wave where risk/contradiction/uncertainty/blast radius/protected domain requires it
```

استخدم:

```text
Observation → Hypothesis → Cheapest discriminating evidence → Confirm/Reject → Next hypothesis
```

## 9) Governance Promotion

في `EXECUTE_END_TO_END`، بعد حسم الحقيقة الدائمة في الـWave الحالية وقبل/مع تنفيذ ما يعتمد عليها:

```text
resolved durable rule
→ classify durability/type
→ identify existing canonical governance owner
→ verify authority
→ update canonical owner
→ update machine counterpart/registry when applicable
→ update implementation owner and consumers
→ verify governance ↔ Product Truth ↔ contract ↔ code ↔ runtime parity
```

لا تنشئ topic-specific governance إذا كان Owner حاكم قائم مناسبًا.

في `PREPARE_ONLY` لا تكتب Governance؛ سجل `GOVERNANCE_PROMOTION_PENDING` + exact owner + exact semantic change required.

قبل Closure:

```text
ZERO durable truth only in task artifacts
ZERO governance/Product Truth contradiction
ZERO governance/machine-contract contradiction
ZERO governance/implementation contradiction
ZERO governance/runtime contradiction
```

## 10) Evidence / Candidate / Decision Separation

ثلاثة مفاهيم مختلفة:

```text
LIFECYCLE_STATE
= internal task state in derived package.

EVIDENCE_STATUS
= PASS/FAIL/MISSING/STALE/BLOCKED/... for a declared evidence scope.

FINAL_DECISION
= canonical decision ID from current governance/contracts/decision-vocabulary.json.
```

`OPEN` و`BLOCKED` يمكن أن يصفا lifecycle داخليًا، لكنهما **ليسا** Final Decision إلا إذا عرّفتهـما Governance الحالية صراحةً.

Final branch-head closure requires:

```text
FINAL_CANDIDATE_SHA = immutable exact SHA after all writes/cleanup
HEAD_AT_REVIEW_START = live exact SHA at review start
HEAD_AT_DECISION = live exact SHA immediately before decision
HEAD_AT_DECISION == FINAL_CANDIDATE_SHA
FINAL_DECISION == current closureRules.closedDecision
```

No arbitrary parent/base guessing. Any write after Freeze creates a new candidate and invalidates affected evidence.

## 11) Final Closure Equation

In `EXECUTE_END_TO_END`:

```text
DISCOVERY_COMPLETE
AND DIAGNOSIS_COMPLETE
AND DECISION_COMPLETE
AND COVERAGE_COMPLETE
AND PACKAGE_READY
AND IMPLEMENTATION_COMPLETE
AND CLEANUP_COMPLETE
AND EVIDENCE_COMPLETE
AND GOVERNANCE_SYNC_COMPLETE
AND FRESH_HEAD_VALID
AND FINAL_ADVERSARIAL_PASS
```

Additionally: every material Wave closed its Wave Gate; zero known fixable in-scope defect; zero unresolved material Finding/Decision; zero required missing/stale/pending/cancelled evidence; zero required unproven approval/independent review; zero unjustified duplicate truth; zero reachable obsolete path tied to scope; zero durable truth left only in derived artifacts.

Only then may the current governed closure decision be issued. Otherwise keep lifecycle non-closed and use the appropriate **canonical** non-closed decision when a decision is required (`FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, etc. according to current vocabulary).

## 12) Safe Stop / Resume

Stopping before final objective is legitimate only for:

```text
TRUE_DECISION_GAP
EXTERNAL_EVIDENCE_GAP
PROTECTED_ACTION lacking authority/approval
hard external blocker
```

في القرار المتسلسل، أوقف فقط الـWave المتأثرة بالقرار. لا تتجاوزها إلى dependent Wave. سجل one exact resume point; do not call it closure.

## 13) Contracts + Source Integrity

Output contracts:

```text
contracts/DIAGNOSIS-OUTPUT-CONTRACT.md
contracts/DECISION-OUTPUT-CONTRACT.md
contracts/EXECUTION-PACKAGE-CONTRACT.md
contracts/EVIDENCE-CONTRACT.md
contracts/CLOSURE-CONTRACT.md
```

`source-map/SOURCE-RULE-TRACEABILITY.md` records exact preserved source SHAs and rule mappings. Any source SHA drift makes source coverage stale until reconciled. No `UNACCOUNTED`/`DROPPED` rule is allowed.
