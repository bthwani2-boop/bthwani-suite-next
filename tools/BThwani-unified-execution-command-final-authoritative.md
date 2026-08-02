# الأمر التنفيذي الهندسي الحاكم والعميق والنهائي لمنظومة بثواني

> **تنبيه السلطة والتفويض:** هذا الملف أمر تنفيذي دائم وقابل لإعادة الاستخدام، ولا يمنح نفسه سلطة مستقلة على الحوكمة الحية، ولا تمنح القيم الافتراضية داخله إذن كتابة أو Push أو PR أو Merge أو Release أو Production. تطبق تعليمات المهمة الحالية ثم `governance/authority/authority-precedence.json` ثم `AGENTS.md` ثم الحوكمة والعقود النشطة. التفويض الفعلي يثبت من طلب المستخدم الحالي ومن مدخلات المهمة المعبأة.

## معيار الدقة والانضباط

ابدأ التنفيذ فور ثبوت المدخلات والتفويض، واستهدف دقة قابلة للإثبات وبوابات صفرية تمنع:

```text
ERROR
CONTRADICTION
OMISSION
FORGETTING
DUPLICATION
GAP
NOISE
LOGIC_WEAKNESS
RUNTIME_WEAKNESS
SCOPE_DRIFT
UNVERIFIED_FAILURE
DEFECT
FALSE_SUCCESS
```

لا يجوز تحويل عبارة «الدقة الكاملة» إلى ادعاء غير مثبت. معناها التنفيذي هو: لا يصدر النجاح إلا بعد تنفيذ الفحوص المنطبقة، ومعالجة كل فشل داخلي قابل للإصلاح، وربط الأدلة بالالتزام النهائي نفسه، والإفصاح الصريح عن أي مانع خارجي أو دليل غير متاح.


## قاعدة حفظ كل معنى صحيح

عند تنقيح هذا الأمر أو دمج قواعده أو تطبيقه:

1. لا تُحذف قاعدة صحيحة لمجرد أنها ظهرت في نسخة أقدم أو في ملحق.
2. عند تكرار المعنى، تُحفظ **مجموعة القيود الأقوى كاملة** في موضع حاكم واحد، ثم يزال التكرار النصي فقط.
3. عند التعارض، يُحسم وفق ترتيب السلطة الحي، ويُحتفظ بالقاعدة الصحيحة الناتجة مع إزالة القاعدة المتقادمة.
4. أي قاعدة تزال يجب أن تصنف داخليًا إلى واحد من:
   `DUPLICATE_MERGED` أو `CONTRADICTED_BY_HIGHER_AUTHORITY` أو `OBSOLETE` أو `NOT_APPLICABLE_WITH_REASON`.
5. يمنع اختصار قاعدة إذا أدى الاختصار إلى فقد شرط أمان أو ملكية أو نطاق أو فشل أو تعافٍ أو تحقق أو اعتماد.
6. لا تعتبر قلة الأسطر هدفًا؛ الهدف هو أقل نص غير مكرر يحتفظ بجميع المعاني المنطبقة.


# تمهيد حاكم — حقيقة منصة بثواني وحدود نموذج التشغيل

هذا الأمر مخصص لمنصة بثواني، ويجب تفسير كل بند فيه وفق ملف الحقيقة الحاكم الموجود على مرجع التنفيذ المثبت، لا وفق تسمية تاريخية أو افتراض عام بأنها منصة مستقلة لكل شريك.

## التوصيف الرسمي للمنصة

```text
BThwani Unified Multi-Surface B2B2C Commerce,
Fulfillment and Financial Platform,
with Partner Management capabilities.
```

بالعربية:

> بثواني منصة موحدة متعددة الأسطح للتجارة والكتالوج والطلبات وتنفيذ الطلبات والتوصيل والإدارة المالية، تربط المشغّل والشريك والكابتن والميداني والعميل، وتوفر للشركاء أدوات إدارة وتشغيل داخل المنصة، دون إنشاء منصة مستقلة أو حد عزل مستقل لكل شريك.

## النموذج الهندسي الحاكم

```yaml
platform_profile:
  source_of_truth: governance/product/platform-model.yaml
  platform_type: UNIFIED_MULTI_SURFACE_B2B2C_COMMERCE_FULFILLMENT_FINANCIAL_PLATFORM
  operating_model: BTHWANI_OPERATED_PLATFORM
  software_delivery_model: UNIFIED_PLATFORM
  trusted_isolation_boundary: PLATFORM_CONTEXT
  operator_context_purpose: TRUST_AND_DATA_ISOLATION
  partner_scope_type: BUSINESS_SCOPE
  store_scope_type: BUSINESS_SCOPE
  actor_scope_type: IDENTITY_AND_ASSIGNMENT_SCOPE
  generic_scope_identifier: FORBIDDEN
```

تُقرأ القيم الحية من المصدر الحاكم على SHA المثبت. لا يثبت هذا الأمر حالة تنفيذية أو تجارية أو إنتاجية بعينها، ولا يسمح لنص وصفي أن يتجاوز الملف الآلي.

## الممثلون والسياقات والنطاقات

لا يثبت هذا الأمر قائمة Actor Types بوصفها قائمة أبدية؛ تُقرأ القائمة من Product Truth والنموذج الحاكم. القواعد الدائمة هي:

```text
Platform Context = حد العزل الأعلى للمنصة.
Operator Context = سياق سلطة تشغيلية موثوق داخل Platform Context.
Partner          = نطاق الأعمال الأعلى داخل DSH.
Store            = وحدة تشغيل وكتالوج وتنفيذ تابعة لـPartner.
Actor            = هوية أعمال موثقة تنفذ فعلًا عبر جلسة وصلاحيات وتكليفات.
Service Identity = هوية خدمة موثوقة للاتصال بين الخدمات، وليست Actor أعمال.
Assignment       = تكليف Actor على Partner أو Store أو Area أو Department أو Role.
```

لا يجوز مساواة هذه المفاهيم أو استخدام معرف عام ملتبس بدلها. كل حقل ملتبس يُصنف إلى قرار واحد:

```text
KEEP_AS_PLATFORM_CONTEXT_ID
RENAME_TO_OPERATOR_CONTEXT_ID
RENAME_TO_PARTNER_ID
RENAME_TO_STORE_ID
RENAME_TO_REGION_OR_AREA_ID
RENAME_TO_ACTOR_OR_ASSIGNMENT_SCOPE
REMOVE_AFTER_BACKFILL
```

أي اسم تاريخي لحقل الشريك لا ينشئ نطاق أعمال ثالثًا؛ يُعامل بوصفه تسمية تقنية قائمة، ويُرحّل إلى `partner_id` فقط عبر عقد وتوافق وMigration وBackfill مثبتة، لا بإعادة تسمية عمياء.


لا يفرض هذا الأمر إعادة تسمية فورية لأي حقل حي. أثناء التنفيذ تُقرأ الأسماء الفعلية من العقود والمهاجرات والكود على SHA المثبت، ثم يُتخذ قرار `KEEP` أو `MIGRATE` أو `DEPRECATE` بناءً على الأثر والتوافق والبيانات، مع بقاء النموذج المفاهيمي محصورًا في `Partner / Store`.

## حدود ملكية المجالات

```text
Identity          → Actor، المصادقة، الجلسات، الأجهزة، الأدوار، الصلاحيات، هوية الخدمات.
Workforce         → الملف المهني والوظيفي، الأقسام، المسميات، المشرفون، التكليفات، الجاهزية والوثائق.
DSH               → Partner، Store، الكتالوج، Assortment، السلة، الطلب، Fulfillment، Dispatch، Delivery، التشغيل.
WLT               → المحافظ، Ledger، الأرصدة المشتقة، الدفع، العمولة، الاشتراك المالي، الدين، التسوية، الاسترداد، COD، Payout، Reconciliation؛ وهو المالك الوحيد للحقيقة المالية.
Platform Control  → التغييرات السيادية، حالة المنصة، Feature rollout، السياسات المركزية، والموافقات التشغيلية المعتمدة.
Providers         → تعريف المزود، قدراته، حالته، مراجع الأسرار وسياسات الاتصال.
Media             → Metadata الملفات، المالك والنطاق والغرض، الرفع والتنزيل والمسح والاحتفاظ والحذف.
Shared Brains     → Controllers وAdapters وView Models وقراءة العقود والعملاء المولدين.
Surfaces          → العرض والتركيب والتنقل والحالة المرئية فقط؛ وتصل إلى الماليات عبر واجهة DSH الحاكمة دون استدعاء WLT مباشرة.
```

## تعريف قدرات إدارة الشريك داخل بثواني

قدرات إدارة الشريك تعني أن الشريك يحصل على أدوات مستضافة لإدارة أعماله داخل منظومة بثواني، دون أن يملك نسخة مستقلة من المنصة أو حد عزل سياديًا مستقلًا.

يشمل النطاق الوظيفي الذي يجب فحصه عند تأثر قدرات إدارة الشريك، وفق Product Truth والعقود الحية:

* إدارة بيانات الشريك التجارية والتشغيلية المسموحة.
* إدارة مستخدمي الشريك وصلاحياتهم الداخلية وتكليفاتهم ونطاقاتهم.
* إدارة الفروع والمتاجر وساعات العمل والحالة والجاهزية.
* إدارة الكتالوج المركزي عبر Proposals وAssortment والأسعار والتوفر والنشر، دون كتالوج محلي موازٍ.
* استقبال الطلبات وقبولها أو رفضها وتجهيزها وفق السياسات والحالات المركزية.
* إدارة مناطق التغطية وسياسات توصيل الشريك والأسعار والحدود المعتمدة.
* إدارة كباتن الشريك وربطهم بالمتاجر والنطاقات المسموحة.
* الإسناد وإعادة الإسناد والمتابعة وفشل التسليم وإثبات التنفيذ.
* التقارير التشغيلية والمالية المقيدة بنطاق الشريك والمتجر.
* المحفظة والقيود المقروءة والمستحقات والديون والتسويات وطلبات السحب، مع بقاء الحقيقة المالية في WLT.
* إعدادات توصيل المتجر: المجاني أو تسعير بثواني أو السعر الثابت أو التسعير حسب المنطقة وفق Product Truth الفعال.
* الدعم والنزاعات والتدقيق وسجل القرارات والتدخلات اليدوية.
* حالات Loading وEmpty وError وBlocked وConflict وOffline وUnknown Result والقراءة الراجعة.

القواعد الحاسمة:

```text
Partner management capabilities remain inside the BThwani platform
Monthly subscription is a pricing and billing relationship only
Order commission is a commercial model only
Partner scope isolation remains a business and authorization boundary
```

## نموذج المنتج التشغيلي المرجعي

تتحقق القيم التالية من Product Truth والعقود الحية قبل التنفيذ، ولا يعاد تعريفها داخل الأسطح:

```text
CaptainAffiliation:
- BTHWANI
- PARTNER

FulfillmentMode:
- BTHWANI_CAPTAIN
- PARTNER_CAPTAIN
- PARTNER_SELF_FULFILLMENT
- CUSTOMER_PICKUP

PartnerCommercialModel:
- COMMISSION
- SUBSCRIPTION
- HYBRID
- OPERATOR_MANAGED

PartnerDeliveryPricingPolicy:
- FREE_DELIVERY
- BTHWANI_PRICING
- PARTNER_FIXED_PRICING
- ZONE_PRICING

PartnerCaptainCompensation:
- MONTHLY_SALARY
- FIXED_PER_DELIVERY
- PERCENTAGE_OF_DELIVERY_FEE
- NO_PER_ORDER_COMPENSATION
```

هذه القيم تصف أبعادًا مستقلة: وضع تنفيذ الطلب لا يحدد تلقائيًا نموذج إيراد بثواني، ونموذج إيراد بثواني لا يحدد تلقائيًا تسعير توصيل الشريك، وتعويض كابتن الشريك لا يساوي عمولة بثواني.

## الفصل بين DSH وWLT

```text
DSH يثبت ماذا حدث تشغيليًا.
WLT يثبت ماذا حدث ماليًا.
التطبيقات والأسطح لا تستدعي WLT مباشرة؛ تصل إلى القراءات والأوامر المالية المصرح بها عبر واجهة DSH الحاكمة، بينما تبقى الكتابة والحقيقة المالية داخل WLT.
```

لا يحسب DSH الرصيد أو العمولة النهائية أو الدين أو التسوية، ولا تعدل الأسطح هذه الحقائق. يرسل DSH الأدلة التشغيلية والمراجع المؤرخة، ويطبق WLT السياسة المالية الفعالة ويكتب قيودًا ذرية قابلة للتدقيق وIdempotent ثم يعيد Readback موثقًا.

## الحالات التجارية والإنتاجية

لا يثبت هذا الأمر أسماء حالات تجارية أو إنتاجية بعينها. تُقرأ الحالات والانتقالات والسلطات من Product Truth وسياسة الإصدار والعقود الآلية الحية.

القواعد الدائمة:

```text
TECHNICAL READINESS ≠ PRODUCT ACCEPTANCE
PRODUCT ACCEPTANCE ≠ COMMERCIAL ACTIVATION
COMMERCIAL ACTIVATION ≠ RELEASE AUTHORIZATION
RELEASE AUTHORIZATION ≠ PRODUCTION AUTHORIZATION
```

- لا تستنتج حالة من أخرى.
- لا تعرض قدرة أو خطة أو فوترة أو نشرًا مستقلًا ما لم تكن فعالة في Product Truth والعقود وRuntime.
- أي قدرة مؤجلة في المصدر الحاكم تبقى غير فعالة.
- أي نموذج مستقل مستقبلًا يحتاج تغيير Product Truth ومعمار وأمن وبيانات وماليات وإصدار وتفويض صريح.

---

# التفويض التنفيذي الجذري لمعالجة المستودع أو أي نطاق مطلوب

نفّذ معالجة هندسية جذرية وشاملة للمستودع بأكمله أو للنطاق المحدد في المهمة بدقة صارمة، وابدأ بتشخيص معماري وتقني ومنطقي وتشغيلي عميق لكل ملف ومجلد ووحدة وخدمة وعقد وقاعدة بيانات وسطح وتدفق وتكامل وإعداد واختبار وأداة حوكمة تقع داخل النطاق المتأثر أو يثبت ارتباطها به، دون افتراض مسبق لسلامتها. حدّد الأسباب الجذرية لجميع الفجوات والمخالفات والتناقضات والنواقص والازدواجية ومصادر الحقيقة المتوازية والاعتماديات الخاطئة والديون التقنية والهياكل الضعيفة والملفات المشتتة أو عديمة القيمة أو ذات المسميات والمسؤوليات غير الصحيحة، ثم نفّذ الحل الأنسب والأكثر كفاءة واستدامة وفق أفضل الممارسات الهندسية والمعمارية والأمنية.

عند وجود تفويض الكتابة، يسمح بإعادة الهيكلة أو إعادة البناء أو الحذف أو النقل أو الدمج أو التقسيم أو إعادة التسمية أو الاستبدال أو الإضافة أو الإزالة متى ثبت أنها أكثر أمانًا وأقل تعقيدًا من ملاحقة الأخطاء داخل تصميم فاسد. تعالج كل مشكلة من مصدرها الحقيقي لا من أعراضها، ويمنع استخدام الترقيعات المؤقتة أو طبقات التوافق غير الضرورية أو الحلول الالتفافية أو تكرار المنطق أو إنشاء مصادر حقيقة بديلة أو إبقاء ملفات قديمة احتياطية داخل المسارات الحية.

يمنع استنزاف الوقت والسياق في مطاردة أخطاء متسلسلة داخل مكوّن ثبت فساد أساسه؛ يستبدل حينها بتصميم صحيح ومبسّط مع خطة انتقال واختبارات تمنع الرجوع. ينفذ العمل بترتيب متدرج يبدأ بحدود الثقة والسيادة والهوية والصلاحيات والنطاق الموثوق وحقيقة البيانات والعقود المركزية والاعتماديات المعمارية والحدود المالية، ثم ينتقل إلى الخدمات والتكاملات والأسطح والتجربة التشغيلية والأدوات والوثائق.

يجب الحفاظ على الوظائف الصحيحة والبيانات الضرورية والتوافقات المعتمدة فقط. لا يحذف أي عنصر قبل تحليل استخدامه واعتمادياته وتأثيره وخطة ترحيله أو استبداله، ولا يعتبر أي ملف سليمًا لمجرد أنه لا يفشل حاليًا. لا تعد المهمة مكتملة إلا بعد إزالة الأسباب الجذرية والبقايا والازدواجيات والمسارات المهجورة، وتوحيد الملكية ومصادر الحقيقة والمسميات والحدود والمسؤوليات، وتشغيل الفحوص والبناء والاختبارات الوحدوية والتكاملية والتعاقدية والأمنية والسلبية واختبارات الترحيل والتراجع والتشغيل الفعلي على جميع الأجزاء المتأثرة.

يقدم في النهاية دليل قابل للتدقيق يوضح ما شُخّص وما حُذف وما نُقل وما دُمج وما أُعيد بناؤه وما تم التحقق منه، مع قائمة صريحة بأي نقطة لم يمكن إثبات إغلاقها بدل الادعاء غير المدعوم بالكمال.

عبارات «صفر أخطاء» و«الدقة الكاملة» و«100%» هي أهداف بوابات وليست ضمانًا لفظيًا. تتحقق فقط عندما تكون العدادات المنطبقة صفرًا، وجميع الفحوص المطلوبة ناجحة على SHA النهائي نفسه، ولا يبقى عنصر غير مثبت. أي استثناء أو مانع يصرح به صراحة ولا يخفى.

---

@GitHub

نفّذ المهمة المحددة أدناه تشخيصًا وإصلاحًا وربطًا وتنظيفًا وتحققًا وإغلاقًا عمليًا كاملًا، وفق المنهجية الحاكمة:

**Unified Full-Stack Multi-Surface B2B2C Platform — Domain-Owned, Trusted-Scope, Platform-Model-Aware, Code-First, Fix-First, Runtime-Proven, Evidence-Governed**

هذا الأمر صالح لأي:

* تطبيق.
* سطح.
* قسم.
* صفحة.
* شاشة.
* تبويب.
* واجهة.
* مكوّن.
* زر.
* أيقونة.
* وظيفة.
* Feature.
* Capability.
* تدفق.
* رحلة مستخدم.
* عملية تشغيلية.
* API.
* خدمة خلفية.
* قاعدة بيانات.
* Migration.
* تكامل.
* مزود خارجي.
* Runtime.
* Docker profile.
* Workflow.
* حارس.
* اختبار.
* مهمة تنظيف أو إعادة هيكلة.
* مراجعة فرع أو Pull Request أو عملية دمج.

لا تتعامل مع المطلوب كملف منفرد أو شاشة معزولة أو مهمة Frontend أو Backend منفصلة، بل بوصفه نطاقًا تشغيليًا رأسيًا كاملًا يبدأ من حاجة المستخدم، ويمر بجميع الطبقات والأسطح والخدمات والعقود والبيانات المتأثرة، وينتهي بحقيقة صحيحة محفوظة وقابلة للقراءة الراجعة والتحقق.

---

# المحرك التنفيذي الإلزامي

هذا القسم ليس شرحًا نظريًا. هو أمر تنفيذ مباشر يجب تطبيقه كلما كانت المهمة في وضع تنفيذ وكانت صلاحيات الكتابة متاحة.

## الأمر التنفيذي الجذري

نفّذ المهمة كاملة فعليًا على المرجع الذي يحدده المستخدم ومن أحدث SHA ريموت مثبت. ابدأ بتشخيص أصغر نطاق كامل يكشف السبب الجذري، ثم أغلق كل فجوة مثبتة في الكود الحقيقي والعقد والبيانات والتشغيل والأسطح المتأثرة. لا تتوقف بعد أول إصلاح أو أول Commit أو أول Push أو أول فحص ناجح. استمر حتى يصبح كل عنصر داخل النطاق مغلقًا بدليل من الالتزام النهائي نفسه، أو يبقى مانع خارجي حقيقي لا يمكن تجاوزه.

عالج السبب في مالك الحقيقة الصحيح، لا العرض في أقرب ملف. لا تنشئ مصدر حقيقة ثالثًا، ولا تبقِ مسار كتابة موازٍ، ولا تستخدم Fallback صامتًا، ولا تحوّل المشكلة إلى تقرير أو TODO أو Guard بدل إصلاحها عندما يكون الإصلاح ممكنًا ومصرحًا به.

## الحلقة الحاكمة

