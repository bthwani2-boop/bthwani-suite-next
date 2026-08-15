# Diagnose/Implementing package framework

Status: DERIVED_SUPPORT

هذا الإطار ينشئ Living Derived task packages تحت `plans/diagnose-implementing/<task-name>/`. لا ينشئ Product/Implementation/Runtime Truth أو Approval أو Closure بذاته.

## Schema V2 — Sequential Adaptive Package

```text
plans/diagnose-implementing/<TASK>/
├── 00-OVERVIEW.md
├── 001-<proven-sequence>.md
├── 002-<proven-sequence>.md
└── ...
```

لا يوجد عدد ثابت من الملفات، ولا Domain tree ثابتة، ولا ثلاثة ملفات لكل موضوع.

```text
ONE FILE = ONE COHERENT EXECUTION/CLOSURE SEQUENCE
SEQUENCES COME FROM THE DEPENDENCY GRAPH
CREATE SEQUENCES JUST-IN-TIME
NO PRECREATED FUTURE SEQUENCES
NO SUBDIRECTORIES INSIDE V2 PACKAGE
NO DIAGNOSIS/EXECUTION/VERIFICATION SPLIT
00-OVERVIEW = SMALL GLOBAL MAP ONLY
```

TARGET صغير قد يبقى `00-OVERVIEW.md + 001-...md`. TARGET واسع قد يحتوي Sequences كثيرة، لكنها تنشأ واحدة بعد الأخرى فقط عندما يثبت الرسم البياني الحاجة إليها. هذا يمنع Mega Package والـMicro-file noise معًا.

## PREPARE_ONLY

```text
diagnose → decide → re-diagnose → exact root solution
→ exact consumers/governance/cleanup/verification
→ PREPARED → next
```

لا live mutation. كل Sequence يصبح handoff قابلًا للتنفيذ من وكيل آخر دون Product/Architecture guessing.

## EXECUTE_END_TO_END

```text
diagnose → decide → re-diagnose → solution-ready
→ execute → migrate consumers → cleanup → verify/readback
→ COMPLETE → next
```

لا dependent next Sequence قبل Exit Gate الحالية.

## إنشاء الحزمة

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <task-name> `
  --branch <branch> `
  --start-sha <40-sha> `
  --current-sha <40-sha> `
  --mode <PREPARE_ONLY|EXECUTE_END_TO_END> `
  --target "<target>" `
  --objective "<objective>"
```

ينشئ `00-OVERVIEW.md` فقط.

## إنشاء Sequence بعد إثباتها

```powershell
node plans/diagnose-implementing/new-sequence.mjs `
  --package <task-name> `
  --name <sequence-slug> `
  --title "<human title>" `
  --base-sha <overview CURRENT_SHA> `
  --basis "<why this is a distinct proven execution boundary>" `
  --depends-on "<SEQ-001|NONE>"
```

المولد يرفض إنشاء Sequence جديدة إذا بقيت الحالية active، ويحدّث `CURRENT_SEQUENCE_ID` والـRegistry.

## التحقق

```powershell
node plans/diagnose-implementing/validate-package.mjs <package>
node plans/diagnose-implementing/validate-package.mjs <package> --sequence-ready
node plans/diagnose-implementing/validate-package.mjs <package> --sequence-complete
node plans/diagnose-implementing/validate-package.mjs <package> --handoff
node plans/diagnose-implementing/validate-package.mjs <package> --closure
```

- Basic: schema/flat structure/registry/sequence consistency.
- `--sequence-ready`: current Sequence solution/write readiness.
- `--sequence-complete`: mode-specific Sequence exit.
- `--handoff`: PREPARE_ONLY final package readiness.
- `--closure`: EXECUTE_END_TO_END final target closure structure.
- Validator يثبت فقط ما يفحصه، لا Product/Runtime correctness.

## متى نقسم Sequence؟

فقط عند Boundary مثبت: Root Cause مختلف، Canonical Owner مختلف، dependency/handoff مستقل، verification/runtime boundary مستقل، protected/risk domain مستقل، أو consumer/governance closure مستقلة.

لا تقسّم بسبب عدد الأسطر، اسم التطبيق، أو مجلد المستودع. ولا تدمج Root Causes غير مرتبطة فقط لتقليل عدد الملفات.

## Legacy V1

الحزم النشطة ذات `01-DIAGNOSIS.md / 02-EXECUTION.md / 03-VERIFICATION-CLOSURE.md` تُعاد معايرتها إلى V2 عند استئنافها. Git history هو الأرشيف. لا parallel V1 template/schema.

## السلامة

لا Secrets/PII/production dumps. Durable truth تترقى إلى canonical owner؛ Package/Sequence files تبقى Derived Support فقط.
