# 03 — التصميم المستهدف

## الملكية والعقود

1. OpenAPI index المركزي هو authority للHTTP contracts.
2. Generated types/clients هي الوسيط الوحيد للطلب والاستجابة والحالة.
3. Domain models وView models مسموحة إذا لم تعيد تعريف contract authority.
4. DB constraints والمهاجرات تثبت invariants والملكية.
5. WLT يملك الحقيقة المالية؛ DSH يملك facade والreferences فقط.

## الحدود

- كل endpoint حساس مرتبط permission وownership/scope واختبار سلبي.
- كل mutation مالية مسجلة operation-level، لا directory marker.
- لا direct WLT access من surface.
- لا cross-service internal import غير معلن.
- لا fallback إلى ports/URLs قديمة.

## Runtime

- Bootstrap idempotent: create/replay/conflict/readback/compensation.
- readiness تفصل healthy/degraded/not-ready.
- الأخطاء تحتوي correlation ID وسببًا آمنًا في logs/artifacts دون PII.
- legacy routes لها owner وtelemetry وdeadline وremoval trigger.

## Frontend متعدد الأسطح

مصفوفة موحدة `capability × surface × route/screen × action × permission × operationId × state × test`، وتشمل loading/ready/empty/error/forbidden/stale/conflict/unknown-result/offline.

## Toolchain وCI

- Compiler CLI وCompiler API صريحان.
- Generated clients عبر Nx target صريح، لا postinstall شامل.
- PR synchronize يستخدم previous head→new head للفحوص affected، والفحص الشامل يدوي/merge-readiness/scheduled.
- Gitleaks incremental للPR وfull-history scheduled/manual.
- Capability Registry آلي صغير بدل Journey Gate.

## نظافة المستودع

- Config واحد لكل أداة ما لم توجد ضرورة مثبتة.
- لا one-off scripts في `tools` بعد انتهاء الترحيل.
- لا `.gitkeep` في مجلد مأهول.
- لا backup/archive/compatibility entrypoint داخل المسارات الحية؛ Git history للاستعادة.
