# 03 — Decisions, Coverage & Anti-Drift

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/03-DECISIONS-COVERAGE-ANTI-DRIFT.md`

## 1) القاعدة الدستورية

```text
EVERY DISCOVERED MATERIAL THING → RELATION GRAPH.
EVERY MATERIAL GRAPH NODE → COVERAGE STATUS.
EVERY MATERIAL DEFECT/GAP/CONTRADICTION → FINDING.
EVERY NEW DEPENDENCY/CONSUMER/SURFACE → SCOPE DELTA.
EVERY TRUE DECISION → DECISION RECORD.
EVERY DECISION → IMPACT PROPAGATION + RE-DIAGNOSIS.
EVERY PROVEN EXECUTION BOUNDARY → SEQUENCE REGISTRY.
NO SILENT MATERIAL ELEMENT.
```

## 2) Universe Inventory

احصر حسب الانطباق Domains/Journeys/Actors/Surfaces/Routes/States/Actions/Transitions/Handoffs/Contracts/Services/Data Owners/Writers/Readers/Consumers/Runtime/Configs/Verification owners.

## 3) Coverage Status

`UNVISITED / IN_PROGRESS / PROVEN / CONTRADICTED / DECISION_REQUIRED / BLOCKED_EXTERNAL / NOT_APPLICABLE_WITH_PROOF`.

## 4) Bidirectional Traceability

```text
Journey → Code/Contract/Data/Runtime
AND
Route/Contract/State/Writer/Reader/Config/Runtime → Journey/Capability/Consumer
```

## 5) Scope Delta

```text
DISCOVERED → CLASSIFY RELATION → ADD TO GRAPH → IMPACT ANALYSIS → IN_SCOPE | SUPPORTED_EXCLUSION | MATERIAL_UNCERTAIN → COVER
```

## 6) Findings

كل Finding مادي يسجل ID، location/journey/surface، ACTUAL/INTENDED/DESIRED/CONFLICT، evidence، hypotheses، root cause/missing proof، owner، consumers، blast radius، risk، status، required action/decision/verification، reopen trigger.

## 7) Decision Candidate vs True Decision

ابدأ `QUESTION_CANDIDATE`. حاول حسمه من authority/product truth/code/state/contracts/data/permissions/other surfaces/tests/runtime. لا يصل للمستخدم إلا `CONTRADICTION / AMBIGUITY / MISSING_PRODUCT_OR_OPERATIONAL_DECISION / MULTIPLE_VALID_BEHAVIORS`.

## 8) Decision Order

الأسئلة تتبع Dependency Graph. اسأل أصغر مجموعة مترابطة تفتح أكبر قدر من العمل، ثم decision → impact propagation → re-diagnose → adversarial recheck. لا تجمع أسئلة TARGET الكبير حتى النهاية إذا كان قرار حالي يمنع Sequence حالية.

## 9) Sequence Derivation

لا تنشئ Sequence لأن هناك Domain/Surface باسم ما. اشتقه فقط عندما يثبت الرسم البياني وحدة Closure متماسكة.

الفصل مبرر عند:

```text
distinct root-cause cluster
different canonical owner
hard dependency boundary
independent state/journey boundary
materially distinct verification/runtime boundary
different protected/risk domain
independent consumer migration set
different durable governance decision boundary
```

الدمج مطلوب عندما تشترك العناصر في Root Cause + Canonical Owner + Consumer Migration + Verification Boundary.

## 10) Sequence Registry Discipline

`00-OVERVIEW.md` يسجل فقط `SEQUENCE_ID / FILE / SUBJECT / DERIVATION_BASIS / DEPENDS_ON / UNLOCKS / STATUS / REOPEN_TRIGGER`.

```text
one registry row ↔ one sequence file
contiguous sequence order
at most one active non-terminal sequence
no future placeholder sequence files
no sequence directory
```

## 11) Mode-Specific Sequence Exit

### PREPARE_ONLY

قبل التالي: `ROOT_CAUSE_PROVEN=YES`, `DECISIONS_RESOLVED=YES`, `REDIAGNOSIS_COMPLETE=YES`, `IMPACT_MAPPED=YES`, `VERIFICATION_DEFINED=YES`, `SOLUTION_READY=YES`, `SEQUENCE_STATUS=PREPARED`.

### EXECUTE_END_TO_END

قبل التالي: كل solution-ready gates + `SEQUENCE_STATUS=COMPLETE`, `IMPLEMENTATION_COMPLETE=YES`, `CONSUMERS_RECONCILED=YES`, `LOCAL_CLEANUP_COMPLETE=YES`, `VERIFICATION_PASS=YES`, `GOVERNANCE_SYNC=YES|NOT_APPLICABLE`, `SCOPE_DELTA_CLASSIFIED=YES`.

## 12) Just-In-Time Rule

```text
DO NOT PRE-CREATE 002 WHILE 001 IS ACTIVE.
COMPLETE/PREPARE 001 → reconcile graph → derive whether 002 still exists → only then create it.
```

## 13) Periodic Reconciliation

بعد كل Sequence: Journey↔Journey, Surface↔Surface, State↔State, Owner↔Consumer, Contract↔Client/Backend, Governance↔Product Truth↔Implementation, Sequence Registry↔Dependency Graph.

## 14) Independent Adversarial Completeness

ابحث عن unmapped routes/states/APIs/hidden writers/jobs/admin/fallback/config/data/migration/error/recovery paths. Material node جديد يعيد فتح الرسم والتغطية وقد يغيّر ترتيب/حدود Sequences.

## 15) Fresh-Head Drift

قبل إنشاء Sequence، قبل write في EXECUTE، وبعد Sequence، وقبل handoff/closure: re-resolve HEAD → classify delta → update graph/coverage → invalidate/re-diagnose affected scope.

## 16) Global Gates

بعد تغطية كل material universe فقط: `DISCOVERY_COMPLETE / DIAGNOSIS_COMPLETE / DECISION_COMPLETE / COVERAGE_COMPLETE / PACKAGE_READY`. `ZERO known findings` وحدها لا تثبت completeness.
