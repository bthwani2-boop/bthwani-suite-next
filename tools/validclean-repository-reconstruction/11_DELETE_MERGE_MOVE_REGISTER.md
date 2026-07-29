# 11 — سجل الحذف والدمج والنقل والاستبدال

## الغرض

هذا السجل لا يصرح بالحذف الجماعي. هو قائمة قرارات يجب إغلاقها بالدليل. كل عنصر ينتقل من `CANDIDATE` إلى قرار نهائي واحد فقط.

## الحالات

```text
CANDIDATE
CONSUMER_ANALYSIS_REQUIRED
REPLACEMENT_REQUIRED
MIGRATION_IN_PROGRESS
READY_TO_DELETE
DELETED_VERIFIED
KEEP_ACTIVE
KEEP_GENERATED
MOVE_TO_OWNER
MERGE_TO_CANONICAL
ARCHIVE_IN_GIT_HISTORY_ONLY
BLOCKED
```

## متطلبات `READY_TO_DELETE`

```yaml
canonical_replacement: required
tracked_consumers_migrated: true
dynamic_discovery_checked: true
runtime_or_build_proof: true
security_finance_migration_protection_reviewed: true
delete_regenerate_diff_when_generated: true
rollback: git_revert_or_data_restore_plan
```

## السجل الأولي المثبت

### حزمة validclean نفسها

| المسار | الحالة الحالية | القرار المستهدف | السبب |
|---|---|---|---|
| `tools/validclean-repository-reconstruction/apply-vc004.mjs` | CANDIDATE | ARCHIVE_IN_GIT_HISTORY_ONLY | Codemod مؤقت استُخدم لإنشاء مواد WLT؛ لا يبقى كأداة دائمة بلا idempotency واختبارات |
| `apply-vc004-common.mjs` | CANDIDATE | ARCHIVE_IN_GIT_HISTORY_ONLY | جزء من ترحيل لمرة واحدة |
| `apply-vc004-contract-dedup.mjs` | CANDIDATE | ARCHIVE_IN_GIT_HISTORY_ONLY | جزء من ترحيل لمرة واحدة |
| `.agents/archive/validclean-vc003/` | CANDIDATE | ARCHIVE_IN_GIT_HISTORY_ONLY | Git history هو الأرشيف؛ لا نحتاج أرشيفًا دائمًا داخل source tree |
| `07_APPROVAL_CHECKPOINT.md` | CANDIDATE | MERGE_TO_CANONICAL | الموافقة تمت؛ يجب تحويله إلى سجل تفويض مختصر أو دمجه في Manifest |

### عقود Platform Control

| المسار | الحالة | القرار المطلوب |
|---|---|---|
| `core/platform-control/contracts/platform-control.openapi.yaml` | SOURCE_COLLISION | RECONSTRUCT_ENTRY |
| `core/platform-control/contracts/platform-change-sets.openapi.yaml` | SOURCE_COLLISION | KEEP_AS_MODULE_OR_MERGE |
| `core/platform-control/contracts/jrn-041-progressive-rollout.openapi.yaml` | SOURCE_COLLISION | RENAME_AND_KEEP_AS_MODULE_OR_MERGE |

ممنوع حذف أي منها قبل اختيار نموذج واحد:

```text
ENTRY_REFERENCES_MODULES
or
MODULES_COMPOSE_TO_GENERATED_BUNDLE
```

### عقود DSH

| المسار | الحالة | القرار المطلوب |
|---|---|---|
| `dsh.fulfillment-operations.openapi.yaml` | OPERATION_OWNER_COLLISION | SPLIT_BY_DOMAIN_OWNER |
| `dsh.partner-delivery.openapi.yaml` | OPERATION_OWNER_COLLISION | SPLIT_BY_DOMAIN_OWNER |
| `dsh.jrn-*.openapi.yaml` | PERMANENT_CODE_WITH_JOURNEY_NAME | RENAME_WITH_REFERENCE_MIGRATION |
| `jrn-033-representative-finance.openapi.yaml` | OWNERSHIP_REVIEW | MOVE_FINANCIAL_TRUTH_TO_WLT_OR_REFERENCE_ONLY |
| `jrn-035-refunds.openapi.yaml` | OWNERSHIP_REVIEW | MOVE_FINANCIAL_TRUTH_TO_WLT_OR_DELETE_DUPLICATE |

### Generated WLT/DSH frontend bridges

المجلد:

```text
services/dsh/frontend/shared/finance-wlt-link/wlt/generated/
```

مرشحاته تشمل:

```text
wlt_frontend_dsh_app_captain_wlt_dsh_captain_ui_copy.facade.ts
wlt_frontend_dsh_app_captain.facade.ts
wlt_frontend_dsh_app_partner_wlt_dsh_partner_ui_copy.facade.ts
wlt_frontend_dsh_app_partner.facade.ts
WltDshCaptainBridge.tsx
WltDshPartnerBridge.tsx
```

