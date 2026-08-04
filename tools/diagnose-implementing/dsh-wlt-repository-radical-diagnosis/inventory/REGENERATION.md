# إعادة توليد الجرد قبل التنفيذ

## أوامر المصدر

```powershell
$Expected = '<PINNED_SHA>'
if ((git rev-parse HEAD).Trim() -ne $Expected) { throw 'SHA mismatch' }
if (git status --porcelain) { throw 'Dirty worktree' }

git ls-files > tracked-files.txt
git grep -n -I -E 'legacy|compat|obsolete|deprecated|temporary|workaround|TODO|FIXME|journey|CONTRACT_ONLY' > suspicious-markers.txt
git grep -n -I -E 'run-journey-gate|check-smsm-journey-coverage|guard:journey|journey_scope' > journey-references.txt
git grep -n -I -E '\.wlt-mutation-approved|wlt-mutation-approved' > wlt-bypass-references.txt
git grep -n -I -E 'platform_operational_policy_compat|legacy_contract_compat_routes|unified_handler_aliases' > compatibility-references.txt
pnpm exec nx graph --file=nx-graph.json
pnpm exec knip
pnpm exec knip --config knip.strict.json
```

## استخراج إضافي إلزامي

- Hash/size/line count لكل `git ls-files`.
- exact duplicate groups مع استثناء الملفات الصفرية.
- TS/JS static import edges وGo imports.
- package.json dependencies لكل workspace.
- HTTP method/path/handler registrations.
- Next pages/routes لكل surfaces.
- OpenAPI path/operationId/schema/client consumer matrix.
- DB migration manifest/fresh/upgrade/replay matrix.

## Fail-closed

أي SHA مختلف، worktree متسخ، ملف غير موجود، أمر غير متاح، أو parse غير مكتمل يسجل blocker ولا يسمح بتطبيق قرار حذف. ناتج الجرد Evidence مشتق وليس مصدر حقيقة بديل.
