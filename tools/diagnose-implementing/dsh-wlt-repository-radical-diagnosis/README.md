# DSH/WLT Repository Radical Diagnosis Package

## الحالة

- `repository`: `bthwani2-boop/bthwani-suite-next`
- `branch`: `smsm`
- `diagnostic_base_sha`: `09f7a33081cdf07792710271038098862e58fbef`
- `mode`: `DIAGNOSIS_AND_PLAN_ONLY`
- `remote_path`: `tools/diagnose-implementing/dsh-wlt-repository-radical-diagnosis/`
- `local_equivalent`: `C:\bthwani-suite-next\tools\diagnose-implementing\dsh-wlt-repository-radical-diagnosis\`
- `product_files_modified`: `0`
- `product_files_deleted_or_moved`: `0`

هذه الحزمة هي التغيير الوحيد المسموح في هذه المرحلة. لا تنفذ أي معالجة في ملفات المنتج، ولا تمنح أي وكيل إذنًا بالحذف أو النقل لمجرد وجود عنصر في سجل المرشحين.

## نقطة البدء

ابدأ من `MASTER-EXECUTION-ORDER.md`، ثم نفّذ المراحل بالترتيب الإلزامي. جميع أرقام الأسطر والأدلة مرتبطة بالـSHA التشخيصي، ويجب إعادة تثبيت أحدث SHA وتجديدها قبل التنفيذ الفعلي.

## محتوى الحزمة

- نطاق وحدود وخط أساس وأدلة.
- جرد الاعتماديات والتدفقات ومصادر الحقيقة.
- أسباب جذرية ومخاطر وقرارات حذف/نقل/دمج مشروطة.
- تصميم مستهدف.
- مهام ذرية مرتبة حسب الاعتماديات.
- 8 مراحل مستقلة ذات مدخلات ومخرجات ومعايير إغلاق.
- معايير قبول وفحوص تحقق وتراجع.
- موانع ونقاط غير مثبتة.
- سجل مرشحين وسكربت/أوامر إعادة توليد الجرد.

## حقائق الخط الأساسي

- 3,605 ملفات Git متتبعة عند التشخيص.
- 1,854 ملفًا تحت DSH و347 تحت WLT.
- 47 ملفًا صفريًا، منها 35 `.gitkeep` داخل مجلدات مأهولة.
- 25 مجموعة تطابق بايتية غير فارغة.
- PR #201 كان يحتوي 722 Commit و1,151 ملفًا متغيرًا عند تثبيت الدليل.
- Backends وقواعد البيانات الستة نجحت على الرأس المثبت؛ الفشل الحالي متركز في Node verification وRuntime bootstrap وGitleaks وStatic diagnostics وJourney Gate.

## قاعدة الحذف

لا يصبح أي عنصر `SAFE_TO_DELETE` إلا بعد إثبات: صفر imports واستدعاءات shell/package/workflow/routes/registries، عدم امتلاك بيانات أو migration أو عقد فريد، اكتمال البديل والترحيل، نجاح الفحوص المستهدفة والسلبية، وإمكانية التراجع من Git history دون إبقاء نسخ احتياطية حية.
