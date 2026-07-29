# 10 — سجل التنفيذ الشامل المتسلسل

## قاعدة التنفيذ

كل شريحة لها هذه الدورة فقط:

```text
PIN SOURCE SHA
→ INVENTORY SCOPE
→ CHOOSE CANONICAL OWNER
→ WRITE MIGRATION/REPLACEMENT
→ MIGRATE ALL CONSUMERS
→ DELETE OLD PATHS
→ RUN STATIC + CONTRACT + DB + RUNTIME PROOF
→ RECORD SAME-SHA EVIDENCE
→ CLOSE SLICE
```

لا توجد حالة `DONE` بلا حذف البقايا وبوابة تمنع رجوعها.

## الحالات المسموحة

```text
NOT_STARTED
DIAGNOSIS_COMPLETE
IMPLEMENTATION_IN_PROGRESS
BLOCKED_BY_DEPENDENCY
IMPLEMENTED_PENDING_DB_PROOF
IMPLEMENTED_PENDING_RUNTIME_PROOF
VERIFIED_SAME_SHA
CLOSED_WITH_EVIDENCE
```

`VERIFIED_LOCAL_SAME_SHA` من الحزمة القديمة لا يساوي إغلاق المستودع؛ يثبت فقط دفعة محددة.

## المرحلة A — إعادة تأسيس الحزمة والجرد

### VC-100 — Full tracked-file inventory

الحالة: `VERIFIED_SAME_SHA`

الدليل:

```text
fbc0139234e2bdb34a8de77d74a6b91297a754b0
workflow run 30422464222
artifact 8712393270
```

### VC-101 — Package state unification

الأعمال:

- تحديث README من خطة غير منفذة إلى برنامج تنفيذ مصرح.
- إزالة `PLAN_ONLY_AWAITING_OWNER_APPROVAL` من الملفات النشطة.
- ترقية Manifest إلى schemaVersion 2.
- فصل `auditTargetSha` عن `packageHeadSha`.
- منع أكثر من حالة حاكمة للحزمة.

البوابة:

```text
VALIDCLEAN_PACKAGE_STATE_CONFLICT = 0
```

### VC-102 — Path decision registry

- إضافة سجل قرار لكل مرشح حذف/دمج/نقل.
- لا يُلتزم inventory.ndjson الضخم؛ يبقى Artifact.
- تلتزم القرارات النهائية والقواعد الدائمة فقط.

## المرحلة B — P0: العقود والترحيلات والملكية

### VC-110 — Platform Control contract reconstruction

- اختيار مصدر واحد لعمليات Change Sets.
- اختيار مصدر واحد لعمليات Progressive Rollout.
- تحويل `platform-control.openapi.yaml` إلى Entry/Composer أو حذف الوحدات بعد دمج حقيقي؛ ممنوع النسخ اليدوي.
- Bundle وclient وroute parity.

الإغلاق:

```text
platform_control_canonical_operation_collisions = 0
```

### VC-120 — DSH contract reconstruction

- حسم ملكية عمليات Pickup وPartner Delivery SLA بين:
  - `dsh.fulfillment-operations.openapi.yaml`
  - `dsh.partner-delivery.openapi.yaml`
- إعادة تسمية عقود `jrn-*` الدائمة إلى أسماء مجالات بعد ترحيل كل المراجع.
- إضافة owner metadata لكل عقد.
- Composer حتمي وBundle واحد.
- منع عقد دخول ينسخ modules.

الإغلاق:

```text
dsh_canonical_operation_collisions = 0
dsh_contract_owner_missing = 0
dsh_dangling_refs = 0
dsh_bundle_drift = 0
```

### VC-130 — Migration history reconstruction

- جرد جميع بادئات الترحيلات المتكررة.
- إثبات ترتيب التشغيل الحالي بالاسم الكامل.
- إنشاء Manifest تاريخي بالاسم وSHA والترتيب الفعلي.
- عدم إعادة تسمية ملف مطبق.
- نقطة قطع تمنع أي Prefix جديد مكرر.
- ترحيلات جديدة monotonic فقط.
- Fresh/upgrade/replay/checksum/partial-failure proof.

الإغلاق:

```text
unregistered_migrations = 0
new_prefix_collisions = 0
checksum_drift = 0
fresh_schema_failures = 0
upgrade_schema_failures = 0
```

### VC-130b — Migration manifests for the remaining five services

الحالة: `VERIFIED_SAME_SHA`

قبل الشريحة كانت `migration-manifest-drift-gate.mjs` تمر على DSH فقط وتُصدر `SKIP` للخمسة الباقية، أي أن غياب Manifest لم يكن يفشل.

الأعمال:

- توليد `manifest.json` بـ`tools/scripts/generate-migration-manifest.mjs` نفسه (لم تُكتب أداة ثانية) لـ:

