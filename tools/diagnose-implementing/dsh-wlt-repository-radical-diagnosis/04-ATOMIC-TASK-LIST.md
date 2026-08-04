# 04 — قائمة المهام الذرية

> يجب إعادة تحديد الأسطر على SHA التنفيذ. الترتيب أدناه إلزامي بحسب الاعتماديات.

## T-001 — تجديد الخط الأساسي

- **الملفات/الأوامر:** `git rev-parse`, `git ls-files`, Nx graph, Go list, OpenAPI index, CI artifacts.
- **التغيير:** لا تغيير منتج؛ تحديث دليل التنفيذ فقط.
- **النتيجة:** delta inventory، مواقع حديثة، failures مصنفة.
- **القبول:** كل دليل يحمل SHA وأمر وexit code.

## T-002 — إصلاح فصل TypeScript CLI/API

- **النطاق:** root/control-panel package manifests، `.pnpmfile.cjs`، mobile verifier، API-binding tools، Next config consumers.
- **التغيير:** اختيار حزمة CLI وحزمة API صريحتين، namespace imports واختبار self-check.
- **التحقق:** Next production build، mobile lint/typecheck للأسطح الأربعة، contract lint، test يثبت `ScriptTarget` وAPI namespace.
- **التراجع:** Revert مستقل مع lockfile.

## T-003 — كشف وإصلاح Workforce 500

- **النطاق:** `apps/mobile/mobile-dev-data.mjs`، Workforce handler/service/repository/migrations، Identity client، runtime artifact collection.
- **التغيير:** لا fallback؛ أضف correlation/logging آمن، أصلح constraint/validation/transaction حسب reproduction.
- **التحقق:** fresh/upgrade/replay DB، create/replay/conflict/readback، runtime full smoke.

## T-004 — تثبيت السيادة المالية

- **النطاق:** `services/wlt/frontend/shared/dsh/.wlt-mutation-approved` وfullstack boundary guard وجميع adapters.
- **التغيير:** operation-level allowlist مرتبطة بـDSH endpoint وOpenAPI operationId؛ ثم حذف marker.
- **التحقق:** رفض أي file/method/path غير مدرج، direct-WLT negative tests، idempotency/reconciliation.

## T-005 — تقارب العقود والأنواع

- **النطاق:** `contracts/openapi/index.yaml`، DSH/WLT specs، generated clients، shared checkout/payment types.
- **التغيير:** ترحيل كل Request/Response/Status authority اليدوية إلى generated types؛ إبقاء View models فقط.
- **التحقق:** generated diff zero، Spectral/Redocly، route-operation-client matrix، typecheck جميع المستهلكين.

## T-006 — قواعد البيانات

- **النطاق:** DSH/WLT/Identity/Workforce/Platform/Providers migrations/manifests/indexes/tests.
- **التغيير:** لا حذف migration عشوائي؛ إصلاح invariants وconstraints/indexes في migration forward-only عند الحاجة.
- **التحقق:** fresh، upgrade من baseline، replay، data preservation، rollback/forward-fix، race/concurrency tests.

## T-007 — Retirement للمسارات القديمة

- **النطاق:** `platform_operational_policy_compat.go`, `legacy_contract_compat_routes.go`, route registrations، OpenAPI/clients/surfaces.
- **التغيير:** ترحيل المستهلكين، deprecation telemetry، ثم حذف aliases/wrappers بعد zero-use proof.
- **التحقق:** route inventory، OpenAPI drift، consumer tests، negative route tests، telemetry window.

## T-008 — تفكيك handler aliases

- **النطاق:** `unified_handler_aliases.go`.
- **التغيير:** نقل المنطق الحقيقي إلى domain files، تحديث bindings، حذف forwarders ثم الملف إن أصبح فارغًا.
- **التحقق:** Go tests، route equivalence، no-reference grep.

## T-009 — توحيد Shared transport

- **النطاق:** DSH `_kernel` URL/request helpers ونسخ WLT.
- **التغيير:** اختيار ownership لا ينشئ reverse dependency؛ package/exports مركزية أو generation.
- **التحقق:** boundary guards، typecheck/build، timeout/retry/abort/error normalization tests.

## T-010 — Generation صريح

