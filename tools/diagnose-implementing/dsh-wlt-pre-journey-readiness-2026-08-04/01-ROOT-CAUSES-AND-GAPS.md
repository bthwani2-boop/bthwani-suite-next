# 01 — الأسباب الجذرية والفجوات

## P0 — موانع فورية

### RC-001 — انعدام Baseline واحد حاكم

الرحلات، FOUNDATION، الحزمة التشخيصية السابقة، CI، والرأس الحالي لا تشير جميعها إلى SHA واحد. هذا يجعل النتائج غير قابلة للجمع ويحوّل النجاح التاريخي إلى ادعاء غير صالح للحاضر.

### RC-002 — تضارب base branch authority

وجود `main` في metadata و`master` في order file يهدد كل compare/merge/evidence calculation. يجب حسم المرجع في مصدر سلطة واحد ثم إعادة توليد الحزم.

### RC-003 — DSH seed idempotence غير مغلقة

فشل تطبيق local seeds مرتين يعني أن fresh/replay baseline غير أخضر. قد يكون السبب SQL conflict أو ordering أو identity/reference data أو script semantics؛ السبب غير مثبت حتى إعادة الإنتاج وجمع stderr/DB state.

### RC-004 — تقييم FOUNDATION قديم

FOUNDATION يمنع الرحلات، لكنه نفسه لا يصف الرأس الحالي. المطلوب ليس تجاهله، بل إعادة تنفيذه على SHA حديث مع فصل current failures عن historical hypotheses.

### RC-005 — غياب جرد شامل قابل للتكرار

البحث المفهرس لم يثبت tree census، imports، dynamic requires، package scripts، workflows، routes، generated consumers، migrations، أو surface actions بالكامل. أي حذف أو توحيد قبل الجرد مخاطرة.

## P1 — فجوات معمارية وتشغيلية يجب إعادة إثباتها

1. **الهوية والصلاحيات:** session lifecycle، activation، TOTP، ownership/scopes، negative matrix، ومنع capability عامة مثل `admin:*` من استبدال capability دقيقة.
2. **حقيقة البيانات:** DSH يملك التجارة والتوصيل؛ WLT يملك ledger/payment/settlement/reconciliation. يجب كشف أي table/type/status/receipt موازٍ.
3. **العقود:** `contracts/openapi/index.yaml` يجب أن يكون نقطة التجميع؛ أي Request/Response/Status يدوي يحتاج تصنيفًا وترحيلًا.
4. **حدود DB:** منع direct cross-service reads/writes، legacy sqlite/drizzle/better-sqlite paths، ومصادر schema/migration الموازية.
5. **المسارات والتكاملات:** route↔operationId↔handler↔client↔surface matrix غير مثبتة بالكامل.
6. **الأسطح الخمسة:** page/tab/control/action/state/permission/API/test coverage غير مثبتة بالكامل.
7. **التشغيل:** readiness، bootstrap idempotence، compensation، unknown-result، observability، وPII-safe logs تحتاج evidence.
8. **CI والحراس:** نجاح detect-only أو snapshot لا يثبت runtime closure. يجب إزالة الحراس الزائدين فقط بعد نقل assertions الضرورية.
9. **ملفات قديمة/مكررة:** retirement register القديم يقدم مرشحين، لا قرارات حذف. كل عنصر يحتاج zero-use/data/contract/migration proof.
10. **Toolchain:** DSH package quality gates وWLT Node/cross-platform scripts تحتاج تقارب واختبارات فعلية.

## أخطاء منهجية ممنوعة

- اعتبار عدم وجود خطأ compile دليل سلامة التصميم.
- إصلاح أعراض متتابعة داخل مصدر حقيقة فاسد بدل استبداله بتصميم صحيح.
- إضافة compatibility layer جديدة.
- إبقاء backup/old/final-v2 داخل المسارات الحية.
- حذف migration أو contract أو test أمني بحجة التنظيف.
- تحويل حزمة الرحلات نفسها إلى منتج موازٍ بلا ownership واضح.
- إزالة منظومة الرحلات جماعيًا قبل semantic harvest وإثبات أن البديل يحفظ معايير القبول.