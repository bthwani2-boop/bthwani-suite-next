# BThwani Orchestrator — نقطة الدخول الوحيدة

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY

هذه الحزمة **منهجية توثيقية فقط** تحت `tools/prompting/**`. ليست Product Code ولا Runtime Code ولا Product Truth ولا Implementation/Runtime/Repository-Platform Truth، ولا يجوز لأي تطبيق أو خدمة أو Build/Runtime الاعتماد عليها. بيانات المهمة الفعلية تكتب فقط داخل حزمة المهمة تحت `plans/diagnose-implementing/<TASK_NAME>/`، والحقيقة الدائمة تترقى إلى مالكها الحاكم داخل `governance/**` والعقود/الكود الحي عند السماح بذلك.

## 0) الاستدعاء الإلزامي

استخدم هذه الصيغة المختصرة:

```text
@GitHub BRANCH: `<EXACT_BRANCH>` | TARGET: `<blank | target>` | MODE: `<PREPARE_ONLY | EXECUTE_END_TO_END>` — استخدم `tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md` كنقطة الدخول الوحيدة ونفّذ المسار الحاكم كاملًا FAIL-CLOSED دون تخطي أي Gate.
```

المدخلات الحاكمة:

```text
REPOSITORY = repository explicitly named by the user/current task
BRANCH     = exact user-named branch/ref; no substitution
TARGET     = blank or explicit target/outcome
MODE       = PREPARE_ONLY | EXECUTE_END_TO_END
```

`TARGET` الفارغ لا يعني تلقائيًا full-repository scan. استخرج النطاق الحقيقي من الأدلة والعلاقات. إذا كان المقصود صراحةً «كل شيء»، حوّله إلى Coverage قابلة للإثبات بدل ادعاء شامل غير قابل للقياس.

أي Mode آخر = `OPEN / INVALID_INVOCATION` حتى يحدد المستخدم أحد الخيارين فقط.

---

# 1) معنى الـMODE — سلطة الكتابة العليا

## PREPARE_ONLY

الغرض: **إعداد وتجهيز كاملان دون تغيير المنتج أو الحقيقة الدائمة.**

مسموح:

```text
read/search/analyze current truth
diagnostic/runtime/read-only checks when authorized and non-mutating
ask true decision questions
create/update plans/diagnose-implementing/<TASK_NAME>/
```

ممنوع:

```text
product/source implementation writes
runtime/data/provider mutation
migration application/destructive data work
governance/** mutation
merge/release/deploy/tag
final product closure claim
```

أي حقيقة دائمة يلزم تحديثها تسجل داخل `01-DIAGNOSIS.md` كـ`GOVERNANCE_PROMOTION_PENDING` مع المالك الحاكم المقترح؛ لا تكتبها في `governance/**` في هذا الوضع.

نقطة التوقف الصحيحة:

```text
DISCOVERY_COMPLETE
AND DIAGNOSIS_COMPLETE
AND DECISION_COMPLETE
AND COVERAGE_COMPLETE
AND PACKAGE_READY
```

ثم تسليم حزمة جاهزة للتنفيذ، لا ادعاء أن المنتج أُصلح.

## EXECUTE_END_TO_END

الغرض: **نفس التشخيص الكامل أولًا، ثم التنفيذ الجذري حتى أعلى إغلاق تسمح به الأدلة والسلطة.**

لا يعني هذا الوضع «ابدأ بتعديل الكود فورًا». الكتابة في المنتج ممنوعة قبل اجتياز بوابات التشخيص والقرارات والتغطية والجاهزية.

بعد الجاهزية فقط:

```text
Governance Promotion for durable resolved truth
→ root-cause implementation
→ migrate all affected consumers
→ cleanup/refactor/structural finishing
→ verification/evidence
→ governance/code/runtime reconciliation
→ fresh-head gate
→ final adversarial completeness
→ CLOSED_WITH_EVIDENCE only when current governance vocabulary allows it
```

الـMODE لا يمنح تلقائيًا صلاحية Merge/Release/Deploy/Production mutation/irreversible external action؛ هذه تحتاج سلطة صريحة مستقلة عند الانطباق.

---

# 2) الوحدات الحاكمة — اقرأ حسب الحالة فقط

```text
01-CORE-CONTRACT.md
  = الحقيقة، السلطة، النطاق، SHA، القدرات، FAIL-CLOSED، حدود الكتابة.

02-DISCOVERY-DIAGNOSIS.md
  = Broad Discovery، Macro Blueprint، System Graph، Journey-by-Journey × Multi-Surface × Cross-Layer، Root Cause.

03-DECISIONS-COVERAGE-ANTI-DRIFT.md
  = Universe/Coverage accounting، Findings، Scope Delta، Decision Boundary، Re-Diagnosis، Governance Candidates، Anti-Drift.

04-PACKAGE-EXECUTION.md
  = عقد حزمة المهمة ذات الملفات الثلاثة، Readiness، Governance Promotion، Root-Cause execution، consumer migration.

05-VERIFICATION-CLEANUP-CLOSURE.md
  = Candidate/Evidence، Runtime/E2E، Cleanup/Structural Hygiene، Governance Sync، Fresh Head، Final Closure.

06-CONCURRENCY-RESUME-RECOVERY.md
  = تعدد الوكلاء، branch movement، atomic writes، resume/rebaseline/recovery، retention.
```