```text
wlt              63 migrations
identity         12 migrations
workforce        13 migrations
providers         3 migrations
platform-control  7 migrations
```

- إثبات أن ترتيب التشغيل غير ملتبس: مُقارنة الترتيبين الفعليين المستعملين في المستودع على مجموعات الملفات الست:

```text
Sort-Object { $_.Name.ToLowerInvariant() }, Name   (tools/scripts/invoke-service-migrations.ps1)
Sort-Object Name                                    (infra/docker/scripts/runtime.ps1,
                                                     services/dsh/database/scripts/invoke-dsh-database.ps1)
```

النتيجة: `firstDivergenceCount = 0` لكل الخدمات الست، فالـManifest صالح لكل مُشغِّل.

- تصفير مسار التهرّب: `SKIP` أُزيلت من الحارس؛ غياب `manifest.json` صار `FAIL` صريحًا مع أمر إعادة التوليد.
- تسجيل الحارس فعليًا: `guard:migration-manifest-drift` في `package.json` وفي `governance/guards/guard-registry.json`، وخطوة غير مشروطة في `.github/workflows/ci-policy.yml`. حارس لا يشغّله شيء ليس حارسًا.

إصلاحات مصاحبة كانت تُفشل `guard:guard-registry` و`guard:cleanup-policy` قبل هذه الشريحة (سابقة لها، من موجات سابقة):

- `guard:wlt-openapi-bundle` كان سكربتًا غير مسجل ⇒ سُجّل، وحُذف الاسم المرادف غير المستهلك `openapi:lint:wlt`.
- `.github/workflows/validclean-full-repository-audit.yml` كان خارج `governance/github/workflow-registry.json` ⇒ سُجّل كـ`READ_ONLY_DIAGNOSTIC` مع شرط تقاعده.
- `14_NOISE_AND_NAMESPACE_ELIMINATION.md` كان يحوي جذر مستودع محلي حرفيًا ⇒ أُزيل.

مُتحقَّق منه بالطفرة (mutation test): إخفاء `core/providers/.../manifest.json` يُنتج `FAIL providers` وخروج `1`؛ وإعادته تُنتج `PASS` وخروج `0`.

الإغلاق:

```text
migration_manifest_missing = 0
unregistered_migrations   = 0
checksum_drift            = 0
new_prefix_collisions     = 0
```

ملاحظة صريحة: تصادمات البادئات التاريخية (32 في التدقيق المُثبت، منها `providers-002` مرتين و`dsh-096/097/098` بخمسة ملفات لكل) تبقى كما هي بوصفها `HISTORICAL_IMMUTABLE`؛ الحارس يمنع تصادمًا **جديدًا** بعد ملف `cutover` ولا يعيد تسمية ملف مطبق.

### VC-140 — OpenAPI ownership metadata

- `x-bthwani-owner` إلزامي لكل مصدر عقد.
- `x-bthwani-contract-state` إلزامي.
- Generated derivatives تحمل provenance ولا تدخل في عداد المالكين.
- Master يسجل service entries فقط.

الإغلاق:

```text
openapi_owner_missing = 0
openapi_state_missing = 0
master_service_entry_count = 6
```

### VC-150 — Generated client provenance for all services

يشمل:

```text
identity
workforce
platform-control
providers
dsh
wlt
```

لكل خدمة:

```text
bundle hash
source list
pinned generator version
generated header
delete-regenerate-diff gate
consumer proof
```

الإغلاق:

```text
manual_generated_clients = 0
unproven_generated_files = 0
unconsumed_generated_files = 0
```

## المرحلة C — P0/P1: الثقة والماليات والبيانات

### VC-160 — Identity trust closure

- إعادة اختبار التفعيل والجلسات والأجهزة.
- إزالة scan-test الذي يعتمد على self-scanning إن كان يمنع Windows Application Control، واستبداله باختبار parser أو guard Node مستقل.
- منع public OTP لـWorkforce roles.
- منع tenant fallback والربط العابر للنطاق.
- اختبار CI فعلي لا build/vet فقط.

### VC-170 — Actor/organization/tenant migration

- استخراج كل استعمال لـtenant_id.
- تصنيف الدلالة.
- ترحيل الحقول الملتبسة.
- منع قراءة نطاق من client headers دون boundary موثوق.
- اختبارات عزل سلبية لكل خدمة.

### VC-180 — WLT financial invariants

- تشغيل Postgres مع كل migrations.
- Ledger balance and append-only proof.
- Idempotency/duplicate/timeout/unknown-result.
- COD/refund/settlement/payout/reconciliation.
- منع Financial mutation خارج WLT.
- Readback بعد الكتابة.

### VC-190 — DSH operational truth

