# LEGACY_SOURCE_TRACE — تتبع مصادر ما قبل الحزمة

**Package:** Unified Operational Journey Protocol — v3 modular strict
**Repository:** `<REPO_REMOTE>`
**Remote ref:** `<REF>`
**Date:** `2026-07-01`
**Scope:** يوثّق مصادر ما قبل الحزمة الحالية لحفظ traceability التاريخية.

---

## الحالة النهائية للمصادر القديمة

```yaml
legacy_sources:
  - path: tools/plan/command_operational_journey_unified
    role: original_v1_source
    sha_observed: 617ed1f69bc91d42ce8c433b92c252b7abda2ce3
    migrated_to: governance/operational_journey_protocol_package
    decision: ARCHIVED_AND_DELETED
    deletion_date: "2026-07-04"
    reason: >
      الترحيل مكتمل — جميع ملفات الحزمة (00-11) تحكم نفسها ذاتيًا
      ولا تحتاج للإشارة إلى الملف الأصلي كمصدر تنفيذ.

  - path: tools/plan/command_old_new
    role: pre_v1_command_variant
    decision: ARCHIVED_AND_DELETED
    deletion_date: "2026-07-04"
    reason: >
      جميع البنود المفيدة محصودة ومدمجة في ملفات الحزمة.
      Guards القديمة التي كانت فيه موحّدة في:
        - foundation:gate  (ui-kit-boundary + runtime-config + no-broken-imports + cleanup-policy)
        - journey:gate     (fullstack-boundary + wlt-financial-boundary + runtime-config + no-broken-imports)
```

---

## قاعدة مرجعية

هذه الحزمة (`governance/operational_journey_protocol_package`) هي المصدر الحاكم الوحيد.
لا يوجد ملف خارجي مرجعي نشط — كل المصادر القديمة مؤرشفة.
