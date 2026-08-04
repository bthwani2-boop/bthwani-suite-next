# PHASE 05 — التجربة متعددة الأسطح

## النطاق
Control panel وclient/partner/captain/field: routes/screens/navigation/actions/states/offline/accessibility.

## المدخلات
PHASE-04 clients، PHASE-01 permission matrix.

## المهام
Capability-surface matrix؛ فحص كل page/tab/control؛ إزالة mocks/local authorities؛ unknown-result/reconciliation UX؛ deep links/session restore/offline؛ accessibility/RTL؛ تنظيف placeholders/assets بعد الاستبدال.

## المخرجات
Acceptance matrix، missing-state backlog، manual scripts وأدلة التشغيل.

## الاعتماديات
PHASE-04 مغلقة.

## معايير القبول
كل action له permission/API/result؛ كل الحالات السلبية قابلة للاسترداد؛ builds وقبول يدوي للأسطح الخمسة.

## فحوص الإغلاق
Web/mobile builds، E2E/manual، accessibility، generated-schema mocks، multi-surface runtime smoke.
