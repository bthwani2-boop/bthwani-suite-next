# الإغلاق والتخلص

```yaml
closure_decision: NOT_READY
disposal_decision: NOT_READY
durable_outputs_migrated: false
reference_scan_passed: false
```

بعد إغلاق جميع المهام تُنقل النتائج الدائمة إلى ملاكها، ثم يُشغل `validate-package.mjs --strict --disposal`. لا يحذف إلا مجلد المهمة بعد إثبات انعدام اعتماد runtime أو build أو test أو CI أو migrations أو governance أو operations عليه. تبقى أدوات `_template/` و`new-package.mjs` و`validate-package.mjs`.