```text
PIN
→ READ AUTHORITY
→ RESOLVE PRODUCT TRUTH
→ DEFINE SCOPE
→ INVENTORY OWNERS AND CONSUMERS
→ DIAGNOSE
→ PROVE ROOT CAUSE
→ FIX CANONICAL OWNER
→ COMPLETE FULL-STACK BINDING
→ COMPLETE REQUIRED SURFACES
→ MIGRATE DATA AND CONSUMERS WHEN REQUIRED
→ REMOVE PARALLEL WRITES, FALLBACKS AND RESIDUE
→ VERIFY TARGETED BEHAVIOR
→ FIX EVERY IN-SCOPE FAILURE
→ READ-ONLY REVERIFY
→ REVIEW DIFF
→ COMMIT LOGICAL UNIT
→ PUSH WHEN AUTHORIZED
→ RE-PIN REMOTE HEAD
→ CONTINUE
→ FINAL SAME-SHA VERIFICATION
→ DECIDE
```

## قواعد الاستمرار والإنهاء حسب وضع المهمة

في وضع `EXECUTE` لا تتوقف عند:

- اكتشاف السبب الجذري دون إصلاحه.
- إصلاح ملف واحد مع بقاء عقد أو جدول أو مستهلك أو سطح متأثر.
- نجاح Typecheck أو Lint أو Build وحده.
- نجاح اختبار واحد مع بقاء Runtime أو Persistence أو Readback مطلوب غير مثبت.
- إنشاء Commit أو Push مع بقاء Finding داخلي قابل للإصلاح.
- انخفاض عدد الأخطاء دون وصول العدادات المنطبقة المقاسة إلى الصفر.
- ظهور مشكلة جديدة مثبتة داخل النطاق أثناء التحقق.
- اكتمال الكتابة مع بقاء مراجعة Diff أو التحقق النهائي غير منفذ.

ينتهي وضع التنفيذ بأحد القرارات الحاكمة فقط:

```text
CLOSED_WITH_EVIDENCE
READY_FOR_REVIEW
NEEDS_EVIDENCE
BLOCKED_EXTERNAL
FIX_REQUIRED
PROTOCOL_VIOLATION
```

- `CLOSED_WITH_EVIDENCE`: جميع الأدلة والاعتمادات المنطبقة نجحت على Final SHA واحد.
- `READY_FOR_REVIEW`: اكتمل التنفيذ والتحقق المستهدف، لكن اعتمادًا مستقلًا مطلوبًا لم يصدر.
- `NEEDS_EVIDENCE`: التنفيذ قد يكون موجودًا، لكن دليلًا مطلوبًا مفقود أو قديم.
- `BLOCKED_EXTERNAL`: مانع خارجي حقيقي يمنع الإكمال.
- `FIX_REQUIRED`: بقي فشل داخلي مثبت.
- `PROTOCOL_VIOLATION`: خولفت قاعدة سلطة أو نطاق أو أمان أو دليل.

أوضاع `DIAGNOSE` و`VERIFY` و`REVIEW` تنتهي بالقرار الذي يطابق نطاقها الفعلي، دون إجبارها على ادعاء إغلاق.

## سلوك أوضاع المهمة

### DIAGNOSE

```text
READ ONLY
→ PIN
→ TRACE
→ PROVE FINDINGS
→ IDENTIFY ROOT CAUSES
→ DEFINE REQUIRED FIXES
→ DO NOT WRITE
```

يصدر التشخيص Findings قابلة للتنفيذ، لا قائمة احتمالات عامة.

### EXECUTE

```text
PIN
→ DIAGNOSE ENOUGH TO PROVE ROOT CAUSE
→ WRITE CANONICAL FIX
→ VERIFY THE LOGICAL UNIT
→ COMMIT WHEN AUTHORIZED
→ PUSH ACCORDING TO THE APPROVED STRATEGY
→ RE-PIN
→ CONTINUE UNTIL NO FIXABLE IN-SCOPE FINDING REMAINS
→ RUN FINAL READ-ONLY VERIFICATION
→ ISSUE THE CANONICAL DECISION
```

لا يتحول وضع التنفيذ إلى تشخيص فقط ما دام الإصلاح داخل الصلاحيات والنطاق. إذا بقي اعتماد محمي أو دليل خارجي بعد اكتمال التنفيذ، يصدر القرار المناسب بدل الادعاء بالإغلاق.

### VERIFY

```text
READ ONLY
→ PIN CANDIDATE SHA
→ RUN APPLICABLE CHECKS
→ CONFIRM READBACK AND ZERO GATES
→ REPORT ONLY PROVEN RESULTS
```

لا يعدل التحقق النهائي المصدر.

### REVIEW

```text
PIN REVIEWED SHA
→ INSPECT DIFF AND OWNERSHIP
→ TEST CLAIMS AGAINST CONTRACTS AND RUNTIME EVIDENCE
→ CLASSIFY FINDINGS BY SEVERITY
→ DO NOT APPROVE UNPROVEN PROTECTED WORK
```

### MERGE

```text
VERIFY EXPLICIT AUTHORIZATION
→ VERIFY EXPECTED HEAD SHA
→ VERIFY REQUIRED CHECKS AND APPROVALS
→ VERIFY NO BLOCKER OR CONFLICT
→ MERGE USING AUTHORIZED METHOD
→ VERIFY RESULTING SHA
```

لا يُدمج تلقائيًا لمجرد أن التغيير صحيح تقنيًا.

### CLEANUP

```text
PIN
→ PROVE REFERENCES AND RUNTIME REACHABILITY
→ CLASSIFY KEEP | MERGE | MOVE | RETIRE
→ MIGRATE REQUIRED CONSUMERS
→ DELETE ONLY PROVEN DEAD RESIDUE
→ VERIFY ZERO LEGACY REACHABILITY
```

لا يعتمد الحذف على العمر أو الاسم أو عدم ظهور فشل حالي.

### RELEASE

```text
VERIFY EXPLICIT RELEASE AUTHORIZATION
→ PIN CANDIDATE SHA
→ VERIFY REQUIRED EVIDENCE SCOPES
→ VERIFY ARTIFACT PROVENANCE
→ VERIFY ROLLBACK AND RECOVERY
→ PERFORM ONLY THE AUTHORIZED RELEASE ACTION
→ VERIFY THE RESULTING STATE
```

تفويض التنفيذ أو الدمج لا يساوي تفويض Release أو Production.

## أمر PIN وتثبيت الحقيقة

قبل التشخيص، وقبل كل دفعة كتابة، وبعد كل Push، وقبل القرار النهائي:

```text
RESOLVE exact repository
RESOLVE exact user-named branch or ref
FETCH current remote head
PIN current SHA
VERIFY expected_head_sha
READ from the pinned ref only
REJECT stale local, cached or historical evidence
```

إذا تحرك المرجع:

```text
STOP WRITE
→ FETCH NEW HEAD
→ COMPARE SEMANTIC CHANGES
→ RECONCILE SAFELY
→ RE-RUN AFFECTED CHECKS
→ CONTINUE FROM NEW PIN
```

ممنوع Force Push أو Reset أو الكتابة فوق تغيير أحدث لتسهيل التنفيذ.

## أمر تعريف النطاق

قبل أول تعديل، حدّد فعليًا:

```text
REQUESTED OUTCOME
PRODUCT TRUTH
ACTORS AND SERVICE IDENTITIES
PLATFORM CONTEXT
OPERATOR CONTEXT
PARTNER SCOPE
STORE SCOPE
ROLES AND PERMISSIONS
CANONICAL OWNER
CANONICAL WRITE PATH
READ CONSUMERS
CONTRACT OPERATIONS
GENERATED CLIENTS
BACKEND ROUTES AND DOMAIN SERVICES
TABLES, MIGRATIONS, CONSTRAINTS AND INDEXES
EVENTS, OUTBOX, JOBS, CACHES, MEDIA AND PROVIDERS
REQUIRED SURFACES
NEGATIVE, RETRY, OFFLINE AND RECOVERY BEHAVIOR
ALLOWED PATHS
READ-ONLY PATHS
FORBIDDEN PATHS
ACCEPTANCE CRITERIA
```

لا تستخدم «Frontend» أو «Backend» أو «المستودع» وصفًا نهائيًا للنطاق. سمِّ المسارات والعمليات والطبقات والأسطح الفعلية.

## أمر التشخيص العميق

نفّذ التتبع التالي بقدر انطباقه:

```text
TRACE user action to persisted truth
TRACE every write path to one canonical owner
TRACE readback to every required consumer
TRACE Identity permission to backend enforcement
TRACE Partner/Store scope from trusted session to query and constraint
TRACE OpenAPI operation to generated client and live handler
TRACE state transition to database transaction
TRACE DSH operational evidence to WLT financial effect
TRACE event from producer transaction to consumer and retry path
TRACE cache key, invalidation and stale-read behavior
TRACE offline queue and reconnect conflict behavior
TRACE runtime configuration and provider dependency
TRACE every visible control to real backend effect
SEARCH semantic duplicates under different names
SEARCH parallel writable sources
SEARCH legacy fallbacks and compatibility residue
SEARCH runtime-reachable mocks, fixtures and seeds
SEARCH dead routes, unreachable screens, orphan tables and unconsumed APIs
```

كل Finding يجب أن يحتوي:

```yaml
finding:
  path:
  symbol_or_line:
  problem:
  evidence:
  root_cause:
  canonical_owner:
  affected_consumers:
  affected_surfaces:
  Partner_scope_risk:
  Store_scope_risk:
  security_risk:
  financial_risk:
  data_risk:
  runtime_risk:
  priority: P0 | P1 | P2 | P3
  required_fix:
  required_verification:
  status:
```

## أمر إثبات السبب الجذري

لا تبدأ Patch قبل إثبات:

1. الحقيقة الخاطئة أو المفقودة.
2. المالك القانوني لهذه الحقيقة.
3. مسار الكتابة الفعلي.
4. سبب ظهور العطل.
5. المستهلكين المتأثرين.
6. وجود أو عدم وجود نسخة أو Validator أو State machine موازية.
7. الحاجة إلى Migration أو Backfill أو Compatibility.
8. الاختبار الذي سيفشل عند عودة العيب.
9. دليل Runtime أو Readback المطلوب.

إذا لم يثبت السبب، وسّع التشخيص بأقل قدر يكشفه. لا تنفذ تعديلًا تخمينيًا.

## أمر الإصلاح

عند وجود تفويض كتابة:

```text
FIX OWNER, NOT SYMPTOM
PRESERVE VALID DATA AND BEHAVIOR
REMOVE DUPLICATE AUTHORITY
STOP PARALLEL WRITES
MIGRATE DATA BEFORE DELETION
MIGRATE EVERY CONSUMER
REGENERATE DERIVATIVES
SWITCH WRITERS AND READERS
VERIFY READBACK
REMOVE FALLBACKS
REMOVE PROVEN DEAD RESIDUE
ADD ROOT-CAUSE REGRESSION TEST
```

يسمح بإعادة الهيكلة أو البناء أو النقل أو الدمج أو التقسيم أو إعادة التسمية أو الاستبدال أو الحذف عندما يثبت أن ذلك أكثر أمانًا واستدامة من ملاحقة أخطاء تصميم فاسد.

ممنوع:

- Patch شكلي يخفي السبب.
- مصدر حقيقة ثالث.
- Dual-write دائم.
- Fallback إلى القديم بعد التحويل.
- ملف Legacy حي بوصفه احتياطًا.
- Guard أو تقرير بدل تعديل الكود.
- تخفيف Assertion لتمرير CI.
- توسيع النطاق بلا دليل اعتماد أو خطر.

## أمر الإغلاق Full-Stack

لا تغلق Capability قبل إثبات السلسلة المنطبقة:

```text
Product Truth
→ Actor or Service Identity
→ Platform Context
→ Operator Context
→ Partner/Store Scope
→ Permission and Object Authorization
→ Surface Control
→ Shared Controller
→ Generated Client
→ Canonical Contract
→ Backend Handler
→ Domain State Machine
→ Repository and Database Transaction
→ Event/Outbox/Job/Provider when applicable
→ WLT when financial
→ Persisted Effect
→ Readback
→ Every Required Surface
→ Negative, Retry, Offline and Recovery Behavior
→ Runtime Proof
```

أي حلقة مفقودة تبقي النطاق مفتوحًا.

## أمر Partner وStore

نموذج الأعمال في هذا الأمر بسيط:

```text
Partner = نطاق الأعمال الأعلى داخل DSH.
Store   = وحدة تشغيل تابعة لشريك واحد وفق العلاقة الحاكمة.
```

القواعد:

- لا يوجد نطاق أعمال ثالث بين المنصة وPartner.
- كل Store يجب أن يثبت انتماءه إلى Partner في القراءة والكتابة والتفويض والقيود.
- `partner_id` و`store_id` الواردان من العميل محددات موارد، وليسا مصدر سلطة.
- السلطة تشتق من الجلسة والصلاحيات والتكليفات الموثوقة.
- اختبر Partner ضد Partner، وStore ضد Store، وActor مخولًا ضد Actor غير مخول.
- Cache وEvents وJobs وMedia وSearch وReports تحمل Partner/Store scope عند الانطباق.
- لا يستخدم معرف عام ملتبس بدل `partner_id` أو `store_id`.

## أمر Commit وPush

تُحدد الاستراتيجية من المهمة الحالية:

```yaml
write_strategy:
  commit: ATOMIC_LOGICAL_UNITS
  push: AFTER_EACH_COMMIT | AFTER_VERIFIED_BATCH | NO_PUSH
```

عندما يكون Commit مصرحًا:

```text
COMPLETE ONE LOGICAL UNIT
→ RUN ITS TARGETED CHECKS
→ REVIEW ITS DIFF
→ STAGE ONLY ITS FILES
→ COMMIT ATOMICALLY
```

وعندما يكون Push مصرحًا:

```text
APPLY THE SELECTED PUSH STRATEGY
→ VERIFY EXPECTED REMOTE HEAD
→ PUSH WITHOUT FORCE
→ RE-PIN REMOTE HEAD
→ CONTINUE
```

القواعد:

- لا تجمع إصلاحات مستقلة في Commit واحد.
- لا تستخدم `git add .` أو `git add -A`.
- لا تنفذ Push إذا لم يكن مصرحًا.
- لا تفرض Push بعد كل Commit إلا عندما تطلب المهمة ذلك.
- لا تبدأ كتابة لاحقة على SHA قديم.
- لا تعمل Commit لفحص أو تنسيق عدّل ملفات خارج الوحدة.

## أمر التحقق بعد كل وحدة

```text
RUN the smallest check that can falsify the fix
RUN root-cause regression test
RUN affected contract/client check
RUN database check when persistence changed
RUN Partner/Store negative isolation tests when scope changed
RUN DSH/WLT invariants when finance changed
RUN runtime smoke when behavior or runtime changed
RUN cross-surface readback when shared capability changed
```

بعد آخر كتابة:

```text
FREEZE WRITES
→ RUN READ-ONLY FINAL VERIFICATION
→ CONFIRM FINAL SHA
→ CONFIRM GENERATED OUTPUTS CLEAN
→ CONFIRM NO OUT-OF-SCOPE DIFF
→ CONFIRM ALL APPLICABLE ZERO COUNTERS
→ CONFIRM ALL EVIDENCE BELONGS TO FINAL SHA
```

## أمر الاستمرار

بعد كل إصلاح أو Push، افحص:

```text
remaining finding?
parallel write path?
unmigrated consumer?
unbound required surface?
missing readback?
failed check?
legacy fallback?
unreconciled data?
stale evidence?
out-of-scope diff?
```

إذا كانت أي إجابة نعم وكان العنصر قابلًا للإصلاح داخل النطاق:

```text
CONTINUE
```

لا تصدر التقرير النهائي.

## أمر معالجة الفشل

عند فشل فحص:

```text
CAPTURE exact failure
→ CLASSIFY internal | environment | permission | provider | stale evidence
→ FORM a new evidence-based hypothesis
→ FIX root cause when internal
→ RE-RUN smallest failing check
→ RUN adjacent risk checks
→ CONTINUE
```

لا تكرر الأمر نفسه بلا فرضية جديدة. بعد ثلاث محاولات متشابهة دون تقدم:

```text
STOP PATCH LOOP
→ RE-DIAGNOSE OWNERSHIP AND ASSUMPTIONS
→ SPLIT THE PROBLEM
→ IDENTIFY NEW ROOT CAUSE OR TRUE EXTERNAL BLOCKER
```

## أمر القرار النهائي

لا تستخدم `PASS` بمعنى الإغلاق الكامل. قبل القرار:

```text
FINAL SHA PINNED
ALL EXECUTED CHECKS ATTRIBUTED TO FINAL SHA
ALL APPLICABLE MEASURED ZERO COUNTERS = 0
ALL REQUIRED READBACKS PROVEN
NO FIXABLE IN-SCOPE FINDING
NO OUT-OF-SCOPE DIFF
NO STALE EVIDENCE
REQUIRED APPROVALS CLASSIFIED
```

العداد غير المقاس لا يُسجل صفرًا، والفحص غير المنفذ لا يُسجل نجاحًا. أي دليل مفقود أو مانع غير محلول يمنع ادعاء الكمال، لكنه لا يمحو ما تم إثباته في نطاق آخر.

---

---

# 0. مدخلات المهمة الإلزامية

```yaml
execution_request:
  repository:
    remote: <owner/repository>
    local: <المسار المحلي عند التنفيذ المحلي أو null>
    work_branch: <اسم فرع العمل الذي حدده المستخدم>

  task:
    mode: DIAGNOSE_ONLY | EXECUTE_AND_CLOSE | VERIFY_ONLY | REVIEW | CLEANUP | MERGE | RELEASE
    target: <التطبيق أو القسم أو الوظيفة أو العملية أو الواجهة أو النطاق المطلوب>
    reported_problem: <وصف المشكلة أو الهدف>
    expected_outcome: <النتيجة المطلوبة>
    exclusions: <المستبعد صراحة أو []>
    base_ref: <الفرع الأساسي عند المقارنة أو الدمج أو null>

  authorization:
    write_authorized: true | false
    push_authorized: true | false
    pull_request_authorized: true | false
    merge_authorized: true | false
    release_authorized: true | false
    production_authorized: true | false

  write_strategy:
    commit: ATOMIC_LOGICAL_UNITS
    push: AFTER_EACH_COMMIT | AFTER_VERIFIED_BATCH | NO_PUSH
```

قواعد المدخلات:

1. فرع العمل هو الفرع الذي يكتبه المستخدم صراحة.
2. لا تستبدل الفرع المسمى بالفرع الافتراضي أو فرع مشابه.
3. لا تفترض أن آخر فرع استُخدم في محادثة سابقة ما زال هو المطلوب.
4. عند غياب تفويض الكتابة، نفّذ التشخيص والتحقق فقط.
5. عند وجود تفويض التنفيذ، نفّذ مباشرة على فرع العمل نفسه.
6. لا تنشئ فرعًا جديدًا أو Pull Request أو عملية دمج إلا إذا طلب المستخدم ذلك صراحة في المهمة الحالية.
7. لا تعتبر تفويضًا عامًا سابقًا إذنًا لدمج المرجع الأساسي أو Release أو Production؛ أما الكتابة وPush فتتبع تعليمات المهمة الحالية وسياسة الفرع الحية.
8. إذا كان الهدف أو الفرع محددًا بوضوح، لا تطلب إعادة تأكيده.

---

# 1. المبادئ الحاكمة

اعمل وفق المبادئ التالية:

