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

## 1) MODE = سلطة الكتابة

### PREPARE_ONLY

يسمح بالقراءة والتحليل والفحوص غير المتحولة والأسئلة الحقيقية وإنشاء/تحديث حزمة المهمة ذات الملفات الثلاثة فقط. يمنع Product/Governance/Runtime/Data/Provider mutation، migration application، implementation commits، merge/release/deploy/tag، وأي final product closure claim.

الحقيقة الدائمة تسجل `GOVERNANCE_PROMOTION_PENDING` فقط.

أعلى Lifecycle state:

```text
PREPARED
```

### EXECUTE_END_TO_END

يبدأ **بنفس التشخيص الكامل**؛ لا Product write قبل:

```text
DISCOVERY_COMPLETE
DIAGNOSIS_COMPLETE
DECISION_COMPLETE
COVERAGE_COMPLETE
PACKAGE_READY
```

بعدها فقط:

```text
Governance Promotion when required
→ Root-Cause implementation
→ Consumer migration
→ local cleanup
→ affected verification
→ final cleanup/structural hygiene
→ Freeze immutable candidate
→ final read-only verification
→ governance reconciliation
→ fresh-head reconciliation
→ final adversarial completeness
→ canonical final decision
```

الـMODE لا يمنح تلقائيًا Merge/Release/Deploy/Production/destructive/irreversible authority.

## 2) الوحدات الحاكمة

```text
01-CORE-CONTRACT.md
= truth/authority/scope/SHA/capabilities/FAIL-CLOSED/write boundaries.

02-DISCOVERY-DIAGNOSIS.md
= broad discovery/macro blueprint/graph/journey × multisurface × crosslayer/root-cause diagnosis.

03-DECISIONS-COVERAGE-ANTI-DRIFT.md
= Universe/Coverage/Findings/Scope Delta/Decision Boundary/Re-Diagnosis/Governance Candidates.

04-PACKAGE-EXECUTION.md
= exact three-file task package/readiness/governance promotion/root-cause execution/consumer migration.

05-VERIFICATION-CLEANUP-CLOSURE.md
= candidate/evidence/CI/runtime/E2E/approvals/cleanup/governance sync/fresh head/final closure.

06-CONCURRENCY-RESUME-RECOVERY.md
= multi-agent/branch movement/atomic writes/resume/rebaseline/recovery/retention.
```

`01-CORE-CONTRACT.md` حاضر منطقيًا في كل مرحلة. اقرأ الوحدة الحالية وأي وحدة trigger يفرضها الخطر/الاعتماد، لا كل شيء عشوائيًا.

## 3) State Machine

```text
INIT
→ PIN_TRUTH
→ CAPABILITY_PREFLIGHT
→ BROAD_DISCOVERY
→ BUILD_RELATION_GRAPH
→ MACRO_BLUEPRINT
→ MACRO_DECISION_GATE
→ LOCK_RESOLVED_MACRO_MODEL
→ PRIORITIZE_FOUNDATIONS_AND_CONNECTED_CLUSTERS
→ DEEP_DIAGNOSIS_WAVES
↔ TRUE_DECISION_BOUNDARY
↔ USER/AUTHORITY_DECISION
↔ IMPACT_PROPAGATION_AND_RE_DIAGNOSIS
→ DISCOVERY_COMPLETE_GATE
→ DIAGNOSIS_COMPLETE_GATE
→ DECISION_COMPLETE_GATE
→ COVERAGE_COMPLETE_GATE
→ PACKAGE_READY_GATE
→ CREATE_OR_RECONCILE_EXACT_THREE_FILE_TASK_PACKAGE

PREPARE_ONLY
→ LIFECYCLE_STATE=PREPARED
→ STOP_PREPARED

EXECUTE_END_TO_END
→ LIFECYCLE_STATE=READY_TO_EXECUTE
→ GOVERNANCE_PROMOTION_GATE
→ EXECUTE_ROOT_CAUSE
→ LOCAL_CLEANUP_AND_CONSUMER_MIGRATION
→ VERIFY_AFFECTED
→ FINAL_STRUCTURAL_CLEANUP
→ REVERIFY_INVALIDATED_SCOPE
→ FREEZE_FINAL_CANDIDATE
→ FINAL_READ_ONLY_VERIFICATION
→ GOVERNANCE_RECONCILIATION
→ FRESH_HEAD_DRIFT_GATE
→ FINAL_ADVERSARIAL_COMPLETENESS
→ CLOSURE_GATE
→ LIFECYCLE_STATE=CLOSED only with governed closure decision
```

