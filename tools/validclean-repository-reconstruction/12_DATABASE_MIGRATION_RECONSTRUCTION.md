# 12 — إعادة بناء سجل الترحيلات وقاعدة البيانات

## المشكلة المثبتة

تم رصد 32 مجموعة ذات بادئة رقمية متكررة، منها:

```text
providers-002_*
dsh-027_*
dsh-048_*
dsh-056_*
dsh-057_*
dsh-058_*
dsh-059_*
dsh-076_*
dsh-077_*
dsh-078_*
dsh-079_*
dsh-080_*
dsh-088_*
dsh-089_*
dsh-090_*
dsh-094_*
dsh-095_*
dsh-096_*
dsh-097_*
dsh-098_*
dsh-099_*
dsh-101_*
dsh-103_*
dsh-119_*
dsh-129_*
dsh-901_*
dsh-904_*
dsh-907_*
dsh-908_*
dsh-910_*
```

آلية DSH الحالية ترتب بالاسم الكامل وتستخدم الاسم الكامل كمفتاح في `runtime_schema_migrations`. لذلك:

- الملفات تنفذ.
- Checksums محمية.
- لكن الرقم لم يعد معرف ترتيب فريدًا.
- الاعتماد على الرقم في الوثائق أو rollback أو التشخيص أصبح مضللًا.

## محظورات

ممنوع:

- إعادة تسمية Migration مطبقة في أي بيئة.
- تعديل محتوى Migration مطبقة.
- دمج ملفات تاريخية مطبقة في ملف واحد.
- حذف Migration لأن الجدول النهائي يحتوي أثرها.
- حل التصادم بإضافة suffix عشوائي جديد.
- الاعتماد على `IF NOT EXISTS` لإخفاء اختلاف Schema.

## الحل الجذري

### 1. Manifest تاريخي حاكم

إنشاء ملف لكل خدمة:

```text
<service>/database/migrations/manifest.json
```

الحقول:

```json
{
  "schemaVersion": 1,
  "service": "dsh",
  "ordering": "explicit",
  "cutover": "<last historical filename>",
  "migrations": [
    {
      "ordinal": 1,
      "file": "dsh-001_store_discovery.sql",
      "sha256": "...",
      "historicalPrefix": "001",
      "state": "HISTORICAL_IMMUTABLE"
    }
  ]
}
```

يولد Manifest أول مرة من الترتيب النصي الحالي، ثم يراجع يدويًا مقابل الاعتماديات الفعلية قبل اعتماده.

### 2. Runner يعتمد Manifest

بعد الاعتماد:

```text
read manifest
→ verify file set exactly matches manifest
→ verify checksum
→ apply by ordinal
→ record name + checksum + ordinal + manifest version
```

لا يكتشف Runner ملفات جديدة تلقائيًا بعد نقطة القطع.

### 3. نظام تسمية جديد

بعد Cutover:

```text
<service>-m000001_<domain-action>.sql
```

أو رقم زمني monotonic موحد، بشرط:

- فريد على مستوى الخدمة.
- يولد عبر أمر واحد.
- لا يقبل إدخالًا يدويًا متصادمًا.
- Manifest هو المالك.

### 4. Gate يمنع الانحراف

يفشل عند:

```text
file not in manifest
manifest file missing on disk
checksum mismatch
duplicate ordinal
duplicate filename
new legacy numeric prefix after cutover
historical file content changed
```

### 5. فصل أنواع SQL

```text
migrations/     schema/data migrations immutable
seeds/local/    local-only repeatable fixtures
indexes/        must be empty unless online-index protocol exists
scripts/        runner/admin tools only
tests/schema/   invariants
tests/seed/     fixture contracts
```

الفهارس التشغيلية العادية داخل Migration. `CREATE INDEX CONCURRENTLY` يحتاج بروتوكول online migration منفصل ولا يدخل مع `--single-transaction`.

## خطة التحقق

### Fresh database

```text
empty database
→ apply all manifest migrations
→ validate constraints/indexes/functions/triggers/RLS
→ run schema tests
```

### Existing database

```text
snapshot from pre-cutover state
→ import historical ledger
→ reconcile applied files/checksums
→ apply remaining manifest entries
→ readback business invariants
```

### Replay

```text
run migrate again
→ zero schema changes
→ all entries skipped by checksum
```

### Partial failure

- حقن Migration تفشل في المنتصف داخل قاعدة اختبار.
- إثبات rollback الكامل.
- عدم تسجيلها في ledger.
- إصلاحها بإضافة Migration جديدة، لا تعديل المطبقة.

### Recovery

- Backup قبل data backfill المدمر.
- Backfill على دفعات مع counters.
- Reconciliation قبل فرض `NOT NULL` أو unique.
- Roll-forward هو الأصل؛ rollback فقط عند وجود خطة بيانات قابلة للإثبات.

## ترحيلات tenant_id

كل `tenant_id` يخضع قبل أي تغيير إلى تصنيف دلالي. لا تُنفذ إعادة تسمية جماعية.

الخطوات:

```text
inventory columns and FKs
→ map semantic owner
→ add new explicit column
→ backfill
→ dual-read only in bounded migration window
→ switch writes once
→ verify isolation/readback
→ remove old column in later migration
```

`dual-write` الدائم ممنوع.

## بوابات الإغلاق

```yaml
historical_manifest_complete: true
historical_checksum_drift: 0
unregistered_files: 0
duplicate_manifest_ordinals: 0
new_legacy_prefix_collisions: 0
fresh_database_failures: 0
upgrade_database_failures: 0
replay_mutations: 0
partial_failure_ledger_leaks: 0
unknown_backfill_rows: 0
```