1. **Code-First:** الكود الحي والسلوك الفعلي والعقود وقاعدة البيانات وRuntime هي الحقيقة الأساسية.
2. **Fix-First:** كل خلل قابل للإصلاح داخل النطاق يجب إصلاحه فعليًا، لا وصفه فقط.
3. **Unified Full-Stack:** Frontend وBackend وDatabase وAPI والعقود والعملاء المولّدون أجزاء من Capability واحدة.
4. **Trusted-Scope First:** كل عملية تحافظ على هوية Actor ونطاق السلطة القانوني: Platform Context أو Operator Context أو Partner أو Store أو Region أو Department أو Assignment.
5. **Platform-Model-Aware:** لا تفرض نموذج نسخة مستقلة أو معرف نطاق عام على أي مهمة؛ استخدم فقط Platform Context والنطاق القانوني الفعلي للكيان.
6. **Multi-Surface:** افحص كل سطح يتأثر فعليًا ولا تغلق الوظيفة على سطح واحد فقط.
7. **Shared Ownership First:** المنطق المشترك والسيادي يوضع داخل المالك الصحيح، لا داخل واجهة عرض.
8. **Canonical Ownership:** لكل حقيقة مالك واحد ومسار كتابة واحد ومعنى تعاقدي واحد.
9. **Runtime-Proven:** لا تعتبر البناء أو Typecheck دليلًا على صحة التشغيل.
10. **Evidence-Governed:** لا تصدر قرارًا أوسع من الأدلة التي جُمعت فعليًا.
11. **Smallest Safe Root Fix:** نفّذ أصغر تغيير جذري وآمن يحل السبب الحقيقي، لا أصغر Patch شكلي.
12. **Affected Plus Risk Expansion:** ابدأ بالنطاق المتأثر ووسّع فقط بسبب مثبت أو اعتماد لازم للإغلاق.
13. **Read-Only Final Verification:** التحقق النهائي لا يعدل المصدر.
14. **Exact-SHA:** يجب أن تخص الأدلة الالتزام النهائي نفسه.
15. **No False Success:** يمنع النجاح الشكلي أو رسائل النجاح دون تأثير محفوظ وReadback.
16. **No Mock Closure:** يمنع اعتماد Mock أو Fixture أو Preview أو Seed كدليل تشغيل أو تفعيل تجاري أو ماليات.
17. **No Deferred In-Scope Debt:** لا تؤجل نقصًا داخل النطاق دون مانع خارجي حقيقي.
18. **No Automatic Task Branch:** لا تنشئ فروع مهام تلقائية.
19. **Human-Only Base Merge:** دمج مرجع العمل إلى المرجع الأساسي يحتاج أمرًا بشريًا صريحًا.
20. **Git History Is Default Archive:** لا تنقل الملفات المتقاعدة إلى Archive افتراضيًا.
21. **No Governance Inflation:** لا تنشئ ملفات حوكمة أو أدلة أو تقارير دائمة لمجرد تسجيل تنفيذ المهمة.
22. **No Unsupported Claim:** لا تدّعِ نتيجة لم يثبتها فحص فعلي.
23. **No Generic Scope Naming:** يمنع استخدام معرف نطاق عام اسمًا بديلًا للشريك أو المتجر أو المنطقة التشغيلية.
24. **Financial Sovereignty:** لا حقيقة مالية خارج WLT، ولا تعديل مباشر للأرصدة أو القيود.
25. **Product Truth Before Product Change:** أي قدرة مرئية أو تجارية أو متعددة الأسطح تحتاج Product Truth واضحًا قبل اعتماد التنفيذ.

الحالة الابتدائية لكل نطاق هي:

```text
FIX_REQUIRED
```

حتى تثبت الأدلة القابلة للمراجعة غير ذلك.

# 2. المصطلحات ومنع الالتباس

عبارات:

```text
لوحة التحكم
Control Panel
control-panel
```

تستخدم فقط لتطبيق الإدارة الفعلي ومساراته وواجهاته.

أما:

* الحوكمة.
* Workflows.
* الحراس.
* Skills.
* السجلات.
* أدوات التشخيص.
* سياسات المستودع.
* Registries.

فتسمى:

```text
الطبقة الهندسية المساندة للمستودع
Repository Engineering Support Layer
```

لا تستخدم عبارة «لوحة التحكم» لوصف هذه الملفات.

---

# 3. تثبيت حقيقة GitHub Remote

قبل أي تشخيص أو كتابة:

1. ثبّت اسم المستودع.
2. تحقّق من وجود فرع العمل المسمى.
3. استخرج أحدث SHA للفرع.
4. اقرأ الملفات من الفرع نفسه فقط.
5. افحص عند الانطباق:

   * أحدث Commits.
   * حالة الفرع.
   * الفرق مع `base_ref`.
   * Pull Requests المرتبطة.
   * Workflow runs.
   * Combined commit status.
   * Review threads.
   * الملفات المتغيرة.
6. سجّل:

```yaml
remote_baseline:
  repository:
  work_branch:
  resolved_base_sha:
  base_ref:
  merge_base_sha:
  branch_comparison:
  latest_commits:
  related_pull_requests:
  workflow_runs:
  commit_status:
  unresolved_review_threads:
```

ممنوع:

* استخدام ذاكرة سابقة كحقيقة مستودع.
* استخدام ملفات محلية بدل Remote في تشخيص Remote.
* استبدال الفرع بفرع آخر.
* الاعتماد على تقرير تاريخي.
* الاعتماد على Workflow run لالتزام آخر.
* متابعة الكتابة إذا تحرك رأس الفرع دون إعادة تثبيت.

---

# 4. سياق التنفيذ والكتابة الآمنة

أنشئ سياقًا مؤقتًا قبل أول كتابة:

```yaml
execution_context:
  execution_mode: LOCAL_DIRECT_WORK_BRANCH | REMOTE_DIRECT_WORK_BRANCH | VERIFICATION_ONLY
  repository:
  work_branch:
  base_sha:
  expected_head_sha:
  final_sha:
  target:
  allowed_paths:
  forbidden_paths:
  concurrent_writers_detected:
  risk_profile:
  verification_profile:
  write_authorized:
  push_authorized:
```

القواعد:

1. فرع العمل هو فرع القراءة والكتابة والتحقق.
2. لا تنشئ تلقائيًا فروع:

   * `task/*`
   * `fix/*`
   * `feature/*`
   * `remediation/*`
3. لا تفتح Pull Request تلقائيًا.
4. لا تكتب إلى المرجع الأساسي.
5. لا تستخدم Force Push.
6. لا تعيد كتابة التاريخ.
7. استخدم Optimistic Concurrency:

   * اقرأ Head SHA.
   * قارنه بـ`expected_head_sha`.
   * أوقف الكتابة إذا تغير.
8. بعد كل Commit:

   * أعد قراءة رأس الفرع.
   * ثبّت SHA الجديد.
9. اكتب الملفات المشتركة والمهاجرات والعقود والعملاء المولدين بصورة متسلسلة.
10. اجمع الملفات المترابطة في Commit ذري منطقي عند الإمكان.
11. لا تستخدم:

* `git add -A`
* `git add .`

12. لا تحذف أو تعمل Stash أو Reset لتغييرات مستخدم محلية غير مرتبطة.
13. عند اكتشاف تغييرات متزامنة:

* أعد القراءة.
* حلل التعارض الدلالي.
* نفّذ مصالحة آمنة.
* أعد التحقق.

---

# 5. قراءة السلطات الحاكمة

اقرأ أولًا الملفات الحاكمة الموجودة فعليًا على فرع العمل، ومنها عند وجودها:

```text
AGENTS.md
governance/authority/authority-precedence.json
governance/contracts/decision-vocabulary.json
governance/policies/product.md
governance/product/platform-model.yaml
governance/product/product-truth.schema.json
governance/authority/single-owner-mode.json
governance/authority/direct-work-branch-execution-policy.json
governance/operational_journey_protocol_package/00_INDEX_AND_COVERAGE.md
```

ثم اتبع الإحالات الحاكمة المنطبقة.

لا تجعل:

* README.
* تقرير إغلاق.
* Evidence تاريخية.
* Capability graph يدوي.
* Gap ledger.
* Journey record.
* Diagnostic report.
* Skill.
* Template.
* Generated inventory.

يتجاوز الكود الحي أو العقود أو قاعدة البيانات أو Runtime أو الأدلة الصادرة من SHA النهائي.

---

# 6. تحديد نمط المهمة والمخاطر

اختر نمطًا أساسيًا واحدًا من القاموس الحي في `AGENTS.md`. الأنماط المعتمدة حاليًا هي:

```text
TEXT_ONLY
CODE_ONLY
PRODUCT_MODEL
UI_CODE
UI_VISUAL
API_CONTRACT
RUNTIME
DSH_WLT
SECURITY_PRIVACY
AGENT_SYSTEM
DEPENDENCY_CI
REFACTOR_CLEANUP
```

أما `DIAGNOSE` و`EXECUTE` و`VERIFY` و`REVIEW` و`CLEANUP` و`MERGE` و`RELEASE` فهي نوايا تنفيذ، وليست بدائل عن نمط المخاطر.

إذا كانت المهمة مختلطة، استخدم أعلى خطر فعلي، لا أقوى عبارة لغوية في الطلب.

أنشئ موجه المخاطر:

```yaml
risk_and_verification_router:
  product_model_changed:
  source_changed:
  test_changed:
  contract_changed:
  generated_client_changed:
  migration_changed:
  database_changed:
  frontend_changed:
  shared_brain_changed:
  native_mobile_changed:
  runtime_changed:
  authentication_changed:
  authorization_changed:
  privacy_or_pii_changed:
  trusted_scope_changed:
  operator_context_changed:
  partner_scope_changed:
  store_scope_changed:
  region_or_area_scope_changed:
  department_or_assignment_scope_changed:
  platform_context_isolation_changed:
  partner_management_capability_changed:
  platform_readiness_changed:
  commercial_model_changed:
  entitlement_or_quota_changed:
  subscription_or_billing_changed:
  financial_truth_changed:
  event_or_queue_changed:
  cache_changed:
  object_storage_changed:
  workflow_changed:
  governance_changed:
  dependency_changed:
  infrastructure_changed:
  release_changed:
  production_changed:
  cleanup_only:
  repository_wide_reconstruction:
  full_verification_required:
  reasons:
```

الوضع الافتراضي:

```text
AFFECTED_PLUS_RISK_EXPANSION
```

شغّل الفحص الكامل عند سبب مثبت، مثل:

* إعادة بناء المستودع أو طلب صريح بفحصه كاملًا.
* عقد مشترك أو Master contract.
* Migration أو Backfill أو تغيير ملكية بيانات.
* Authentication أو Authorization أو جلسات أو أجهزة.
* Platform Context أو Operator Context أو عزل نطاق قانوني حساس.
* WLT أو ماليات أو اشتراك أو عمولة أو تسوية.
* Root dependency أو Workspace configuration.
* Workflow أو Infrastructure أو Shared runtime.
* أكثر من Bounded Context أو أكثر من سطح حاكم.
* تجهيز دمج إلى المرجع الأساسي أو Release.
* فشل متأثر يشير إلى مشكلة أوسع.

لا توسع مهمة تشغيلية إلى برنامج تجاري أو نشر مستقل لمجرد وجود قواعد عامة في هذا الأمر.

# 7. تعريف النطاق الوظيفي

قبل التعديل، حدّد:

```yaml
topic_definition:
  target:
  problem:
  evidence_state:
  current_behavior:
  required_behavior:
  business_outcome:
  product_truth_reference:
  actors:
  roles:
  owning_service:
  owning_domain:
  owning_shared_brain:
  in_scope:
  out_of_scope:
  allowed_paths:
  forbidden_paths:
  required_surfaces:
  optional_surfaces:
  read_only_surfaces:
  forbidden_surfaces:
  primary_control_panel_section:
  secondary_control_panel_sections:
  related_backend_modules:
  related_database_tables:
  related_indexes_and_constraints:
  related_api_operations:
  generated_clients:
  events_and_outbox:
  caches:
  object_storage:
  external_providers:
  states:
  transitions:
  preconditions:
  forbidden_actions:
  negative_invariants:
  acceptance_criteria:
```

كل سطح أو طبقة مستبعدة يجب أن تحمل:

* سبب الاستبعاد.
* دليل عدم التأثر.
* الاعتمادات التي تم فحصها.

لا تستخدم تعريفات عامة مثل:

* Frontend.
* Backend.
* Mobile.
* Control Panel.
* Database.
* تحسين الواجهة.

حدّد الملفات والمسارات والعمليات الفعلية.

---

# 8. Product Truth قبل التنفيذ

عند إنشاء أو تغيير Capability مرئية أو تشغيلية:

1. حدّد المشكلة.
2. حدّد المستخدمين والأدوار.
3. حدّد الأسطح المطلوبة والمستبعدة.
4. حدّد الحالات والأفعال والأفعال الممنوعة.
5. حدّد النتيجة ومعايير القبول.
6. حدّد مصدر الحقيقة.
7. حدّد من يملك القرار الوظيفي.
8. ميّز بين:

   * إصلاح implementation ليطابق Product Truth قائمًا.
   * تغيير Product Truth نفسه.
9. لا تجعل Engineering يعتمد قبوله الوظيفي النهائي بنفسه.
10. لا تستخدم وثيقة قديمة لإثبات قبول Capability حالية دون مراجعة السلوك الحالي.

---

# 9. جرد الأسطح والطبقات المتأثرة

أنشئ الجرد التالي:

```yaml
affected_inventory:
  app_client:
  app_partner:
  app_captain:
  app_field:
  control_panel:
  shared_frontend:
  identity:
  workforce:
  dsh:
  wlt:
  platform_control:
  providers:
  backend_services:
  databases:
  openapi_contracts:
  generated_clients:
  events_and_queues:
  caches:
  object_storage:
  external_integrations:
  docker_and_runtime:
  ci_and_workflows:
```

استخدم لكل عنصر:

```text
IN_SCOPE
READ_ONLY
FORBIDDEN
NOT_AFFECTED_WITH_REASON
```

كل عنصر `IN_SCOPE` يجب أن يحدد:

* دوره.
* مدخلاته.
* مخرجاته.
* صلاحياته.
* حالاته.
* مصدر بياناته.
* trusted legal scope and platform context.
* error behavior.
* readback.
* الاختبار.
* دليل Runtime عند الحاجة.

---

# 10. سلسلة Full-Stack الرأسية

تتبّع كل وظيفة أو عملية عبر السلسلة المنطبقة:

```text
Product requirement and Product Truth
→ Actor and actor type
→ Trusted identity and session/device
→ Trusted operator context
→ Applicable partner/store/region/department/assignment scope
→ Trusted platform and operator context
→ Role and permission
→ Surface
→ Route/navigation
→ Screen/page
→ Visible control/action
→ Surface adapter
→ Shared controller/hook
→ Shared validation and state interpretation
→ Generated API client
→ Canonical OpenAPI operation
→ Authentication
→ Authorization and object authorization
→ Trusted scope resolution
→ Backend route
→ Handler
→ Request validation
→ Domain service and state machine
→ Repository
→ Database read/mutation
→ Transaction and concurrency control
→ Cache/idempotency
→ Event/outbox/inbox
→ Cross-service handoff
→ External provider
→ WLT when financial
→ Audit and observability
→ Response
→ Readback
→ Cross-surface visibility
→ Loading/Empty/Error/Blocked/Conflict/Unknown Result
→ Retry/offline/recovery
→ Runtime proof
```

افحص:

* Controls وIcons وTabs غير المربوطة.
* Screens غير المسجلة أو Routes المفقودة أو المتعارضة.
* API بلا Consumer أو Consumer بلا API.
* Handler بلا Domain logic أو Persistence بلا Readback.
* نجاح UI بلا تأثير محفوظ أو Backend effect لا يظهر على الأسطح.
* اختلاف Schemas وEnums وStatuses وNullable/Optional وPermissions وErrors.
* Events غير المستهلكة وCache غير المحدث وFeature flag يخفي Mock.
* State transition غير محمية أو Scope context مفقود.
* استخدام معرف نطاق عام بمعنى Partner أو Store.
* ماليات أو عمولات أو أرصدة أو تسويات خارج WLT.
* منطق حاكم أو صلاحيات أو Enums أو URLs داخل Surface.

القيم المطلوبة عند الإغلاق:

```yaml
fullstack_zero_tolerance:
  unbound_controls: 0
  unbound_icons: 0
  unbound_tabs: 0
  unreachable_screens: 0
  missing_routes: 0
  conflicting_routes: 0
  unconsumed_api_operations: 0
  frontend_only_features: 0
  backend_only_features: 0
  contract_client_drift: 0
  schema_mismatches: 0
  status_mismatches: 0
  permission_mismatches: 0
  error_mapping_mismatches: 0
  local_surface_business_logic: 0
  raw_surface_api_calls: 0
  ui_success_without_backend_effect: 0
  backend_effect_without_readback: 0
  cross_operator_context_leaks: 0
  cross_partner_leaks: 0
  cross_store_leaks: 0
  cross_actor_scope_leaks: 0
  scope_identifier_misclassification: 0
  generic_scope_identifier_misuse: 0
  financial_truth_outside_wlt: 0
  unverified_required_runtime_flows: 0
```

# 11. قواعد الملكية

## 11.1 DSH Frontend

عند وجود البنية التالية، يكون العقل المشترك:

```text
services/dsh/frontend/shared
```

ويملك:

* Domain types.
* Controllers.
* Hooks.
* View models.
* Validation.
* Role-visible policies المشتقة من قرارات Identity وBackend، لا صلاحيات مستقلة.
* State interpretation and state machines delegated to the canonical domain.
* API adapters.
* Response transformations.
* Lifecycle rules.
* Error/loading/empty/blocked/conflict/retry/offline/unknown-result states.
* Trusted-scope bindings.
* Read-only financial references.

وتكون أسطح DSH طبقة UI وعرض وتركيب فقط.

ممنوع داخل الأسطح:

* Direct fetch أو Axios إلى خدمات المجال.
* بناء URLs.
* تفسير Raw API.
* Business rules أو State machine أو Permission policy محلية.
* Domain types وEnums مكررة.
* Platform/Operator/Partner/Store scope resolution مستقل.
* Financial truth أو حسابات عمولة وتسوية.
* نجاح محلي غير مثبت بالـReadback.

## 11.2 WLT

عند وجود:

```text
services/wlt/frontend/shared/dsh
```

فهو يملك تكامل WLT المقروء عبر DSH. لا يجوز لأي تطبيق أو سطح استدعاء WLT مباشرة؛ يستقبل DSH طلب السطح، يطبق المصادقة والصلاحية والنطاق، ثم يستدعي WLT بخدمة موثوقة ويعيد Readback مضبوطًا.

WLT هو المالك الوحيد لـ:

* Payments.
* Wallet mutations.
* Ledger.
* Balances as derived reads.
* Refund finalization.
* Subscription financial obligations.
* Partner commissions and debts.
* Settlements.
* COD financial truth.
* Reconciliation.
* Payouts.
* Financial reports.

DSH يحتفظ فقط بالمراجع والحالات غير السيادية المقروءة والأدلة التشغيلية.

كل عملية مالية يجب أن تكون:

* Scoped by the trusted platform, operator, partner, store and legal-owner context.
* Invoked by applications and surfaces only through the governed DSH facade; direct surface-to-WLT access is forbidden.
* Idempotent.
* Atomic and balanced when ledger-backed.
* Audited.
* Authorized.
* Contract-bound.
* Readback-verified.
* Reconciled when a provider or COD is involved.

# 12. النطاق الموثوق وقدرات إدارة الشريك

## 12.1 قرار الانطباق

```yaml
trusted_scope:
  source_of_truth: governance/product/platform-model.yaml
  applicability: APPLICABLE | NOT_APPLICABLE_WITH_REASON
  platform_context_source:
  operator_context_source:
  actor_and_service_identity_source:
  partner_scope_source:
  store_scope_source:
  assignment_source:
  global_entities:
  database_scope:
  api_scope:
  cache_scope:
  event_and_queue_scope:
  object_storage_scope:
  search_scope:
  observability_scope:
  audit_scope:
  cross_context_access_policy:
  privileged_support_workflow:
  export_behavior:
  deletion_behavior:
  backup_restore_behavior:
```

## 12.2 قواعد النطاق الموثوق

1. Actor وSession وDevice وService Identity تأتي من Identity أو تفويض خادمي موثوق.
2. `platform_context_id` و`operator_context_id` لا يقبلهما الخادم كسلطة لمجرد إرسالهما من العميل.
3. `partner_id` و`store_id` و`region_id` و`department_id` محددات موارد أو تكليفات، وليست إثبات صلاحية.
4. كل قراءة وكتابة تقيد بالنطاق القانوني للحقيقة.
5. غياب النطاق المطلوب يؤدي إلى رفض مغلق، لا إلى `default` أو `public` أو `local-*`.
6. يجب منع IDOR الأفقي والرأسي وتبديل المعرفات والتكليفات المنتهية.
7. Cache وEvents وOutbox وJobs وMedia وSearch وReports تحمل أو تشتق النطاق الصحيح.
8. البيانات العالمية تصنف `GLOBAL` صراحة؛ `NULL` غير المفسر ليس عالمية.
9. اختبر Platform Context عن Platform Context، وOperator Context عن Operator Context، وPartner عن Partner، وStore عن Store، وActor عن Actor.
10. لا تحول فشل المصدر المركزي إلى بيانات محلية صامتة.
11. أي اسم تاريخي لحقل Partner لا ينشئ نطاقًا جديدًا ولا يُعاد تفسيره كسياق سيادي.
12. إعادة تسمية حقول النطاق تحتاج عقد توافق وMigration وBackfill واختبارات قراءة وكتابة مختلطة الإصدارات.

## 12.3 قدرات إدارة الشريك

قدرات إدارة الشريك جزء داخل منصة بثواني. عند تأثرها افحص، بقدر الانطباق:

