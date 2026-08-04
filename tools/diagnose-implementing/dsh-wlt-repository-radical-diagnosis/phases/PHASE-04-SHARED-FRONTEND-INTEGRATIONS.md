# PHASE 04 — Shared Frontend والتكاملات

## النطاق
DSH frontend shared، WLT shared/dsh، generated clients، transports، checkout/payment adapters.

## المدخلات
PHASE-02 contracts وPHASE-03 canonical routes.

## المهام
إثبات ownership؛ دمج duplicate transports بلا reverse dependency؛ explicit generation target؛ operationId binding؛ إبقاء view models فقط؛ timeout/retry/abort/error tests؛ حذف القديم بعد zero-import.

## المخرجات
Shared ownership map، canonical exports، generation graph، consumer migration list.

## الاعتماديات
PHASE-02 و03 مغلقتان.

## معايير القبول
Transport واحد لكل حد؛ fresh install صريح؛ صفر forbidden imports؛ typecheck/build لكل المستهلكين.

## فحوص الإغلاق
Nx graph/boundaries، generated drift، TypeScript builds، integration requests، mobile/web smoke.
