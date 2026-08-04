# PHASE 00 — الخط الأساسي والأدلة

## النطاق
Git refs، الشجرة الكاملة، CI artifacts، dependency/route/contract/database inventories.

## المدخلات
SHA الحزمة، `inventory/REGENERATION.md`، سجلات الفشل الحالية.

## المهام
Pin latest SHA؛ حساب delta؛ تجديد الجرد والمواضع؛ تشغيل baseline دون تعديل؛ تصنيف الفشل الحقيقي مقابل ضجيج الحراس.

## المخرجات
Baseline report، delta inventory، P0/P1 محدثة، blockers.

## الاعتماديات
لا شيء.

## معايير القبول
كل دليل يحمل SHA/command/exit code؛ صفر مسار مفقود غير مصنف؛ لا تغيير منتج.

## فحوص الإغلاق
`git status`, `rev-parse`, workflow-to-SHA mapping، reconciliation للأعداد والمسارات.
