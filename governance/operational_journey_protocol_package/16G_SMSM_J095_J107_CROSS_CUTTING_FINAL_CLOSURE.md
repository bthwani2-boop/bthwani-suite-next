# 16G — الرحلات J095..J107: الموثوقية والأمن والتشغيل والإغلاق النهائي

> جزء إلزامي من الخطة الرئيسية. هذه الرحلات عرضية وتطبق على كل الرحلات التي تتأثر بها، ولا تستخدم كبديل عن إغلاق رحلة المجال نفسها.

## J095 — Idempotency وCorrelation وUnknown Result

- **الهدف:** ضمان تنفيذ كل mutation الحساسة مرة واحدة منطقيًا وإمكانية استعادة نتيجتها.
- **النطاق:** idempotency key، payload hash، result store، correlation/causation IDs، status lookup، expiry/retention.
- **المالكون:** كل مجال يطبقها على عملياته؛ shared contract يحدد الشكل ولا يملك الحقيقة.
- **الأسطح:** منع duplicate submit وإظهار pending/unknown/retry-safe بكل التطبيقات وControl Panel.
- **الاختبارات:** same key same payload، different payload conflict، timeout after commit، concurrent duplicate، expired key.
- **معيار الإغلاق:** duplicate persisted effects صفر؛ كل mutation المصنفة حساسة تملك lookup؛ correlation gaps صفر؛ UI لا يعيد الإرسال أعمى.

## J096 — التفويض الذري وTOCTOU وهوية الخدمات

- **الهدف:** منع تغيير الملكية أو الرصيد أو الحالة بين فحص الصلاحية والكتابة.
- **النطاق:** transaction locks/version checks، service identity scopes، actor delegation، ownership predicates.
- **الأسطح:** لا تحمل service credentials؛ DSH facade يفرض actor/object context.
- **الاختبارات:** concurrent revoke، ownership transfer، stale version، forged service headers، replayed delegation.
- **معيار الإغلاق:** authorization+write atomic حيث يلزم؛ TOCTOU tests PASS؛ overprivileged service identities صفر؛ client identifiers لا تمنح سلطة.

## J097 — Events وOutbox وInbox وReplay

- **الهدف:** نشر الأحداث داخل transaction واستهلاكها idempotently مع lineage.
- **النطاق:** event schema/version، producer outbox، consumer inbox، ordering key، retry، replay، poison handling.
- **المالكون:** المجال المنتج يملك الحدث؛ المستهلك يملك أثره المحلي.
- **الاختبارات:** duplicate/out-of-order/missing event، crash before/after ack، schema evolution، replay range.
- **معيار الإغلاق:** DB write without required outbox صفر؛ duplicate consumer effects صفر؛ replay يعيد projection دون فساد؛ unowned events صفر.

## J098 — Jobs وQueues وRetry وDead Letters

- **الهدف:** تشغيل الأعمال المؤجلة مع lease/heartbeat/retry/backoff/visibility وDLQ.
- **النطاق:** job identity، schedule، timeout، cancellation، deduplication، poison payload، operator replay.
- **الأسطح:** Control Panel operational visibility/actions؛ لا زر replay دون permission/confirmation/audit.
- **الاختبارات:** worker crash، duplicate lease، clock drift، retry exhaustion، malformed job، queue unavailable.
- **معيار الإغلاق:** lost/stuck jobs صفر ضمن SLA؛ duplicate side effects صفر؛ DLQ owned/actionable؛ replay/audit/runtime proof PASS.

## J099 — Cache وSearch وInvalidation

- **الهدف:** جعل cache/search مشتقات آمنة لا مصادر حقيقة.
- **النطاق:** key scope/version، TTL، invalidation events، stampede protection، index rebuild، freshness metadata.
- **الاختبارات:** cross-partner cache bleed، stale permission، missing invalidation، rebuild أثناء traffic، cache outage.
- **معيار الإغلاق:** writable truth in cache/search صفر؛ scoped keys PASS؛ rebuild/reconciliation proof؛ stale behavior واضح وفشل آمن.

## J100 — دورة حياة الوسائط والملفات

- **الهدف:** توحيد upload/scan/ownership/link/read/delete/retention لكل catalog/HR/PoD/support media.
- **المالك:** Media للملف والmetadata؛ المجالات للروابط والغرض.
- **النطاق:** presigned upload، MIME/size/hash، malware scan، quarantine، short-lived read URL، orphan cleanup.
- **الاختبارات:** path traversal، MIME spoof، oversized/bomb، unauthorized read، deleted owner، interrupted upload.
- **معيار الإغلاق:** raw public objects صفر؛ unscanned active media صفر؛ orphan files/links صفر؛ retention/deletion/restore tests PASS.

## J101 — Offline وإعادة الاتصال والتعارض

- **الهدف:** تعريف ما يمكن قراءته أو صفّه offline وكيف يحل التعارض عند reconnect.
- **النطاق:** local queue schema، encryption، expiry، ordering، deduplication، conflict UI، server readback.
- **الأسطح:** app-client cart، app-field visits، app-captain execution/COD، app-partner inventory حسب المخاطر.
- **الاختبارات:** long offline، revoked permission، changed assignment/state، duplicate reconnect، device clock skew.
- **معيار الإغلاق:** unsupported offline writes صفر؛ stale privileged action rejected؛ queue replay idempotent؛ conflict/unknown-result UI مكتمل.

