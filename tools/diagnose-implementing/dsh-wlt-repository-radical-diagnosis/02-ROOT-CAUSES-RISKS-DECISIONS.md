# 02 — الأسباب الجذرية والمخاطر والقرارات

## RC-01 — حوكمة الرحلات تحولت إلى منتج موازٍ

**الدليل:** 107 ملفات، Journey Gate، package commands، CI job، router، registries، infra integration، وملفات متعددة تدعي السلطة.

**الأثر:** زمن CI وسياق مرتفعان، فشل غير تشخيصي، مصادر حقيقة متوازية، وربط صحة الكود بشكل وثائق ثابتة.

**القرار:** إزالة المنظومة كوحدة ذرية بعد حصاد أي معنى فريد إلى Capability Registry + Product Truth + Acceptance Matrix. لا تحذف الاختبارات السلوكية لمجرد أن أسماءها Journey؛ انقلها أو أعد تسميتها.

## RC-02 — Toolchain TypeScript غير صريح

**الدليل:** TS7 كافتراضي، TS6 bridge، pnpm patch، وأدوات تعتمد Compiler API بطرق مختلفة؛ CI يعرض `ts.ScriptTarget.Latest`/Next availability failures.

**القرار:** اسم وأمر صريحان للCLI، package صريح للCompiler API، اختبار namespace، ثم حذف scripts الانتقالية بعد استخراج assertions الدائمة.

## RC-03 — Runtime يخفي السبب الداخلي

**الدليل:** readiness لجميع الخدمات ثم Workforce create field يعيد generic 500؛ artifact لا يجمع log السبب.

**القرار:** إعادة إنتاج fresh DB، correlation ID، log مفلتر بلا PII، ثم إصلاح source validation/identity/transaction/constraint حسب الدليل. يمنع patch في mobile bootstrap يخفي الخطأ.

## RC-04 — bypass مالي واسع

**الدليل:** وجود marker واحد يعطل mutation guard لكل subtree.

**القرار:** allowlist دقيقة تحتوي file/method/DSH endpoint/OpenAPI operationId/rationale/tests، ثم حذف marker.

## RC-05 — تراكم Compatibility وAliases

**الدليل:** `platform_operational_policy_compat.go`, `legacy_contract_compat_routes.go`, `unified_handler_aliases.go` وتسجيلات ما زالت حية.

**القرار:** telemetry + consumer migration + deprecation evidence، نقل المنطق الحقيقي، ثم حذف wrappers؛ لا طبقة توافق جديدة فوق القديمة.

## RC-06 — Config/Tool authority مزدوجة

**الدليل:** ملفا Next، generated side effects في postinstall، workflows مرحلة Foundation، scripts one-off، Knip ignores قديمة.

**القرار:** إثبات السلطة المحملة فعليًا، بديل صريح واختبارات، ثم تقارب إلى ملف/هدف واحد.

## RC-07 — ملفات ضجيج ونسخ متطابقة

**الدليل:** 47 ملفات صفرية، 35 populated `.gitkeep`، 25 duplicate groups، mobile templates/assets مكررة.

**القرار:** حذف placeholders المأهولة مباشرة ضمن دفعات نطاقية، أما configs/assets فتُولد أو تُملك مركزيًا بعد إثبات متطلبات Expo/Next.

## مخاطر التنفيذ

- حذف عقد أو migration تاريخية يؤدي إلى فقدان upgrade path.
- دمج helpers في موضع خاطئ ينشئ reverse dependency بين DSH وWLT.
- إزالة legacy routes دون telemetry تكسر مستهلكًا خارجيًا.
- تغيير TypeScript مع تنظيف واسع يحجب السبب الحقيقي.
- حذف وثائق canonical متعارضة قبل harvest يفقد قواعد أعمال لم تُنقل.
- تدوير الأسرار لا يُتراجع عنه، ويحتاج فصلًا عن allowlisting false positives.
