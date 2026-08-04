# خطة التنفيذ — إغلاق DSH/WLT وجميع الرحلات

> الخطة لا تمنح إذن تنفيذ. التنفيذ يبدأ فقط بعد اعتماد صريح، مع إعادة تثبيت الرأس قبل كل كتابة.

## 1. الترتيب الإلزامي

`PHASE-00 → PHASE-01 → PHASE-02 → PHASE-03 → PHASE-04 → PHASE-05 → PHASE-06 → PHASE-07 → PHASE-08 → PHASE-09 → PHASE-10`

لا تفتح مرحلة لاحقة إذا بقي finding داخلي قابل للمعالجة أو فحص مطلوب فاشل أو behavior غير مثبت أو duplicate truth owner أو contract mismatch أو deletion غير مثبت.

## 2. فهرس المراحل

| المرحلة | النتيجة | بوابة الخروج | الحالة |
| --- | --- | --- | --- |
| PHASE-00 | تثبيت السلطة والرأس والنطاق والأدلة | Package strict validation and exact remote pin | PLANNED |
| PHASE-01 | الجرد والتصنيف وملاك الحقيقة | 3,558 inventory items classified and evidence indexed | PLANNED |
| PHASE-02 | خط أساس الأدوات والحراس وCI | diff, AST guards, naming and journey diagnostics | PLANNED |
| PHASE-03 | مهاجرات DSH وWLT وحقيقة البيانات | fresh/upgrade/replay/data preservation | PLANNED |
| PHASE-04 | العقود والـroutes والسيادة المالية | zero route mismatch and scoped mutation policy | PLANNED |
| PHASE-05 | التشغيل والتكامل والreadback | full runtime healthy and readable | PLANNED |
| PHASE-06 | الأسطح وFOUNDATION والتغطية | zero unbound screen and current Foundation | PLANNED |
| PHASE-07 | تنفيذ J001..J107 | one journey slice at a time | PLANNED |
| PHASE-08 | التنظيف والتكرار والاعتماديات والhotspots | zero unclassified candidate | PLANNED |
| PHASE-09 | التحقق النهائي على SHA واحد | all required evidence scopes pass | PLANNED |
| PHASE-10 | نقل النتائج والتخلص من الحزم المؤقتة | strict disposal and reference scan | PLANNED |

## 3. ترتيب المهام الذرية

| الترتيب | المهمة | النتيجة الذرية | تعتمد على | التحقق |
| ---: | --- | --- | --- | --- |
| 1 | TASK-0001 | إزالة مانع immutable diff | None | VER-0001 |
| 2 | TASK-0002 | توحيد Compiler API للحراس | TASK-0001 | VER-0002 |
| 3 | TASK-0003 | إصلاح سلطة مهاجرات DSH | TASK-0002 | VER-0003 |
| 4 | TASK-0004 | إصلاح سلطة مهاجرات WLT | TASK-0003 | VER-0004 |
| 5 | TASK-0005 | إضافة تشخيص منظم لـJourney Gate | TASK-0004 | VER-0005 |
| 6 | TASK-0006 | تقارب عقود DSH وتسجيلات الخادم | TASK-0005 | VER-0006 |
| 7 | TASK-0007 | استبدال موافقة WLT الشاملة بسجل عمليات | TASK-0006 | VER-0007 |
| 8 | TASK-0008 | إغلاق full runtime readback | TASK-0007 | VER-0008 |
| 9 | TASK-0009 | حسم ربط الشاشات التسع | TASK-0008 | VER-0009 |
| 10 | TASK-0010 | مواءمة naming مع القالب الدائم | TASK-0009 | VER-0010 |
| 11 | TASK-0011 | تنظيف Knip وتصنيف dependencies | TASK-0010 | VER-0011 |
| 12 | TASK-0012 | توحيد DSH HTTP helpers | TASK-0011 | VER-0012 |
| 13 | TASK-0013 | تصنيف مجموعات التطابق البايتي | TASK-0012 | VER-0013 |
| 14 | TASK-0014 | تفكيك hotspots المثبتة فقط | TASK-0013 | VER-0014 |
| 15 | TASK-0015 | إعادة تثبيت FOUNDATION وسجل التغطية | TASK-0014 | VER-0015 |
| 16 | TASK-0016 | تنفيذ الرحلات J001 إلى J107 بالتسلسل | TASK-0015 | VER-0016 |
| 17 | TASK-0017 | التخلص من الحزمة القديمة بأمان | TASK-0016 | VER-0017 |
| 18 | TASK-0018 | الإغلاق النهائي على SHA واحد | TASK-0017 | VER-0018 |

- تفتح مهمة واحدة فقط.
- بعد كل كتابة: التحقق المستهدف، commit، push، إعادة pin، ثم فتح التالية.
- لا force push ولا دمج ولا release ولا production action ضمن هذه الحزمة.

## 4. تنفيذ الرحلات

`evidence/journey-slice-ledger.csv` يسجل 2,568 شريحة بالترتيب. هذا السجل لا يكرر تعريف الشريحة؛ التعريف الحاكم داخل dossier كل رحلة. عند PHASE-07:

1. افتح J001 فقط.
2. افتح SL-01 فقط.
3. نفذ vertical slice عبر contract/backend/data/surfaces/tests/observability.
4. أغلق الشريحة بأدلة نفس SHA.
5. افتح الشريحة التالية.
6. لا تغلق الرحلة قبل SL-24 والقبول اليدوي والruntime readback والتنظيف.
7. أعد pin ثم انتقل إلى الرحلة التالية حتى J107.

## 5. بوابة الخطة

```yaml
unclassified_inventory_items: 0
findings_without_evidence: 0
findings_without_root_cause: 0
internal_findings_without_work_items: 0
work_items_without_acceptance_criteria: 0
work_items_without_verification: 0
unresolved_template_markers: 0
dependency_cycles: 0
```

## 6. بوابة الإغلاق النهائي

```yaml
open_findings: 0
failed_required_checks: 0
skipped_required_checks_due_to_internal_failure: 0
unverified_required_behaviors: 0
duplicate_truth_owners: 0
contract_mismatches: 0
unverified_deletions: 0
open_journeys: 0
open_journey_slices: 0
outside_references_to_package: 0
```

## 7. التراجع

كل مهمة commit مستقل. التراجع بالكود يتم عبر revert للـcommit الذري. مهاجرات البيانات تحتاج recovery path مثبتة ولا تُعكس تلقائيًا. تغييرات العقود لا تُرجع منفردة عن الخادم والعملاء والمستهلكين.