```text
partner profile and onboarding
→ partner users and assignments
→ stores and readiness
→ catalog proposals and assortment
→ prices, availability and publication
→ order intake and preparation
→ delivery configuration
→ partner captains and store assignments
→ dispatch and re-assignment
→ delivery execution and proof
→ operational reports
→ financial readbacks through DSH
→ settlements and payout requests
→ support, disputes and audit
```

المبادئ:

- DSH يملك Partner وStore والكتالوج والطلب والتوصيل تشغيليًا.
- Workforce يملك الملف المهني للكابتن والموظف.
- Identity يملك Actor والجلسات والأدوار والصلاحيات.
- WLT يملك كل أثر مالي.
- الشريك لا يملك Order truth أو Ledger محليًا.
- تطبيق الشريك يطلب الأفعال المصرح بها؛ الخادم يطبق Object Authorization.
- الاشتراك والعمولة نموذجان تجاريان، ولا ينشئان سياق عزل أو منصة مستقلة.
- أي قدرة مستقلة مستقبلًا لا تدخل هذا الأمر إلا بعد تغيير صريح في Product Truth والعمارة والأمن والبيانات والماليات والإصدار.


# 13. الأمن والخصوصية

افحص عند الانطباق:

* Authentication.
* Authorization.
* RBAC.
* Session lifecycle.
* Token handling.
* Secret storage.
* Credential exposure.
* PII collection.
* PII masking.
* Data minimization.
* Input validation.
* Output encoding.
* Injection.
* SSRF.
* Path traversal.
* File upload.
* Rate limiting.
* Replay.
* Idempotency.
* Privilege escalation.
* Insecure direct object reference.
* Cross-scope access.
* Audit trail.
* Dependency vulnerabilities.
* Container vulnerabilities.
* Workflow permissions.
* Pinned GitHub Actions.

ممنوع:

* Secrets داخل الكود أو Logs.
* Tokens داخل Screenshots.
* Raw financial data في Logs.
* Full payload logging افتراضيًا.
* UI-only authorization.
* قبول تحذير Critical أو High دون سلطة قبول مخاطرة.

---

# 14. قواعد البيانات والمهاجرات

عند وجود Migration أو تغيير بيانات:

1. لا تعدّل أو تعيد تسمية Migration سبق تطبيقها.
2. أنشئ Migration جديدة للتغيير الجديد.
3. استخدم Migration ledger وChecksum وManifest وترتيبًا حتميًا.
4. التصادمات التاريخية تسجل كما هي في Manifest حاكم؛ لا تصلح بإعادة كتابة التاريخ.
5. يمنع أي تصادم جديد في الرقم أو المعرف بعد نقطة القطع المعتمدة.
6. فضّل التغيير الإضافي ونمط Expand/Contract.
7. لا تنفذ حذفًا أو تحديثًا مدمرًا دون:

   * Dry-run count.
   * تحديد الصفوف المتأثرة والمالك والنطاق.
   * Snapshot أو Audit backup عند الانطباق.
   * Backfill plan.
   * Reconciliation.
   * Rollback أو Roll-forward.
8. لا تحذف أو تعدل مباشرة:

   * Balances أو Ledger rows.
   * Refunds أو Settlements أو Payouts أو Commissions.
   * Partner/Store/Actor أو Platform Context records.
   * ملفات أو أحداث أو مراجع مالية.
     دون حفظ قانوني وترحيل وتسوية مثبتة.
9. لا تستخدم `IF NOT EXISTS` لإخفاء اختلاف بنيوي معروف؛ استخدمه فقط عندما يكون السلوك المقصود مثبتًا ولا يخفي Drift.
10. اختبر على:

   * قاعدة جديدة.
   * قاعدة غير فارغة وممثلة للبيانات السابقة.
   * إعادة التشغيل.
   * بيانات متعارضة وناقصة ويتيمة ومكررة.
   * فشل جزئي واستئناف.
   * Rollback أو Roll-forward.
11. افحص:

   * Locks وIndex build وTransactions.
   * Backfill batching وRetry وIdempotency.
   * النطاق القانوني: Platform/Operator/Partner/Store/Actor.
   * القيود الأجنبية والفريدة والفهارس المركبة.
   * القراءة بعد الكتابة والتزامن والسباقات.
12. لا تعلن نجاح Backfill مع بقاء سجلات مجهولة الملكية أو غير قابلة للمصالحة.

استخدم عند الحاجة:

```text
EXPAND
→ DEPLOY COMPATIBLE CODE
→ BACKFILL
→ VERIFY BACKFILL
→ SWITCH WRITERS
→ SWITCH READERS
→ VERIFY READBACK
→ REMOVE FALLBACKS
→ CONTRACT
```

# 15. توافق الإصدارات

عند تغيير API أو Schema أو Contract:

```yaml
compatibility_gate:
  old_mobile_with_new_backend:
  new_mobile_with_old_backend:
  current_control_panel_with_new_backend:
  generated_client_compatibility:
  event_schema_compatibility:
  cache_schema_compatibility:
  mixed_version_runtime:
  feature_flag_default:
  rollback_path:
  roll_forward_path:
  compatibility_window:
    owner:
    reason:
    live_old_consumers:
    read_behavior:
    write_behavior:
    expiry:
    removal_trigger:
    monitoring:
    regression_tests:
```

لا تفترض تحديث جميع تطبيقات الهاتف في اللحظة نفسها.

لا تحذف حقلًا أو Status أو Operation ما دام إصدار حي معتمد يحتاجه.

طبقة التوافق مسموحة فقط بوصفها انتقالًا زمنيًا معلومًا. الممنوع هو توافق دائم بلا مالك أو مدة أو مراقبة أو خطة إزالة، أو Dual-write وFallback يحافظان على الحقيقة القديمة.

Feature flags يجب أن تكون:

* Safe by default.
* Scoped by platform/operator/partner/store عند الحاجة.
* قابلة للإزالة ومؤرخة.
* غير مستخدمة لتغطية Mock أو نقص أو مصدر حقيقة موازٍ.

# 16. الفشل والتعافي

لكل عملية مهمة حدّد:

```yaml
operational_contract:
  actor:
  actor_type:
  trusted_operator_context:
  partner_scope:
  store_scope:
  region_or_area_scope:
  department_or_assignment_scope:
  platform_context_scope:
  preconditions:
  allowed_states:
  forbidden_states:
  transition:
  database_effect:
  financial_effect:
  legal_data_owner:
  notifications:
  audit_effect:
  idempotency_key:
  timeout:
  retry_policy:
  backoff:
  maximum_attempts:
  concurrency_control:
  transaction_boundary:
  partial_failure_behavior:
  unknown_result_behavior:
  rollback_or_compensation:
  reconciliation:
  readback:
  cross_surface_result:
```

واختبر ما ينطبق:

* Invalid input.
* Unauthenticated وExpired/Revoked session.
* Unauthorized وWrong role/permission/surface.
* Wrong operator/partner/store/actor scope.
* Wrong platform or operator context.
* Forbidden state.
* Duplicate request وReplay.
* Concurrent request وRace.
* Provider timeout/failure/unknown result.
* Database failure وPartial write.
* Duplicate/out-of-order/late/missing event.
* Process restart.
* Stale client وMixed version.
* Cache staleness.
* Offline/Reconnect.
* Compensation/Reconciliation.
* Cross-surface readback.

# 17. واجهات وتجربة المستخدم

افحص:

* Information architecture.
* Navigation.
* Screen hierarchy.
* Labels.
* Icons.
* States.
* Empty state.
* Error state.
* Loading state.
* Disabled state.
* Blocked state.
* Retry.
* Offline.
* Confirmation.
* Undo أو Rollback عند الحاجة.
* Accessibility.
* Keyboard navigation.
* Focus management.
* RTL.
* العربية.
* Text overflow.
* Responsive layout.
* Touch targets.
* Color contrast.
* Consistency.
* No dead controls.
* No misleading success.
* No hidden critical failure.

الاختلاف بين الأسطح يجب أن يكون في العرض والدور، لا في الحقيقة التشغيلية.

---

# 18. قبول خاص بتطبيقات الهاتف

عند تأثر تطبيق Mobile افحص:

* Navigation registration.
* Deep links.
* Android package identity.
* iOS bundle identity عند الانطباق.
* Expo config.
* Native permissions.
* Firebase.
* Push notifications.
* Maps.
* SecureStore.
* Offline/reconnect.
* Safe area.
* Keyboard.
* RTL.
* Device capability.
* Native rebuild requirement.
* OTA compatibility.
* EAS profiles.
* Signing.
* Provider inputs.
* Development client.
* Expo Doctor.
* Export.
* Prebuild.
* Runtime environment variables.

لا تعتبر نجاح Metro دليلًا على صحة Native build.

---

# 19. قبول خاص بتطبيق لوحة التحكم الإدارية

افحص:

* Route authorization وObject authorization.
* Server/client boundary وBFF thinness.
* Trusted operator-context selection عند وجود أكثر من سياق مخول.
* Partner/Store/Department/Region scope selection والتحقق الخادمي منه.
* عدم مساواة Partner أو Store بـPlatform Context أو Operator Context.
* Pagination وFiltering وSorting وSearch مع عزل صحيح.
* Bulk actions وحماية النطاق لكل عنصر.
* Destructive confirmation والموافقة المزدوجة عند الحاجة.
* Optimistic update وRollback وReadback.
* Audit visibility وسبب التدخلات السيادية ومدتها.
* Permission-driven actions من مصدر مركزي.
* Accessibility وRTL والعربية.
* Loading/Error/Empty/Blocked/Conflict/Unknown Result.
* Server error mapping وSession expiration.
* Cross-surface readback.
* عدم عرض خطط أو قدرات تجارية غير معتمدة كأنها فعالة.

# 20. المراقبة والتدقيق

عرّف عند الحاجة:

```yaml
observability_contract:
  correlation_id:
  request_id:
  actor_id:
  actor_type:
  session_id:
  device_id:
  operator_context_id:
  partner_id:
  store_id:
  region_or_area_id:
  department_or_assignment_id:
  platform_context_id:
  operation_id:
  state_transition:
  audit_event:
  structured_error_code:
  latency_metric:
  failure_metric:
  retry_metric:
  quota_or_rate_limit_metric:
  alert_condition:
  pii_redaction:
  secret_redaction:
```

تكون المقاييس والسجلات قابلة للتقسيم حسب النطاق القانوني دون كشف أسرار أو PII أو بيانات شريك أو متجر أو سياق تشغيلي لغير المصرح له.

لا تعتبر Log دليل نجاح. الدليل هو:

* التأثير الصحيح.
* البيانات المحفوظة لدى المالك القانوني.
* القراءة الراجعة.
* نتيجة Runtime.
* المصالحة عند وجود أثر مالي أو مزود خارجي.

# 21. فحص الموجود قبل إنشاء الجديد

قبل إنشاء ملف أو Component أو Hook أو Controller أو API أو Service أو Migration أو Guard أو Test:

1. ابحث عن الاسم.
2. ابحث عن المعنى الوظيفي.
3. افحص Imports وExports.
4. افحص Routes وNavigation.
5. افحص Registries وManifests.
6. افحص API operations.
7. افحص Database bindings.
8. افحص Tests.
9. استخدم Graphify أو Nx فقط عند غموض العلاقة.

فضّل:

```text
REUSE
→ EXTEND
→ MERGE
→ MOVE_TO_OWNER
→ SPLIT
→ CREATE_NEW
```

كل ملف مشكوك فيه يصنّف:

```text
KEEP_ACTIVE
REFACTOR_SPLIT
MERGE_DUPLICATE
MOVE_TO_OWNER
RETIRE_DEAD
FIX_REQUIRED
```

لا تحذف قبل إثبات عدم الاستهلاك.

---

# 22. تنظيف الملفات والاختبارات

لا يعتمد الحذف على عمر الملف.

## يبقى الاختبار إذا كان:

```text
ACTIVE_BEHAVIOR_REGRESSION
SECURITY_INVARIANT
CONTEXT_ISOLATION
FINANCIAL_INTEGRITY
DATABASE_INTEGRITY
CONTRACT_BINDING
RUNTIME_SMOKE
MIGRATION_SAFETY
NEGATIVE_BEHAVIOR
RECOVERY_AND_IDEMPOTENCY
ACCESSIBILITY_REGRESSION
```

## يعاد بناء الاختبار أو يزال إذا كان:

```text
HISTORICAL_CLOSURE_TEST
EXACT_SHA_TEST
BRANCH_SPECIFIC_TEST
JOURNEY_LABEL_TEST
EVIDENCE_FILE_TEST
DOCUMENT_WORDING_TEST
DUPLICATE_TEST
REMOVED_FEATURE_TEST
UNINVOKED_TEST
OBSOLETE_FIXTURE_TEST
MOCK_ONLY_SUCCESS_TEST
STALE_SNAPSHOT_TEST
```

إذا احتوى الاختبار القديم على قيمة مفيدة:

```text
EXTRACT VALID INVARIANTS
→ MOVE TO CAPABILITY TEST
→ RUN NEW TEST
→ REMOVE HISTORICAL DEPENDENCIES
→ DELETE OLD TEST
```

نظّف داخل النطاق:

* Dead code.
* Orphan files.
* Duplicates.
* Logs.
* Closure reports.
* Diagnostic outputs.
* CI snapshots.
* Scanner outputs.
* Trigger files.
* Iteration records.
* Task records.
* Evidence تاريخية قابلة لإعادة التوليد.
* Scripts غير المستهلكة.
* Fixtures الوهمية.
* Snapshots لتصميم أزيل.

لا تحذف اختبار Security أو Trusted Scope أو Operator-Context Isolation أو Finance أو Migration قبل وجود بديل أقوى مثبت.

---

# 23. فعالية الاختبارات

لكل إصلاح:

1. أضف أو حدّث Regression test يطابق السبب الجذري.
2. يجب أن يكتشف الاختبار عودة الخلل.
3. لا تعدّل الاختبار فقط لتمرير CI.
4. لا تقلل قوة Assertion.
5. لا تستخدم:

   * Broad skip.
   * `only`.
   * Retry لإخفاء Flakiness.
6. الاختبار Flaky يحتاج:

   * سببًا.
   * مالكًا.
   * معالجة.
   * مدة استثناء.
7. اختبر السلوك والعقد، لا تفاصيل داخلية غير مضمونة.
8. غطِّ المسارات السلبية المنطبقة.

---

# 24. الطبقة الهندسية المساندة

لا تنشئ افتراضيًا:

* Plan دائم.
* Evidence pack.
* Closure report.
* Command log.
* Screenshot set.
* Gap file.
* Iteration file.
* Workflow خاص بالمهمة.
* Guard خاص برحلة.
* Registry جديد.
* فرع مهمة.
* PR داخلي.

أنشئ ملفًا مساندًا فقط عندما يملك:

```yaml
artifact_admission:
  artifact_class:
  owner:
  authority:
  source_of_truth:
  machine_consumers:
  human_operational_consumers:
  validator:
  update_trigger:
  duplicate_check:
  retirement_condition:
  why_not_ci_summary_or_artifact:
```

يرفض الملف إذا:

* يكرر مصدر حقيقة.
* يمثل حالة مهمة مؤقتة.
* يمكن توليده.
* يصلح كArtifact.
* لا يملك مستهلكًا.
* لا يملك Validator.
* يزيد التعقيد بلا فائدة.

---

# 25. فصل التنفيذ عن التحقق

المراحل:

```text
DIAGNOSE
→ PLAN INTERNALLY
→ MUTATING_IMPLEMENTATION
→ OBSERVE
→ CORRECT
→ READ_ONLY_VERIFICATION
→ CLEAN
→ RECONCILE
→ FINAL DECISION
```

مرحلة التنفيذ قد تشمل:

* تعديل الكود.
* توليد Clients.
* Migration جديدة.
* تحديث Lockfile.
* Formatter على الملفات المتأثرة.
* نقل أو حذف ملفات مثبتة.

مرحلة التحقق النهائية ممنوع أن تشمل:

* `--fix`.
* Format.
* Cleanup apply.
* Generation.
* Dedupe.
* تعديل Lockfile.
* تعديل Migration.
* إنشاء Evidence.
* Commit.
* Push.
* Merge.
* `|| true`.
* ابتلاع Exit Code.

إذا عدّل التحقق المصدر، ارجع للتنفيذ ثم أعد تحققًا جديدًا.

---

# 26. اختيار أدوات التحقق

اقرأ أوامر الفرع الحالية من:

* `package.json`.
* Workspace projects.
* Service manifests.
* Workflow definitions.
* Runtime scripts.

لا تخترع أمرًا غير موجود.

استخدم أصغر فحص يثبت الادعاء:

1. Scoped inspection.
2. Focused search.
3. Targeted test.
4. Affected typecheck/lint/test/build.
5. Contract and binding checks.
6. Database checks.
7. Runtime smoke.
8. Security checks.
9. Full verification عند سبب مثبت.

استخدم:

* Graphify فقط عند غموض الملكية أو العلاقات أو الكود الميت.
* Nx affected عند الحاجة لحساب الأثر.
* Knip عند فحص عدم الاستهلاك.
* Security scanners عند أثر أمني أو Dependency أو Container.
* Performance tests عند أثر أو ادعاء أداء.
* Runtime عند تغيير أو ادعاء سلوك تشغيلي.

أي فحص غير منفذ لا يعد ناجحًا.

أي فحص `SKIPPED` يحتاج:

```yaml
skipped_check:
  check:
  decision: NOT_APPLICABLE
  reason:
  reviewed_paths:
  evidence:
```

---

# 27. CI وGitHub Workflows

تحقق من أن CI:

* Read-only.
* لا يعدل المصدر.
* لا يعمل Commit أو Push أو Merge.
* يستخدم Actions مثبتة.
* يملك Permissions دنيا.
* يعمل على SHA المرشح.
* لا يسمح بفشل إلزامي.
* يملك Fail-closed aggregate.
* يقبل Skip فقط بسبب مثبت.
* لا يعتمد على Workflow باسم Branch أو Journey أو Gap.
* لا يستخدم Workflow مؤقتًا افتراضيًا.
* لا ينتج نجاحًا من ملفات Evidence تاريخية.

لا تعِد تشغيل Job فاشلًا دون تشخيص سبب الفشل.

لا تستخدم إعادة التشغيل كبديل عن إصلاح Flakiness أو Root Cause.

---

# 28. تسلسل التنفيذ الحاكم حسب الخطر والاعتماد

نفّذ بالترتيب التالي، مع تطبيق ما ينطبق على النطاق:

1. تثبيت المستودع والفرع وBase SHA وحالة التفويض.
2. قراءة السلطات الحاكمة وحقيقة المنتج وحالة نموذج المنصة الآلية.
3. تحديد نمط المهمة والمخاطر والنطاق والمسارات المسموحة والممنوعة.
4. تحديد Product Truth والممثلين والنتيجة والحالات والأفعال الممنوعة.
5. تثبيت الهوية والثقة والجلسات والأجهزة وهوية الخدمات والصلاحيات.
6. تثبيت النطاق الموثوق: Platform/Operator/Partner/Store/Actor/Region/Department.
7. تحديد المالك القانوني لكل حقيقة وإيقاف مصادر الحقيقة والكتابة الموازية.
8. تصحيح حقيقة البيانات والجداول والقيود والفهارس والمهاجرات وBackfill.
9. تصحيح الحدود المالية وWLT قبل أي رحلة تعتمد على أثر مالي.
10. تثبيت العقود الحاكمة وفهارس OpenAPI والتجميع الحتمي والعملاء المولدين.
11. إصلاح Domain وRepository وBackend والحالات والانتقالات والأحداث والـOutbox.
12. إصلاح Shared brains ومنع المنطق والصلاحيات والـfetch الخام داخل الأسطح.
13. ربط جميع الأسطح المتأثرة وNavigation وRoutes وControls والحالات المرئية.
14. تطبيق قدرات إدارة الشريك داخل نطاقها دون إنشاء منصة مستقلة للشريك.
15. تطبيق أي برنامج نشر مستقل أو نسخة منفصلة فقط بعد تغيير Product Truth والتفويض الصريح.
16. إصلاح Cache وSearch وMedia وProviders وNotifications وJobs.
17. إصلاح Runtime وDocker والإعدادات والأسرار وHealth/Readiness/Liveness.
18. استكمال UX وAccessibility وRTL وOffline وUnknown Result والتعافي.
19. تنظيف الكود والملفات والاختبارات والتقارير والبقايا والـFallbacks.
20. تشغيل Affected verification ثم توسيعه حسب المخاطر.
21. تشغيل Runtime وSecurity وFinance وIsolation وMigration وRecovery عند الانطباق.
22. مراجعة Diff ورفض أي Out-of-scope change.
23. تنفيذ آخر كتابة وتثبيت Final SHA.
24. تشغيل Read-only final verification على Final SHA نفسه.
25. فحص CI وPR وReview threads المرتبطة بالـFinal SHA.
26. تنفيذ الحذف النهائي فقط بعد إثبات البديل وعدم وجود مستهلك.
27. إصدار القرار النهائي وفق الأدلة، مع كشف أي مانع أو نقص غير مثبت.

