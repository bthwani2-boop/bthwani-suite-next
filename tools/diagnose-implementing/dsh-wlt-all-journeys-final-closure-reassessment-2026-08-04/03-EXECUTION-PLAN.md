# خطة التنفيذ الحاكمة — dsh-wlt-all-journeys-final-closure-reassessment-2026-08-04

## baseline

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: smsm
pinned_sha: f97dcbc3ecfbc19a130c4dbafef6cb7def9c3eb8
plan_status: READY_FOR_EXECUTION_REVIEW
execution_authorization: NOT_AUTHORIZED_FOR_PRODUCT_CHANGES_IN_THIS_STAGE
one_work_item_at_a_time: true
push_after_each_atomic_commit: true
force_push: false
```

## ترتيب المراحل

| الترتيب | المرحلة | النتيجة | الحالة |
|---:|---|---|---|
| 0 | `PHASE-00` | Authority, baseline, inventory and plan validation | CLOSED_WITH_EVIDENCE |
| 1 | `PHASE-01` | Repository hygiene and diagnostic tooling | BLOCKED |
| 2 | `PHASE-02` | DSH and WLT migration sovereignty | BLOCKED |
| 3 | `PHASE-03` | Canonical contracts and backend bindings | BLOCKED |
| 4 | `PHASE-04` | Financial trust boundary | BLOCKED |
| 5 | `PHASE-05` | Surface reachability, duplication and ownership hotspots | BLOCKED |
| 6 | `PHASE-06` | Full runtime and FOUNDATION closure | BLOCKED |
| 7 | `PHASE-07` | Journeys J001..J019 | BLOCKED |
| 8 | `PHASE-08` | Journeys J020..J078 | BLOCKED |
| 9 | `PHASE-09` | Journeys J079..J107 | BLOCKED |
| 10 | `PHASE-10` | Same-SHA closure and disposal | BLOCKED |

## ترتيب المهام

| الترتيب | المهمة | المرحلة | النتيجة الذرية | تعتمد على | الحالة |
|---:|---|---|---|---|---|
| 1 | `TASK-0001` | `PHASE-02` | إصلاح سلطة مهاجرات DSH | `none` | READY |
| 2 | `TASK-0002` | `PHASE-02` | إصلاح سلطة مهاجرات WLT | `TASK-0001` | BLOCKED |
| 3 | `TASK-0003` | `PHASE-01` | إزالة مانع immutable diff | `TASK-0002` | BLOCKED |
| 4 | `TASK-0004` | `PHASE-01` | توحيد Compiler API للحراس | `TASK-0003` | BLOCKED |
| 5 | `TASK-0005` | `PHASE-03` | تقارب عقود DSH وتسجيلات الخادم | `TASK-0004` | BLOCKED |
| 6 | `TASK-0006` | `PHASE-04` | استبدال موافقة WLT الشاملة بسلطة operation-level | `TASK-0005` | BLOCKED |
| 7 | `TASK-0007` | `PHASE-01` | تقوية إطار حزم التشخيص | `TASK-0006` | BLOCKED |
| 8 | `TASK-0008` | `PHASE-01` | إصلاح تشخيص وانتقاء Journey Gate | `TASK-0007` | BLOCKED |
| 9 | `TASK-0009` | `PHASE-05` | حسم ربط الشاشات التسع | `TASK-0008` | BLOCKED |
| 10 | `TASK-0010` | `PHASE-01` | تصحيح Knip واعتماديات الأدوات | `TASK-0009` | BLOCKED |
| 11 | `TASK-0011` | `PHASE-05` | تصنيف وتوحيد مجموعات التطابق والأصول | `TASK-0010` | BLOCKED |
| 12 | `TASK-0012` | `PHASE-05` | تفكيك hotspots المثبتة فقط | `TASK-0011` | BLOCKED |
| 13 | `TASK-0013` | `PHASE-06` | إغلاق full runtime readback | `TASK-0012` | BLOCKED |
| 14 | `TASK-0014` | `PHASE-06` | إعادة تثبيت FOUNDATION وسجل التغطية | `TASK-0013` | BLOCKED |
| 15 | `TASK-0015` | `PHASE-07` | تنفيذ الرحلات J001 إلى J019 | `TASK-0014` | BLOCKED |
| 16 | `TASK-0016` | `PHASE-08` | تنفيذ الرحلات J020 إلى J078 | `TASK-0015` | BLOCKED |
| 17 | `TASK-0017` | `PHASE-09` | تنفيذ الرحلات J079 إلى J107 | `TASK-0016` | BLOCKED |
| 18 | `TASK-0018` | `PHASE-10` | الإغلاق النهائي same-SHA والتخلص الآمن | `TASK-0017` | BLOCKED |

## بروتوكول كل مهمة

```text
PIN REMOTE HEAD
→ READ LINKED FINDINGS AND EVIDENCE
→ OPEN ONE WORK ITEM
→ IMPLEMENT ONE VERTICAL BEHAVIOR
→ RUN SMALLEST FALSIFYING CHECK
→ RUN CROSS-LAYER CHECKS AFTER LAST WRITE
→ REVIEW DIFF
→ COMMIT ONE LOGICAL UNIT
→ PUSH IMMEDIATELY
→ RE-PIN
→ RECORD SAME-COMMIT EVIDENCE
→ CLOSE ZERO GATE
```

## بوابة الصفر لكل مرحلة

```yaml
open_internal_findings: 0
failed_required_checks: 0
unverified_required_behaviors: 0
duplicate_truth_owners: 0
contract_mismatches: 0
unverified_deletions: 0
unresolved_internal_blockers: 0
```

## تنفيذ الرحلات

- لا تفتح رحلة قبل `TASK-0014`.
- الرحلة الواحدة تنفذ شرائح `SL-01..SL-24` حسب `evidence/journey-slice-ledger.csv`.
- لا تجمع رحلتين في حالة `IN_PROGRESS`.
- كل شاشة/Route/تبويب/زر/حالة/صلاحية/API/جدول/Event/Job داخل الرحلة يسجل أو يحذف بعد إثبات.
- الإغلاق يتطلب automated + negative + manual + runtime readback + cleanup + same-SHA evidence.

## الحذف والنقل والدمج

لا ينفذ قرار من `candidate-register.csv` قبل: replacement readiness، consumer migration، compatibility decision، data migration، reference scan، post-write verification، rollback.

## التراجع

كل مهمة تملك rollback مستقلًا في ملفها. لا تعكس migration غير قابلة للعكس عميانًا؛ استخدم recovery/service-owned repair.
