# السلطة وترتيب التنفيذ

## التصنيف

هذه الحزمة `DERIVED_SUPPORT_ARTIFACT`. لا تتجاوز طلب المستخدم الحالي، `authority-precedence.json`، `AGENTS.md`، Product Truth، أو العقود والسياسات الآلية الحية.

```yaml
repository: bthwani2-boop/bthwani-suite-next
work_branch: smsm
base_branch: smsm
write_mode: DIRECT_WORK_BRANCH
force_push: forbidden
automatic_branch: forbidden
automatic_pr: forbidden
merge: forbidden_without_explicit_authorization
release: forbidden_without_explicit_authorization
production: forbidden_without_explicit_authorization
```

## التسلسل الإلزامي

```text
PIN
→ READ AUTHORITY
→ RESOLVE PRODUCT TRUTH
→ FOUNDATION-00
→ REGENERATE COVERAGE-00
→ OPEN ONE JOURNEY
→ EXECUTE SL-01..SL-24 SEQUENTIALLY
→ TARGETED CHECKS
→ MANUAL ACCEPTANCE
→ RUNTIME READBACK
→ CLEANUP
→ SAME-SHA READ-ONLY VERIFY
→ CLOSE JOURNEY
→ RE-PIN
→ OPEN NEXT JOURNEY
```

## منع التجاوز

- لا قفز إلى واجهة أو زر قبل حسم ملكية الحقيقة والعقد والصلاحية.
- لا رحلة مالية قبل DSH facade وهوية خدمة موثوقة.
- لا إغلاق مع فحص Required متخطى بسبب upstream failure.
- لا توريث PASS من SHA قديم.
- لا عداد صفر لعنصر غير مقاس.
- لا فتح رحلة لاحقة قبل إغلاق تبعياتها.