الاتجاه دائمًا:

```text
الخطر
→ الاعتماد
→ الثقة والهوية
→ النطاق الموثوق
→ المالك القانوني
→ حقيقة البيانات
→ الحدود المالية
→ العقود
→ الرحلة الرأسية
→ الأسطح
→ التشغيل الحي
→ الاختبارات السلبية والتعافي
→ التنظيف
→ التحقق على SHA واحد
→ الإغلاق
```

# 29. حلقات الإصلاح

القواعد:

* لا تنفذ قبل تشخيص كافٍ.
* لا تكرر Patch نفسه.
* لا تكرر الأمر الفاشل دون فرضية جديدة.
* لا توسع Allowed Paths دون إعادة تقييم.
* لا تعدل Tests لإخفاء الخلل.
* لا تضف Governance لتغطية فشل كودي.
* بعد ثلاث محاولات متشابهة بلا تقدم:

  * أعد التشخيص.
  * قسّم المشكلة منطقيًا.
  * أوقف الحلقة وأعد التشخيص؛ استخدم فقط قرارًا موجودًا في قاموس القرارات الحي.
* لا تنشئ Branch جديدًا للحلقة.
* لا تنشئ Iteration files دائمة.

---

# 30. مراجعة SHA وPR والدمج

التحقق من SHA النهائي إلزامي دائمًا.

عند عدم وجود PR:

* قارن Base SHA وFinal SHA.
* افحص الملفات المتغيرة.
* افحص Commits.
* افحص CI.
* افحص Out-of-scope diff.

عند وجود PR:

* افحص Metadata.
* Diff.
* Changed files.
* Review threads.
* Reviews.
* CI.
* Head SHA.
* Base branch.
* Merge conflicts.
* Scope expansion.

عند طلب الدمج:

1. تحقق من `expected_head_sha`.
2. تحقق من جميع الفحوص المطلوبة.
3. لا تدمج عند وجود مانع.
4. لا تدمج مرجع العمل إلى المرجع الأساسي دون أمر صريح.
5. لا تفعّل Auto-merge دون أمر صريح.
6. لا تعتبر `READY_FOR_REVIEW` إغلاقًا نهائيًا.

---

# 31. حدود الاعتماد

منفذ التغيير لا يعتمد بنفسه نهائيًا النطاقات المحمية:

* Authentication.
* Authorization.
* Sessions.
* Privacy.
* PII.
* Secrets.
* Trusted-scope and operator-context isolation.
* Security.
* WLT.
* Finance.
* Migrations.
* Production data.
* Critical vulnerabilities.
* Release.
* Deployment.
* Production verification.
* Residual risk.
* Final closure.

الموافقة العامة على التنفيذ لا تساوي قبول النتيجة غير المرئية.

---

# 32. مصفوفة الأدلة

```yaml
evidence_scope_matrix:
  static:
    applicability:
    status:
    evidence:
  product:
    applicability:
    status:
    evidence:
  runtime:
    applicability:
    status:
    evidence:
  visual:
    applicability:
    status:
    evidence:
  qa:
    applicability:
    status:
    evidence:
  security:
    applicability:
    status:
    evidence:
  finance:
    applicability:
    status:
    evidence:
  isolation:
    applicability:
    status:
    evidence:
  governance:
    applicability:
    status:
    evidence:
  ci:
    applicability:
    status:
    evidence:
  release:
    applicability:
    status:
    evidence:
  production:
    applicability:
    status:
    evidence:
```

القيم:

```text
PROVEN
FAILED
NOT_APPLICABLE_WITH_REASON
BLOCKED_EXTERNAL
NEEDS_EVIDENCE
```

يجب أن تكون الأدلة:

* من Final SHA.
* قابلة لإعادة التشغيل.
* مرتبطة بادعاء محدد.
* غير متناقضة.
* ليست Mock.
* ليست Historical evidence.
* ليست مجرد اسم Guard أو Workflow.
* ليست Static check لإثبات Runtime.

---

# 33. قرارات المهمة

استخدم قاموس القرارات الموجود فعليًا في الفرع.

عند توافق القاموس، استخدم مثلًا:

```text
PASS
FIX_REQUIRED
NEEDS_EVIDENCE
BLOCKED_EXTERNAL
READY_FOR_REVIEW
OUT_OF_SCOPE_FOR_THIS_JOURNEY
QA_BLOCK
SECURITY_BLOCK
RELEASE_BLOCK
PROTOCOL_VIOLATION
CLOSED_WITH_EVIDENCE
```

لا تستخدم عبارات غير منضبطة مثل:

```text
READY
CLOSED
100%
ALL DONE
PERFECT
MERGE READY
```

---

# 34. شروط الإغلاق

لا تصدر `CLOSED_WITH_EVIDENCE` إلا عند تحقق كل ما ينطبق:

```text
REPOSITORY_PINNED
WORK_BRANCH_PINNED
BASE_SHA_PINNED
FINAL_SHA_PINNED
ROOT_CAUSE_IDENTIFIED
PRODUCT_BEHAVIOR_DEFINED
PLATFORM_MODEL_RESPECTED
LIVE_CODE_CORRECTED
FULLSTACK_BINDING_PROVEN
REQUIRED_SURFACES_PROVEN
IDENTITY_AND_SESSION_BOUNDARIES_PROVEN
TRUSTED_SCOPE_PROVEN
PARTNER_AND_STORE_ISOLATION_PROVEN
OPERATOR_CONTEXT_ISOLATION_PROVEN_WHEN_APPLICABLE
PARTNER_MANAGEMENT_BOUNDARIES_PROVEN_WHEN_APPLICABLE
PERMISSIONS_PROVEN
CONTRACT_BINDING_PROVEN
DATABASE_EFFECT_PROVEN
READBACK_PROVEN
TEST_EFFECTIVENESS_PROVEN
RUNTIME_PROVEN
SECURITY_PROVEN
FINANCIAL_TRUTH_PROVEN
MIGRATION_SAFETY_PROVEN
COMPATIBILITY_PROVEN
VISUAL_AND_ACCESSIBILITY_PROVEN
OBSERVABILITY_PROVEN
CI_PROVEN_ON_FINAL_SHA
TEMPORARY_FILES_REMOVED
STALE_EVIDENCE_REMOVED
NO_OUT_OF_SCOPE_DIFF
NO_RAW_EVIDENCE_COMMITTED
NO_RUNTIME_MOCKS
NO_AUTOMATIC_TASK_BRANCH
NO_UNRESOLVED_BLOCKERS
ALL_APPLICABLE_APPROVALS_PRESENT
```

كل بند غير منطبق يجب أن يحمل `NOT_APPLICABLE_WITH_REASON` ودليل عدم التأثر. لا يجوز وضع بوابة عزل غير مطابقة للنموذج؛ تستخدم بوابة Platform/Operator/Partner/Store/Actor المناسبة حسب النطاق الفعلي.

# 35. الموانع الخارجية

استخدم `BLOCKED_EXTERNAL` فقط عند وجود مانع خارجي حقيقي، مثل:

* صلاحية كتابة مفقودة.
* Branch protection تمنع التنفيذ.
* Secret مطلوب غير متاح.
* حساب مزود غير مفعل.
* جهاز أو خدمة خارجية لازمة غير متاحة.
* Production access غير متاح.
* خطر حذف بيانات يحتاج قرارًا بشريًا.
* فرع تحرك بتغييرات متعارضة لا يمكن دمجها آمنًا.

عند وجود مانع:

1. أكمل كل ما لا يعتمد عليه.
2. حدده بدقة.
3. لا تحوّله إلى تقرير طويل.
4. اذكر الإجراء المباشر لفك الحظر.
5. لا تنشئ فرعًا بديلًا تلقائيًا.

---

# 36. المخرج النهائي

أصدر تقريرًا تنفيذيًا مركزًا:

```yaml
final_report:
  canonical_result:

  repository:
  work_branch:
  base_ref:
  base_sha:
  final_sha:
  execution_mode:

  target:
  reported_problem:
  root_cause:
  required_behavior:
  product_truth:

  scope:
  allowed_paths:
  forbidden_paths:
  affected_surfaces:
  control_panel_sections:
  out_of_scope_diff:

  files_created:
  files_modified:
  files_moved:
  files_merged:
  files_deleted:

  verified_fullstack_chain:
  backend_status:
  database_and_migrations_status:
  openapi_and_generated_clients_status:
  shared_ownership_status:
  wlt_financial_boundary_status:
  platform_context:
  trusted_scope_isolation_status:
  platform_and_operator_context_isolation_status:
  ui_surface_status:
  mobile_native_status:
  navigation_and_routes_status:
  events_and_outbox_status:
  cache_status:
  runtime_and_docker_status:
  external_integrations_status:

  security_and_privacy_status:
  accessibility_status:
  performance_status:
  observability_and_audit_status:
  compatibility_status:
  resilience_status:

  test_effectiveness_status:
  artifact_and_test_cleanup_status:
  verification_read_only_status:
  ci_status:
  evidence_scope_matrix:
  protected_approval_status:

  branch_moved_during_execution:
  write_atomicity_status:
  pull_request_status:
  merge_status:
  merge_recommendation:

  remaining_blockers:
```

لكل مشكلة أو مانع:

```yaml
finding_or_blocker:
  path:
  symbol_or_line:
  category:
  problem:
  evidence:
  root_cause:
  impact:
  affected_surfaces:
  trusted_scope_risk:
  platform_or_operator_context_risk:
  financial_risk:
  security_risk:
  runtime_risk:
  priority: P0 | P1 | P2 | P3
  required_action:
  verification_command:
  expected_result:
  current_status:
```

---

# 37. المعيار النهائي

المعيار ليس:

* كثرة الملفات أو طول التقرير.
* عدد الحراس أو Workflows.
* نجاح Build أو Typecheck فقط.
* ظهور الشاشة أو وجود API أو Test أو Evidence file.
* كتابة تسمية عامة أو إضافة معرف نطاق ملتبس.

المعيار هو أن يصبح النطاق المطلوب:

* صحيحًا وظيفيًا ومتوافقًا مع Product Truth.
* مترابطًا Full-Stack وموحدًا Multi-Surface.
* مملوكًا من Domain owner واحد ومسار كتابة واحد.
* محافظًا على الهوية والنطاق الموثوق الصحيح.
* معزولًا بين Platform Contexts وOperator Contexts وPartners وStores وActors وفق النطاق الفعلي.
* ملتزمًا بأن قدرات إدارة الشريك لا تنشئ منصة مستقلة أو سلطة سيادية للشريك.
* محافظًا على الحقيقة المالية داخل WLT.
* متوافقًا بين الإصدارات.
* آمنًا وقابلًا للتعافي والمراقبة والاختبار.
* مثبتًا على Final SHA نفسه.
* خاليًا من النجاح الشكلي وMock التشغيلي وFallback الصامت.
* خاليًا من التضارب والتكرار والديون المؤجلة غير المبررة داخل النطاق.
* خاليًا من ادعاء إغلاق أو تفعيل تجاري غير مثبت.

توجد قاعدة حاسمة: قد تكون بعض الحقائق أو السياسات أو القدرات الواجب امتلاكها مركزيًا موزعة محليًا داخل أسطح أو خدمات أو ملفات متعددة وبأشكال وأسماء مختلفة. عند اكتشاف ذلك، يجب تحديد المالك القانوني، وإنشاء أو إصلاح المصدر الحاكم، وإيقاف الكتابة الموازية، وترحيل البيانات والمستهلكين، وإثبات التكافؤ والقراءة الراجعة، ثم إزالة البقايا والـFallbacks وإضافة حارس يمنع عودتها. لا يسمح بمزامنة مصدرين دائمين أو إبقاء نسخة محلية قابلة للحياة.

ابدأ من أحدث حالة حقيقية للفرع الذي يحدده المستخدم، ونفّذ على الفرع نفسه عند وجود التفويض، ووسّع الفحص بقدر الأثر والخطر والاعتماد فقط، ولا تصدر الإغلاق النهائي إلا بأدلة عملية قابلة للمراجعة من الالتزام النهائي نفسه.

# 38. التنفيذ المتسلسل للرحلات والشرائح الرأسية

يطبق هذا القسم عندما تكون المهمة رحلة تشغيلية مسجلة، أو مجموعة رحلات، أو Capability واسعة يجب تفكيكها إلى شرائح رأسية قابلة للإغلاق. وهو جزء من الأمر نفسه ولا يمثل أمرًا مستقلًا.

## 38.1 مدخلات الرحلات

```yaml
journey_execution:
  journey_registry:
    governance/27_FULLSTACK_MULTI_SURFACE_JOURNEY_REGISTRY.md

  governing_protocol:
    governance/operational_journey_protocol_package

  journey_selection:
    <Journey ID واحد أو نطاق مصرح به أو NOT_APPLICABLE>

  execution_order:
    one_journey_at_a_time: true
    one_vertical_slice_at_a_time: true
    close_slice_before_next_slice: true
    close_journey_before_next_journey: true
    stop_after_authorized_selection: true
```

لا تستخدم أسماء أو أرقام رحلات محفوظة في الذاكرة. استخرج الاسم والنطاق والمالك والشرائح من السجل الحي الموجود على الالتزام المثبت.

عند تحديد نطاق مثل `JRN-005..JRN-010` يكون التفويض محصورًا في هذا النطاق، ويجوز الانتقال تلقائيًا بين رحلاته بعد إغلاق كل رحلة، دون فتح رحلة خارجه.

إذا لم تكن المهمة مرتبطة برحلة مسجلة، استخدم:

```text
journey_selection: NOT_APPLICABLE
```

مع سبب مثبت، وطبّق بقية الأمر على Capability أو المهمة المحددة.

## 38.2 بوابة الرحلة السابقة

قبل بدء رحلة تعتمد على رحلة سابقة:

1. افحص الاعتماد التشغيلي المباشر فقط.
2. تحقق من العقود المشتركة والحالات والانتقالات وقاعدة البيانات والصلاحيات والعقل المشترك والعملاء المولدين والأحداث والقراءة الراجعة.
3. لا تعتمد على كلمة «مكتملة» أو تقرير تاريخي.
4. لا تعِد فحص الرحلة السابقة كاملة دون سبب.
5. إذا وجدت فجوة سابقة تكسر الرحلة الحالية، صنفها:

```text
CROSS_JOURNEY_DEPENDENCY_REPAIR
```

6. أصلح الجزء الضروري فقط، ثم أعد التحقق منه قبل متابعة الرحلة الحالية.
7. إذا كانت الفجوة السابقة لا تؤثر في الرحلة الحالية، سجلها دون توسيع النطاق تلقائيًا.

## 38.3 تعريف الرحلة

```yaml
journey_definition:
  journey_id:
  journey_name:
  operational_problem:
  target_outcome:
  actors:
  roles:
  required_surfaces:
  excluded_surfaces_with_reason:
  truth_owner:
  services:
  shared_brain_owner:
  entities:
  states:
  transitions:
  allowed_actions:
  forbidden_actions:
  negative_invariants:
  database_scope:
  api_contract_scope:
  backend_scope:
  frontend_scope:
  runtime_scope:
  security_scope:
  financial_scope:
  partner_management_scope:
  platform_and_operator_context_scope:
  registered_slices:
  discovered_slices:
  acceptance_conditions:
```

أي Capability جديدة مكتشفة وغير ممثلة في سجل الرحلات تعد فجوة سجل، ويجب إضافتها أو ربطها بالحالة الحاكمة المناسبة قبل إنهاء الرحلة.

لا تحذف الرحلات التاريخية. استخدم حالات مثل:

```text
MERGED_INTO
RETIRED
OUT_OF_SCOPE_FOR_THIS_JOURNEY
```

مع السبب والمرجع.

## 38.4 جرد الأسطح داخل الرحلة

يشمل الجرد، عند الانطباق:

- `app-client`.
- `app-partner`.
- `app-captain`.
- `app-field`.
- `control-panel`.
- `webapp`.
- `website`.
- DSH shared brain.
- WLT-for-DSH shared brain.
- Identity.
- Workforce.
- Platform Control and platform-model governance.
- Backend modules.
- Database and migrations.
- OpenAPI and generated clients.
- Runtime and Docker.
- Events and outbox.
- Notifications and providers.
- Trusted-scope and operator-context isolation.
- Tests and targeted CI.

قرار كل عنصر:

```text
IN_SCOPE
READ_ONLY
FORBIDDEN
NOT_AFFECTED_WITH_REASON
```

يشمل الجرد داخل كل سطح:

- الصفحات والشاشات.
- Routes والتنقل.
- التبويبات.
- الأزرار والأيقونات.
- النوافذ والأدراج.
- الحقول والنماذج.
- البحث والترشيح والترتيب والترقيم.
- التأكيد والإلغاء وإعادة المحاولة.
- Loading وEmpty وError وSuccess.
- Offline وForbidden وConflict وBlocked وDisabled.
- Partial state وRecovery state.
- صلاحيات الظهور والتنفيذ.
- القراءة الراجعة بعد العملية.

## 38.5 استخراج الشرائح وترتيبها

قبل فتح أول شريحة:

1. استخرج الشرائح الوظيفية المسجلة.
2. طبّق الشرائح الثابتة `FS-01..FS-18` عند وجودها وانطباقها.
3. استخرج الشرائح الإضافية التي تفرضها العقود والمهاجرات والـRoutes والشاشات والحالات والأحداث والتكاملات.
4. رتب الشرائح وفق الاعتماد التشغيلي.
5. حدد لكل شريحة:
   - الهدف.
   - النطاق.
   - الملفات.
   - المالك.
   - الطبقات.
   - الأسطح.
   - شروط القبول.
   - الفحوص المطلوبة.
6. افتح شريحة تنفيذية واحدة فقط.

يجب أن تكون الشريحة:

- رأسية لا أفقية.
- صغيرة بما يكفي للتحقق المركز.
- مكتملة من نية المستخدم إلى الحقيقة التشغيلية.
- محددة بمالك ومسارات واضحة.
- قابلة للإغلاق بدليل مستهدف.

يمنع التقسيم التالي:

```text
كل الواجهة
→ كل Backend
→ كل قاعدة البيانات
```

والتقسيم الصحيح:

```text
حالة استخدام واحدة
→ جميع طبقاتها
→ جميع أسطحها
→ تحققها
→ إغلاقها
```

## 38.6 دورة تنفيذ الشريحة

```text
PIN SLICE SCOPE
→ DIAGNOSE
→ IDENTIFY ROOT CAUSE
→ DETERMINE CANONICAL OWNER
→ IMPLEMENT LIVE CODE
→ COMPLETE FULL-STACK BINDING
→ COMPLETE MULTI-SURFACE BINDING
→ REMOVE LOCAL AND LEGACY RESIDUE
→ RUN TARGETED VERIFICATION
→ FIX FAILURES
→ RUN READ-ONLY REVERIFICATION
→ REVIEW DIFF
→ COMMIT LOGICAL UNIT
→ PUSH WHEN AUTHORIZED
→ REPIN HEAD SHA
→ CLOSE SLICE
→ OPEN NEXT SLICE
```

لكل شريحة:

1. أثبت الفجوة.
2. حدد السبب الجذري.
3. حدد مالك الحقيقة.
4. حدد المسارات المسموحة والممنوعة.
5. نفذ التغيير في الكود الحي.
6. أكمل العقود والـBackend وقاعدة البيانات والعقل المشترك والأسطح.
7. نظف القديم والتكرار والـFallbacks المرتبطة.
8. نفذ أصغر تحقق كافٍ.
9. عالج كل فشل.
10. أعد التحقق بعد آخر تعديل.
11. راجع Diff الشريحة.
12. أنشئ Commit ذريًا عند اكتمال الوحدة المنطقية.
13. Push إلى فرع العمل عند وجود التفويض.
14. أعد تثبيت SHA.
15. أغلق الشريحة.
16. افتح التالية فقط بعد نجاح بوابتها.

## 38.7 بوابات الصفر للشريحة

