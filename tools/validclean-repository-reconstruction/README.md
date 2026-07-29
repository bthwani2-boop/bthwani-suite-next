# حزمة إعادة بناء المستودع — validclean

> الحالة الحاكمة: `REPOSITORY_WIDE_RECONSTRUCTION_AUTHORIZED`  
> المستودع: `bthwani2-boop/bthwani-suite-next`  
> فرع التنفيذ: `validclean`  
> مرجع الجرد المثبت: `fbc0139234e2bdb34a8de77d74a6b91297a754b0`  
> تاريخ إعادة التأسيس: `2026-07-29`

## الغرض

هذه ليست خطة أولية ولم تعد في انتظار الموافقة. التنفيذ مصرح به، لكن المستودع غير مغلق. الغرض هو إعادة بناء المستودع كاملًا وإزالة أسباب الانحراف، لا متابعة أخطاء منفردة أو إضافة ترقيعات فوق بنية غير حاكمة.

البرنامج يعالج جذريًا:

1. ملكية الحقيقة وحدود المجالات.
2. Identity وWorkforce وDSH وWLT وPlatform Control وProviders.
3. OpenAPI والـBundles والعملاء المولدين.
4. قواعد البيانات والترحيلات والتاريخ غير القابل للتعديل.
5. الأسطح والعقل المشترك والربط من الطرف إلى الطرف.
6. Runtime وDocker وExpo/EAS/Firebase/Sentry دون مسارات خاصة بجهاز واحد.
7. الحوكمة والمهارات والحراس وGitHub Actions.
8. حذف الضجيج والـNamespaces الوهمية والأدوات غير المستهلكة.
9. إغلاق نهائي على SHA واحد فقط.

## ما ثبت فعليًا

تم جرد كل الملفات المتتبعة عند:

```text
fbc0139234e2bdb34a8de77d74a6b91297a754b0
```

النتائج المنقحة:

```yaml
total_paths: 3938
P0: 56
P1: 60
P2: 229
canonical_operation_id_collisions: 24
migration_prefix_collisions: 32
openapi_owner_missing: 22
absolute_local_paths: 21
unconsumed_tool_candidates: 47
empty_tracked_files: 87
```

التفاصيل والدليل في `08_PINNED_FULL_REPOSITORY_AUDIT.md`.

## حدود التفويض

مصرح داخل `validclean`:

- التشخيص والجرد.
- تعديل وإعادة هيكلة الكود.
- إنشاء/نقل/دمج/حذف الملفات والمجلدات بعد إثبات البديل.
- إعادة بناء العقود والعملاء والحراس.
- تشغيل CI وDB/Runtime verification.
- فتح PR مسودة للتشخيص.

غير مصرح تلقائيًا:

- دمج `master`.
- النشر إلى Production.
- تعديل أسرار أو بيانات إنتاج.

## ملفات الحزمة

### الأساس السابق، بعد تصحيحه

- `00_REMOTE_BASELINE_AND_FINDINGS.md`
- `01_REPOSITORY_DIAGNOSIS_MATRIX.md`
- `02_PRODUCT_AND_OWNERSHIP_MODEL.md`
- `03_OPENAPI_RECONSTRUCTION_PLAN.md`
- `04_EXECUTION_WAVES.md`
- `05_DELETION_RETENTION_PROTOCOL.md`
- `06_ZERO_TOLERANCE_GATES.md`
- `07_APPROVAL_CHECKPOINT.md`

### التوسعة الشاملة الحاكمة

- `08_PINNED_FULL_REPOSITORY_AUDIT.md`: جرد 3,938 مسارًا على SHA مثبت.
- `09_CANONICAL_TARGET_ARCHITECTURE.md`: الهيكل المستهدف ومالكو الحقيقة.
- `10_REPOSITORY_WIDE_EXECUTION_LEDGER.md`: سجل التنفيذ من VC-100 إلى VC-320.
- `11_DELETE_MERGE_MOVE_REGISTER.md`: قرارات الحذف والدمج والنقل والاستبدال.
- `12_DATABASE_MIGRATION_RECONSTRUCTION.md`: Manifest وترتيب الترحيلات دون العبث بالتاريخ المطبق.
- `13_OPENAPI_AND_GENERATED_CLIENT_RECONSTRUCTION.md`: ملكية العمليات والتوليد والـparity.
- `14_NOISE_AND_NAMESPACE_ELIMINATION.md`: إزالة الضجيج والخدمات والمجلدات الوهمية.
- `15_FULLSTACK_SURFACE_AND_RUNTIME_CLOSURE.md`: إغلاق الأسطح والـRuntime رأسيًا.
- `16_GOVERNANCE_AGENTS_GUARDS_REDUCTION.md`: تقليص السلطة والحراس والمهارات.
- `17_FINAL_CLOSURE_MATRIX.md`: العدادات التي يجب أن تصبح صفرًا.
- `plan.manifest.json`: الحالة الآلية الوحيدة للحزمة.

## القواعد الحاكمة

لكل ملف أو مسار قرار واحد:

```text
KEEP_ACTIVE
REPAIR_FOUNDATION
MERGE_TO_CANONICAL_OWNER
GENERATE_FROM_CANONICAL_SOURCE
MOVE_TO_OWNER
MOVE_TO_BUILD_ARTIFACT
REPLACE_THEN_DELETE
DELETE_PROVEN_DEAD
BLOCKED_PENDING_EVIDENCE
```

ممنوع:

- الاحتفاظ بملف لأنه قديم.
- حذف ملف لأنه مزعج دون فحص المستهلك.
- كتابة خطأ ثم Repair لاحق.
- Registry يطرح الحقيقة من عقد آخر.
- عميل Generated مكتوب يدويًا.
- عقد دخول ينسخ Modules.
- Dual-write دائم.
- CI يكتب source أو يدفع Commit تلقائيًا.
- ادعاء 100% مع عدادات غير مثبتة.

## طريقة التنفيذ

```text
تثبيت SHA
→ جرد النطاق
→ اختيار المالك
→ بناء البديل
→ ترحيل جميع المستهلكين
→ حذف المسار القديم
→ فحص Static/Contract/DB/Runtime
→ Commit ذري
→ دليل Same-SHA
```

الحالة النهائية الوحيدة المقبولة:

```text
CLOSED_WITH_EVIDENCE
```

ولا تُعلن إلا بعد أن تصبح مصفوفة `17_FINAL_CLOSURE_MATRIX.md` كلها صفرًا.
