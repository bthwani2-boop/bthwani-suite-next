# Global Diagnosis — Field 3

## Baseline and authority

Pinned diagnosis baseline: `bthwani2-boop/bthwani-suite-next@BB bee8e9cfe1762cef39690f0b254fdf0b6855e1a9`. هذه الحزمة مشتقة ولا تنشئ Product Truth أو Policy. `BTHWANI_CHATGPT_GITHUB_EXECUTION_CARD_ONE_PAGE.md` يفرض exact-ref evidence وroot-cause execution، و`01-diagnose-plan-package.md` يفرض أصغر نطاق سببي كامل مع تقييم جميع seeded surfaces دون تحويلها إلى مشاريع مستقلة.

## Current proven changes versus stale assumptions

الحزمة الأقدم `app-field-final-closure` مفيدة كمصدر provenance لكنها لم تعد baseline صالحًا: manifest القديم مثبت على SHA أقدم، وU001 القديم كان يصف `src/__tests__` مفقودًا. التنفيذ الحالي لـ`apps/app-field/runtime/package.json` يشغل `node --test tests/*.test.mjs` ثم runtime-contract، ومجلد `tests/` يحتوي اختبارات deep-link/readiness/offline. لذلك Field 3 لا يعيد بناء بوابة الاختبارات؛ يثبتها على candidate حديث ويغلق ما ينقصها.

المشكلة المشتركة الحالية قبل gates هي فشل `pnpm install --frozen-lockfile` في root postinstall أثناء OpenAPI materialization برسالة `Self-referencing circular pointer`. الإصلاح يجب أن يحدد context/schema/$ref ويزيل السبب من العقد أو composer، لا تعطيل generation.

## Product/root-cause findings in scope

1. Identity/Workforce/session/readiness يجب أن تبقى سلطات منفصلة وواضحة وتفشل مغلقًا عند revocation أو حالة وظيفية غير صالحة.
2. Home/History/Tasks الحالية تحتاج convergence: History لا يصبح حقيقة ثانية، Tasks تمثل عملًا مستقلًا، وكل card يفتح canonical detail واحدة بصلاحية object-level.
3. Control Panel field assignment الحالي مبني على raw Actor ID وWorkforceScopeManager؛ المطلوب business assignment حقيقي أو reuse لمكافئ موجود بعد البحث.
4. Onboarding يحمل خطر حقيقة مزدوجة بين local category/default وCentral Catalog. المطلوب Business Vertical canonical وdraft/publication lifecycle موحد.
5. uploaded لا يساوي verified؛ visit media لا يساوي legal documents؛ document taxonomy يجب أن يكون قابلًا للمراجعة والتدقيق.
6. Partners يحتاج read visibility + contextual collaboration دون silent editing أو chat عام مكرر.
7. Visits/checklists/escalations موجودة أساسًا وتُعامل verification-first، منفصلة عن onboarding assignment.
8. Catalog يبقى مركزيًا؛ publication gate server-authoritative؛ Partner/Client readback يجب أن يحافظ على نفس IDs والحقيقة.
9. Offline v3/legacy/capacity لديه تنفيذ واختبارات؛ المتبقي الأهم unknown-result reconciliation قبل retry.
10. Finance الحالي تحسن: payout request يدعم `FULL_AVAILABLE`/`SPECIFIED` ولا يختار التطبيق destination. المتبقي authority hardening، provisioning، maker/checker، versioning/reconciliation واختبار shared actor contract.
11. Native dependency set واسع. لا حذف متفرق أثناء تطوير المنتج. نجمع أدلة per-app ونجمّد graph ثم ننفذ U014 كنافذة تنظيف واحدة.
12. final closure هو fail-closed: cleanup + hardening + red-team + Android + cross-surface + CI + backend/database/security على أحدث SHA.

## Scope exclusions

Generic Control Panel administration/analytics/dashboard/login/marketing/platform ليست execution scope. Captain custody/COD/order work غير داخل الحزمة. Partner/Client لا يدخلان إلا readback أو shared payout regression المذكور. Repository-wide Sonar/CI failures غير المرتبطة بالميدان لا تُسحب إلى الحزمة؛ أما OpenAPI materialization الحالي فهو in-scope لأنه prerequisite مثبت يمنع field verification نفسها.

## Concurrency and collision zones

قبل كل write batch يعاد حل `BB`. أهم collision zones: generated OpenAPI contracts/clients، Identity/session، DSH schemas/migrations، partner onboarding models، WLT payout contracts، mobile capability manifest/lockfile. ممنوع overwrite لعمل وكيل آخر؛ أي حركة مرتبطة تُدمج semantic ثم يعاد التحقق. fast-forward only، وpush owner واحد لكل batch.

## Closure interpretation

التشخيص والخطة `READY` لا يعنيان أن المنتج مغلق. RESULT يبدأ غير منفذ. لا يتحول القرار النهائي إلا بعد exact-SHA evidence حديث لكل check required وعدم وجود مشكلة معلومة قابلة للتنفيذ داخل النطاق.