## J102 — Observability والتدقيق والتشخيص

- **الهدف:** ربط logs/metrics/traces/audit بالرحلة والactor/service/object/correlation دون تسريب.
- **النطاق:** structured logs، trace propagation، SLI/SLO، dashboards، alerts، audit immutability، diagnostic access.
- **الاختبارات:** missing trace context، PII/secret scan، alert failure، high cardinality، audit tampering.
- **معيار الإغلاق:** critical flows traceable end-to-end؛ PII/secrets in telemetry صفر؛ alerts/runtime evidence PASS؛ audit records غير قابلة للتعديل الصامت.

## J103 — الأمن والخصوصية والحماية السلبية

- **الهدف:** إغلاق authn/authz/IDOR/injection/SSRF/file abuse/secrets/PII والحدود الشبكية.
- **النطاق:** threat model لكل رحلة، input/output validation، rate limits، encryption، secret rotation، retention/consent/deletion.
- **الاختبارات:** auth bypass، cross-scope IDOR، SQL/command/template injection، SSRF، path traversal، replay، brute force.
- **معيار الإغلاق:** P0/P1 vulnerabilities صفر؛ negative matrix PASS؛ secrets in repo/logs/responses صفر؛ privacy requests قابلة للتنفيذ والتدقيق.

## J104 — Runtime وDocker والمداخل وBFF والبناء المحمول

- **الهدف:** تشغيل المنظومة الفعلية بكل profiles والمداخل والـBFF والبناء المحمول.
- **النطاق:** compose profiles، ports، dependency order، health/readiness، migrations/seeds، Metro/Expo/EAS/Next/BFF، graceful shutdown.
- **الأسطح:** جميع runtime shells وخدمات Identity/Workforce/DSH/WLT/Providers/Media/Notifications.
- **الاختبارات:** cold start، restart، dependency loss/recovery، config missing، port collision، mobile export، deep links.
- **معيار الإغلاق:** required profiles smoke PASS؛ hidden local dependency صفر؛ entrypoints/deep links/BFF/session PASS؛ production claim يحتاج تفويض مستقل.

## J105 — الوصولية وRTL والترجمة والأداء والاعتمادية

- **الهدف:** جعل كل سطح صالحًا للعربية/RTL ولوحات المفاتيح وقارئات الشاشة والأجهزة والشبكات الضعيفة.
- **النطاق:** accessibility names/roles/focus، contrast، dynamic text، RTL mirroring، locale/currency/date، pagination/virtualization.
- **الاختبارات:** keyboard/screen reader، large text، RTL navigation، slow network، low-memory، repeated actions، performance budgets.
- **معيار الإغلاق:** controls بلا accessible name صفر؛ untranslated user strings صفر؛ critical UX budgets PASS؛ loading/error/retry لا تحجب المستخدم.

## J106 — النسخ والاستعادة والاحتفاظ والتصدير والتوافق والإصدار

- **الهدف:** إثبات استعادة البيانات والتوافق والترحيل والتصدير والعودة الآمنة.
- **النطاق:** DB backups، restore drills، RPO/RTO، retention، legal holds، exports، backward/forward contract compatibility، rollback.
- **الاختبارات:** fresh restore، point-in-time عند الانطباق، corrupted backup، old client/new API، migration rollback/forward fix.
- **معيار الإغلاق:** restore verified لا backup existence فقط؛ RPO/RTO measured؛ export authorization/redaction؛ compatibility matrix PASS؛ release authorization منفصلة.

## J107 — الحوكمة وCI والأدلة والتنظيف والإغلاق النهائي

- **الهدف:** إثبات أن كل رحلة وسطح وعنصر مغطى ومغلق على SHA واحد دون بقايا أو ادعاء زائد.
- **النطاق:** authority/registries/workflows/guards، coverage counters، journey evidence، diff review، legacy deletion، approvals.
- **التنظيف:** إزالة duplicate contracts/types/routes/handlers/tables/files/mocks/fixtures/fallbacks/plans المتنافسة بعد ترحيل المستهلكين.
- **التحقق:** targeted suites ثم integrated runtime، head-SHA evidence، merge compatibility منفصل، read-only final verification.
- **الموانع:** لا Merge/Release/Production دون تفويض؛ لا تسجيل check غير منفذ كـPASS؛ لا صفر لعداد غير مقاس.
- **معيار الإغلاق:** 107 رحلة مغلقة أو مستبعدة فقط وفق Product Truth (مع بقاء العدد المسجل 107)؛ جميع عدادات الصفر =0؛ required checks/approvals PASS؛ remaining unproven items=0.

## بوابة إغلاق المجموعة J095..J107

```yaml
idempotency_and_unknown_result: PASS
atomic_authorization_and_service_identity: PASS
events_jobs_replay_dlq: PASS
cache_search_are_derived_only: PASS
media_lifecycle: PASS
offline_conflict_recovery: PASS
observability_audit: PASS
security_privacy: PASS
runtime_all_required_profiles: PASS
accessibility_rtl_performance: PASS
backup_restore_compatibility: PASS
governance_ci_evidence_cleanup: PASS
open_journeys_in_group: 0
failed_required_checks: 0
unproven_required_items: 0
evidence_sha: FINAL_SHA
```
