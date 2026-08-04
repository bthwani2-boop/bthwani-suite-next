# 00 — الحكم الحالي والأدلة

## النتيجة

**لا تبدأ تنفيذ الرحلات.** الحالة الحالية `NO_GO` حتى إغلاق FOUNDATION وجميع الموانع P0 على SHA واحد ونشر CI/runtime/database evidence لنفس الرأس.

## الأدلة الحالية المباشرة

### E-001 — تثبيت الفرع

- الفرع: `smsm`.
- SHA الملاحظة الأولى: `11afa6cd20480afbe0a56364e13a3f5430089439`.
- تحرك الفرع لاحقًا إلى: `98dafdf17e0af7fcc2012a0aa0e250838723f2ce`.
- المقارنة `11afa6c..98dafdf` تحتوي Commit واحدًا و20 ملفًا مضافًا، جميعها داخل `tools/diagnose-implementing/dsh-wlt-repository-radical-diagnosis/`؛ لم تُعدّل ملفات المنتج في ذلك Commit.

### E-002 — تضارب مرجع الأساس

- GitHub repository metadata يعلن `default_branch: main`.
- `governance/operational_journey_protocol_package/smsm-dsh-wlt-journeys/00-AUTHORITY-EXECUTION-ORDER.md` يعلن `base_branch: master`.
- لا يجوز اختيار أحدهما بالافتراض. يجب أن تحدد سلطة المستودع المرجع الصحيح وتحدث كل الحزم والفحوص إليه.

### E-003 — حزمة الرحلات غير مرتبطة بالرأس الحالي

- README/registry/order داخل حزمة الرحلات تحمل target/baseline SHAs أقدم من `98dafdf`.
- `FOUNDATION-00.md` يحمل تقييمًا أقدم ويعلن `FIX_REQUIRED` و`journey_execution_allowed: false`.
- النتيجة: المحتوى مفيد كفرضيات تاريخية، لكنه ليس دليل إغلاق حاليًا.

### E-004 — فشل قاعدة DSH عند SHA الملاحظة

في تشغيل CI المرتبط بـ`11afa6c`:

- setup/install/env: ناجحة.
- DSH DB contract and legacy guards: ناجحة.
- migrations from zero: ناجحة.
- schema-aligned smoke tests: ناجحة.
- `Apply DSH local seeds twice`: فاشلة.

لا يوجد في الدليل المتاح نص موثوق للخطأ الداخلي؛ يمنع تخمين seed أو constraint بعينه.

### E-005 — حالة CI على رأس إنشاء الحزمة

عند فحص `98dafdf` لم تكن هناك statuses منشورة. غياب status ليس نجاحًا. يجب إعادة الفحص بعد Push هذه الحزمة وربط كل Workflow بالـSHA النهائي.

## أدلة مباشرة إضافية تحتاج معالجة

- `services/dsh/package.json` يعلن `main: noop.js` وlint placeholder؛ لا يقدم وحده بوابة build/test/lint فعلية للخدمة.
- `services/wlt/package.json` يعلن Node `>=22`، ويحتوي أمر تنظيف Unix-style ضمن مشروع يُشغّل محليًا على Windows؛ التوافق الفعلي يحتاج اختبارًا.
- `tools/scripts/check-dsh-database-contract.mjs` يثبت canonical Prisma schema/migrations ويمنع عدة مسارات DB مباشرة، لكنه لا يعوّض فشل seed idempotence الحالي.
- ملف التنفيذ الحاكم يمنع wildcard scope، direct cross-service DB access، المصادر الموازية، والحذف دون دليل وترحيل وتراجع.

## حدود التشخيص

لم يثبت موصل GitHub جرد كل ملف وسطر واعتمادية ديناميكية. لذلك أي عبارة مثل «تم فحص كل سطر» غير مدعومة. المرحلة 01 مصممة لإنتاج هذا الجرد فعليًا من نسخة مطابقة للـSHA ثم حفظ نتائج قابلة للتدقيق.