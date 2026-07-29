# 07 — سجل التفويض وحدود التنفيذ

## حالة التفويض

```yaml
implementation_authorized: true
authorized_branch: validclean
authorized_on: 2026-07-29
scope: REPOSITORY_WIDE_RECONSTRUCTION
create_move_merge_delete_files: authorized_with_evidence
contract_database_runtime_governance_changes: authorized
read_only_diagnostic_pr: created
merge_to_master: false
production_deployment: false
production_data_or_secrets_changes: false
force_push_or_history_rewrite: false
```

صدرت موافقات صريحة متعددة على بدء التنفيذ والاستمرار ومعالجة الأسباب الجذرية، مع صلاحية إعادة الهيكلة والحذف والدمج والنقل والإنشاء داخل `validclean`.

لا تُطلب موافقة جديدة لكل شريحة؛ الاستثناءات الوحيدة:

- قرار منتج جوهري لا يمكن استنتاجه من Product Truth.
- إجراء يمس Production أو بيانات/أسرار حقيقية.
- دمج `master` أو Release/Store submission.
- إعادة كتابة تاريخ Git.
- قبول خطر أمني أو مالي بدل إصلاحه.

## ما يسمح به التفويض

1. جرد كل ملف ومجلد.
2. اختيار المالك الحاكم لكل حقيقة.
3. إعادة بناء العقود والعملاء والترحيلات والحراس.
4. نقل المستهلكين إلى البديل الصحيح.
5. حذف البقايا والـNamespaces الوهمية بعد الإثبات.
6. تشغيل CI وDocker وقواعد بيانات اختبار وRuntime smoke.
7. إنشاء Commits ذرية قابلة للتراجع.
8. استخدام PR المسودة رقم 194 للتشخيص والـsame-SHA CI فقط.

## ما لا يسمح به تلقائيًا

- دمج PR 194 أو أي PR.
- نشر Production أو EAS/Stores.
- تعديل أسرار أو حسابات مزودين حقيقية.
- حذف بيانات Production.
- تشغيل Migration مدمرة على Production.
- Force push.
- إعلان إغلاق مع أدلة ناقصة.

## بروتوكول الحذف

أي حذف يجب أن يثبت:

```text
canonical replacement
→ all consumers migrated
→ dynamic discovery checked
→ tests/runtime pass
→ protected invariant retained
→ old path deleted
→ recurrence gate added
```

السجل العملي في:

```text
11_DELETE_MERGE_MOVE_REGISTER.md
```

## بروتوكول التنفيذ

المرجع الحاكم:

```text
10_REPOSITORY_WIDE_EXECUTION_LEDGER.md
```

لا تعاد هذه الحدود داخل ملفات أخرى. `plan.manifest.json` هو السجل الآلي، وREADME هو المدخل البشري.
