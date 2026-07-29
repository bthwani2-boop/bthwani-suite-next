# 07 — نقطة الموافقة قبل التنفيذ

## الحالة الحالية

```yaml
branch_created: true
plan_package_created: true
implementation_started: false
files_deleted: 0
runtime_files_modified: 0
contracts_modified: 0
migrations_modified: 0
governance_modified: 0
pull_request_created: false
merge_performed: false
production_changed: false
```

## ما تعنيه الموافقة على هذه الحزمة

عند صدور موافقة صريحة على بدء التنفيذ، يكون التفويض محصورًا في:

1. العمل مباشرة على `validclean`.
2. بدء الموجة 0 ثم الموجة 1.
3. إصلاح P0 بترتيب الاعتماديات.
4. حذف أو دمج الملفات فقط وفق بروتوكول `05_DELETION_RETENTION_PROTOCOL.md`.
5. إنشاء Commits ذرية صغيرة قابلة للتراجع.
6. تشغيل الفحوص المتأثرة وRuntime عند الحاجة.
7. الاستمرار داخل الفرع دون فتح PR أو دمج `master` إلا بطلب مستقل صريح.

## ما لا تمنحه الموافقة تلقائيًا

حتى بعد الموافقة على التنفيذ، لا يُفترض تلقائيًا:

- Force push أو إعادة كتابة التاريخ.
- دمج إلى `master`.
- حذف بيانات Production.
- تشغيل Migration مدمرة على Production.
- نشر EAS/Stores أو Release.
- تغيير أسرار أو حسابات مزودين حقيقية.
- قبول مخاطر أمنية أو مالية متبقية.
- إعلان إغلاق نهائي دون أدلة.

## أول دفعة تنفيذ مقترحة بعد الموافقة

### Slice VC-000 — Baseline and inventory

- تثبيت رأس `validclean`.
- تشغيل فحوص الحوكمة والعقود والأمن وRuntime القابلة للتشغيل عن بعد أو محليًا.
- بناء جرد المسارات والمالكين والمستهلكين.
- إخراج قرارات أول نطاق P0.

### Slice VC-001 — Identity activation backdoor removal

- حذف `000000` من Repository.
- توحيد خريطة surface.
- إضافة اختبارات Repository سلبية.
- التحقق من مسارات التفعيل الحقيقية لكل actor type.

### Slice VC-002 — Master OpenAPI uniqueness

- جرد مستهلكي `/openapi.yaml` و`contracts/master.openapi.yaml`.
- تثبيت `contracts/master.openapi.yaml` كمرجع وحيد.
- تحديث المستهلكين.
- حذف المصدر الموازي.
- إضافة حارس عام لمنع تكراره.

لا تبدأ `VC-002` قبل ضمان عدم خلطها مع تغييرات Identity في Commit واحد.

## صيغة الموافقة المطلوبة

تكفي موافقة صريحة مثل:

```text
موافق على حزمة validclean. ابدأ التنفيذ على الفرع validclean وفق الموجات والبوابات، دون PR أو دمج master.
```

بعدها يبدأ التنفيذ ولا تعاد مطالبة المالك بتأكيد ما سبق، إلا إذا ظهر قرار منتج جديد غير محسوم، خطر Production، أو تعارض خارجي يمنع الاستمرار بأمان.