# 01 — مصفوفة تشخيص المستودع كاملة

## 1. منهج الجرد بعد الموافقة

سيُفحص كل ملف ومجلد على `validclean` وفق سجل قرار موحد، لا وفق العمر أو الاسم أو الانطباع:

```yaml
path:
kind: source | contract | migration | generated | test | runtime | governance | tooling | documentation | asset
owner:
truth_class: CANONICAL | GENERATED | READ_ONLY_PROJECTION | ADAPTER | EPHEMERAL | EXTERNAL | LEGACY | UNKNOWN
runtime_consumer:
build_consumer:
human_consumer:
validator:
duplicate_of:
security_impact:
financial_impact:
tenant_scope:
replacement:
decision: KEEP_ACTIVE | REPAIR_FOUNDATION | MERGE_TO_OWNER | MOVE_TO_OWNER | REGENERATE | REPLACE_THEN_DELETE | DELETE_PROVEN_DEAD | BLOCKED
evidence:
verification:
```

لا يُحذف أي مسار `UNKNOWN` حتى يتحول إلى قرار مثبت. ولا يُحتفظ بأي ملف دائم بلا مالك أو مستهلك أو سبب بقاء.

## 2. مصفوفة المجالات والمجلدات

| النطاق | التشخيص المطلوب | الأخطار المرجحة | الحقيقة النهائية المطلوبة | بوابة الإغلاق |
|---|---|---|---|---|
| جذر المستودع | فحص الملفات الرئيسية والفهارس والإعدادات والنسخ المكررة | فهرسان OpenAPI، تعليمات متعارضة، ملفات انتقالية | جذر رقيق يحيل إلى مالك واحد لكل موضوع | صفر سلطات جذرية مكررة |
| `apps/` | فحص كل تطبيق ومساراته وRuntime واختباراته وإعداداته الأصلية | منطق أعمال محلي، fetch مباشر، شاشات يتيمة، نجاح وهمي | التطبيقات طبقة تركيب وعرض مرتبطة بالعقل المشترك | صفر raw API وواجهات غير مربوطة |
| `core/identity/` | Actors، المصادقة، التفعيل، الجلسات، الأجهزة، الأدوار والصلاحيات | رمز شامل، Tenant fallback، خرائط surface مكررة، Bootstrap متسرب | Identity مالك وحيد للهوية والوصول | اختبارات سلبية مباشرة وRuntime readback |
| `core/workforce/` | الملفات المهنية والتكليفات والجاهزية والهيكل الإداري | خلط الهوية بالموظف، عقود متوازية، حالات محلية | Workforce مالك وحيد للملف الوظيفي والمهني | عقد واحد + DB constraints + ربط Identity |
| `core/platform-control/` | السياسات السيادية والتغييرات الحساسة وRollout | تحوله إلى مخزن عام للوحة التحكم أو تكرار سياسات الخدمات | Control Plane محدود وواضح | منع عمليات المجال العادية داخله |
| `core/providers/` | تعريف المزودين والصحة والإعدادات ومراجع الأسرار | كشف أسرار، ملكية متداخلة، إعدادات محلية داخل الخدمات | Provider registry واحد مع مراجع أسرار فقط | فحوص أسرار وصحة وتفويض خدمة-إلى-خدمة |
| `services/dsh/` | المتاجر والكتالوج والسلة والطلب والتنفيذ والتوصيل والدعم | عقود كثيرة متوازية، Legacy routes، حقيقة مالية خارج WLT، منطق سطح محلي | DSH أوركسترا التشغيل ومالك حقيقة الطلب والتنفيذ | Route-contract-client-surface parity |
| `services/wlt/` | المحافظ والدفتر والمدفوعات والعمولات والتسويات والاستردادات | عميل يدوي، Registry تقاعد، schemas عامة، قوائم حارس مكررة | WLT مالك مالي وحيد ودفتر ذري | Invariants مالية + Idempotency + reconciliation |
| `services/* الأخرى` | إثبات الحاجة والمالك وحدود كل خدمة | مجلدات فارغة، أسماء مجالات غير مفعلة، حقائق مكررة | خدمة فقط عند وجود مسؤولية وRuntime وعقد وبيانات | حذف المجلد غير المفعّل أو تسجيله مؤجلًا بوضوح |
| `contracts/` | الفهرس المركزي والـschemas المشتركة | Root يعرف تفاصيل Modules أو يكرر عقود الخدمات | Master index واحد يسجل service entries فقط | Master uniqueness guard |
| قواعد البيانات | Migrations، indexes، seeds، scripts، tests | تعديل تاريخي، أرقام مكررة، إصلاح بعد الكتابة، Seeds كحقيقة | Ledger ترحيلات حاكم، قيود وفهارس مملوكة | fresh/old/replay/failure tests |
| `frontend/shared` | Controllers، adapters، view models، error mapping | Shared يتحول إلى مخزن عشوائي أو يكرر أنواعًا مولدة | عقل مشترك لكل مجال، والأسطح رقيقة | import/binding/consumer checks |
| `infra/` | Docker، Compose، شبكات، تخزين، محاكيات، readiness | حذف أساس مفيد، Retry يخفي الخلل، ملفات فارغة غير مفسرة | Runtime موحد قابل للتشغيل من بيئة نظيفة | health/readiness/smoke/recovery |
| `tools/` | scripts، generators، diagnostics، manifests | أوامر aliases، scripts غير مستهلكة، أدوات تعدّل الحقيقة | أدوات قليلة ذات عقود واضحة ومخرجات حتمية | command registry + dead-script scan |
| `tools/guards/` | مصدر بيانات كل حارس وما يثبته | Guard يكرر الحقيقة أو يختبر صياغة/ترقيع | الحارس يقرأ المصدر الحاكم ولا يمتلك نسخة منه | mutation tests للحراس الحرجة |
| `governance/` | السلطة والمفردات والمنتج وSaaS والحراس والسجلات | تضخم، Status متعارض، ملفات تاريخية نشطة، مراجع مكسورة | طبقة صغيرة مقروءة آليًا ذات أسبقية واحدة | governance gates على SHA نفسه |
| `.agents/` | adapters، skills، registries، authority boundaries | مهارات مكررة، Adapter سميك، صلاحيات غير واضحة | Skills رقيقة مسجلة، بلا سلطة موازية | registry parity + frontmatter validation |
| `.github/` | Workflows، CODEOWNERS، permissions، action pins | تكرار workflows، صلاحيات واسعة، نتائج من SHA مختلف | CI تحقق فقط، fail-closed، same-SHA | workflow lint/security/pins |
| `docs/` | تشغيل حي، ADRs، إرشادات المستخدم والمطور | تقارير تاريخية وضجيج وروابط مطلقة | وثائق تشغيلية مستهلكة فقط | link check + owner + retirement condition |
| الاختبارات | تصنيف كل اختبار بحسب السلوك الذي يحميه | حذف الحماية باسم التنظيف أو اختبار Patch قديم | اختبارات Capability وSecurity وFinance وMigration وRuntime | coverage by invariant لا بعدد الملفات |
| generated/evidence | فحص قابلية إعادة التوليد والاستهلاك | ملفات مولدة معدلة يدويًا أو أدلة تاريخية ملتزمة | Generated حتمي أو CI artifact، لا حقيقة ثانية | delete-regenerate-diff |

