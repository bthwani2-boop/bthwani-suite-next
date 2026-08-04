# PHASE 02 — العقود والبيانات وقواعد البيانات

## النطاق
OpenAPI indexes/specs، generators/clients، DTO/types، جميع DB migrations/manifests/indexes/seeds/tests.

## المدخلات
PHASE-01 ownership/authorization maps.

## المهام
route-operation-handler-client matrix؛ type classification؛ table/field/event ownership؛ fresh/upgrade/replay؛ constraints/indexes/FKs؛ إزالة العقود اليدوية بعد ترحيل المستهلكين.

## المخرجات
Contract matrix، data ownership matrix، migration proof، deletion/migration ledger.

## الاعتماديات
PHASE-01 مغلقة.

## معايير القبول
صفر contract authority يدوي موازٍ؛ كل route مصنف؛ جميع مسارات DB ناجحة؛ لا حذف migration تاريخية عشوائي.

## فحوص الإغلاق
Spectral/Redocly، generated diff، contract suites، DB suites، schema drift والاختبارات السلبية.
