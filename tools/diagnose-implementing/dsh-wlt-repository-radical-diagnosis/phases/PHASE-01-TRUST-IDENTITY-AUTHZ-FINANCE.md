# PHASE 01 — الثقة والهوية والصلاحيات والسيادة المالية

## النطاق
Identity/Workforce sessions وroles/scopes، DSH auth، WLT ledger/payment/settlement، DSH↔WLT adapters، surfaces gates.

## المدخلات
PHASE-00، OpenAPI، DB constraints، negative tests.

## المهام
actor-permission matrix؛ session lifecycle؛ financial ownership map؛ operation allowlist؛ direct-WLT rejection؛ Workforce 500 diagnosis؛ idempotency/compensation/unknown-result.

## المخرجات
Trust map، authorization matrix، financial boundary decisions.

## الاعتماديات
PHASE-00 مغلقة.

## معايير القبول
لا endpoint حساس بلا permission/ownership؛ لا حقيقة مالية خارج WLT؛ كل mutation لها audit/idempotency واختبارات سلبية.

## فحوص الإغلاق
Identity/Workforce integration، DSH/WLT negative contracts، runtime session smoke، DB invariants.
