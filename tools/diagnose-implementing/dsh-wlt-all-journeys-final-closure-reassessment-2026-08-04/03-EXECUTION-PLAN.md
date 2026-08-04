# خطة التنفيذ

## المراحل

| المرحلة | النتيجة | المهام | بوابة الخروج |
|---|---|---|---|
| PHASE-00 | سلطة ونطاق وأدلة وخطة | إنشاء الحزمة | strict validation وعدم تعديل المنتج |
| PHASE-01 | manifests والعقود والبيانات متطابقة | TASK-0001 | صفر migration drift |
| PHASE-02 | FOUNDATION ودورة disposal صحيحة | TASK-0002 | حالة حديثة ومنع الحذف غير الموثق |
| PHASE-03 | حدود WLT وحراس AST | TASK-0003 | صفر bypass شامل والحراس يعملون |
| PHASE-04 | inventory وتغطية كل الأسطح والرحلات | TASK-0004 | صفر عنصر غير مصنف |
| PHASE-05 | same-SHA closure | TASK-0005 | كل الفحوص المطلوبة PASS |

## قواعد التنفيذ

يبدأ العمل بالثقة والسلطة والبيانات والعقود، ثم الخدمات والتكاملات، ثم الأسطح والرحلات، ثم التنظيف. لا حذف قبل census للمستهلكين وخطة ترحيل وتراجع وفحص مراجع. لا fallback صامت ولا مصدر حقيقة موازٍ ولا compatibility غير مبررة.

## بوابة الصفر

```yaml
open_findings: 0
failed_required_checks: 0
unverified_required_behaviors: 0
duplicate_truth_owners: 0
contract_mismatches: 0
unclassified_inventory_items: 0
unverified_deletions: 0
```
