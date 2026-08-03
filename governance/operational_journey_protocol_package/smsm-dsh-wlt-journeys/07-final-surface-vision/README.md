# الرؤية النهائية للأسطح بعد إغلاق J001..J107

هذه الملفات تحدد النتيجة النهائية المطلوبة لكل Surface من المنطق التشغيلي والتصميم والتقنية والبرمجة وتجربة المستخدم والأمن والاختبارات. لا تستبدل ملفات الرحلات؛ بل تمنع أن تغلق الرحلات منفردة بينما يبقى السطح النهائي مفككًا أو ناقصًا.

- `CONTROL-PANEL-FINAL-VISION.md`
- `APP-CLIENT-FINAL-VISION.md`
- `APP-PARTNER-FINAL-VISION.md`
- `APP-CAPTAIN-FINAL-VISION.md`
- `APP-FIELD-FINAL-VISION.md`

## قواعد مشتركة

1. كل Surface shell خفيف؛ الحقيقة والمنطق المشترك في مالكه السيادي، لا داخل التطبيق.
2. كل API من عميل مولد عن OpenAPI؛ لا endpoint strings أو DTOs أو status vocabularies موازية.
3. كل route/screen/tab/button/icon/form/filter/sort/pagination مملوك لرحلة وشريحة وعملية حقيقية.
4. visibility ليست authorization؛ Backend يعيد التحقق دائمًا.
5. جميع الحالات المرئية مكتملة: loading/empty/error/forbidden/blocked/conflict/offline/partial/unknown-result/success.
6. كل mutation idempotent عند الخطر وتدعم readback بعد فقد الرد.
7. لا Surface يتصل بـWLT مباشرة؛ كل المال عبر DSH facade.
8. العربية وRTL والوصولية والأداء والخصوصية ليست أعمالًا لاحقة.
9. لا mock/fixture/fallback محلي يصبح حقيقة Runtime.
10. لا يعتبر السطح مغلقًا حتى ينجح التجريب اليدوي من جهاز فعلي أو متصفح حقيقي مع cross-surface readback.
