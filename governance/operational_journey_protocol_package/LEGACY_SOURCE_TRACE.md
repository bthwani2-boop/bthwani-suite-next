# LEGACY_SOURCE_TRACE — تتبع مصادر ما قبل الحزمة

**Package:** Unified Operational Journey Protocol — v3 modular strict
**Repository:** `bthwani2-boop/bthwani-suite-next`
**Remote ref:** `start`
**Date:** `2026-07-01`
**Scope:** يوثّق مصادر ما قبل الحزمة الحالية ويمنع حذفها قبل اكتمال الترحيل، حفاظًا على traceability.

---

## قرار الاحتفاظ الحالي

```yaml
legacy_sources:
  - path: tools/plan/command_operational_journey_unified
    role: original_v1_source
    sha_observed: 617ed1f69bc91d42ce8c433b92c252b7abda2ce3
    migrated_to: governance/operational_journey_protocol_package
    decision: ARCHIVE_OR_KEEP_READONLY_UNTIL_TRACE_COMPLETE
    reason: هو المصدر الأصلي الذي تشير إليه كل ملفات الحزمة (00-09) في ترويسة "Source path". حذفه الآن يضعف traceability.
    deletion_allowed_after:
      - coverage matrix confirmed (تم في 00_INDEX_AND_COVERAGE.md قسم 2-4)
      - missing old_new guards harvested (تم في 10_EXECUTION_PLAN_NO_SKIP_GATE.md قسم 33)
      - docker/hosting/no-skip amendment added (تم في 10_EXECUTION_PLAN_NO_SKIP_GATE.md)
      - package root README/index يشير إلى 00_INDEX_AND_COVERAGE.md كحاكم وحيد

  - path: tools/plan/command_old_new
    role: pre_v1_command_variant
    decision: DO_NOT_DELETE_YET
    reason: يحتوي guards وأوامر تحقق لم تكن منقولة بالقوة الكافية قبل هذا الترحيل.
    extracted_to: 10_EXECUTION_PLAN_NO_SKIP_GATE.md (قسم 33)
    extracted_items:
      - guard:matrix:v3
      - guard:canonical-host-ports
      - slice:gate
      - pnpm install --frozen-lockfile
      - go test/go build لـ services/dsh/backend
      - go test/go build لـ core/identity/backend
    rejected_items_not_migrated:
      - NEW_BRANCH: brach-validation (ثابت مكتوب مسبقًا، يخالف REF Resolution Gate)
      - NEW_BASE_BRANCH: master (ثابت مكتوب مسبقًا)
      - git reset --hard origin/brach-validation (مخالف لـ Human-Gated Git/GitHub Changes)
    deletion_allowed_after:
      - جميع البنود المفيدة محصودة (تم)
      - لا يوجد استخدام حي متبقٍ يشير إلى هذا الملف كمصدر تنفيذ فعلي
```

---

## قاعدة الحذف اللاحقة

لا يجوز حذف أي من الملفين أعلاه إلا بعد:

```text
1. تأكيد أن كل ملفات الحزمة (00-10) تشير إلى نفسها كمصدر حاكم وحيد، وليس إلى الملفات القديمة.
2. تحديث 00_INDEX_AND_COVERAGE.md ليذكر أن المصدر القديم تم ترحيله بالكامل.
3. عدم وجود أي أمر أو وكيل يستدعي المسار القديم مباشرة كمرجع تنفيذ.
```

حذف أي من الملفين بدون استيفاء الشروط أعلاه = `PROTOCOL_VIOLATION`.
