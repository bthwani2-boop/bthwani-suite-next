# SMSM DSH/WLT Closure Plan — Compatibility Entrypoint

> **الحالة:** `REPLACED_WITH_CANONICAL_JOURNEY_PACKAGE`
>
> هذا الملف ليس خطة موازية ولا يحتوي سجل حالة أو تعريفات رحلات مستقلة. نقطة التنفيذ الوحيدة هي:
>
> `governance/operational_journey_protocol_package/smsm-dsh-wlt-journeys/README.md`

## الحزمة الحاكمة للتنفيذ

- السلطة والترتيب: `smsm-dsh-wlt-journeys/00-AUTHORITY-EXECUTION-ORDER.md`
- عقد الرحلة والشرائح: `smsm-dsh-wlt-journeys/01-JOURNEY-SLICE-CONTRACT.md`
- سجل التغطية: `smsm-dsh-wlt-journeys/02-COVERAGE-LEDGER-SCHEMA.yaml`
- التجريب اليدوي: `smsm-dsh-wlt-journeys/03-MANUAL-ACCEPTANCE-STANDARD.md`
- سجل الترتيب: `smsm-dsh-wlt-journeys/04-JOURNEY-REGISTRY.yaml`
- سجل الإزالة: `smsm-dsh-wlt-journeys/05-RETIREMENT-REGISTER.md`
- الرحلات: ملفات مستقلة `J001..J107` داخل المجلدات الستة.

## القاعدة

وجود الحزمة لا يعني تنفيذ الرحلات. كل رحلة تبدأ `NOT_ASSESSED`، وتغلق فقط بعد شرائحها الأربع والعشرين والتجريب اليدوي وRuntime Readback وSame-SHA Evidence.
