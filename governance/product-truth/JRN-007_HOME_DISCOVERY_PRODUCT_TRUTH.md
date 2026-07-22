# JRN-007 — Home Discovery Product Truth

## Source of truth

- نصوص وصور وترتيب وحالة وجدولة بنرات الصفحة الرئيسية: `dsh_home_banners`.
- نصوص وصور وترتيب وحالة وجدولة عروض الصفحة الرئيسية: `dsh_home_promos`.
- استهداف المدينة ومنطقة الخدمة والجمهور: `dsh_home_content_targets` باعتباره projection فقط؛ لا يملك محتوى أو وسائط أو حالة نشر.
- الظهور والنقر: `dsh_marketing_impressions` و`dsh_marketing_clicks` باعتبارهما سجل قياس append-only، وليس مصدرًا لإعادة بناء محتوى الصفحة.
- الفئات والمتاجر والمجموعات: الكتالوج المركزي والمتاجر المنشورة؛ المجموعات مشتقة من خصائص المتاجر الفعلية ولا تُخزن كحقيقة موازية.

## Ownership boundary

### Home Discovery

يمتلك:

- CRUD البنرات والعروض المنزلية.
- الترتيب والأولوية.
- المسودة والنشر والإيقاف والأرشفة.
- نافذة النشر والانتهاء.
- الاستهداف الإقليمي والجماهيري.
- ربط الإجراء بمتجر أو فئة مركزية أو رابط خارجي آمن.

### Marketing Command Deck

يمتلك:

- الحملات العامة.
- القسائم والسياسات والولاء والاشتراكات.
- سجلات التدقيق والقياس التسويقي المشتركة.

لا يمتلك جداول أو مسارات CRUD موازية لبنرات أو عروض الصفحة الرئيسية. أُزيلت الجداول القديمة بواسطة `dsh-018_retire_marketing_banners_promos.sql`.

## Publication invariant

لا يظهر العنصر في `app-client` إلا إذا تحقق جميع ما يلي:

1. `is_active = true`.
2. `publication_status = 'published'`.
3. وجود اعتماد `approved_at`.
4. بداية النشر لم تأتِ بعد أو أصبحت نافذة.
5. نهاية النشر غير موجودة أو لم تنتهِ.
6. هدف المتجر أو الفئة ما زال منشورًا وصالحًا.
7. المدينة ومنطقة الخدمة والجمهور يطابقون سياق الطلب، أو أن البعد غير مقيد.

## Safe administration sequence

عند طلب النشر من لوحة التحكم:

1. يُحفظ المحتوى كمسودة مع OCC.
2. يُستبدل الاستهداف ذريًا ويُدقق.
3. يُنشر العنصر باستخدام النسخة المرتجعة فقط.

فشل الاستهداف لا يترك محتوى منشورًا خارج قواعده.

## Measurement invariant

- لا يُقبل حدث إلا لعنصر منشور ومتاح للسياق نفسه الذي عرضه.
- `viewerRef` مطلوب وقابل للتحقق.
- ظهور العنصر يُحتسب مرة واحدة لكل جلسة عرض عبر قيد قاعدة البيانات.
- النقرات تبقى أحداثًا قابلة للتكرار.
- فشل القياس لا يعطل رحلة العميل ولا ينشئ عدادات محلية أو بيانات مختلقة.

## Verification

- Source bindings: `services/dsh/tests/jrn-007-home-discovery-closure.test.mjs`.
- Go invariants: `services/dsh/backend/internal/homediscovery/journey_007_test.go`.
- PostgreSQL invariants: `services/dsh/database/tests/dsh-098_099_home_discovery_invariants.sql`.
- Targeted typecheck: `services/dsh/tsconfig.jrn-007.json`.
- Same-commit gate: `journeys/jrn-007/home-discovery`.
