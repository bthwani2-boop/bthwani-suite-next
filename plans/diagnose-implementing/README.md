# Diagnose/Implementing package framework

Status: DERIVED_SUPPORT

هذا الإطار ينشئ حزم تشخيص/تنفيذ مشتقة تحت `plans/diagnose-implementing/<task-name>/`. لا ينشئ Product Truth أو Implementation/Runtime Truth أو Approval أو Closure بذاته، ولا يجوز لأي Runtime/Build/CI الاعتماد على محتوى الحزم الناتجة.

## القالب الحاكم الوحيد

```text
plans/diagnose-implementing/_template/
├── 01-DIAGNOSIS.template.md
├── 02-EXECUTION.template.md
└── 03-VERIFICATION-CLOSURE.template.md
```

وينتج **ثلاثة ملفات فقط**:

```text
plans/diagnose-implementing/<TASK_NAME>/
├── 01-DIAGNOSIS.md
├── 02-EXECUTION.md
└── 03-VERIFICATION-CLOSURE.md
```

لا توجد بنية `MANIFEST/COVERAGE/units/**` موازية للقالب الحالي، ولا `new-unit.mjs`. الحزم التاريخية القديمة تبقى Derived Historical Support فقط ولا تحدد Schema الحزمة الجديدة.

## الارتباط بالأوركسترا

نقطة الدخول المنهجية الوحيدة:

```text
tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md
```

حزمة الأمر تحت `tools/prompting/**` منفصلة عن حزمة المهمة تحت `plans/**`، والحقيقة الدائمة تترقى إلى مالكها الحاكم في `governance/**`/العقود/الكود الحي عندما يسمح الـMODE والسلطة بذلك.

## الأوضاع

```text
PREPARE_ONLY
= تشخيص كامل + قرارات + تغطية + حزمة جاهزة، دون Product/Governance/Runtime mutation.

EXECUTE_END_TO_END
= نفس التشخيص أولًا، ثم Governance Promotion عند الحاجة + Root-Cause implementation + cleanup + verification + closure gates.
```

## إنشاء حزمة

```powershell
node plans/diagnose-implementing/new-package.mjs `
  --name <task-name> `
  --branch <branch> `
  --start-sha <diagnosis-start-40-sha> `
  --current-sha <latest-reconciled-40-sha> `
  --mode PREPARE_ONLY `
  --target "<blank-or-target>" `
  --objective "<measurable objective>"
```

`--current-sha` اختياري فقط عندما يساوي `--start-sha`. لا يوجد alias قديم لـ`--surface` أو`--sha`؛ الحقول الحالية صريحة لتجنب التباس baseline مع current truth.

## التحقق

```powershell
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name>
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --strict
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --closure
```

- Validator يرفض أي ملف/مجلد إضافي في حزمة Schema V1؛ البنية الحالية ثلاثة ملفات فقط.
- `--strict` يتطلب بوابات Discovery/Diagnosis/Decision/Coverage/Package Ready، ويثبت حالة Lifecycle المناسبة للـMODE.
- `--closure` يتطلب `EXECUTE_END_TO_END`، `LIFECYCLE_STATE: CLOSED`، جميع بوابات التنفيذ/التنظيف/الأدلة/الحوكمة/Fresh Head/Adversarial، وقرار الإغلاق الحاكم المقروء ديناميكيًا من `governance/contracts/decision-vocabulary.json`.
- `FINAL_DECISION` مختلف عن `LIFECYCLE_STATE`: الأول مفردة Governance canonical، والثاني حالة تشغيلية داخل الحزمة المشتقة.
- Validator يثبت فقط الشكل والبوابات التي ينفذها؛ لا يثبت Product/Runtime correctness.

## استئناف الحزم القديمة

الحزم القديمة ذات `MANIFEST/COVERAGE/units/**` لا تُعاد تشغيلها ميكانيكيًا. إذا كانت المهمة ما تزال نشطة: أعد معايرتها مقابل HEAD/Orchestrator/Governance الحالية، حافظ فقط على الأدلة والقرارات التي ما تزال صالحة، ثم أنشئ/حدّث الحزمة الحالية ذات الملفات الثلاثة. Git history هو الأرشيف.

## السلامة

لا تخزن Credentials/Secrets/PII/production dumps هنا. لا تُعامل الحزمة كمصدر حقيقة دائم. قبل Final Closure يجب ترقية كل حقيقة دائمة لازمة إلى مالكها الحاكم وإثبات التطابق مع العقود والكود والـRuntime الحديث.
