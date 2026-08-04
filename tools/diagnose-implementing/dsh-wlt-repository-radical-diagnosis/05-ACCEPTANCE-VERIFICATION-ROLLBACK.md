# 05 — القبول والتحقق والتراجع

## معايير قبول قابلة للقياس

1. صفر Journey Gate live references بعد مرحلة الإزالة.
2. صفر canonical authority conflict داخل نطاق DSH/WLT.
3. صفر request/response/status authority يدوي موازٍ للعقود المولدة.
4. صفر directory-wide financial bypass.
5. config واحد لـNext، وCompiler CLI/API صريحان.
6. صفر populated `.gitkeep` وone-off live tool مثبت داخل النطاق النهائي.
7. كل HTTP route مرتبط operationId/handler/client أو مصنف internal بوضوح.
8. fresh/upgrade/replay لكل DB متأثرة ناجحة مع حفظ البيانات.
9. Runtime bootstrap idempotent وreadiness/smoke ناجحان.
10. كل surface action مرتبط permission وAPI وحالة وtest.
11. لا secret جديد في `base..head`، وكل historical finding له disposition وتدوير عند اللزوم.
12. كل الأدلة النهائية تحمل SHA واحدًا؛ أي نقطة غير مثبتة تبقى OPEN.

## حزمة التحقق

### Static/Node

- format/lint/typecheck/build لكل projects affected ثم full readiness.
- Nx graph/boundary tests.
- Knip normal وstrict.
- generated clients drift.
- Next typegen/build/CSP headers.

### Go/Contracts

- `go test ./...` لكل module متأثر، race حيث يلزم.
- route/OpenAPI/handler/dispatch checks.
- Spectral/Redocly/generated clients.
- negative authz/ownership/direct-WLT tests.

### Database

- fresh database.
- upgrade من baseline مدعوم.
- replay/idempotency.
- constraints/indexes/FKs/data preservation.
- forward-fix/restore rehearsal للمهاجرات الحساسة.

### Runtime/Surfaces

- all services health/readiness.
- bootstrap create/replay/conflict/compensation/readback.
- control-panel + client/partner/captain/field builds.
- manual acceptance للحالات loading/ready/empty/error/forbidden/stale/conflict/unknown/offline.
- accessibility وRTL.

### Security

- Gitleaks incremental وfull-history منفصل.
- CodeQL/security guards.
- logs/artifacts redaction.
- permission and isolation negative matrix.

## سياسة Commit والتراجع

- Commit لكل سبب جذري مترابط، لا لكل ملف ولا دفعة ضخمة مختلطة.
- لا Force Push.
- قبل Push: targeted checks؛ بعده: re-pin وCI evidence.
- ملفات الكود/config ترجع بـRevert للCommit الذري.
- المهاجرات المطبقة لا تُحذف؛ تستخدم forward-fix وخطة restore.
- تدوير الأسرار غير قابل للتراجع إلى القيمة القديمة.
- legacy wrapper يمكن إعادته مؤقتًا فقط عند ظهور مستهلك مثبت، مع deadline جديد.
