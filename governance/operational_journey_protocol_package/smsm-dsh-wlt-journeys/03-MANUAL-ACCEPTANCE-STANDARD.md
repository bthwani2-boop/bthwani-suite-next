# معيار التجريب اليدوي والإغلاق المرئي

## الهدف

التجريب اليدوي يثبت أن Actor يستطيع إكمال الرحلة من التحكم الحقيقي إلى الحقيقة المحفوظة، وأن كل Surface يعرض النتيجة الصحيحة وحالات الفشل والتعافي.

## قبل الاختبار

- SHA مثبت وRuntime مبني منه.
- قاعدة بيانات معروفة ومهاجرات مطبقة.
- Actors للصلاحية الصحيحة والناقصة والخارجية عن النطاق.
- بيانات Success وEmpty وBlocked وConflict وStale.
- Network inspection وcorrelation IDs.
- لا Mock، لا Fixture كحقيقة، ولا تعديل DB يدوي.

## لكل Surface

يجب فحص Entry/session gate/deep link/back، وكل tab/button/icon/form/filter/sort/pagination، وvisibility/enablement/confirmation، وجميع حالات loading/empty/error/forbidden/blocked/offline/conflict/partial/unknown_result، وduplicate click/slow network/reconnect، وrefresh/restart persistence، وaccessibility/RTL/Arabic/large text، وعدم وجود direct WLT أو endpoint Legacy.

## الدليل

```yaml
manual_acceptance:
  journey_id:
  sha:
  environment:
  actors_and_scopes: []
  test_data: []
  surface_steps: []
  expected_results: []
  actual_results: []
  operation_ids_and_correlation: []
  persisted_readback: []
  negative_results: []
  offline_recovery_results: []
  accessibility_rtl_results: []
  screenshots_recordings: []
  defects: []
  decision: PASS|FIX_REQUIRED|NEEDS_EVIDENCE
```

لا تقبل لقطة شاشة وحدها؛ يجب ربطها بطلب/عملية/أثر محفوظ وReadback.
