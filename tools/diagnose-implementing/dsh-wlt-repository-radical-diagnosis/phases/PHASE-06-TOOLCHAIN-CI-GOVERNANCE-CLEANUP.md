# PHASE 06 — Toolchain وCI والحوكمة والتنظيف

## النطاق
TS/Nx/Next، CI/router، Journey subsystem، governance authorities، one-off scripts، placeholders/duplicates، Knip/workflows.

## المدخلات
إغلاقات PHASE-00..05 وسجل المرشحين.

## المهام
إزالة Journey subsystem؛ تقارب السلطات؛ إصلاح TS CLI/API؛ توحيد Next؛ explicit generation؛ حذف transition scripts بعد استخراج checks؛ populated gitkeep؛ templates/assets؛ workflows/Knip.

## المخرجات
CI graph مبسط، authority map واحد، deletion ledger، toolchain proof.

## الاعتماديات
PHASE-00..05 مغلقة حتى لا يخفي حذف guard فجوة منتج.

## معايير القبول
صفر Journey references/canonical conflicts؛ config واحد؛ صفر populated gitkeep/one-off orphan؛ CI affected fail-closed بأقل نطاق كافٍ.

## فحوص الإغلاق
Actionlint/security، Node/TS builds، Nx affected، Knip strict، grep/reference وstructure tests، cost comparison.
