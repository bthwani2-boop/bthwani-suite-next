# DSH/WLT Pre-Journey Readiness Diagnosis

## الحالة الحاكمة

- `repository`: `bthwani2-boop/bthwani-suite-next`
- `branch`: `smsm`
- `package_parent_sha`: `98dafdf17e0af7fcc2012a0aa0e250838723f2ce`
- `initial_observation_sha`: `11afa6cd20480afbe0a56364e13a3f5430089439`
- `mode`: `DIAGNOSIS_AND_PLAN_ONLY`
- `verdict`: `NO_GO`
- `journey_execution_allowed`: `false`
- `existing_project_files_modified`: `0`
- `existing_project_files_deleted_or_moved`: `0`

هذه الحزمة هي تقرير تشخيص وخطة تنفيذ فقط. لا تمنح إذنًا بتعديل ملفات المنتج أو حذفها أو نقلها، ولا تعلن اكتمال فحص كل سطر في المستودع. فهرس GitHub المتاح لا يثبت جردًا كاملًا للشجرة؛ لذلك تبدأ الخطة بمرحلة جرد محلي/ريموت قابلة لإعادة الإنتاج على SHA واحد قبل أي معالجة.

## لماذا الحكم NO-GO؟

1. ملف `FOUNDATION-00.md` نفسه يعلن `FIX_REQUIRED` و`journey_execution_allowed: false`، لكنه مقيم على SHA أقدم من الرأس الحالي.
2. حزمة الرحلات تربط نفسها بـSHAs أقدم من الرأس الحالي، فلا يجوز استعمال تقييماتها كإثبات إغلاق حالي.
3. مستودع GitHub يعلن الفرع الافتراضي `main`، بينما ملف ترتيب الرحلات يعلن `base_branch: master`؛ مرجع المقارنة الحاكم غير محسوم.
4. على SHA الملاحظة `11afa6c` فشل فحص `DSH Database Contract` في خطوة `Apply DSH local seeds twice` بعد نجاح العقد والمهاجرات واختبارات المخطط؛ السبب الداخلي الدقيق للفشل لم يُثبت من السجل المتاح.
5. الرأس `98dafdf` لم تكن له حالات CI منشورة عند إنشاء هذه الحزمة، ولذلك لا يوجد Same-SHA green baseline.
6. الحزمة التشخيصية السابقة داخل `tools/diagnose-implementing/dsh-wlt-repository-radical-diagnosis/` مبنية على `09f7a33`، لا على الرأس الحالي، وتتضمن قرارات واسعة مثل إزالة منظومة الرحلات؛ هذه القرارات مرشحات وليست تفويضًا حاكمًا.

## نقطة الدخول

ابدأ من `03-MASTER-EXECUTION-PLAN.md`. الترتيب إلزامي، وكل مرحلة Fail-closed. أي تحرك للفرع أو اختلاف SHA يعيد التنفيذ إلى المرحلة 00.

## ملفات الحزمة

- `manifest.json`
- `00-CURRENT-VERDICT-AND-EVIDENCE.md`
- `01-ROOT-CAUSES-AND-GAPS.md`
- `02-TARGET-ARCHITECTURE.md`
- `03-MASTER-EXECUTION-PLAN.md`
- `04-ATOMIC-TASKS.md`
- `05-ACCEPTANCE-VERIFICATION-ROLLBACK.md`
- `06-CANDIDATE-REGISTER.md`
- `07-BLOCKERS-AND-UNPROVEN.md`

## قاعدة الإثبات

كل ادعاء يصنف واحدًا من: `CURRENT_DIRECT`, `CURRENT_CI`, `HISTORICAL_REVALIDATE`, `CANDIDATE`, `UNPROVEN`. لا يتحول أي عنصر إلى `CLOSED` إلا بدليل يحمل SHA وأمرًا ونتيجة وموضعًا حاليًا واختبارًا مناسبًا.