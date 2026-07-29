# 01 — مصفوفة تشخيص المستودع كاملة

## 1. حالة الجرد

تم تنفيذ جرد كل الملفات المتتبعة على:

```text
fbc0139234e2bdb34a8de77d74a6b91297a754b0
```

المخرجات الكاملة موجودة في Artifact GitHub، بينما تلتزم الحزمة بالنتائج والقرارات الدائمة فقط.

```yaml
total_paths: 3938
source: 2120
test: 414
database: 403
runtime: 329
tooling: 236
governance: 218
contract: 159
documentation: 34
generated: 25
```

## 2. سجل القرار الموحد

كل مسار يخضع للنموذج:

```yaml
path:
kind: source | contract | migration | generated | test | runtime | governance | tooling | documentation | asset
owner:
truth_class: CANONICAL | GENERATED_DERIVATIVE | READ_ONLY_PROJECTION | ADAPTER | EPHEMERAL | EXTERNAL | LEGACY | UNKNOWN
runtime_consumers: []
build_consumers: []
human_consumers: []
validator:
security_impact:
financial_impact:
migration_impact:
replacement:
decision: KEEP_ACTIVE | REPAIR_FOUNDATION | MERGE_TO_CANONICAL_OWNER | MOVE_TO_OWNER | GENERATE_FROM_CANONICAL_SOURCE | MOVE_TO_BUILD_ARTIFACT | REPLACE_THEN_DELETE | DELETE_PROVEN_DEAD | BLOCKED_PENDING_EVIDENCE
evidence:
verification:
```

لا يُحذف `UNKNOWN`، ولا يبقى ملف دائم بلا مالك أو مستهلك أو سبب بقاء.

## 3. مصفوفة النطاقات

| النطاق | النتائج المثبتة | الهدف النهائي | بوابة الإغلاق |
|---|---|---|---|
| الجذر | تقارير ومسارات مطلقة وملفات إعداد متطابقة | Root رقيق بلا تقارير تاريخية أو مصادر موازية | صفر stale root files وصفر machine paths |
| `apps/` | `.gitkeep` واسع، إعدادات Mobile متطابقة، احتمال webapp/website متوازيين | أسطح فعلية فقط، app-local files مولدة أو محكومة | صفر orphan apps/shells/raw calls |
| Identity | الدفعة السابقة أصلحت bypass/fallback لكن CI الكامل غير مثبت | مالك وحيد للهوية والجلسات والأجهزة | اختبارات سلبية وCI وRuntime readback |
| Workforce | عقود بلا owner وبعض الأسماء Journey-based | ملف مهني وإداري واحد مرتبط بـactor_id | رحلة employee/provider كاملة |
| Platform Control | operationIds مصدرية مكررة بين entry/modules | Entry رقيق + modules + bundle | صفر canonical operation collisions |
| Providers | Prefix ترحيل `002` متكرر | Manifest وتاريخ محكوم | صفر unregistered migrations |
| DSH Contracts | 8 عمليات مصدرية مكررة، عقود بلا owner، أسماء jrn-* | ملكية مجال واحدة وBundle حتمي | صفر collisions/owner gaps/drift |
| DSH DB | عشرات Prefix collisions وتاريخ Lexical | Manifest صريح وتسمية جديدة monotonic | fresh/upgrade/replay/checksum pass |
| DSH Runtime | لم يُثبت repo-wide route/contract/surface parity | حقيقة الطلب والتنفيذ الوحيدة | صفر legacy/live drift |
| WLT | Bundle/Client تحسنا، لكن DB/Runtime invariants غير مثبتة | مالك مالي وحيد | كل invariants والرحلات المالية ناجحة |
| Shared frontend | WLT bridges/facades generated بلا provenance أو مستهلك ظاهر | عقلان مشتركان حاكمان بلا ui_copy | صفر generated UI copies/raw rules |
| `infra/` | مجلدات فارغة ومسارات تشغيل محتملة | مكونات مرتبطة فعليًا بـCompose/Runbook | clean environment startup |
| `tools/` | 47 مرشحًا بلا inbound reference و16 alias group | أدوات مسجلة قليلة | صفر unregistered/dead tools |
| `tools/guards/` | بعض الحراس تحمل قوائم أو نصوصًا بديلة | Guards تقارن المصادر الحاكمة | mutation tests لكل حارس حرج |
| `governance/` | تقارير استخراج ومسارات محلية وحالات تاريخية | Canonical index صغير | صفر active historical reports |
| `.agents/` | Archive داخل active tree واحتمال Skills غير مستهلكة | Skills مسجلة وAdapters رقيقة | registry parity وصفر active archive |
| `.github/` | يجب إبقاء read-only/same-SHA؛ منع auto-commit | CI تحقق فقط | صفر source mutation/unpinned actions |
| Generated | 7 بلا provenance و9 مرشحين بلا مستهلك ظاهر | مولد حتمي أو build artifact | delete-regenerate-diff |

## 4. ترتيب الخطورة

### P0

- مصدران قابلان للتحرير للعملية نفسها.
- ترحيلات بلا ترتيب تاريخي صريح.
- مصادقة أو نطاق غير موثوق.
- Financial mutation خارج WLT.
- Migration history modified.
- Contract/route/client divergence في مسار حساس.

### P1

- عقد بلا owner/state.
- Generated بلا provenance أو consumer proof.
- مسار محلي داخل التشغيل.
- Legacy route أو fallback بلا expiry.
- منطق مجال داخل Surface.
- Governance state متعارض.

### P2

- Aliases.
- `.gitkeep` وNamespaces وهمية.
- تقارير وأرشيفات داخل active tree.
- إعدادات متطابقة بلا generator.
- أدوات غير مسجلة.

## 5. ناتج كل موجة

لكل موجة ملف قرار صغير أو تحديث Manifest، وليس تقريرًا ضخمًا دائمًا:

```yaml
scope:
source_sha:
canonical_owner:
paths_kept: []
paths_moved: []
paths_merged: []
paths_generated: []
paths_deleted: []
blocked: []
verification_commands: []
verification_sha:
closure_state:
```

## 6. شروط الانتقال

- داخل أي نطاق P0: `UNKNOWN_OWNERSHIP = 0` قبل الحذف.
- لا تنتقل الشريحة قبل ترحيل المستهلكين وحذف البقايا.
- التنفيذ الحاكم في `10_REPOSITORY_WIDE_EXECUTION_LEDGER.md`.
- الإغلاق الحاكم في `17_FINAL_CLOSURE_MATRIX.md`.