- **النطاق:** root `postinstall` و`postinstall-generate-clients.mjs` وNx targets.
- **التغيير:** إنشاء `generated:ensure`/affected target واعتماد build/typecheck عليه، ثم إزالة postinstall side effect.
- **التحقق:** fresh clone install، generate، builds، generated drift.

## T-011 — توحيد Next config

- **النطاق:** `apps/control-panel/runtime/next.config.mjs` و`next.config.ts`.
- **التغيير:** أثبت الملف المحمل فعليًا، ادمج CSP/aliases/Turbopack/transpile settings، احذف الآخر.
- **التحقق:** typegen، typecheck، build، browser CSP/headers، runtime smoke.

## T-012 — إزالة Journey subsystem

- **النطاق:** `run-journey-gate.ps1`, `check-smsm-journey-coverage.mjs`, root package scripts، CI jobs/inputs/outputs، `detect-ci-context.mjs`, registries، infra callers، skills/docs.
- **التغيير:** حصاد المعنى الفريد أولًا، ثم حذف المنظومة في Commit ذري واحد. صحح `gate-build-test.ps1` الذي يمرر `-Soft` غير المدعوم.
- **التحقق:** zero live references، workflow lint/router tests/Nx affected، بقاء الاختبارات السلوكية الضرورية.

## T-013 — تقارب الحوكمة

- **النطاق:** registry 27، `smsm-dsh-wlt-journeys/**`، FOUNDATION/13/16 compatibility entrypoints والسياسات المكررة.
- **التغيير:** Capability Registry + Product Truth + Acceptance Matrix؛ حذف السلطات المتوازية بعد semantic harvest.
- **التحقق:** zero canonical conflict، cross-reference integrity، موافقة Product owner على المعنى المنقول.

## T-014 — إزالة الأدوات الانتقالية

- **النطاق:** TS7 upgrade/fix/finalize/verify scripts، `refactor-wlt-dsh.mjs`، giant prompt تحت tools.
- **التغيير:** استخراج assertions الدائمة، نقل السلطة التوثيقية أو حذف غير المشار إليه، ثم zero-reference deletion.
- **التحقق:** git grep، script registry، readiness tests/build.

## T-015 — تنظيف Workflow/CI

- **النطاق:** Foundation snapshot/git-bundle، Sonar skipped workflow، duplicate push/PR triggers، full-history Gitleaks.
- **التغيير:** حذف/Manualize phase workflows، incremental PR + scheduled full history، تحديث registry.
- **التحقق:** actionlint، permissions/security، cost/run comparison، required checks unchanged intentionally.

## T-016 — تنظيف منخفض المخاطر

- **النطاق:** populated `.gitkeep`، ملفات صفرية غير ذات معنى، `DOCKERFILE_PENDING.md`، stale issue/trace files.
- **التغيير:** حذف بدفعات نطاقية بعد final reference check.
- **التحقق:** repository structure، zero references، builds unaffected.

## T-017 — قوالب وأصول التطبيقات

- **النطاق:** Metro/EAS/start/env/sentry configs والأيقونات المتطابقة.
- **التغيير:** generation أو shared template مع متغيرات app؛ لا symlink غير مدعوم من Expo/EAS.
- **التحقق:** local وremote EAS config، Metro لكل تطبيق، asset resolution.

## T-018 — Knip والاعتماديات

- **النطاق:** unused dependencies وstale ignores/entries.
- **التغيير:** إثبات dynamic/tool usage، ثم حذف أو تصحيح config والlockfile.
- **التحقق:** Knip normal+strict، جميع builds/tools.

## T-019 — اختبارات نص المصدر

- **النطاق:** Identity session-surface، app-client runtime-bootstrap، DSH catalog-runtime وأمثالها.
- **التغيير:** تحويل regex/source-string assertions إلى behavioral/API contracts.
- **التحقق:** الاختبار يفشل على regression سلوكي ويصمد أمام refactor مكافئ.

## T-020 — إغلاق متعدد الأسطح

- **النطاق:** control-panel وapps الأربعة، كل route/page/tab/control/action/state.
- **التغيير:** ربط permission+operationId+state، إزالة mocks/local authorities، unknown-result/offline UX.
- **التحقق:** build/E2E/manual matrix/accessibility/RTL/runtime smoke.