الحالة: `REPLACEMENT_REQUIRED`.

الهدف:

```text
services/wlt/frontend/shared/dsh
→ typed controllers/view models
→ thin surface adapters
```

ثم حذف `ui_copy` وكل Bridge غير مولد أو غير مستهلك.

### Identity generated outputs

```text
core/identity/clients/generated/identity-api.js
core/identity/clients/generated/identity-api.js.map
core/identity/clients/generated/identity-api.d.ts
core/identity/clients/generated/identity-api.d.ts.map
```

الحالة: `CONSUMER_ANALYSIS_REQUIRED`.

القرار:

- إذا كانت package exports تشير إليها عبر discovery: `KEEP_GENERATED` وإضافة provenance/gate.
- إذا كانت source `.ts` هي المستهلك الحقيقي وهذه ملفات build ملتزمة بلا حاجة: `MOVE_TO_BUILD_ARTIFACT` ثم حذفها من Git.

### الخدمات الفارغة

```text
services/amn
services/arb
services/esf
services/knz
services/kwd
services/mrf
services/snd
```

الحالة: `CANDIDATE`.

لا يبقى المجلد بسبب `.gitkeep`. يجب استخراج أي قرار مستقبلي إلى:

```text
governance/capabilities/future-capabilities.json
```

ثم حذف namespace إذا لم يملك Runtime/contract/data/owner.

### التطبيقات والمواقع الوهمية

```text
apps/webapp
apps/website
```

الحالة: `CONSUMER_ANALYSIS_REQUIRED`.

يجب تحديد هل هما سطحان مختلفان فعلًا. إن كانا نفس الموقع العام:

```text
choose one canonical app
→ migrate routes/config/deploy
→ delete the other namespace
```

### `.gitkeep`

تم رصد 87 ملفًا فارغًا. القرار ليس حذفها فرديًا؛ القرار على المجلد:

```text
ACTIVE_EMPTY_DIRECTORY_REQUIRED_BY_TOOL
or
IMAGINARY_STRUCTURE_DELETE_DIRECTORY
```

الأمثلة ذات الأولوية:

- مجلدات `apps/*/shell` الفارغة.
- أقسام `control-panel` الفارغة بينما التنفيذ في مسار آخر.
- `infra/data-plane/*` الفارغة.
- `services/*` الوهمية.
- مجلدات WLT الفارغة التي تحتوي `.gitkeep` بجوار محتوى فعلي في مسارات أخرى.

### إعدادات Mobile المتطابقة

مجموعات مطابقة مثبتة:

```text
4 x .easignore
4 x .env.example
4 x metro.config.cjs
4 x sentry-config.ts
4 x start.ps1
5 x eas.json including template
16 x placeholder icon assets
```

لا تحذف ملفات app-specific التي تتطلبها Expo/EAS. القرار المستهدف:

```text
central template/generator
→ generated app-local required files
→ drift gate
```

ملفات الصور المتطابقة يجب أن تستبدل بأصول حقيقية لكل تطبيق أو مصدر مركزي يولدها؛ لا تبقى كعلامة أن التطبيقات مختلفة وهي تستخدم الصورة نفسها بالضبط.

### أوامر package aliases

تم رصد 16 مجموعة. أمثلة:

```text
foundation:gate = guard:foundation
journey:gate = guard:journey
runtime:up = runtime:all = docker:runtime:up
runtime:wlt = runtime:wlt:up = runtime:codespaces:wlt
graphify = graphify:code
```

الحالة: `MERGE_TO_CANONICAL`.

قاعدة البقاء:

- اسم واحد واجهة عامة.
- alias واحد فقط إذا كان compatibility مؤقتًا وله تاريخ حذف.
- لا ثلاثة أسماء لنفس الأمر.

### أدوات بلا inbound reference ظاهر

تم رصد 47 مرشحًا. لا تُحذف بالعداد. الفحص الإلزامي:

```text
package scripts
workflows
PowerShell invocations
human runbooks
CLI discovery
import/require
```

النتائج النهائية:

```text
KEEP_CLI_ENTRY
REGISTER_AND_TEST
MERGE_WITH_TOOL
DELETE_PROVEN_DEAD
```

### ملفات المسارات المطلقة

21 ملفًا. القرار حسب النوع:

- كود التشغيل: استبدال بمتغير/مسار نسبي.
- Runbook: استخدام placeholder واضح مثل `<REPO_ROOT>`.
- Evidence تاريخي: استخراج القرار ثم حذف الملف.
- Test fixture: إبقاء fixture اصطناعي لا مسار جهاز المستخدم الحقيقي.

## حمايات لا تُحذف باسم التنظيف

```text
security negative tests
financial invariants
migration replay/checksum tests
runtime readiness/recovery tests
contract-runtime parity tests
outbox/idempotency/concurrency tests
```

أي حذف لهذه الفئات يحتاج اختبارًا بديلًا يثبت نفس invariant أو أقوى.