لا يجوز تخطي مرحلة. فشل Gate يعيد إلى أقرب مرحلة قادرة على إزالة السبب.

## 4) Transition Contract

كل انتقال يحدد:

```text
INPUT
REQUIRED EVIDENCE
REQUIRED MODULE
REQUIRED TASK-PACKAGE UPDATE when package exists
EXIT GATE
NEXT STATE
REOPEN TRIGGER
```

الانتقال لا يحدث لأن الوكيل «أنهى القراءة» بل لأن Exit Gate ثبت.

## 5) Pre-Package Gates

```text
DISCOVERY_COMPLETE
= bounded Universe + all material discovered nodes recorded + no silent scope delta + adversarial/negative-space discovery at required depth.

DIAGNOSIS_COMPLETE
= every material covered node dispositioned + root cause or explicit missing proof + ACTUAL/INTENDED/DESIRED/CONFLICT separated + cross-surface/layer contradictions dispositioned.

DECISION_COMPLETE
= zero unresolved required product/operational/architecture/policy decision + zero discoverable fact still asked of user + all decisions propagated and re-diagnosed.

COVERAGE_COMPLETE
= zero material UNVISITED/UNCLASSIFIED/UNTRACED/UNOWNED + zero unrecorded Finding + zero silent exclusion/delta.
```

فقط بعدها `PACKAGE_READY`.

## 6) Task Package Contract

الحزمة الحالية **ثلاثة ملفات فقط بلا ملفات/مجلدات إضافية**:

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 01-DIAGNOSIS.md
├── 02-EXECUTION.md
└── 03-VERIFICATION-CLOSURE.md
```

الحزمة `DERIVED_SUPPORT`. لا تنشئ Manifest/Coverage/units parallel schema. التعقيد يعالج بتنظيم الأقسام داخل الملفات الثلاثة، لا بتكاثر ملفات افتراضية.

## 7) Anti-Drift Constitution

```text
EVERY DISCOVERED MATERIAL THING → GRAPH.
EVERY MATERIAL GRAPH NODE → COVERAGE STATUS.
EVERY MATERIAL DEFECT/GAP/CONTRADICTION → FINDING.
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA.
EVERY TRUE DECISION → DECISION LEDGER.
EVERY DECISION → IMPACT PROPAGATION + RE-DIAGNOSIS.
EVERY DURABLE RESOLVED RULE → CANONICAL GOVERNANCE OWNER in EXECUTE mode.
EVERY WRITE → INVALIDATE AFFECTED EVIDENCE.
EVERY FINAL CLAIM → EXACT CURRENT CANDIDATE/HEAD PROVENANCE.
```

ممنوع حمل عنصر مادي صامت من مرحلة إلى أخرى.

## 8) Global Breadth + Risk-Adaptive Depth

```text
GLOBAL BREADTH
→ bounded inventory/relevance for the proven universe

LOCAL ADAPTIVE DEPTH
→ deepen where dependency/risk/contradiction/uncertainty/blast radius/protected domain requires it
```

استخدم:

```text
Observation → Hypothesis → Cheapest discriminating evidence → Confirm/Reject → Next hypothesis
```

## 9) Governance Promotion

في `EXECUTE_END_TO_END`:

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

Additionally: zero known fixable in-scope defect, zero unresolved material Finding/Decision, zero required missing/stale/pending/cancelled evidence, zero required unproven approval/independent review, zero unjustified duplicate truth, zero reachable obsolete path tied to scope, and zero durable truth left only in derived artifacts.

Only then may the current governed closure decision be issued. Otherwise keep lifecycle non-closed and use the appropriate **canonical** non-closed decision when a decision is required (`FIX_REQUIRED`, `BLOCKED_EXTERNAL`, `NEEDS_EVIDENCE`, `QA_BLOCK`, `SECURITY_BLOCK`, etc. according to current vocabulary).

## 12) Safe Stop / Resume

Stopping before final objective is legitimate only for:

```text
TRUE_DECISION_GAP
EXTERNAL_EVIDENCE_GAP
PROTECTED_ACTION lacking authority/approval
hard external blocker
```

Record one exact resume point; do not call it closure.

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
