# Global Diagnosis — Field 3 canonical rebaseline

## Baseline

الحزمة أعيد تأسيسها على `A@449b129b526fbe725c6aa6822ef3b3139dd1b8b0` بعد حذف حزمتَي Field الأقدم. لا ترث أي DONE أو PASS سابق؛ التنفيذ يبدأ OPEN ويعيد الإثبات من الصفر على أحدث candidate.

## عيوب جذرية مثبتة

1. **إنشاء مقدم الخدمة الميداني متناقض ومكسور.** العقد يقول independent provider، بينما واجهة الإنشاء أرسلت `employee`. شاشة الإنشاء مرتبطة controller deprecated يعيد خطأ دائمًا، وفي الوقت نفسه توجد `createFieldAgent()` حية غير مستخدمة و`provisioning-cases` frontend موجودة بينما routes الخلفية معلقة. عقد POST نفسه متناقض بين ادعاء إنشاء Identity وبين طلب `actorId` مسبقًا. الجذر المطلوب: public creation command واحدة في Workforce orchestrates Identity داخليًا، ثم حذف كل المسارات/controllers/contracts المتنافسة والميتة.
2. **Activation readiness له أكثر من معنى.** توجد `sovereignFieldsComplete` و`EvaluateProviderActivationReadiness` و`GovernedActivationReadiness`، وشروطها ليست متطابقة. إصدار الكود/الميدلوير/لوحة التحكم يجب أن تعتمد policy واحدة canonical مطابقة للقرار: name+phone+zone+supervisor+verified identity+approved contract؛ لا فرض ضامن/إحالة عالميًا بلا Policy.
3. **ملف الميداني في Control Panel مكرر وغير موصول بالكامل.** `FieldAgentDetailView` و`ProviderDetailView` يمثلان واجهتين متوازيتين؛ تبويب media بلا render كامل، save/supervisor/operational-core logic موجود جزئيًا بلا wiring. يجب اختيار route/view canonical واحد ودمج ما يلزم ثم حذف الآخر والكود الميت.
4. **Partners يحتاج تنظيماً سببيًا لا تراكم Tabs.** Field assignment موجود وفعال، لكن self-initiated onboarding يجب أن يبقى مسموحًا أيضًا. كلا المصدرين يجب أن يصبا في نفس canonical draft/review lifecycle مع provenance، collaboration، handoff، SLA، وreadiness review داخل Partners، بلا shadow states أو raw Actor ID كبديل للمهمة.
5. **الزيارة والChecklist تحتاجان Policy حقيقية.** التنفيذ الحالي يدعم visits/checks/evidence لكنه يعتمد قائمة ثابتة في shared policy/view model. القرار النهائي يفرض checklist حسب Business Vertical من Control Panel، GPS event proof بلا continuous tracking، camera-first evidence، وPartners reviewer مستقل.
6. **Catalog/Publication ownership يحتاج تصحيحًا.** Field لا يملك Master Product، لكنه يستطيع assortment/local commercial data/proposals. Store publication تخص Marketing Control Panel: server-side Composite Gate + audited manual override. Client/Partner readback يجب أن يحافظ على نفس store/product IDs ويثبت positive وnegative paths.
7. **Offline متقدم لكنه غير شامل للنطاق المطلوب.** queue الحالية تعالج visits/checks/escalations والنتيجة المجهولة؛ المطلوب توسيع onboarding drafts/evidence بصورة durable، Catalog cache+draft+revalidation، retention 30 يومًا وواجهة pending/failed/quarantined مع عدم blind replay.
8. **المالية يجب تنظيفها من أشياء ألغيت تجاريًا.** WLT صحيح كمالك للwallet/ledger/commissions/payout، لكن app-field يعرض ProviderIncidentsPanel وتوجد routes/state لincidents/penalties. هذه خارج المنتج الميداني المعتمد ويجب إزالتها من Field وما يصبح ميتًا بسببها. COD كذلك خارج Field تمامًا. العمولة policy-driven بعد approval، payout destination Finance-owned، والتسوية عند offboarding تبقى مالية لا تعطل قطع الوصول.
9. **الاختبارات الحالية ليست كافية كإغلاق E2E.** app-field يملك test/type/lint/build واختبارات offline/readiness/navigation، لكن ذلك لا يثبت Field→Control Panel→Partner→Marketing→Client ولا WLT ولا Android real-device على exact same SHA.

## حدود النطاق

Primary: app-field + كل Control Panel section/tab يقرأ أو يراجع أو يغير حقيقة ميدانية. app-partner/app-client يدخلان readback وإصلاح defect المثبت فقط. app-captain لا يدخل كمنتج؛ فقط shared regression إن عُدل عقد مالي مشترك. Generic dashboard/analytics/administration/login/platform خارج النطاق ما لم يظهر causal dependency مثبت. Marketing داخل النطاق حصريًا لنشر store/product الناتج عن field journey. WLT finance داخل النطاق حصريًا لمالية الميداني.

## التنظيف البنيوي الإلزامي

التنظيف ليس cosmetic. كل duplicate line/state/type/controller/view/API/route/file/directory/package يخالف النموذج المعتمد يجب دمجه أو حذفه. ممنوع ترك aliases مؤقتة أو commented dead routes أو deprecated controllers أو duplicate field packages بعد إثبات عدم الحاجة. إعادة الهيكلة الجذرية مطلوبة عندما يكون العيب بنيويًا؛ workaround وترقيع فوق مسارين متنافسين غير مقبول.

## أدوات الإثبات

تستخدم أدوات Codex/GitHub المتاحة فعليًا، والـcontracts/OpenAPI guards، Graphify، Trivy، Sonar، runtime smokes، database checks، device/EAS وCI عندما تكون مناسبة ومتاحة. عدم توفر أداة يوثق ولا يُدّعى استخدامها. أي warning أو regression متعلق بالنطاق يمنع الإغلاق.