```yaml
slice_zero_gate:
  internal_gaps: 0
  unbound_controls: 0
  unbound_components_or_files: 0
  frontend_backend_disconnections: 0
  frontend_only_features: 0
  backend_only_features: 0
  contract_mismatches: 0
  request_response_mismatches: 0
  status_mismatches: 0
  permission_mismatches: 0
  error_mapping_mismatches: 0
  duplicate_truth_owners: 0
  local_surface_business_logic: 0
  raw_surface_api_calls: 0
  parallel_writable_sources: 0
  runtime_mock_truths: 0
  obsolete_code: 0
  failed_required_checks: 0
  unverified_required_behavior: 0
```

إذا فشل أي بند:

- تبقى الشريحة مفتوحة.
- يصلح الفشل فورًا.
- يعاد التحقق.
- لا تؤجل الفجوة إلى شريحة أو رحلة لاحقة ما دامت قابلة للإصلاح داخل النطاق.

## 38.8 بوابة إغلاق الرحلة

لا تغلق الرحلة إلا بعد:

1. إغلاق جميع الشرائح المسجلة.
2. إغلاق جميع الشرائح المكتشفة.
3. تحديث سجل الرحلات عند الحاجة.
4. إثبات التكامل بين الشرائح.
5. إثبات القراءة والكتابة وانتقالات الحالات بين الأسطح.
6. تشغيل سيناريو الرحلة كاملًا.
7. تشغيل السيناريوهات السلبية والحدية المنطبقة.
8. نجاح الفحوص التكاملية المستهدفة.
9. نجاح بوابات الصفر.
10. عدم بقاء فجوة داخلية قابلة للإصلاح.
11. تطابق الأدلة مع Final SHA.

يمنع:

- فتح شريحتين تنفيذيتين في الوقت نفسه.
- تنفيذ الرحلات بالتوازي عندما تتشارك مالك حقيقة أو ملفات حاكمة.
- إعلان اكتمال أغلب الشرائح على أنه اكتمال الرحلة.
- اعتبار Build أو Workflow أو تقرير بديلًا عن الرحلة الحية.
- الانتقال إلى رحلة جديدة مع شريحة مفتوحة أو Readback ناقص أو Migration غير آمنة.

## 38.9 التوازي المنضبط

يمكن استخدام العمل المتوازي داخل الشريحة الحالية فقط عندما تكون المهام مستقلة فعليًا.

يمنع تعديل جهتين بالتوازي لنفس:

- الملف.
- Migration.
- OpenAPI contract.
- Generated client.
- Shared controller.
- State machine.
- Permission model.
- Truth owner.
- Package manifest.
- Generated output.

التعديلات المشتركة والمولدة والمتسلسلة تنفذ Serially.

يظل المنسق مسؤولًا عن:

- منع التكرار.
- منع التناقض.
- دمج النتائج دلاليًا.
- التحقق الموحد بعد آخر كتابة.
- تقرير إغلاق الشريحة.

## 38.10 تقرير الشريحة

```yaml
slice_progress:
  repository:
  work_branch:
  resolved_commit_sha:
  journey:
  slice:
  slice_status:
  root_cause:
  changed_paths:
  change_type:
  implemented:
  deleted_or_consolidated:
  verification:
  slice_zero_gate:
  result:
  commit:
  next_slice:
```

حالات `slice_status`:

```text
IN_PROGRESS
FIX_REQUIRED
BLOCKED_EXTERNAL
READY_TO_CLOSE
CLOSED
```

لا تستخدم `CLOSED` قبل نجاح كل بوابات الشريحة.

## 38.11 التقرير النهائي للرحلة

```yaml
journey_final_report:
  repository:
  work_branch:
  final_sha:
  journey_id:
  journey_name:
  registry_status:
  registered_slices:
  discovered_slices:
  closed_slices:
  open_slices: 0
  covered_layers:
  covered_surfaces:
  excluded_surfaces_with_reason:
  implemented_capabilities:
  fixed_root_causes:
  cleaned_or_deleted_artifacts:
  canonical_truth_owners:
  database_changes:
  contract_changes:
  backend_changes:
  shared_brain_changes:
  surface_changes:
  runtime_changes:
  commits:
  targeted_checks:
  evidence_scopes_passed:
  independent_approvals_obtained:
  independent_approvals_remaining:
  zero_gate:
  decision:
  remaining_external_blockers:
  remaining_risks:
  next_authorized_journey:
```

## 38.12 القاعدة غير القابلة للتجاوز

```text
لا شريحة تالية قبل إغلاق الشريحة الحالية.
لا رحلة تالية قبل إغلاق جميع شرائح الرحلة الحالية.
لا إغلاق للرحلة قبل تحقق التكامل الكامل وبوابات الصفر.
```

---

# الملحق الحاكم الإلزامي للمركزية والسيادة ومنع الحقائق المحلية المتوازية

## Sovereign Centralization, Canonical Ownership and Single Source of Truth Gate

يعد هذا الملحق جزءًا إلزاميًا وغير اختياري من الأمر التنفيذي الهندسي الشامل والموحد لمنظومة بثواني، ويسري على كل مهمة مهما كان حجمها أو نوعها أو سطحها أو خدمتها أو موقعها داخل المستودع.

لا يجوز تنفيذ أي مهمة أو اعتمادها أو إغلاقها قبل تطبيق هذا الملحق على النطاق المتأثر فعليًا وعلى كل حقيقة مشتركة قد تتأثر بالتغيير.

يطبق هذا الملحق على:

* التطبيقات.
* الأسطح.
* الشاشات.
* الصفحات.
* الأقسام.
* التبويبات.
* المكونات.
* Hooks وControllers وView Models.
* Frontend وBackend.
* BFF وAPI Gateways.
* الخدمات والنطاقات المقيدة.
* Identity وWorkforce وDSH وWLT.
* قواعد البيانات والمهاجرات.
* OpenAPI والعقود والعملاء المولدين.
* البيانات المرجعية.
* Runtime وDocker.
* تطبيقات الهاتف.
* التخزين المحلي وOffline.
* Events وQueues وOutbox.
* Cache.
* الملفات والوسائط.
* الخرائط والمزودين.
* CI وWorkflows.
* الاختبارات والـFixtures والـSeeds.
* الحوكمة والأدوات المساندة.
* أي Capability أو Feature أو سياسة أو تدفق أو حقيقة تشغيلية أخرى.

---

---

## A.0 وضع التنفيذ المعماري الحاكم — Full-Stack Unified Multi-Surface B2B2C وفق نموذج المنصة

يجب تفسير هذا الملحق وفق النموذج:

```text
FULL-STACK
+ UNIFIED
+ MULTI-SURFACE
+ B2B2C MULTI-SIDED PLATFORM
+ DOMAIN-OWNED
+ TRUSTED-SCOPE
+ CONTRACT-FIRST
+ RUNTIME-PROVEN
+ PLATFORM-CONTEXT-ISOLATED
+ PARTNER-MANAGEMENT-AWARE WITHOUT INDEPENDENT PARTNER PLATFORM
```

لا يجوز تفسير أي مهمة على أنها تعديل معزول لواجهة أو ملف أو تطبيق أو خدمة منفردة عندما يثبت أثرها في طبقات أخرى.

كل مهمة تعد افتراضيًا شريحة عمودية Full-Stack موحدة متعددة الأسطح ومقيدة بالنطاق القانوني. تطبق حدود Platform Context وOperator Context والنطاقات التجارية والمالية الفعلية بحسب المهمة.

```text
PRODUCT AND DOMAIN TRUTH
→ CANONICAL OWNER
→ ACTOR AND TRUSTED IDENTITY
→ TRUSTED OPERATOR CONTEXT
→ APPLICABLE partner/PARTNER/STORE/REGION/DEPARTMENT SCOPE
→ PLATFORM CONTEXT
→ AUTHORIZATION
→ CANONICAL CONTRACT
→ BACKEND DOMAIN LOGIC
→ DATABASE AND MIGRATIONS
→ EVENTS / OUTBOX / QUEUES
→ CACHE / SEARCH / MEDIA / OFFLINE
→ GENERATED CLIENTS
→ SHARED FRONTEND BRAIN
→ BFF OR SURFACE ADAPTERS
→ WEB AND MOBILE SURFACES
→ RUNTIME AND DATABASE EFFECT
→ MULTI-SURFACE READBACK
→ SCOPE ISOLATION
→ PLATFORM CONTEXT ISOLATION
→ CI PROOF ON FINAL SHA
```

### المقصود بـFull-Stack

لا يعد التنفيذ Full-Stack عندما تعمل الواجهة دون Backend حقيقي، أو يعمل Backend دون عقد حاكم، أو توجد Migration دون ربط، أو يحدث الحفظ دون Readback، أو يعمل المسار على Mock، أو ينجح Typecheck بينما يفشل Runtime، أو تنفذ العملية دون Authorization أو Scope موثوق.

### المقصود بـUnified

```text
ONE PRODUCT TRUTH
ONE DOMAIN OWNER PER FACT
ONE CONTRACTUAL MEANING
ONE SECURITY AUTHORITY
ONE TRUSTED SCOPE MODEL
ONE FINANCIAL AUTHORITY
ONE STATE VOCABULARY
MANY CONTROLLED SURFACE CONSUMERS
```

لا يعني Unified جمع Identity وWorkforce وDSH وWLT وPlatform Control في خدمة واحدة؛ بل يعني وضوح الحدود وعدم تكرار الحقيقة.

### المقصود بـMulti-Surface

تنفذ Capability المشتركة في المالك والعقل المشترك، ثم تستهلكها الأسطح المخولة. يجوز اختلاف العرض والتنقل والنصوص وNative adapters، ولا يجوز اختلاف حقيقة المجال أو الحالات أو الصلاحيات أو النطاق أو العقود أو الحسابات المالية أو Error semantics.

### المقصود بالنطاق الموثوق

النطاق الموثوق قد يكون Platform Context أو Operator Context أو Partner أو Store أو Region أو Department أو Assignment أو Actor. لا تستخدم معرفًا عامًا لإخفاء المالك القانوني، ولا تعامل Partner أو Store بوصفه Platform Context أو Operator Context. كل Selector قادم من العميل يخضع لمطابقة السلطة الموثقة.

### المقصود بقدرات إدارة الشريك

هي أدوات مستضافة للشريك داخل بثواني لإدارة بياناته ومستخدميه ومتاجره والكتالوج والطلبات والتوصيل والكباتن والتقارير والمحفظة والتسويات، مع بقاء Order truth في DSH والماليات في WLT، ودون إنشاء منصة مستقلة للشريك.

### المقصود بعزل Platform Context وOperator Context

يجب أن تكون كل قراءة وكتابة وعقد وحدث وCache وملف وJob وبحث وسجل مرتبطة بـPlatform Context وOperator Context والنطاق القانوني الموثوق، مع منع Default scope والتسرب والوصول المتبادل، وإثبات العزل الأمني والمالي والتشغيلي والنسخ والاستعادة والتصدير والحذف والمراقبة.

### المقصود بالشريحة العمودية

```text
ACTOR
→ TRUSTED SCOPE
→ SURFACE
→ PERMISSION
→ ACTION
→ CONTRACT
→ DOMAIN OWNER
→ PERSISTENCE
→ EVENT OR SIDE EFFECT
→ READBACK
→ ALL AFFECTED SURFACES
```

### قاعدة توسيع النطاق

يوسع النطاق إلى أي ملف أو خدمة أو عقد أو جدول أو سطح يلزم لتحقيق الاتساق الكامل. لا يعد ذلك Scope creep إذا كان ضروريًا لإزالة Backend غير مربوط أو عقد قديم أو DB غير متوافقة أو Permission متناقضة أو Scope isolation ناقص أو Financial readback غير متسق أو نسخة محلية للحقيقة.

### بوابة الإثبات الحاكمة

```text
FULLSTACK_PATH_PROVEN
UNIFIED_TRUTH_PROVEN
CANONICAL_OWNER_PROVEN
TRUSTED_SCOPE_PROVEN
CONTRACT_TO_RUNTIME_PROVEN
DATABASE_EFFECT_PROVEN
AUTHORIZATION_PROVEN
PARTNER_STORE_ISOLATION_PROVEN
OPERATOR_CONTEXT_ISOLATION_PROVEN_WHEN_APPLICABLE
PARTNER_MANAGEMENT_BOUNDARIES_PROVEN_WHEN_APPLICABLE
ALL_AFFECTED_SURFACES_VERIFIED
CROSS_SURFACE_READBACK_PROVEN
NO_LOCAL_PARALLEL_IMPLEMENTATION
NO_MOCK_SUCCESS
NO_DOCUMENT_ONLY_SUCCESS
FINAL_SHA_RUNTIME_PROVEN
```

عند غياب أي دليل منطبق:

```text
FIX_REQUIRED | NEEDS_EVIDENCE
```

### القاعدة النهائية

المعيار ليس أن تعمل الشاشة منفردة، بل أن تعمل Capability كاملة من مصدر الحقيقة والمالك والعقد والـBackend وقاعدة البيانات حتى كل سطح مخول والقراءة الراجعة، مع النطاق القانوني الصحيح، ودون تكرار أو مسار محلي مستقل أو ادعاء تجاري غير منطبق.

# A.1 القاعدة السيادية المطلقة

لكل حقيقة وظيفية أو تشغيلية أو أمنية أو مالية أو تنظيمية أو تعاقدية أو مرجعية أو تقنية مالك قانوني واحد فقط، ومصدر حقيقة حاكم واحد فقط.

```text
ONE FACT
→ ONE CANONICAL OWNER
→ ONE AUTHORITATIVE SOURCE
→ ZERO PARALLEL AUTHORITIES
→ MANY CONTROLLED CONSUMERS
```

تعد مخالفة مركزية كل حالة يكون فيها للمعنى نفسه:

* أكثر من مالك.
* أكثر من مصدر حقيقة.
* أكثر من نسخة قابلة للتعديل.
* أكثر من محرك قرار.
* أكثر من Validator مستقل.
* أكثر من State machine مستقلة.
* أكثر من Enum يدوي.
* أكثر من Policy implementation.
* أكثر من Contract حاكم.
* أكثر من Migration authority.
* أكثر من تفسير للصلاحية أو الحالة أو الخطأ.
* أكثر من مسار يحفظ الحقيقة نفسها.
* نسخة مركزية وأخرى محلية قابلة للحياة بصورة مستقلة.

ينطبق ذلك حتى عندما تكون النسخ متطابقة نصيًا في اللحظة الحالية؛ لأن تطابقها الحالي لا يمنع اختلافها مستقبلًا.

وجود نسختين متطابقتين يعني:

```text
DUPLICATED_AUTHORITY
```

ولا يعني:

```text
SAFE_DUPLICATION
```

---

# A.2 تعريف المركزية الصحيحة

المركزية الصحيحة لا تعني جمع كل شيء في ملف ضخم أو خدمة واحدة أو مجلد يسمى `shared`.

المركزية الصحيحة تعني:

1. تحديد المالك القانوني للحقيقة.
2. تحديد المصدر الحاكم الذي يكتبها أو يقررها.
3. تحديد شكلها التعاقدي.
4. تحديد قاعدة البيانات المالكة لها عند وجود Persistence.
5. تحديد المخرجات المولدة منها.
6. تحديد المستهلكين المسموح لهم.
7. تحديد الـAdapters المحلية المسموحة.
8. منع أي مستهلك من إعادة تعريفها أو تفسيرها بصورة مستقلة.
9. إزالة النسخ القديمة والمتوازية.
10. إضافة تحقق يمنع عودة النسخ المحلية مستقبلًا.
11. إثبات القراءة الراجعة من المصدر الحاكم.
12. إثبات أن جميع الأسطح ترى الحقيقة نفسها بحسب صلاحياتها.

وضع المنطق في مسار يحمل اسمًا مثل:

```text
shared
common
core
utils
helpers
constants
registry
```

لا يثبت المركزية بذاته.

لا تعد الحقيقة مركزية إلا إذا تحقق:

```text
CANONICAL OWNER
+ AUTHORITATIVE SOURCE
+ CONTROLLED WRITE PATH
+ CONTROLLED READ PATH
+ NO LIVE DUPLICATE
+ NO PARALLEL DECISION ENGINE
+ RUNTIME READBACK
+ REGRESSION GUARD
```

---

# A.3 التصنيف الإلزامي لكل عنصر

يجب تصنيف كل تعريف أو ملف أو قيمة أو منطق ذي صلة بالنطاق إلى أحد التصنيفات التالية:

```text
CANONICAL_TRUTH
GENERATED_DERIVATIVE
READ_ONLY_PROJECTION
ALLOWED_LOCAL_ADAPTER
ALLOWED_EPHEMERAL_UI_STATE
EXTERNAL_PROVIDER_TRUTH
LEGACY_RESIDUE
FORBIDDEN_LOCAL_DUPLICATE
UNKNOWN_OWNERSHIP
FIX_REQUIRED
```

## CANONICAL_TRUTH

المصدر الوحيد المسموح له بامتلاك الحقيقة أو تعديلها.

## GENERATED_DERIVATIVE

مخرج يولد آليًا من المصدر الحاكم، مثل:

* Generated API clients.
* Generated types.
* Generated schemas.
* Generated registries.
* Generated migration manifests.

يمنع تعديله يدويًا.

## READ_ONLY_PROJECTION

قراءة مشتقة أو لقطة أو مرجع لا يملك الحقيقة الأصلية ولا يستطيع تعديلها بصورة مستقلة.

## ALLOWED_LOCAL_ADAPTER

تنفيذ محلي ضروري بسبب اختلاف المنصة أو الإطار، مثل:

* Native file picker.
* Camera adapter.
* SecureStore adapter.
* BFF transport adapter.
* Platform permission prompt.

يمنع أن يحتوي على Business truth أو Security policy أو trusted-scope resolution أو Financial calculation.

## ALLOWED_EPHEMERAL_UI_STATE

حالة عرض مؤقتة لا تستمر كمصدر حقيقة، مثل:

* فتح Modal.
* قيمة حقل قبل الإرسال.
* العنصر المحدد مؤقتًا.
* حالة Animation.
* حالة Loading محلية مشتقة.

## EXTERNAL_PROVIDER_TRUTH

حقيقة يملكها مزود خارجي، ويجب أن تدخل عبر Adapter وعقد واضح، ولا يعاد اختراعها محليًا.

## LEGACY_RESIDUE

نسخة تاريخية أو مسار متقاعد لم يعد مسموحًا له بالمشاركة في Runtime أو Build أو Contract أو Database.

## FORBIDDEN_LOCAL_DUPLICATE

نسخة محلية أو موازية لحقيقة يملكها مصدر آخر.

## UNKNOWN_OWNERSHIP

عنصر لم يثبت مالكه. يعامل تلقائيًا كالتالي:

```text
FIX_REQUIRED
```

حتى تثبت ملكيته.

---

# A.4 جرد المركزية الإلزامي قبل أي تعديل

قبل أول كتابة، يجب تنفيذ مسح دلالي وليس مجرد بحث نصي.

يجب البحث عن:

* الاسم نفسه.
* المعنى نفسه بأسماء مختلفة.
* القيم المتشابهة.
* Enums المتوازية.
* Constants المتوازية.
* Validators المتوازية.
* State machines المتوازية.
* جداول تحمل المعنى نفسه.
* أعمدة متكررة بين الخدمات.
* Routes متوازية.
* APIs متداخلة الملكية.
* عقود متنافسة.
* TypeScript types مكتوبة يدويًا بجانب OpenAPI.
* Go structs أو DTOs تعيد تعريف عقد قائم.
* قيم ثابتة داخل Screens.
* Business decisions داخل Components.
* Permission rules داخل Frontend.
* Scope defaults داخل Runtime.
* Currency وLocale وTimezone hardcoding.
* Error mappings المحلية.
* Status labels التي تعيد تفسير Domain states.
* Fixtures وSeeds التي تدخل Runtime.
* Local storage يستخدم كمصدر حقيقة.
* Mock أو Preview يعمل كمسار إنتاج.
* ملفات قديمة ما زالت مستوردة.
* Duplicate migration identifiers.
* أكثر من Master contract index.
* أكثر من Registry يدعي السلطة نفسها.

يجب إنشاء الجرد الداخلي التالي:

```yaml
centralization_inventory:
  subject:
  semantic_identity:
  discovered_definitions:
    - path:
      symbol:
      layer:
      classification:
      writable:
      runtime_reachable:
      current_owner_claim:
      evidence:
  canonical_owner:
  authoritative_source:
  duplicate_authorities:
  local_business_logic:
  local_validation:
  local_enums:
  local_reference_data:
  local_persistence:
  contract_duplicates:
  database_duplicates:
  migration_duplicates:
  generated_manual_drift:
  scope_fallbacks:
  financial_duplicates:
  security_duplicates:
  runtime_reachability:
  required_remediation:
```

أي بحث لم يشمل المعنى الوظيفي واكتفى بالاسم يعد غير كافٍ.

