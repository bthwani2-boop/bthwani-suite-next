# 05 — القبول والتحقق والتراجع

## معايير قبول ما قبل الرحلات

1. base branch authority واحدة ومثبتة.
2. target SHA واحد لكل task/report/CI/runtime evidence.
3. FOUNDATION status `CLOSED` و`journey_execution_allowed: true` على نفس SHA.
4. DSH Database Contract أخضر، بما في ذلك seed مرتين.
5. كل required check منشور ومكتمل؛ لا queued/skipped غير مفسر.
6. كل ملف متتبع داخل النطاق مصنف، وكل عنصر غير مثبت مسجل.
7. صفر direct cross-service DB access.
8. صفر manual Request/Response/Status authority موازية للعقود المولدة.
9. صفر direct WLT access من الأسطح.
10. كل endpoint حساس مرتبط capability دقيقة وownership واختبار سلبي.
11. كل DB متأثرة تنجح fresh/upgrade/replay/preservation.
12. كل surface action مرتبط permission وoperationId وحالة واختبار.
13. لا legacy/compatibility route بلا owner وtelemetry وdeadline وبديل.
14. لا حذف دون zero-use/unique-value/migration/rollback proof.

## حزمة التحقق

### Static/Architecture

- format/lint/typecheck/build للـaffected ثم full.
- Nx graph/boundaries/cycles.
- forbidden imports/paths/generated drift.
- package/workflow/script reference integrity.

### Contracts/Security

- OpenAPI lint/bundle/generated client diff.
- route-operation-handler-client matrix.
- authn/authz/ownership/tenant or scope negative matrix.
- secret scanning incremental؛ full-history منفصل مع disposition.

### Databases

- fresh empty DB.
- upgrade من كل baseline مدعوم.
- migration replay/idempotence.
- seeds twice/readback.
- constraints/FKs/indexes/concurrency/data preservation.
- restore/forward-fix rehearsal عند الحساسية.

### Runtime

- health/readiness لكل الخدمات.
- bootstrap create/replay/conflict/readback.
- WLT operation timeout/duplicate/unknown/reconciliation.
- provider/network failure injection.
- safe structured logs + correlation IDs.

### Surfaces/Journeys

- web/mobile builds.
- E2E + manual matrix للأسطح الخمسة.
- offline/deep-link/session restore.
- loading/empty/error/forbidden/stale/conflict/unknown.
- accessibility/RTL.

## سياسة التراجع

- كل سبب جذري في Commit ذري مستقل.
- لا Force Push.
- code/config: Git revert للCommit الذري.
- migration مطبقة: لا حذف؛ forward-fix + restore plan.
- contract: dual-read/write فقط إذا كان ترحيلًا محدودًا ومؤقتًا ومثبتًا، لا authority دائمة.
- secret rotation: لا رجوع للقيمة القديمة.
- legacy route يعاد مؤقتًا فقط عند مستهلك مثبت مع owner/deadline جديد.

## سجل الدليل الإلزامي

لكل مهمة: `task_id, base_sha, head_sha, files, commands, exit_codes, test_results, runtime_evidence, data_impact, security_impact, rollback, residual_risks, status`.