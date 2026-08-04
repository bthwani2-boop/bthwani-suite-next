# PHASE-08 — التنظيف

## النتيجة

تصنيف duplicates وdependencies وhotspots والترحيل الآمن.

## المدخلات

- الرأس المثبت `f085bf81eb27ef10ea2155e19d0e77d4cb15b8e6` عند التشخيص؛ يعاد التثبيت عند التنفيذ.
- findings وwork items وverification matrix في هذه الحزمة.
- المالك المركزي للكود أو العقد أو البيانات المتأثر.

## الاعتماد السابق

PHASE-07 closed with evidence

## المهام

- `TASK-0011`
- `TASK-0012`
- `TASK-0013`
- `TASK-0014`

## بوابة الخروج

صفر مرشح غير مصنف وصفر حذف بلا proof.

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