## 3. ترتيب الخطورة

### P0 — يمنع أي إعادة هيكلة واسعة

- مصادقة أو جلسة أو رمز ثابت أو باب خلفي.
- Tenant أو Actor أو Permission غير موثوق.
- مصدران قابلان للكتابة للحقيقة نفسها.
- دفتر أو رصيد أو عمولة خارج WLT.
- Migration مدمرة أو غير قابلة للاستعادة.
- عقد رئيسي مكرر أو عميل مولد يدويًا.
- حذف حماية أمنية أو مالية دون بديل.

### P1 — يسبب انحرافًا مستمرًا

- Legacy runtime حي بلا تاريخ إزالة.
- Registry يكرر Router أو OpenAPI أو package scripts.
- منطق أعمال داخل Surface أو BFF.
- Runtime restart أو fallback يخفي جاهزية خاطئة.
- Governance references إلى ملفات غير موجودة.
- اختبارات تحفظ Patch بدل القاعدة.

### P2 — ضجيج وتعقيد وتكلفة صيانة

- Aliases غير المبررة.
- ملفات فارغة أو مجلدات مؤجلة بلا بيان.
- تقارير وEvidence قابلة لإعادة التوليد.
- Docs قديمة أو روابط مطلقة.
- أسماء رحلات تاريخية داخل أسماء كود دائم.
- Adapters وtypes وschemas متكررة.

## 4. ناتج الجرد الإلزامي

بعد الموافقة، لا يبدأ الحذف مباشرة. أول ناتج تنفيذي سيكون ملفًا مولدًا مؤقتًا خارج Git أو CI artifact يحتوي قرار كل مسار. تُلتزم في Git فقط القواعد الدائمة أو التغييرات الفعلية، لا سجل فحص ضخم دائم.

الإحصاءات المطلوبة قبل أول حذف:

```yaml
total_paths:
canonical_sources:
generated_derivatives:
read_only_projections:
active_adapters:
legacy_candidates:
duplicate_candidates:
unknown_ownership:
security_protected:
financial_protected:
migration_protected:
runtime_protected:
```

شرط الانتقال: `unknown_ownership = 0` داخل الدفعة المراد تعديلها، وليس بالضرورة على المستودع كله قبل أي إصلاح P0 محدود.