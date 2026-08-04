# 06 — الموانع والنقاط غير المثبتة

1. السبب الداخلي الدقيق لـWorkforce HTTP 500 غير مثبت لأن service log غير مرفوع.
2. لا توجد production telemetry لإثبات انعدام مستهلكي legacy routes.
3. لا يمكن إثبات صلاحية/إلغاء قيم Gitleaks من الشجرة؛ يلزم فحص secrets وتدوير دون كشف القيم.
4. حالة SonarQube variables/service غير مثبتة؛ workflow كان skipped.
5. لم يتم semantic harvest ملفًا ملفًا لجميع وثائق J001..J107؛ لا حذف جماعي قبل ذلك.
6. قبول Product owner للمعاني المنقولة إلى التصميم البديل مطلوب.
7. بعض نتائج Knip قد تكون dynamic/tool use؛ لا حذف dependency قبل تشغيل المستهلك.
8. Expo/EAS قد يتطلب ملفات مادية مكررة؛ يجب إثبات generation بدل افتراض symlink أو حذف.
9. actual Next config loaded يجب إثباته بالبناء/التشغيل قبل اختيار الملف النهائي.
10. TypeScript 6 bridge لا يحذف قبل إثبات توافق openapi-typescript/Next وجميع compiler API consumers.
11. لم تُشغّل Production ولم تُعدّل بيانات حقيقية.
12. أرقام الأسطر تتحرك؛ يعاد استخراج anchors على SHA التنفيذ.
13. أي حركة جديدة في الفرع بعد هذه الحزمة تستلزم PHASE-00 قبل التنفيذ.

لا يجوز تحويل أي عنصر أعلاه إلى CLOSED بالاستنتاج أو نجاح اختبار غير مباشر.
