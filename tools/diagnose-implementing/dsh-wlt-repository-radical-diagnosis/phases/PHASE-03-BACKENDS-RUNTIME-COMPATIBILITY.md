# PHASE 03 — Backends وRuntime والتوافق

## النطاق
DSH/WLT/Identity/Workforce/Platform/Providers، handlers/routes، bootstrap، Docker scripts، legacy wrappers.

## المدخلات
PHASE-02 contracts/data matrices وruntime evidence.

## المهام
إعادة Workforce 500؛ structured safe logs؛ إصلاح المصدر؛ نقل real logic من aliases؛ telemetry للمسارات القديمة؛ ترحيل consumers؛ حذف wrappers بعد الإثبات؛ تصحيح scripts stale.

## المخرجات
Runtime cause record، canonical routes، compatibility retirement ledger.

## الاعتماديات
PHASE-02 مغلقة.

## معايير القبول
Bootstrap idempotent؛ جميع readiness/smoke ناجحة؛ لا forwarding/legacy route بلا owner/telemetry/deadline.

## فحوص الإغلاق
Go/race، route/OpenAPI diff، Docker smoke، failure injection، logging redaction.