لا تحمل كل الوحدات بلا حاجة؛ لكن `01-CORE-CONTRACT.md` حاضر منطقيًا في كل مرحلة، وتطبق الوحدة الحالية مع أي وحدة trigger يثبتها الخطر أو الاعتماد.

---

# 3) State Machine الإلزامية

```text
INIT
→ PIN_TRUTH
→ CAPABILITY_PREFLIGHT
→ BROAD_DISCOVERY
→ BUILD_RELATION_GRAPH
→ MACRO_BLUEPRINT
→ MACRO_DECISION_GATE
→ LOCK_RESOLVED_MACRO_MODEL
→ PRIORITIZE_FOUNDATIONS_AND_JOURNEY_CLUSTERS
→ DEEP_DIAGNOSIS_WAVES
↔ TRUE_DECISION_BOUNDARY
↔ USER_DECISIONS
↔ IMPACT_PROPAGATION_AND_RE_DIAGNOSIS
→ DISCOVERY_COMPLETE_GATE
→ DIAGNOSIS_COMPLETE_GATE
→ DECISION_COMPLETE_GATE
→ COVERAGE_COMPLETE_GATE
→ PACKAGE_READY_GATE
→ CREATE_OR_RECONCILE_TASK_PACKAGE

PREPARE_ONLY
→ STOP_PREPARED

EXECUTE_END_TO_END
→ GOVERNANCE_PROMOTION_GATE
→ EXECUTE_ROOT_CAUSE
→ LOCAL_CLEANUP_AND_CONSUMER_MIGRATION
→ VERIFY_AFFECTED
→ FREEZE_FINAL_CANDIDATE
→ FINAL_READ_ONLY_VERIFICATION
→ FINAL_STRUCTURAL_CLEANUP_REVIEW
→ GOVERNANCE_RECONCILIATION
→ FRESH_HEAD_DRIFT_GATE
→ FINAL_ADVERSARIAL_COMPLETENESS
→ CLOSURE_GATE
→ CLOSED_WITH_EVIDENCE | OPEN | BLOCKED (current vocabulary only)
```

**لا يجوز تخطي مرحلة.** إذا فشلت بوابة، ارجع إلى أقرب مرحلة تستطيع إزالة سبب الفشل.

---

# 4) تعريف كل Transition

لكل انتقال يجب أن يكون معلومًا:

```text
INPUT
REQUIRED EVIDENCE
REQUIRED MODULE
REQUIRED TASK-PACKAGE UPDATE when package exists
EXIT GATE
NEXT STATE
REOPEN TRIGGER
```

الانتقال لا يحدث لأن الوكيل «أنهى القراءة»؛ يحدث فقط عند إثبات Exit Gate.

---

# 5) البوابات الأربع قبل الحزمة

## DISCOVERY_COMPLETE

```text
all material discovered nodes are inventoried
no silent scope delta
material graph edges classified
negative-space/adversarial discovery pass performed to the required risk depth
```

## DIAGNOSIS_COMPLETE

```text
material nodes have diagnosis/disposition
root cause or explicit missing-proof classification exists for material findings
actual/intended/desired/conflict separated
material cross-surface/cross-layer contradictions have dispositions
```

## DECISION_COMPLETE

```text
zero unresolved material product/operational/architecture/policy decision required to plan safely
zero discoverable fact still being asked of the user
user decisions propagated and re-diagnosed
```

## COVERAGE_COMPLETE

```text
zero material UNVISITED
zero material UNCLASSIFIED
zero material UNTRACED
zero material UNOWNED
zero unrecorded finding
zero silent supported exclusion
```

فقط بعدها `PACKAGE_READY`.

---

# 6) بوابات التنفيذ والإغلاق

في `EXECUTE_END_TO_END` لا يسمح بالإغلاق إلا إذا تحققت جميع البنود المنطبقة:

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

أي بند غير مثبت = `OPEN` أو `BLOCKED` وفق vocabulary الحاكمة، لا DONE.

---

# 7) قواعد عدم الانحراف

```text
EVERY DISCOVERED MATERIAL THING → GRAPH.
EVERY MATERIAL GRAPH NODE → COVERAGE STATUS.
EVERY MATERIAL DEFECT/GAP → FINDING.
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE-DELTA CLASSIFICATION.
EVERY USER DECISION → IMPACT PROPAGATION + RE-DIAGNOSIS.
EVERY DURABLE RESOLVED RULE → CANONICAL GOVERNANCE OWNER IN EXECUTE MODE.
EVERY WRITE → INVALIDATE AFFECTED EVIDENCE.
EVERY FINAL CLAIM → EXACT CURRENT CANDIDATE/HEAD PROVENANCE.
```

