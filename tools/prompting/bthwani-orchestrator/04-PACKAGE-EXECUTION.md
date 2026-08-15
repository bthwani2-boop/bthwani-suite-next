# 04 — Package & Execution

Status: DERIVED_SUPPORT / DOCUMENTATION_ONLY
Owner: `tools/prompting/bthwani-orchestrator/04-PACKAGE-EXECUTION.md`

## 1) Package V2

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 00-OVERVIEW.md
├── 001-<sequence>.md
├── 002-<sequence>.md
└── ...
```

لا يوجد عدد ثابت من Sequences. لا توجد مجلدات Domains/Surfaces داخل الحزمة. لا توجد ملفات Diagnosis/Execution/Verification منفصلة لنفس Sequence.

## 2) 00-OVERVIEW Ownership

يمتلك فقط: task identity / repository / branch / mode / target، START_SHA / CURRENT_SHA، macro blueprint / dependency graph summary، sequence registry + order، global decisions/blockers، global coverage/reconciliation، final handoff/closure metadata.

## 3) Sequence File Ownership

كل `NNN-<sequence>.md` يمتلك دورة واحدة متماسكة:

```text
Scope / Context
Diagnosis / Findings
Root Cause / Blast Radius
Decisions / Re-Diagnosis
Exact Target State
Treatment / Execution
Consumer / Contract / Data / Governance
Cleanup
Verification / Runtime / Evidence
Exit Gate / Reopen
```

`ONE FILE = ONE COHERENT EXECUTION/CLOSURE SEQUENCE`.

## 4) Create / Resume

```text
ABSENT → create V2 overview only.
EXISTS V2 + same task identity → resume/reconcile.
EXISTS legacy V1 active task → rebaseline, preserve only valid evidence/decisions, migrate to V2.
DIFFERENT identity collision → stop; do not overwrite.
```

`new-package.mjs` ينشئ `00-OVERVIEW.md` فقط. `new-sequence.mjs` يستخدم فقط بعد إثبات Sequence boundary من Graph وينشئ الرقم التالي Just-In-Time.

## 5) No Mega Package / No Fragmentation

ممنوع:

```text
one giant file for all target details
hundreds of pre-created future sequence files
one file per app/folder merely because repository has that structure
three files per sequence by default
split because line count crossed an arbitrary threshold
merge unrelated root causes just to reduce file count
```

قسّم Sequence فقط إذا ظهر Closure Boundary مستقل. ادمج الأعراض إذا كان لها Root Cause/Owner/Verification مشتركة.

## 6) PREPARE_ONLY Sequence

```text
diagnose to evidence limit
→ resolve derivable facts
→ ask true decision(s) if needed
→ propagate decision
→ re-diagnose
→ prove root cause / owner / blast radius
→ define exact target state
→ define root treatment
→ map writers/readers/consumers
→ define governance promotion
→ define obsolete removal + cleanup
→ define verification / acceptance
→ SEQUENCE_STATUS=PREPARED
```

لا Actual execution ولا fabricated implementation SHA/evidence. الهدف: وكيل آخر يفتح الملف ويستطيع التنفيذ دون Product/Architecture guessing أو إعادة تصميم.

## 7) EXECUTE_END_TO_END Sequence

قبل live write:

```text
SEQUENCE_STATUS=READY_TO_EXECUTE
ROOT_CAUSE_PROVEN=YES
DECISIONS_RESOLVED=YES
REDIAGNOSIS_COMPLETE=YES
IMPACT_MAPPED=YES
VERIFICATION_DEFINED=YES
SOLUTION_READY=YES
BASE_SHA reconciled
```

ثم:

```text
Governance Promotion where required
→ canonical owner root fix/refactor/redesign/rebuild
→ migrate every affected writer/reader/consumer
→ synchronize contract/data/generated transitions
→ remove obsolete/parallel path
→ local cleanup
→ affected verification
→ runtime/readback where required
→ record exact evidence
→ SEQUENCE_STATUS=COMPLETE
```

## 8) Governance Promotion

لكل durable resolved rule: classify durability → existing canonical owner → authority check → canonical governance write when authorized → machine counterpart when applicable → implementation/consumer propagation → verify parity. PREPARE يسجل pending فقط.

## 9) Root-Cause Loop

```text
confirm symptom/evidence
→ correlate duplicate symptoms
→ first causal failure
→ challenge competing hypothesis
→ canonical owner/root cause
→ root fix
→ consumer migration
→ contract/data/generated sync
→ obsolete path removal
→ cleanup
→ verification
→ neighboring regression search
```

## 10) Consumer Migration

كل proven consumer = `MIGRATED` أو `NOT_AFFECTED_WITH_PROOF`. Cover writers/readers/APIs/generated clients/surfaces/jobs/events/DB/config/permissions/tests/docs وفق semantic blast radius.

## 11) Sequence Creation Safety

قبل إنشاء Sequence التالية:

```text
current sequence mode-specific exit gate = PASS
overview registry reconciled
current sequence cleared
latest HEAD reconciled
dependency graph refreshed
next sequence boundary proven
```

ثم فقط أنشئ `NNN-<name>.md`.

## 12) Cleanup

داخل كل Sequence: remove obsolete path/compatibility/workaround، repair imports/exports/routes/bindings/references، normalize affected naming/ownership/placement، remove debug/temp residue، verify reference integrity. التنظيف النهائي العالمي يبقى في الوحدة 05.

## 13) Protected Domains

Data/Security/Finance/Events/Mobile/Control Panel ترفع Evidence/Authority gates تلقائيًا؛ لا تخفضها بنية الملف الجديدة.

## 14) Global Completion

لا تعتبر TARGET جاهزًا/مغلقًا بمجرد إغلاق آخر Sequence:

```text
all sequence records terminal for MODE
→ global reconciliation
→ duplicate truth search
→ global coverage gates
→ final cleanup
→ final evidence/fresh-head/adversarial gates
```