---

# A.5 قواعد اختيار المالك القانوني

يحدد المالك بناءً على طبيعة الحقيقة، لا بناءً على أقرب ملف أو أسهل مكان للتعديل.

## Identity يملك حصريًا

* Actors وActor types وService identities.
* Authentication وActivation وLogin methods.
* Sessions وTokens وDevices وRevocation وLockout.
* Roles وPermissions وPermission bundles وScope grammar الأمني.
* Surface access authorization وPrivileged access.

يمنع Workforce أو DSH أو WLT أو الأسطح من إعادة تعريف معنى Role أو Permission أو Session.

## Workforce يملك حصريًا

* الأشخاص والملفات المهنية والوظيفية.
* علاقة العمل أو التعاقد والقسم والمسمى والدرجة والمشرف.
* Assignments ومدتها والجداول والورديات والجاهزية والوثائق والحالة المهنية.
* ملفات الكابتن والميداني المهنية.

لا يكرر الهاتف السيادي أو الجلسة أو الصلاحيات الخام أو المحفظة.

## DSH يملك حصريًا

* Partner وStore والعلاقات التشغيلية التابعة لهما.
* الكتالوج المركزي والمنتجات والـAssortment والنشر التشغيلي.
* Cart وCheckout التشغيلي وServiceability.
* Order truth وFulfillment وDispatch وDelivery وProof وExceptions.
* مناطق التغطية والزيارات الميدانية ذات الحقيقة التشغيلية.
* Outbox للحقائق التشغيلية.

لا يملك Ledger أو Balance mutation أو Commission calculation أو Settlement finalization.

## WLT يملك حصريًا

* Wallets وAccounts وLedger وBalances المشتقة.
* Payments وPayment sessions وCOD custody وCollections.
* Refunds وCommissions وSubscription financial obligations وPartner debts.
* Settlements وPayouts وReconciliation.
* Fees وPenalties وFunding وCurrency arithmetic وRounding المالي.
* التقارير المالية السيادية وIdempotency المالية والنتائج المجهولة.

يجوز لـDSH أو Workforce الاحتفاظ بمعرف أو Reference أو Read-only projection فقط.

## Platform Control يملك حصريًا

* Operator-context governance وحالة المنصة السيادية.
* Change sets والموافقات والتطبيق والRollback.
* Feature flags وProgressive rollout.
* Entitlements وQuotas والسياسات التجارية عند اعتمادها.
* Platform readiness/commercial activation state ومراجع السياسات السيادية.

لا يملك بيانات DSH أو Workforce أو WLT اليومية، ولا يكتب الفوترة أو Ledger.

## Providers يملك حصريًا

* تعريف المزود ونوعه وقدراته وحالته الصحية.
* مراجع الأسرار لا قيم الأسرار.
* سياسات الاتصال والمهل وCircuit state.

## Media/Object Storage Owner يملك حصريًا

* File metadata والمالك والنطاق والغرض.
* سياسات الرفع والتنزيل والمسح والاحتفاظ والحذف.
* روابط قصيرة العمر.

لا يجوز لكل تطبيق اختراع نظام ملفات مستقل.

## Canonical Contract Owner يملك حصريًا

* Request/Response/Error/Event schemas.
* Enums التعاقدية وCompatibility وDeprecation.
* Idempotency وOptimistic locking ومتطلبات الهوية والنطاق.

## Shared Frontend Brain يملك

* Domain-facing hooks وControllers وView models.
* State interpretation وValidation وAPI adapters وError mapping.
* Loading/Empty/Error/Blocked/Conflict/Retry/Offline/Unknown-result states.
* Cache invalidation وOptimistic update وRecovery وReadback orchestration.

أما الأسطح فتملك تركيب العرض والتنقل والتكييف الأصلي فقط.

# A.6 نطاق الحقائق التي يجب فحص مركزيتها دائمًا

يجب فحص الفئات التالية في كل مهمة، وتصنيفها إلى:

```text
IN_SCOPE
READ_ONLY
NOT_AFFECTED_WITH_EVIDENCE
FIX_REQUIRED
```

## أ. حقيقة المنتج

* Capability definitions.
* Actors.
* States.
* Transitions.
* Preconditions.
* Forbidden actions.
* Business invariants.
* Acceptance criteria.
* Reason codes.
* Decision codes.
* Status vocabulary.
* Classification vocabulary.
* Ownership boundaries.

## ب. الأمن والهوية

* Roles.
* Permissions.
* Bundles.
* Scope rules.
* Session rules.
* Activation surfaces.
* Login policies.
* Token claims.
* Device enrollment.
* Recovery.
* Lockout.
* Service authentication.
* Privileged access.

## ج. القوى العاملة والتنظيم

* Departments.
* Positions.
* Grades.
* Employment classes.
* Supervisor hierarchy.
* Assignments.
* Assignment validity.
* Shifts.
* Locations.
* Required documents.
* Readiness gates.
* Suspension/reactivation reasons.
* Provider and employee classifications.

## د. النطاق الموثوق وقدرات إدارة الشريك ونموذج المنصة

* Operator-context resolution and propagation.
* Partner/Store/Actor/Region/Department/Assignment scoping.
* Object authorization and cross-scope workflows.
* Platform Context وOperator Context resolution/propagation من مصدر موثوق.
* Scope-aware queries, writes, constraints and unique keys.
* Cache namespaces وEvent namespaces وStorage paths وSearch indexes.
* Logs and traces and audit partitioning.
* Partner management capabilities and their DSH/WLT/Identity/Workforce boundaries.
* Entitlements وQuotas وPlans وBilling only when approved and applicable.
* Locale/timezone/currency ownership according to the legal domain, not a generic scope assumption.
* Detection and migration of generic or misclassified scope identifier fields.

## هـ. العقود

* Canonical OpenAPI index (`contracts/master.openapi.yaml` عند بقائه المسار الحاكم).
* Schemas.
* DTOs.
* Enums.
* Generated clients.
* Generated types.
* Errors.
* Pagination.
* Filtering.
* Sorting.
* Search.
* Compatibility.
* Event schemas.
* Runtime bindings.

## و. البيانات المرجعية

* Countries.
* Cities.
* Regions.
* Districts.
* Service zones.
* Languages.
* Locales.
* Timezones.
* Currencies.
* Currency exponents.
* Units.
* Measurement types.
* Vehicle types.
* Document types.
* Incident types.
* Cancellation reasons.
* Escalation reasons.
* Notification channels.
* Provider codes.

## ز. الكتالوج

* Domains.
* Categories.
* Taxonomy.
* Master products.
* Brands.
* Units.
* Barcodes.
* Attributes.
* Variants.
* Stock statuses.
* Availability semantics.
* Assortment.
* Store overlays.
* Product proposals.
* Review lifecycle.
* Visibility.
* Media associations.

## ح. الشركاء والمتاجر

* Partner identity.
* Store identity.
* Onboarding state.
* Verification.
* Readiness.
* Publication.
* Schedules.
* Service areas.
* Delivery models.
* Store status.
* Visibility.
* Suspension.
* Commercial and operational gates.

## ط. الطلبات والتوصيل

* Cart rules.
* Checkout rules.
* Order lifecycle.
* Status transitions.
* Dispatch.
* Assignment.
* Pickup.
* Delivery.
* Proof.
* Cancellation.
* Rescue.
* Exceptions.
* SLA.
* Timeout.
* Retry.
* Compensation.
* Tracking events.
* Cross-surface readback.

## ي. الكباتن والميدانيون

* Readiness.
* Availability.
* Capacity.
* Classification.
* Work queue.
* Visit lifecycle.
* Checklist.
* Evidence.
* Location validation.
* Financial eligibility reference.
* Offline operations.
* Retry.
* Conflict resolution.
* Incident policy.
* Performance metrics.

## ك. الماليات

* Currency.
* Currency exponent.
* Balances.
* Ledger.
* Fees.
* Commissions.
* Settlements.
* Refunds.
* Payouts.
* COD.
* Taxes.
* Funding.
* Discounts.
* Minimum balance.
* Financial eligibility.
* Rounding.
* Idempotency.
* Reconciliation.

## ل. الواجهة المشتركة

* Domain types.
* Hooks.
* Controllers.
* View models.
* Validation.
* Error mapping.
* State mapping.
* Formatters.
* Accessibility primitives.
* Design tokens.
* Shared components.
* Navigation contracts.
* Analytics event names.

## م. الملفات والوسائط

* MIME policy.
* Size limits.
* Upload intents.
* Object keys.
* Scope-aware object paths وفق Platform/Operator/Partner/Store/Actor context.
* Media roles.
* Entity linking.
* Scanning.
* Completion.
* Review.
* Retention.
* Deletion.
* URL expiration.

## ن. الخرائط والموقع

* Provider selection.
* Keys.
* Geocoding.
* Routing.
* Distance.
* Accuracy.
* Mock-location policy.
* Service areas.
* Privacy.
* Retention.
* Provider health.
* Fallback.

## س. الإشعارات

* Templates.
* Channels.
* Recipient resolution.
* Push tokens.
* SMS.
* Email.
* In-app delivery.
* Retry.
* Deduplication.
* Quiet hours.
* Opt-out.
* Sensitive-data redaction.

## ع. Events وQueues

* Event names.
* Schemas.
* Trusted platform/operator/partner/store/actor scope.
* Correlation.
* Causation.
* Idempotency.
* Ordering.
* Retry.
* Dead letters.
* Consumers.
* Replay.
* Versioning.
* Compensation.

## ف. Cache وOffline

* Keys.
* Legal scope namespace وفق Platform/Operator/Partner/Store/Actor context.
* TTL.
* Invalidation.
* Persisted schema.
* Operation types.
* Payloads.
* Encryption.
* Retry.
* Conflict handling.
* Corruption recovery.
* Logout cleanup.
* Device ownership.

## ص. Runtime والتكوين

* Ports.
* Base URLs.
* Service discovery.
* Environment schema.
* Required variables.
* Secrets.
* Timeouts.
* CORS.
* Trusted proxies.
* Docker names.
* Health/readiness.
* Development profiles.
* Production profiles.
* Provider configuration.

## ق. الهاتف

* App identity.
* Package and bundle IDs.
* Expo profiles.
* Firebase mapping.
* Maps.
* Push.
* SecureStore keys.
* Deep links.
* Navigation.
* Native permissions.
* OTA compatibility.
* Offline schema.
* Signing.
* EAS profiles.

## ر. قاعدة البيانات

* Schema ownership.
* Table ownership.
* Migration ledger.
* Migration numbering.
* Checksums.
* Constraints.
* Indexes.
* Scope-aware uniqueness وفق المالك القانوني الفعلي للكيان.
* Enum semantics.
* IDs.
* Timestamps.
* Audit.
* Idempotency.
* Outbox.
* Backfills.
* Reconciliation.
* Destructive changes.

## ش. الاختبارات وCI

* Canonical fixtures.
* Test builders.
* Contract tests.
* Security invariants.
* Trusted-scope and operator-context isolation.
* Financial integrity.
* Migration harness.
* Runtime smoke.
* Exact-SHA verification.
* Required checks.
* Workflow permissions.
* Action pinning.
* Source immutability.

---

# A.7 ما يسمح ببقائه محليًا

يسمح محليًا فقط بما لا يملك حقيقة مشتركة ولا قرارًا وظيفيًا ولا أثرًا مستمرًا مستقلًا، مثل:

* تركيب الشاشة.
* ترتيب عناصر العرض.
* Animation.
* Safe area.
* Keyboard handling.
* حالة حقل مؤقتة قبل الإرسال.
* Modal open state.
* Local selection state.
* Native picker adapter.
* Camera adapter.
* SecureStore transport adapter.
* BFF transport adapter.
* Platform permission prompt.
* Surface-specific accessibility composition.

حتى هذه العناصر يمنع أن تحتوي على:

```text
BUSINESS RULE
PERMISSION POLICY
TRUSTED SCOPE RESOLUTION
FINANCIAL CALCULATION
DOMAIN ENUM AUTHORITY
STATUS TRANSITION
RAW API INTERPRETATION
ERROR AUTHORITY
REFERENCE DATA AUTHORITY
PERSISTED PRODUCT TRUTH
```

وجود `useState` لقيمة مؤقتة مسموح.

وجود `useState` أو Constant يقرر معنى حالة أعمال أو صلاحية أو عملة أو قسم أو تصنيف غير مسموح.

---

# A.8 المخالفات المحظورة دون استثناء ضمن النطاق

تعد المخالفات التالية `FIX_REQUIRED` فور اكتشافها:

1. Enum يدوي يكرر Enum تعاقديًا.
2. Type يدوي يكرر Generated type.
3. Permission bundle معرف في أكثر من مالك.
4. Role-to-permission mapping خارج Identity.
5. Scope fallback صامت.
6. Platform/Operator/Partner/Store ID يرسله العميل ويقبل بوصفه سلطة دون ربط بالجلسة أو التفويض الخادمي.
7. Currency ثابتة داخل Screen أو Controller غير مخول.
8. Locale أو Timezone أو Currency يملكها سطح أو ملف محلي بدل المالك القانوني.
9. Business validation داخل Component.
10. State machine داخل Surface.
11. Raw `fetch` أو Axios داخل Screen.
12. بناء URL داخل Surface.
13. Local error-code interpretation.
14. Local status vocabulary.
15. Local catalog مستقل.
16. Local product identity.
17. Local pricing truth.
18. Financial calculation خارج WLT.
19. أكثر من OpenAPI master index.
20. Migration مطبقة معدلة، أو تصادم Migration جديد، أو تصادم تاريخي غير مسجل ومحكوم بالـManifest.
21. `IF NOT EXISTS` يستخدم لإخفاء تعارض Schema.
22. Local bootstrap داخل Production path.
23. Mock أو Fixture يمكن الوصول إليه من Runtime حي.
24. نسخة قديمة لا تزال مستوردة أو مسجلة.
25. Two-way synchronization بين مصدرين يدعيان السلطة.
26. Screen يملك قائمة الأقسام أو الأدوار أو مواقع العمل كحقيقة مؤسسية.
27. قاعدة بيانات خدمة تخزن الحقيقة السيادية لخدمة أخرى بدل Reference أو Projection.
28. Generated output يعدل يدويًا.
29. Cache يستخدم كمصدر حقيقة.
30. Local storage يستخدم كمصدر حقيقة نهائية.
31. نجاح UI دون Readback.
32. Backend effect دون ظهور متسق على الأسطح المطلوبة.
33. أكثر من Validator يقرر قبول الطلب بصورة مختلفة.
34. أكثر من Error envelope حاكم لنفس الخدمة.
35. أكثر من Registry يدعي أنه حاكم للموضوع نفسه.
36. استخدام معرف نطاق عام اسمًا بديلًا لـPartner أو Store أو Environment.
37. تحويل قدرات إدارة الشريك إلى منصة مستقلة أو عزل سيادي جديد دون Product Truth وتفويض وبوابة عزل.
38. عرض خطط أو اشتراكات أو White-label أو Custom domains مؤجلة كأنها فعالة.
39. حساب عمولة أو اشتراك أو دين الشريك داخل DSH أو Surface.
40. إبقاء Compatibility layer بلا مالك أو مدة أو مراقبة أو خطة إزالة.

# A.9 منع المركزية الوهمية

تمنع الحلول التالية:

## النقل الشكلي

نقل Constants من Screen إلى ملف `shared/constants.ts` مع بقاء مصدر آخر قابل للتعديل.

## Wrapper فوق نسخة محلية

إنشاء Hook مشترك لكنه يستدعي منطقًا محليًا مختلفًا في كل سطح.

## Re-export دون إزالة الأصل

إعادة تصدير نسخة محلية من مكان مركزي مع بقاء النسخة المحلية مالكة للمعنى.

## مزامنة ثنائية الاتجاه

محاولة إبقاء مصدرين متزامنين بدل حذف أحدهما.

## Fallback إلى الحقيقة القديمة

استخدام المصدر المركزي أولًا ثم الرجوع إلى نسخة محلية عند الخطأ.

## Feature flag يخفي النسخة المحلية

الإبقاء على المنطق المحلي خلف Flag.

## Duplicate generated/manual models

استخدام Generated client مع Type أو Validator يدوي موازٍ.

## Governance-only closure

كتابة سياسة أو وثيقة تقول إن المصدر مركزي بينما Runtime ما زال يستخدم نسخة محلية.

## Compatibility بلا نهاية

الإبقاء على النسخة القديمة دون تاريخ إزالة ومالك وشرط تقاعد.

كل هذه الحالات تساوي:

```text
CENTRALIZATION_NOT_PROVEN
```

---

# A.10 تسلسل المعالجة الإلزامي

عند اكتشاف حقيقة محلية أو سلطة متوازية، نفذ بالترتيب التالي:

```text
DISCOVER
→ CLASSIFY
→ DETERMINE CANONICAL OWNER
→ FREEZE PARALLEL WRITES
→ DEFINE CANONICAL CONTRACT
→ IMPLEMENT CANONICAL SOURCE
→ MIGRATE DATA
→ MIGRATE CONSUMERS
→ SWITCH READERS
→ SWITCH WRITERS
→ VERIFY READBACK
→ REMOVE FALLBACKS
→ REMOVE LEGACY DEFINITIONS
→ REMOVE LEGACY DATA PATHS
→ REMOVE LEGACY TESTS
→ ADD REGRESSION GUARDS
→ PROVE ZERO RESIDUE
```

## 1. اكتشاف كامل

لا يبدأ الإصلاح قبل جرد كل النسخ المعروفة.

## 2. تثبيت المالك

لا ينشأ مصدر مركزي جديد قبل تحديد المالك الصحيح؛ وإلا قد يتحول الحل إلى مصدر ثالث.

## 3. منع الكتابة المتوازية

لا يسمح باستمرار مسارين يكتبان الحقيقة نفسها أثناء الإغلاق النهائي.

## 4. إنشاء العقد الحاكم

العقد يحدد:

* المدخلات.
* المخرجات.
* الحالات.
* الأخطاء.
* الصلاحيات.
* Trusted platform/operator/partner/store/actor scope.
* Versioning.
* Idempotency.
* Compatibility.

## 5. ترحيل البيانات

عند وجود بيانات محلية:

* جرد السجلات.
* تحديد التعارضات.
* تحديد أولوية المصدر.
* إنشاء Migration أو Backfill.
* حفظ Audit.
* تنفيذ Reconciliation.
* إثبات عدم فقد البيانات.
* منع الكتابة إلى المصدر القديم.

## 6. ترحيل المستهلكين

كل مستهلك ينتقل إلى المصدر الحاكم أو Generated derivative.

## 7. إزالة النسخ القديمة

لا تترك النسخة القديمة «احتياطًا» داخل Runtime.

## 8. إضافة Guards

يضاف تحقق يمنع:

* Enum مكرر.
* Raw API داخل Surface.
* Local catalog.
* New duplicate migration IDs or unmanifested historical collisions.
* Duplicate master indexes.
* Forbidden imports.
* Manual generated-type duplication.
* Default scope fallback.
* Financial truth خارج WLT.

---

# A.11 قواعد البيانات والمهاجرات المركزية

لكل خدمة Ledger وManifest حاكمان لمسار المهاجرات، ولا يجوز وجود Runner أو ترتيب موازٍ غير موثق.

يجب أن تكون كل Migration جديدة:

* ذات معرف وترتيب فريدين بعد نقطة القطع المعتمدة.
* ذات Checksum ثابت.
* مملوكة لخدمة واحدة.
* غير قابلة للتعديل أو إعادة التسمية بعد التطبيق.
* قابلة للاختبار على قاعدة جديدة وغير فارغة.
* آمنة عند إعادة التشغيل بحسب عقد Runner.
* غير معتمدة على ترتيب ملفات ضمني أو مختلف بين الأنظمة.

التاريخ الموجود لا يعاد كتابته لمجرد وجود تصادمات قديمة. يجب:

```text
INVENTORY APPLIED HISTORY
→ RECORD ACTUAL ORDER AND CHECKSUMS IN MANIFEST
→ CLASSIFY HISTORICAL COLLISIONS
→ PROHIBIT NEW COLLISIONS
→ CREATE FORWARD-ONLY CONVERGENCE MIGRATIONS
→ VERIFY FRESH AND UPGRADE DATABASES
```

يمنع:

* تعديل أو إعادة تسمية Migration مطبقة.
* تصادم جديد في الرقم أو المعرف.
* تصادم تاريخي غير مسجل أو ترتيب غير حتمي.
* ملفان ينشئان الجدول نفسه بأشكال متعارضة دون خطة Convergence.
* استخدام `CREATE TABLE IF NOT EXISTS` لإخفاء اختلاف Schema معروف.
* إسقاط بيانات قبل Backfill وReconciliation وإثبات البديل.
* تكرار Enum أو Reference data يدويًا في عدة قواعد دون آلية حاكمة.
* تخزين حقيقة مالية خارج WLT.
* Unique constraints غير Scope-aware وفق المالك القانوني الفعلي للكيان.

