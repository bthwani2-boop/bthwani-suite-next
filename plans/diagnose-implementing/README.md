# Diagnose/Implementing package framework

Status: DERIVED_SUPPORT

هذا الإطار ينشئ حزم تشخيص/تنفيذ مشتقة تحت `plans/diagnose-implementing/<task-name>/`. لا ينشئ Product Truth أو Implementation/Runtime Truth أو Approval أو Closure بذاته، ولا يجوز لأي Runtime/Build/CI الاعتماد على محتوى الحزم الناتجة.

## القالب الحاكم

القالب الحالي الوحيد للحزم الجديدة هو:

```text
plans/diagnose-implementing/_template/
├── 01-DIAGNOSIS.template.md
├── 02-EXECUTION.template.md
└── 03-VERIFICATION-CLOSURE.template.md
```

وينتج:

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 01-DIAGNOSIS.md
├── 02-EXECUTION.md
└── 03-VERIFICATION-CLOSURE.md
```

المسارات القديمة داخل `_template` و`new-unit.mjs` باقية فقط كـ`RETIRED_COMPATIBILITY_SENTINEL` لمنع كسر حراس/مراجع أقدم؛ ليست قالبًا موازيًا ولا يجوز استخدامها لإنشاء حزمة جديدة.

## الارتباط بالأوركسترا

نقطة الدخول المنهجية:

```text
tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md
```

حزمة الأمر تحت `tools/prompting/**` منفصلة عن حزمة المهمة تحت `plans/**`.

## الأوضاع

```text
PREPARE_ONLY
= تشخيص كامل + قرارات + تغطية + إنشاء حزمة جاهزة، دون Product/Governance/Runtime mutation.

EXECUTE_END_TO_END
= نفس التشخيص أولًا، ثم Governance Promotion عند الحاجة + Root-Cause implementation + cleanup + verification + closure gates.
```

## إنشاء حزمة

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <task-name> `
  --branch <branch> `
  --sha <40-character-sha> `
  --mode PREPARE_ONLY `
  --target "<blank-or-target>" `
  --objective "<measurable objective>"
```

يمكن استخدام `--surface` كـalias انتقالي لـ`--target` فقط؛ لا يغير نموذج الحزمة.

## التحقق

```powershell
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name>
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --strict
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --strict --closure
```

- `--strict`: يتطلب اجتياز بوابات Discovery/Diagnosis/Decision/Coverage/Package Ready وعدم وجود placeholders غير محسومة.
- `--closure`: يتطلب `EXECUTE_END_TO_END` ويضيف Implementation/Cleanup/Evidence/Governance/Fresh-Head/Adversarial gates وقرار إغلاق غير OPEN/BLOCKED.
- Validator يثبت فقط شكل الحزمة والبوابات النصية التي يفحصها؛ لا يثبت صحة المنتج أو Runtime.

## استئناف الحزم القديمة

أي حزمة قديمة ببنية `MANIFEST/COVERAGE/units/**` هي Derived Historical Support. عند استئنافها لا يُعاد تشغيل مخططها القديم ميكانيكيًا؛ تُعاد معايرتها مقابل الأوركسترا والحقيقة الحالية ثم تُسقط إلى الملفات الثلاثة الحالية إذا كانت المهمة ما تزال نشطة.

## السلامة

لا تخزن Credentials/Secrets/PII/production dumps هنا. Git history هو الأرشيف الافتراضي. الحقيقة الدائمة التي يجب أن تبقى بعد حذف Prompt/Plan تُرقّى إلى مالكها الحاكم داخل `governance/**` والعقود/الكود الحي وفق الـMODE والسلطة.