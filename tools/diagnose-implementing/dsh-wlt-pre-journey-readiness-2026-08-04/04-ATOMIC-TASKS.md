# 04 — قائمة المهام الذرية

> يعاد استخراج أرقام الأسطر على SHA التنفيذ. يمنع تنفيذ أرقام أسطر تاريخية.

## T-000 — Freeze

```powershell
git fetch origin smsm --prune
$Sha = (git rev-parse refs/remotes/origin/smsm).Trim()
if (git status --porcelain) { throw 'Dirty worktree' }
$Sha
```

**النتيجة:** SHA مثبت وسجل وقت/فاعل/فرع. **الفشل:** أي تحرك يعيد التثبيت.

## T-001 — حسم base branch

- قارن repository metadata، refs، branch protection، ملفات authority، PR targets، scripts.
- اختر المرجع بمصدر سلطة صريح، لا بالانتشار النصي.
- حدّث لاحقًا كل ملفات السلطة في Commit مستقل.

**القبول:** صفر `main/master` ambiguity داخل execution path.

## T-002 — جرد الشجرة

```powershell
git ls-files -z | Set-Content -Encoding Byte tracked-files.bin
git grep -n -I -E 'TODO|FIXME|legacy|compat|deprecated|obsolete|CONTRACT_ONLY|temporary|workaround'
git grep -n -I -E 'services/(dsh|wlt)|contracts/openapi|smsm-dsh-wlt-journeys'
pnpm list -r --depth 0
pnpm why better-sqlite3
pnpm why prisma
pnpm exec nx graph --file=nx-graph.json
```

استخرج hash/size/line count/duplicate groups/import edges/runtime entrypoints/package scripts/workflow refs لكل ملف.

## T-003 — إعادة بناء Baseline CI

- احصل على workflow runs/statuses/jobs/artifacts لنفس SHA.
- شغّل الأوامر الحاكمة محليًا بنفس Node/pnpm/env.
- صنّف: product failure / test defect / tool defect / missing evidence.

## T-004 — إعادة إنتاج DSH seed-twice

```powershell
pnpm dsh:db:contract:test
pnpm dsh:db:write-census:ci
pnpm dsh:db:legacy:scan
```

اجمع stderr، seed filename/order، SQLSTATE، constraint، DB diff بعد run1/run2. أصلح السبب في أصغر طبقة حاكمة. لا تضف `ON CONFLICT DO NOTHING` عشوائيًا إن كان يخفي اختلاف بيانات.

**القبول:** fresh + migrate + seed1 + seed2 + readback + contract كلها صفر.

## T-005 — فحص DSH package authority

- حدد owner الحقيقي لـbuild/test/lint/start.
- استبدل `noop.js`/lint placeholder فقط إذا ثبت أنها entrypoints حية أو مضللة.
- اربط package scripts بأوامر حقيقية أو وثق أن الحزمة aggregate غير تشغيلية.

## T-006 — Trust matrix

- استخرج كل endpoint حساس وactor/surface/permission/ownership.
- اختبر missing/expired/revoked/wrong-role/wrong-scope/cross-owner.
- أثبت TOTP enable/verify/recovery والدليل التشغيلي.

## T-007 — Contract matrix

- اربط كل method/path بـoperationId/schema/handler/generated client/consumer.
- صنّف manual types: domain/view/duplicate transport authority.
- رحّل المستهلكين قبل حذف النوع اليدوي.

## T-008 — DB ownership matrix

- جرد schema/migrations/seeds/indexes/scripts/tests لكل خدمة.
- اكشف legacy sqlite/drizzle/better-sqlite/direct Prisma paths.
- أثبت fresh/upgrade/replay/data preservation/concurrency.

## T-009 — Financial sovereignty

- جرد ledger/payment/settlement/reconciliation/status/receipt في DSH وWLT والأسطح.
- استبدل directory-wide bypass بقائمة operation-level.
- اختبر direct-WLT denial، idempotency، duplicate/retry/timeout/unknown-result/reconciliation.

## T-010 — Runtime and events

- route→service→repository→event/outbox→consumer map.
- readiness states: HEALTHY/DEGRADED/NOT_READY.
- failure injection للـDB/WLT/provider/network/retry.
- correlation IDs وredacted logs/artifacts.

## T-011 — Multi-surface inventory

- لكل control-panel/client/partner/captain/field: route/screen/tab/control/action/state/API/permission/test.
- اكشف mocks، local authorities، hardcoded statuses، fallback URLs، orphan navigation.
- أثبت loading/empty/error/forbidden/stale/conflict/unknown/offline/RTL/accessibility.

## T-012 — Journey registry rebind

- لا تنفذ J001..J107 من bindings القديمة.
- أعد توليد registry/order/checksums من SHA الحالي بعد FOUNDATION.
- حافظ على المعنى الفريد ومعايير القبول؛ لا تحذف منظومة الرحلات قبل semantic harvest وقرار حاكم.

## T-013 — Retirement register

لكل مرشح سجل: `path, owner, references, runtime entrypoints, unique data/contract, replacement, migration, tests, rollback, evidence_sha, decision`.

## T-014 — Closure commands

```powershell
pnpm dsh:doctor
pnpm smoke:dsh
pnpm wlt:typecheck
pnpm wlt:test
pnpm wlt:guard:strict
pnpm wlt:release:guard
pnpm wlt:gate:closure
pnpm dsh:wlt:guard
pnpm dsh:wlt:closure
```

ثم journey validators/release gate بعد إعادة ربطها. أي أمر غير موجود أو متغير يسجل blocker ويصحح في الجرد، ولا يستبدل بصمت.