- Partner/Store/Catalog/Assortment.
- Cart/serviceability/order state machine.
- Fulfillment/pickup/captain/partner delivery.
- Outbox وربط WLT بالمراجع.
- حذف legacy routes الحية بعد ترحيل المستهلكين.

## المرحلة D — Full-stack surfaces

### VC-200 — Workforce and administration

- فصل Actor عن Person/Profile/Assignment.
- مدير المشروع والقيادات ومديرو الأقسام والموظفون.
- تفعيل الكابتن والميداني من المالك الإداري الصحيح.
- DSH scopes وWLT profiles بالمراجع.

### VC-210 — Shared frontend brains

- DSH brain في `services/dsh/frontend/shared`.
- WLT-DSH financial brain في `services/wlt/frontend/shared/dsh`.
- إزالة `generated/*ui_copy*` والواجهات المكررة بعد نقل المستهلكين.
- صفر raw fetch داخل screens.
- صفر permission/domain enums محلية.

### VC-220 — Surface closure

يشمل:

```text
app-client
app-partner
app-captain
app-field
control-panel
website/webapp only if proven active
```

لكل capability:

```text
screen
controller
client operation
contract
runtime route
database/read model
loading/empty/error/blocked/offline/readback
negative authorization tests
```

## المرحلة E — Runtime والبنية

### VC-230 — Runtime interface reduction

- اختيار أسماء أوامر حاكمة.
- حذف aliases غير المستهلكة.
- توحيد Profiles والمنافذ.
- readiness حقيقي لا restart wrappers.
- clean environment startup.

### VC-240 — Mobile/EAS/Firebase/Sentry normalization

- نقل الإعدادات المكررة إلى template/generator مركزي عند إمكان ذلك.
- إزالة المسارات المحلية المطلقة.
- إبقاء ملفات app-specific الناتجة عند احتياج Expo/EAS لها، لكن تولد أو تتحقق مركزيًا.
- منع الأسرار من Git.

### VC-250 — Infrastructure namespace cleanup

- تقييم كل `.gitkeep` ومجلد فارغ.
- حذف namespaces الوهمية.
- إبقاء data-plane directories فقط إذا كانت مملوكة من Compose/runbook/backup policy.
- حذف service placeholders غير المفعلة أو نقلها إلى capability registry واحد.

## المرحلة F — الحوكمة والأدوات والضجيج

### VC-260 — Governance authority reduction

- Authority precedence واحدة.
- Product Truth واحدة.
- Decision vocabulary واحدة.
- ملفات canonical محدودة ومفهرسة.
- حذف extraction ledgers والتقارير التاريخية بعد استخراج القرارات الحية.
- كل ملف حوكمة له owner وacceptance condition وretirement condition.

### VC-270 — Agents/skills/guards reconstruction

- كل Skill مسجلة ومستهلكة.
- Adapter رقيق.
- Guard يقرأ الحقيقة ولا يملك قائمة بديلة.
- Mutation tests للحراس الحرجة.
- حذف archive داخل `.agents` بعد نقل الدليل المطلوب إلى Git history أو ADR.

### VC-280 — Tooling and command cleanup

- معالجة 47 أداة بلا inbound reference ظاهر.
- إثبات CLI discovery قبل الحذف.
- دمج aliases.
- حذف codemods المؤقتة `apply-vc004*.mjs` بعد انتهاء استخدامها.
- منع أدوات تكتب source تلقائيًا في CI.

### VC-290 — Documentation and absolute paths

- معالجة 21 ملفًا يحمل مسارات محلية.
- Root README تشغيلي فقط.
- حذف Pasted/audit reports القديمة أو نقل القرار إلى ADR.
- link check وowner وlast-verified.

## المرحلة G — الإغلاق النهائي

### VC-300 — Same-SHA full verification

يجب تنفيذ الآتي على SHA واحد:

```text
full static verification
all contract compose/lint/type generation
all Go/TS tests
fresh DB
upgraded DB
migration replay
runtime up/readiness/smoke
negative security tests
financial invariants
multi-surface vertical journeys
cleanup/dead-code scan
workflow security
```

### VC-310 — Final deletion sweep

- حذف كل ملف `REPLACE_THEN_DELETE` بعد إثبات البديل.
- `UNKNOWN_OWNERSHIP = 0`.
- `BLOCKED_PENDING_EVIDENCE = 0` أو مبرر خارجي صريح لا يسمح بادعاء 100%.

### VC-320 — Closure declaration

الحالة الوحيدة المقبولة:

```text
CLOSED_WITH_EVIDENCE
```

ولا تُكتب إلا إذا كانت جميع عدادات `17_FINAL_CLOSURE_MATRIX.md` صفرًا وكانت الأدلة من SHA نفسه.
