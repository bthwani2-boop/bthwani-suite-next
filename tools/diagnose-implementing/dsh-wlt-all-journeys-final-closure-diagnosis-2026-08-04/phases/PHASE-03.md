# PHASE-03 — قواعد البيانات

## النتيجة

إصلاح manifests ومصير migrations المحذوفة وحفظ البيانات.

## المدخلات

- الرأس المثبت `f085bf81eb27ef10ea2155e19d0e77d4cb15b8e6` عند التشخيص؛ يعاد التثبيت عند التنفيذ.
- findings وwork items وverification matrix في هذه الحزمة.
- المالك المركزي للكود أو العقد أو البيانات المتأثر.

## الاعتماد السابق

PHASE-02 closed with evidence

## المهام

- `TASK-0003`
- `TASK-0004`

## بوابة الخروج

DSH وWLT fresh/upgrade/replay/checksum/data-preservation PASS.

```yaml
open_internal_findings: 0
failed_required_checks: 0
unverified_required_behaviors: 0
duplicate_truth_owners: 0
contract_mismatches: 0
unverified_deletions: 0
```

## التراجع

لا تنتقل إلى المرحلة التالية. أعد المهمة الذرية الفاشلة إلى آخر SHA مثبت، أصلح السبب الجذري، وأعد التحقق بعد آخر كتابة.