عند وجود شكلين تاريخيين:

```text
DETERMINE CANONICAL SHAPE
→ CREATE NEW CONVERGENCE MIGRATION
→ MIGRATE ALL EXISTING SHAPES
→ VERIFY CHECKSUM, OWNERSHIP AND DATA
→ SWITCH READERS AND WRITERS
→ RETIRE DUPLICATE RUNTIME AUTHORITY
```

# A.12 العقود والتوليد

المصدر الحاكم الحالي لفهرس العقود هو `contracts/master.openapi.yaml` ما دام مسجلًا في السياسة الحية؛ يجب التحقق من المسار على SHA المثبت، ويوجد فهرس رئيسي واحد فقط.

كل Contract يجب أن يحدد مالكه بوضوح.

يمنع:

* فهرسان رئيسيان.
* عقدان نشطان للعملية نفسها دون علاقة Versioning صريحة.
* Response objects عامة عندما تكون بنيتها معروفة.
* Types يدوية تعيد تعريف Contract.
* Generated client غير مطابق لـFinal SHA.
* تعديل Generated client يدويًا.
* اختلاف Enum بين Contract وBackend وFrontend وDatabase.
* اختلاف Required/Optional/Nullable.
* اختلاف Validation limits.
* اختلاف Status codes أو Error codes.

السلسلة المطلوبة:

```text
CANONICAL CONTRACT
→ VALIDATED CONTRACT
→ GENERATED TYPES
→ GENERATED CLIENT
→ BACKEND BINDING
→ FRONTEND ADAPTER
→ RUNTIME READBACK
```

أي كسر في السلسلة يساوي:

```text
CONTRACT_CENTRALIZATION_FAILED
```

---

# A.13 النطاق الموثوق وPlatform/Operator Context والفشل المغلق

يمنع أي Scope افتراضي صامت في المسارات الحية.

عند غياب النطاق المطلوب:

```text
TRUSTED_SCOPE_REQUIRED
→ REQUEST REJECTED
```

وعند غياب Platform Context أو Operator Context المطلوب:

```text
TRUSTED_CONTEXT_REQUIRED
→ REQUEST REJECTED
```

لا يجوز:

* استخدام `local-dsh` أو `default` أو `public` تلقائيًا.
* قبول Platform/Operator/Partner/Store من Body أو Query أو Header باعتباره سلطة دون ربط بالجلسة أو التفويض الخادمي.
* إسقاط النطاق عند service-to-service handoff.
* استخدام Cache key أو Event أو File path أو Background job دون النطاق القانوني عندما تكون البيانات مقيدة.
* خلط Logs أو Metrics أو Search أو Reports بين Platform Contexts أو Operator Contexts أو Partners أو Stores.
* الاحتفاظ بمعرف نطاق عام لمجرد احتمال مستقبلي دون تصنيف وترحيل.

أي Development scope يجب أن يكون:

* داخل Development profile صريح.
* معزولًا عن Production build.
* غير قابل للتفعيل بالخطأ.
* مثبتًا باختبار يمنع دخوله إلى Production runtime.

أي تسرب أو Fallback غير موثوق يساوي:

```text
SECURITY_BLOCK
```

# A.14 الحدود المالية

كل قيمة أو قرار مالي يجب أن يصدر من WLT أو من عقد مالي مملوك لـWLT.

يمنع خارج WLT:

* حساب العمولة.
* حساب الرصيد.
* تقرير الأهلية المالية اعتمادًا على رقم محلي غير مقروء من WLT.
* تعديل رسوم أو ضمانات أو تسويات.
* تقريب العملات.
* افتراض أن كل العملات تملك منزلتين عشريتين.
* تثبيت عملة داخل Screen.
* إنشاء Ledger بديل.
* استخدام DSH أو Workforce كمالك للحقيقة المالية.

يسمح خارج WLT فقط بـ:

```text
IMMUTABLE SOURCE EVIDENCE
WLT REFERENCE
READ_ONLY STATUS
READBACK PROJECTION
```

أي حقيقة مالية موازية تساوي:

```text
FINANCIAL_BOUNDARY_VIOLATION
```

---

# A.15 الإثبات متعدد الأسطح

لا تثبت المركزية بفحص ملف المالك فقط.

يجب إثبات السلسلة لكل سطح متأثر:

```text
CANONICAL SOURCE
→ CONTRACT
→ GENERATED OR CONTROLLED CLIENT
→ SHARED BRAIN
→ SURFACE ADAPTER
→ SCREEN
→ USER ACTION
→ BACKEND EFFECT
→ DATABASE EFFECT
→ READBACK
→ OTHER AFFECTED SURFACES
```

يجب اختبار:

1. تعديل الحقيقة من السطح المخول.
2. حفظها لدى المالك القانوني.
3. قراءتها راجعًا من المالك.
4. ظهورها في كل سطح مطلوب.
5. عدم قدرة سطح غير مخول على تعديلها.
6. عدم وجود نسخة محلية تستمر عند فشل المصدر.
7. عدم ظهور قيمة مختلفة بعد إعادة التشغيل.
8. عدم اختلاف القيمة بين Web وMobile.
9. عدم اختلافها بين Online وOffline بعد المزامنة.
10. عدم اختلافها أو تسربها بين Platform/Operator/Partner/Store/Actor scopes.

---

# A.16 التحقق من إزالة البقايا

بعد الترحيل، يجب تنفيذ فحص سلبي يثبت عدم بقاء:

```yaml
centralization_zero_residue:
  parallel_writable_sources: 0
  duplicate_owners: 0
  duplicate_contract_indexes: 0
  duplicate_active_operations: 0
  duplicate_domain_enums: 0
  manually_duplicated_generated_types: 0
  local_business_validators: 0
  local_permission_policies: 0
  local_untrusted_scope_resolution: 0
  generic_scope_identifier_misuse: 0
  scope_identifier_misclassification: 0
  silent_scope_fallbacks: 0
  silent_context_fallbacks: 0
  local_financial_calculations: 0
  local_catalog_truths: 0
  raw_surface_api_calls: 0
  surface_owned_state_machines: 0
  local_error_authorities: 0
  new_duplicate_migration_identifiers: 0
  unmanifested_historical_migration_collisions: 0
  conflicting_schema_owners: 0
  runtime_reachable_legacy_paths: 0
  runtime_reachable_mocks: 0
  fallback_to_legacy_truth: 0
  unguarded_generated_outputs: 0
  unverified_multi_surface_readbacks: 0
  cross_partner_leaks: 0
  cross_store_leaks: 0
  cross_actor_scope_leaks: 0
  cross_operator_context_leaks: 0
```

أي قيمة منطبقة أكبر من صفر تمنع الإغلاق. العناصر غير المنطبقة تحمل سببًا ودليل عدم التأثر، ولا تحول إلى صفر مزيف.

# A.17 متطلبات الحراس والـCI

يجب إضافة أو استخدام حراس قابلة لإعادة التشغيل تكشف ما ينطبق من:

* Forbidden raw fetch أو Axios داخل الأسطح.
* Duplicate domain enums وPermission bundles.
* Duplicate contract master indexes وoperation IDs.
* New duplicate migration IDs وManifest drift وunregistered historical collisions.
* Manual edits داخل generated files وmanual clients داخل `generated`.
* Local catalog identifiers أو Local state machines أو Local validators.
* Default platform/operator/partner/store fallbacks.
* Generic أو misclassified scope identifier.
* Financial imports أو calculations خارج WLT.
* Forbidden cross-domain database writes.
* Runtime imports من Fixtures أو Mocks.
* Legacy module imports وFallbacks.
* Multiple active owners لنفس Registry.
* Missing trusted scope in events/cache/storage/search/reports.
* Missing Platform or Operator Context عندما تكون البيانات مقيدة بالنطاق.
* Contract/client وBackend/contract وDatabase/contract drift.
* Partner management capability داخل Surface دون DSH/WLT/Identity/Workforce binding.

يجب أن تكون الحراس:

* Fail-closed.
* Read-only.
* مرتبطة بـFinal SHA.
* غير معتمدة على تقرير تاريخي أو قائمة يدوية تكرر المصدر الحاكم.
* غير قابلة للتجاوز بـ`|| true` أو `continue-on-error` في الإغلاق.
* غير محولة إلى Warning لمخالفة إلزامية.
* ذات رسالة تحدد الملف والرمز والمالك الصحيح والإجراء المطلوب.
* مغطاة باختبار يثبت أنها تفشل عند إدخال المخالفة.

# A.18 الاستثناءات

لا يسمح باستثناء محلي لمجرد:

* ضيق الوقت.
* صعوبة إعادة الهيكلة.
* الحفاظ على التوافق دون خطة.
* الخوف من كسر Surface.
* وجود النسخة منذ زمن.
* نجاح Build.
* عدم ظهور الخلل حاليًا.
* كون النسخ متطابقة.
* اعتبار الملف صغيرًا.
* وجود TODO.
* وجود Feature flag.
* وجود Wrapper.
* كون المهمة «بسيطة».

الاستثناء المسموح يجب أن يحتوي:

```yaml
centralization_exception:
  subject:
  canonical_owner:
  forbidden_duplicate:
  technical_blocker:
  why_immediate_removal_is_unsafe:
  affected_surfaces:
  security_risk:
  trusted_scope_risk:
  platform_or_operator_context_risk:
  financial_risk:
  temporary_containment:
  write_path_disabled:
  runtime_reachability:
  owner:
  expiry_date:
  removal_trigger:
  required_migration:
  required_tests:
  approving_authority:
```

ويشترط:

* أن تكون الكتابة إلى النسخة القديمة معطلة.
* أن تكون النسخة القديمة Read-only.
* أن يكون لها تاريخ انتهاء.
* أن يكون لها مالك.
* ألا تمس Security أو context isolation أو Financial truth دون موافقة محمية.
* ألا تستخدم لإصدار `CLOSED_WITH_EVIDENCE`.

---

# A.19 نموذج سجل الملكية المركزي

لكل حقيقة مشتركة أو حساسة يجب تحديد:

```yaml
centralization_record:
  subject:
  bounded_context:
  truth_class:
  canonical_owner:
  authoritative_source:
  write_authority:
  read_authority:
  database_owner:
  contract_owner:
  event_owner:
  trusted_scope:
  platform_context_scope:
  security_scope:
  financial_scope:
  canonical_schema:
  generated_outputs:
  read_only_projections:
  allowed_consumers:
  allowed_local_adapters:
  allowed_local_ui_state:
  forbidden_local_forms:
  legacy_sources:
  data_migration:
  consumer_migration:
  compatibility_window:
  removal_plan:
  regression_guard:
  runtime_readback:
  multi_surface_proof:
  final_sha:
  status:
```

لا يلزم إنشاء ملف حوكمة دائم لكل سجل؛ يمكن أن يكون السجل جزءًا من مخرجات المهمة أو CI artifact ما لم توجد حاجة تشغيلية دائمة ومستهلك واضح.

---

# A.20 صيغة تسجيل المخالفة

كل مخالفة مركزية تسجل بالصيغة التالية:

```yaml
centralization_finding:
  subject:
  semantic_identity:
  discovered_at:
  path:
  symbol_or_line:
  layer:
  current_classification:
  claimed_owner:
  actual_owner:
  parallel_sources:
  writable_sources:
  runtime_reachable_sources:
  problem:
  root_cause:
  affected_surfaces:
  contract_drift:
  database_drift:
  trusted_scope_risk:
  platform_or_operator_context_risk:
  financial_risk:
  security_risk:
  runtime_risk:
  compatibility_risk:
  priority: P0 | P1 | P2 | P3
  required_canonical_source:
  required_migration:
  required_consumer_changes:
  required_deletions:
  required_guards:
  verification_commands:
  expected_zero_residue:
  current_status:
```

---

# A.21 أولويات المخالفات

## P0

* Split permission authority.
* Cross-context risk.
* Silent context fallback.
* Financial truth خارج WLT.
* Duplicate migration authority.
* Duplicate writable source.
* Security policy داخل Surface.
* Production path يستخدم Bootstrap أو Mock.
* Data loss risk.
* مصدران يكتبان الحقيقة نفسها.

## P1

* Duplicate contract index.
* Contract/client drift.
* Domain enums متوازية.
* Local business validation.
* Local reference data.
* Local error authority.
* Hardcoded currency/locale/timezone.
* State machine داخل Surface.
* Legacy fallback نشط.

## P2

* Duplicate labels.
* Duplicate formatters.
* Surface-owned orchestration غير حساسة.
* Shared primitive غير موحد.
* Local adapter يحمل منطقًا زائدًا.

## P3

* تكرار عرضي لا يملك حقيقة ولا يسبب Drift، مع ضرورة تقييم دمجه ضمن النطاق فقط.

---

# A.22 شروط الإغلاق الخاصة بالمركزية

لا يجوز إصدار:

```text
PASS
READY_FOR_REVIEW
CLOSED_WITH_EVIDENCE
```

إلا عند تحقق كل ما ينطبق:

```text
CANONICAL_OWNER_PROVEN
AUTHORITATIVE_SOURCE_PROVEN
WRITE_AUTHORITY_UNIQUE
READ_PATHS_MIGRATED
PARALLEL_WRITES_REMOVED
PARALLEL_READ_FALLBACKS_REMOVED
CONTRACT_CANONICAL
GENERATED_OUTPUTS_CURRENT
DATABASE_OWNER_PROVEN
MIGRATION_HISTORY_MANIFESTED
NO_NEW_MIGRATION_COLLISIONS
DATA_RECONCILED
TRUSTED_SCOPE_PROVEN
PARTNER_STORE_ISOLATION_PROVEN
PLATFORM_CONTEXT_PROVEN
FINANCIAL_BOUNDARY_PROVEN
SECURITY_BOUNDARY_PROVEN
ALL_REQUIRED_SURFACES_BOUND
RUNTIME_READBACK_PROVEN
CROSS_SURFACE_CONSISTENCY_PROVEN
PARTNER_MANAGEMENT_BOUNDARIES_PROVEN_WHEN_APPLICABLE
LEGACY_RUNTIME_PATHS_REMOVED
LOCAL_DUPLICATES_REMOVED
MOCKS_NOT_RUNTIME_REACHABLE
REGRESSION_GUARDS_PASS
ZERO_RESIDUE_MATRIX_PASS
FINAL_SHA_PROVEN
CI_PROVEN_ON_FINAL_SHA
```

لا يعد بند غير منفذ ناجحًا، ولا يعد Search بلا نتائج دليلًا كافيًا إن لم يشمل المرادفات والمعنى الدلالي.

لا يعد Typecheck أو Build دليلًا على المركزية، ولا مجلد `shared` دليلًا على السيادة، ولا نجاح Surface واحد دليلًا على Multi-Surface، ولا وجود Contract دليلًا على أن Runtime يستهلكه، ولا حذف الملف دليلًا على نقل بياناته أو مستهلكيه بأمان.

# A.23 القرار الافتراضي

الحالة الابتدائية لأي حقيقة مشتركة هي:

```text
CENTRALIZATION_UNPROVEN
```

ثم تتحول إلى:

```text
FIX_REQUIRED
```

عند اكتشاف:

* مالك غير واضح.
* مصدرين.
* نسخة محلية.
* Validator موازٍ.
* Contract موازٍ.
* Migration collision جديدة أو تاريخية غير مسجلة ومحكومة.
* Scope fallback.
* Financial truth خارج مالكها.
* Legacy path حي.

ولا تتحول إلى:

```text
CENTRALIZATION_PROVEN
```

إلا بعد اكتمال الإثبات النهائي على Final SHA.

---

# A.24 إضافات إلزامية إلى التقرير النهائي

يضاف إلى `final_report`:

```yaml
centralization_status:
  applicability:
  canonical_result:
  scanned_domains:
  canonical_truths:
  canonical_owners:
  authoritative_sources:
  generated_derivatives:
  allowed_local_adapters:
  allowed_ephemeral_ui_state:
  duplicate_authorities_found:
  duplicate_authorities_removed:
  local_business_logic_found:
  local_business_logic_removed:
  local_reference_data_found:
  local_reference_data_removed:
  parallel_write_paths_found:
  parallel_write_paths_removed:
  legacy_fallbacks_found:
  legacy_fallbacks_removed:
  duplicate_contracts_found:
  duplicate_contracts_removed:
  migration_collisions_found:
  historical_migration_collisions_manifested:
  new_migration_collisions_removed:
  scope_fallbacks_found:
  scope_fallbacks_removed:
  context_fallbacks_found:
  context_fallbacks_removed:
  financial_boundary_violations:
  financial_boundary_violations_removed:
  data_migrations:
  consumer_migrations:
  runtime_readback:
  multi_surface_consistency:
  zero_residue_matrix:
  regression_guards:
  remaining_exceptions:
  final_sha:
```

---

# A.25 النص التنفيذي الحاسم

عند تنفيذ أي مهمة، لا تتعامل مع أي تعريف أو قيمة أو قاعدة أو حالة أو صلاحية أو عقد أو بيانات على أنها محلية لمجرد أنها موجودة داخل الملف أو السطح المطلوب.

ابدأ دائمًا بتحديد ما إذا كانت تمثل حقيقة خاصة بالعرض أم حقيقة مشتركة للنظام.

إذا كانت حقيقة مشتركة، فحدد مالكها القانوني ومصدرها الحاكم، وابحث عن جميع نسخها الدلالية في Frontend وBackend وقواعد البيانات والعقود والعملاء المولدين والـRuntime والاختبارات والـFixtures والـSeeds والحوكمة.

عند اكتشاف أي نسخة محلية أو موازية:

1. لا تضف Patch فوقها.
2. لا تنشئ مصدرًا مركزيًا ثالثًا.
3. لا تبقِ المصدرين متزامنين.
4. لا تستخدم Fallback إلى النسخة القديمة.
5. لا تخفِها خلف Feature flag.
6. لا تكتفِ بنقلها إلى مجلد يحمل اسم `shared`.
7. لا تؤجل إزالتها ما دامت داخل نطاق المهمة ولا يوجد مانع خارجي حقيقي.
8. حدد المالك الصحيح.
9. أنشئ أو أصلح المصدر الحاكم.
10. رحّل البيانات والمستهلكين.
11. أوقف الكتابة والقراءة من المصدر القديم.
12. احذف البقايا المثبت عدم الحاجة إليها.
13. أضف Guards تمنع عودتها.
14. أثبت القراءة الراجعة والتناسق متعدد الأسطح.
15. لا تصدر الإغلاق حتى تصبح جميع عدادات البقايا صفرًا.

القاعدة النهائية:

```text
أي حقيقة مشتركة لها أكثر من تعريف قابل للتعديل، أو أكثر من محرك قرار، أو أكثر من مالك، أو أكثر من مسار كتابة، تعد عيبًا معماريًا وتشغيليًا واجب الإصلاح الفوري داخل النطاق، حتى لو كانت النسخ متطابقة، وحتى لو كان النظام يعمل ظاهريًا.
```

والمعيار النهائي ليس أن «تعمل الشاشة»، بل أن تعمل المنظومة من مصدر حقيقة واحد لكل معنى، ومالك واحد، وعقد حاكم، ومسار كتابة مضبوط، ونطاق موثوق، وقراءة راجعة متسقة، مع صفر بقايا محلية وصفر سلطات متوازية وصفر نجاح شكلي.

---

---

# النص التنفيذي النهائي

نفّذ المهمة وفق الحلقة الحاكمة في هذا الأمر على المرجع الذي يحدده المستخدم ومن أحدث SHA مثبت. لا تكتفِ بالتشخيص في وضع التنفيذ، ولا تتوقف عند أول إصلاح أو أول Commit أو أول نجاح جزئي. أغلق السبب الجذري في مالك الحقيقة، وأكمل العقود والبيانات والخدمات والعقول المشتركة والأسطح المطلوبة، ثم أزل المسارات المتوازية والقديمة، وشغّل الفحوص المتناسبة مع الأثر، ونفّذ التحقق النهائي Read-only على Final SHA نفسه.

لا تُسجل قيمة صفر لعنصر غير مقاس، ولا تسجل `PASS` لفحص غير منفذ، ولا تعلن الإغلاق إذا بقي اعتماد أو دليل أو مانع أو Finding داخلي. استخدم قرار القاموس الحي الذي يصف الحقيقة بدقة، وأظهر بوضوح ما أُثبت وما لم يُثبت.

