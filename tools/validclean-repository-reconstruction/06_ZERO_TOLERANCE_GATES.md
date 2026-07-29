# 06 — بروتوكول التحقق وبوابات الصفر

## المصدر الحاكم للعدادات

جميع عدادات الإغلاق التفصيلية موجودة في:

```text
17_FINAL_CLOSURE_MATRIX.md
```

هذا الملف يحدد طريقة الإثبات فقط. لا يجوز إنشاء قائمة عدادات موازية هنا أو في Guard يدوي.

## طبقات التحقق

### 1. Static

- Typecheck/lint/build.
- Broken imports وdependency direction.
- Dead files مع فحص الاستثناءات والاكتشاف الديناميكي.
- لا Generated أو Build output غير قابل لإعادة التوليد.

### 2. Contracts

- Compose جميع عقود الخدمة.
- Spectral/Schema validation دون crash أو skip.
- Canonical operation ownership.
- Route/contract/client parity.
- Delete/regenerate/diff للـBundles والعملاء.

### 3. Database

- Fresh database.
- Upgrade من Snapshot سابق.
- Manifest/checksum validation.
- Replay بلا تغييرات.
- Partial failure/rollback/ledger integrity.
- Constraints/indexes/backfills/read-after-write.
- Backup/restore عندما توجد كتابة مدمرة أو ترحيل بيانات.

### 4. Security

- Unauthenticated.
- Expired/revoked challenge/session/device.
- Wrong actor/surface/organization/store/tenant/scope.
- Privilege escalation وidentifier swapping.
- Service impersonation.
- Secrets/PII logging.

### 5. Finance

- Duplicate/idempotency/concurrency.
- Provider timeout/unknown result.
- Provider success + local persistence failure.
- Local persistence + response failure.
- Refund full/partial.
- COD custody.
- Commission/settlement/payout/reconciliation.
- Cross-organization isolation.

### 6. Runtime

- Clean checkout startup.
- Health/readiness/liveness.
- Dependency unavailable/recovery.
- لا hidden seed أو local fallback.
- Actual write/readback.
- لا restart wrapper يخفي سبب الفشل.

### 7. Multi-surface

- Action من السطح المالك.
- Backend transaction.
- Persistence/readback.
- جميع الأسطح المتأثرة.
- Loading/empty/error/blocked/offline/unknown states.
- Negative authorization.

### 8. Governance and CI

- Authority references موجودة.
- Governance index يطابق القرص.
- Skills/guards/tools registries تطابق المستهلكين.
- Workflows read-only افتراضيًا ومثبتة بـSHA.
- لا source mutation ذاتي.
- الأدلة من SHA المرشح نفسه.

## exact-SHA

```text
Implemented SHA
= Reviewed SHA
= Static-tested SHA
= DB-tested SHA
= Runtime-proven SHA
= CI candidate SHA
```

إذا تحرك رأس الفرع بعد الدليل، تعاد الفحوص المتأثرة. لا تُستخدم نتائج `fbc013923` لإغلاق رأس لاحق؛ هو مرجع جرد فقط.

## حالات التنفيذ

الحالات المسموحة للشرائح محددة في `10_REPOSITORY_WIDE_EXECUTION_LEDGER.md`:

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

حالة الحزمة الحالية مستقلة عن حالات الشرائح وتوجد في `plan.manifest.json` وREADME فقط.

## الإغلاق

لا يكفي:

- حذف عدد كبير من الملفات.
- نجاح Build أو Typecheck.
- مرور Regex guard.
- وجود وثيقة أو شاشة.
- تشغيل Mock أو Seed.

الإغلاق الحقيقي:

```text
مالك واحد
→ كتابة صحيحة
→ عقد وعميل مطابقان
→ بيانات بقيود صحيحة
→ قراءة راجعة
→ أسطح متسقة
→ اختبارات منع وفشل
→ Runtime حقيقي
→ حذف البقايا
→ جميع عدادات 17 = صفر
→ دليل على SHA نهائي واحد
```

الحالة النهائية الوحيدة المقبولة:

```text
CLOSED_WITH_EVIDENCE
```