ممنوع حمل عنصر مادي صامت من مرحلة إلى أخرى.

---

# 8) Global Breadth + Local Adaptive Depth

الشمول لا يعني تشغيل كل أداة أو تحليل بأقصى عمق على كل شيء.

```text
GLOBAL BREADTH
→ inventory and bounded relevance for the proven universe

LOCAL ADAPTIVE DEPTH
→ deepen where dependency, risk, contradiction, uncertainty, blast radius, or protected domain requires it
```

استخدم `Observation → Hypothesis → cheapest discriminating evidence → Confirm/Reject → next hypothesis` لتقليل الوقت دون تخفيض معيار الدليل.

---

# 9) مخرجات حزمة المهمة — ثلاثة ملفات فقط

عندما تسمح بوابة الجاهزية:

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 01-DIAGNOSIS.md
├── 02-EXECUTION.md
└── 03-VERIFICATION-CLOSURE.md
```

لا تنشئ ملفات إضافية إلا عندما **يثبت تعقيد المهمة** أن ملفًا من الثلاثة أصبح غير قابل للاستخدام عمليًا؛ عندها يسمح بتقسيمه داخليًا مع بقاء الملفات الثلاثة كفهارس/مداخل حاكمة وعدم خلق مصدر حقيقة موازٍ.

الحزمة دائمًا `DERIVED_SUPPORT` ويمكن حذفها حسب retention؛ لا يجوز أن تكون المكان الوحيد لحقيقة دائمة.

---

# 10) Governance Promotion

الحقيقة الدائمة لا تعيش فقط في Prompt/Plan.

في `EXECUTE_END_TO_END`:

```text
resolved durable rule
→ classify durability/type
→ identify existing canonical governance owner
→ update that owner first when authorized
→ update machine-readable counterpart when applicable
→ update implementation owner and consumers
→ verify governance ↔ contract ↔ code ↔ runtime semantic parity
```

لا تنشئ topic-specific governance file إذا كان PRD/Platform Model/Product Truth/Engineering/Security/Delivery/Authority/Machine Contract/Registry الحالي يستطيع امتلاك القاعدة.

قبل الإغلاق:

```text
ZERO durable truth existing only in task artifacts
ZERO governance ↔ Product Truth contradiction
ZERO governance ↔ machine-contract contradiction
ZERO governance ↔ implementation contradiction
ZERO governance ↔ runtime contradiction
```

---

# 11) التوقف المشروع

التوقف قبل الهدف النهائي مسموح فقط عندما يكون هناك:

```text
TRUE_DECISION_GAP requiring user/authority decision
EXTERNAL_EVIDENCE_GAP that cannot be acquired with available authority/capability
PROTECTED_ACTION lacking required authority/approval
hard external blocker
```

سجّل exact resume point ولا تصفه كإغلاق.

---

# 12) العقود المرافقة

اقرأ العقود عند إنتاج/تقييم المخرجات:

```text
contracts/DIAGNOSIS-OUTPUT-CONTRACT.md
contracts/DECISION-OUTPUT-CONTRACT.md
contracts/EXECUTION-PACKAGE-CONTRACT.md
contracts/EVIDENCE-CONTRACT.md
contracts/CLOSURE-CONTRACT.md
```

هذه Contracts للوثائق المشتقة وليست Product Truth.

---

# 13) المصدر والتحقق من عدم إسقاط القواعد

`source-map/SOURCE-RULE-TRACEABILITY.md` يربط المصادر القديمة والاتفاقات المعتمدة بوحدات الحزمة الجديدة. لا تعتبر الأوركسترا جاهزة إذا بقي Source Rule/Section مادي بحالة `UNACCOUNTED`.

الملفات المصدر القديمة لا تُحذف ولا تُعدل لمجرد إنشاء هذه الحزمة.

---

# 14) القاعدة الذهبية

```text
PIN BEFORE ASSUMING.
DISCOVER BEFORE ASKING.
MACRO TRUTH BEFORE DEEP DETAIL.
JOURNEY FIRST; FILES ARE EVIDENCE.
GRAPH DEFINES RELATION; NOT FOLDER ORDER.
GLOBAL BREADTH + RISK-ADAPTIVE DEPTH.
ROOT CAUSE FIRST.
NO SILENT SKIP. NO SILENT SCOPE CHANGE.
NO PRODUCT/ARCHITECTURE GUESSING.
NO PACKAGE BEFORE READINESS.
PREPARE_ONLY NEVER MUTATES PRODUCT/GOVERNANCE.
EXECUTE_END_TO_END NEVER SKIPS DIAGNOSIS.
NO DURABLE TRUTH LEFT ONLY IN DERIVED ARTIFACTS.
NO FAKE GREEN. NO STALE-SHA CLOSURE.
CLEANUP/ORGANIZATION/FINISHING ARE PART OF DONE.
UNPROVEN = OPEN.
```
