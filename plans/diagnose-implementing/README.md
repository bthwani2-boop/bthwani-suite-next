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

## المبدأ المشترك للنمطين

`PREPARE_ONLY` و`EXECUTE_END_TO_END` لا يستخدمان منهجين مختلفين للتشخيص. كلاهما يعمل:

```text
DISCOVER GLOBALLY
→ MACRO BLUEPRINT / DEPENDENCY GRAPH
→ SELECT NEXT WAVE
→ DIAGNOSE
→ ROOT CAUSE / BLAST RADIUS
→ RESOLVE DERIVABLE FACTS
→ ASK TRUE DECISION(S) WHEN NEEDED
→ APPLY DECISION
→ RE-DIAGNOSE
→ DEFINE EXACT ROOT SOLUTION
→ MODE-SPECIFIC WAVE GATE
→ NEXT WAVE
```

الفرق هو سلطة الكتابة بعد أن تصبح الـWave الحالية solution-ready.

## PREPARE_ONLY

```text
Wave diagnosis
→ decisions/questions if needed
→ re-diagnosis
→ exact root solution design
→ exact consumers/governance/cleanup/verification handoff
→ WAVE_PREPARED
→ next wave
```

لا Product/Governance/Runtime mutation. الحزمة تُبنى تدريجيًا أثناء التشخيص حتى تصبح حزمة تنفيذ يمكن لوكيل آخر تنفيذها دون Product/Architecture guessing أو قرار مادي مخفي.

بعد جميع الـWaves فقط:

```text
Global Reconciliation
→ Adversarial Completeness
→ Global Diagnosis/Decision/Coverage gates
→ PACKAGE_READY
→ LIFECYCLE_STATE=PREPARED
```

## EXECUTE_END_TO_END

نفس التشخيص والقرارات وإعادة التشخيص، لكن بعد أن تجتاز **الـWave الحالية** بوابة الجاهزية:

```text
CURRENT_WAVE_ROOT_CAUSE_PROVEN = YES
CURRENT_WAVE_DECISIONS_RESOLVED = YES
CURRENT_WAVE_REDIAGNOSIS_COMPLETE = YES
CURRENT_WAVE_IMPACT_MAPPED = YES
CURRENT_WAVE_VERIFICATION_DEFINED = YES
CURRENT_WAVE_READY_TO_EXECUTE = YES
```

يبدأ التنفيذ الحي فورًا للـWave الحالية:

```text
Governance Promotion when required
→ root fix
→ consumer migration
→ obsolete path removal
→ local cleanup
→ required verification/runtime readback
→ update living documentation
```

ولا ينتقل إلى التالية حتى:

```text
CURRENT_WAVE_STATUS = COMPLETE
CURRENT_WAVE_IMPLEMENTATION_COMPLETE = YES
CURRENT_WAVE_CONSUMERS_RECONCILED = YES
CURRENT_WAVE_LOCAL_CLEANUP_COMPLETE = YES
CURRENT_WAVE_VERIFICATION_PASS = YES
CURRENT_WAVE_GOVERNANCE_SYNC = YES | NOT_APPLICABLE
CURRENT_WAVE_SCOPE_DELTA_CLASSIFIED = YES
```

Global `PACKAGE_READY` **ليس شرطًا قبل أول Wave write** في هذا النمط. هو شرط للمصالحة العالمية قبل Final Closure.

## الحزمة Living Derived Documentation

تُنشأ/تستأنف بعد تثبيت Task identity وBranch/SHA، قبل deep waves. وجودها لا يعني أنها جاهزة أو صحيحة أو مغلقة.

- `01-DIAGNOSIS.md`: يتطور مع Findings/Decisions/Re-Diagnosis/Coverage.
- `02-EXECUTION.md`: في PREPARE يوثق التنفيذ المطلوب؛ في EXECUTE يوثق current-wave gate وما نُفذ فعليًا.
- `03-VERIFICATION-CLOSURE.md`: يوثق Evidence/Runtime/Readback/Approvals/Cleanup/Governance/Fresh Head/Closure.

الكود والحوكمة والعقود والبيانات والـRuntime الحي تقود الحقيقة؛ الحزمة توثقها فقط.

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
# Structural/package-schema validation only
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name>

# MODE-aware transition gate:
# PREPARE_ONLY => final handoff readiness
# EXECUTE_END_TO_END => current-wave pre-write readiness
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --strict

# EXECUTE_END_TO_END => current wave must be fully implemented/verified before next dependent wave
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --wave-complete

# EXECUTE_END_TO_END => final global closure only
node plans/diagnose-implementing/validate-package.mjs plans/diagnose-implementing/<task-name> --closure
```

- Validator يرفض أي ملف/مجلد إضافي في حزمة Schema V1؛ البنية الحالية ثلاثة ملفات فقط.
- Basic validation لا يعني readiness.
- `--strict` في `PREPARE_ONLY` يتطلب Global Discovery/Diagnosis/Decision/Coverage/Package Ready + `LIFECYCLE_STATE: PREPARED`.
- `--strict` في `EXECUTE_END_TO_END` يتطلب Current Wave Write Gate فقط؛ لا يطلب Global `PACKAGE_READY`.
- `--wave-complete` يثبت بنيويًا أن current wave مسجلة `COMPLETE` وأن consumer/cleanup/verification/governance/scope-delta gates الخاصة بها مقفلة قبل التالية.
- `--closure` يتطلب Global gates، `IMPLEMENTATION_COMPLETE`, final evidence/cleanup/governance/fresh-head/adversarial gates، وقرار الإغلاق الحاكم المقروء ديناميكيًا من `governance/contracts/decision-vocabulary.json`.
- `FINAL_DECISION` مختلف عن `LIFECYCLE_STATE`: الأول مفردة Governance canonical، والثاني حالة تشغيلية داخل الحزمة المشتقة.
- Validator يثبت فقط الشكل والبوابات التي ينفذها؛ لا يثبت Product/Runtime correctness.

## استئناف الحزم القديمة

الحزم القديمة ذات `MANIFEST/COVERAGE/units/**` لا تُعاد تشغيلها ميكانيكيًا. إذا كانت المهمة ما تزال نشطة: أعد معايرتها مقابل HEAD/Orchestrator/Governance الحالية، حافظ فقط على الأدلة والقرارات التي ما تزال صالحة، ثم أنشئ/حدّث الحزمة الحالية ذات الملفات الثلاثة. Git history هو الأرشيف.

## السلامة

لا تخزن Credentials/Secrets/PII/production dumps هنا. لا تُعامل الحزمة كمصدر حقيقة دائم. قبل Final Closure يجب ترقية كل حقيقة دائمة لازمة إلى مالكها الحاكم وإثبات التطابق مع العقود والكود والـRuntime الحديث.
