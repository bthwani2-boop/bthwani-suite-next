# JRN-039 — متغيرات المنصة والمزودون والصحة

Status: IMPLEMENTED_PENDING_INDEPENDENT_ACCEPTANCE

## المشكلة

كانت قدرات Platform Control وProviders موزعة بين عقود ومسارات وشاشات غير متطابقة بالكامل: عقد المزودين كان يسمح بإرجاع `credentials`، العميل المشترك لم يربط قراءة تفاصيل المزود أو تحديثه، صحة المزود كانت تُستنتج من `active=true` بدل اتصال حي، ومسار route الفعلي لم يكن مسجلًا في OpenAPI. كما كانت الهجرة الأساسية تزرع مزودين فعالين بقيم `mock`، وهو ما يحول بيانات تجريبية إلى حقيقة تشغيلية مزعومة.

## الهدف

توفير قراءة سيادية موحدة لمتغيرات المنصة والحالة الفعالة والـfeature flags والخدمات والمزودين وصحتهم، مع تحديث مزود محكوم من لوحة التحكم، ومنع كشف الأسرار أو اعتماد mocks أو حالة `active` كدليل صحة، وإظهار أثر القراءة والكتابة من المصادر الدائمة فقط.

## الممثلون والصلاحيات

- `operator` و`admin` على `control-panel`: يقرآن Platform Control والمزودين عند امتلاك `platform:read`, `platform:health:read`, `platform:audit:read`, أو `provider:read` حسب العملية.
- تحديث حالة المزود يحتاج `provider:update` ويكتب في خدمة Providers مع سجل تدقيق و`correlationId`.
- اقتراح أو اعتماد أو تطبيق متغيرات المنصة والـfeature flags يبقى ضمن صلاحيات Platform Control ودورة Change Sets في JRN-040؛ لا تنقل JRN-039 ملكيتها إلى الواجهة.
- تطبيقات `app-client`, `app-partner`, `app-captain`, `app-field` تستهلك أثر الإعدادات أو المزود فقط عبر العقل المشترك والخدمات المالكة، ولا تملك سجل المزود أو أسراره أو تعديلاته.

## الأسطح المطلوبة

- `control-panel`: runtime snapshot، effective config، variables، feature flags، services، health، audit، قائمة المزودين، تفاصيل المزود، الصحة الحية، والتفعيل أو التعطيل المحكوم.
- `core/platform-control`: الحقيقة الدائمة لمتغيرات المنصة والـflags وقراءة صحة الخدمات والتدقيق.
- `core/providers`: سجل المزودين، التحديث، الأسرار الخلفية، صحة الاتصال الخارجي، والتدقيق.
- DSH shared brain: العملاء والمحولات والحالات المرئية دون raw API calls في الشاشة.
- PostgreSQL migrations، OpenAPI، generated clients، runtime وtargeted CI.

## الأسطح المستبعدة

- `app-client`, `app-partner`, `app-captain`, `app-field`: لا تعرض سجل المزودين أو تفاصيله ولا تنفذ mutation؛ تتأثر فقط بالنتيجة التشغيلية من الخدمة المالكة.
- `webapp`, `website`: لا توجد قدرة إدارية معتمدة في هذه الرحلة.
- WLT mutations والدفتر والمدفوعات والتسويات: خارج النطاق؛ مزود الدفع يظل ضمن حدود WLT المالية.
- Change Sets وprogressive rollout: مملوكة لـJRN-040 وJRN-041، عدا قراءتها الحالية ضمن Platform Control.

## مالك الحقيقة وحدود الخدمات

- Platform Control يملك المتغيرات والـfeature flags والحالة الفعالة والخدمات المسجلة وقراءات التدقيق الخاصة بها.
- Providers يملك تكوين المزود وحالة تفعيله وبيانات اعتماده وصحة اتصاله الخارجي.
- `credentials` أسرار خلفية كتابية فقط؛ لا تظهر في API أو audit أو logs أو frontend state.
- `parameters` إعدادات غير سرية. `healthUrl` لا يُفحص إلا إذا كان hostname ضمن `PROVIDERS_HEALTH_PROBE_ALLOWED_HOSTS`.
- DSH لا يملك حقيقة المزود أو الحقيقة المالية؛ يقدّم فقط shared controllers وview models لسطح لوحة التحكم.

## الحالات والأفعال

- Platform Control: `OPERATIONAL`, `PARTIALLY_BOUND`, `FIX_REQUIRED`, `UNKNOWN_HEALTH`, `CONTRACT_REQUIRED` والحالات المقيدة الأخرى في العقد.
- صحة المزود: `healthy`, `degraded`, `down`, `not_configured`.
- حالات الواجهة: `idle`, `loading`, `success`, `empty`, `error`, `forbidden`، وحالة mutation مستقلة.
- الأفعال: refresh، قراءة التفاصيل، قراءة الحالة الفعالة، قراءة المتغيرات والـflags والخدمات والتدقيق، تفعيل المزود أو تعطيله عند الصلاحية.

## الأفعال الممنوعة والثوابت السلبية

1. يمنع إرجاع `credentials` أو أسماء مفاتيحها أو قيمها في أي response أو audit payload أو سجل أو frontend state.
2. يمنع اعتبار `active=true` دليلًا على صحة المزود؛ `healthy` يتطلب فحصًا حيًا ناجحًا.
3. يمنع إرسال Authorization أو أسرار المزود في health probe.
4. يمنع health probe إلى host غير مدرج صراحة في قائمة السماح، ويمنع اتباع redirects.
5. يمنع زرع أو إبقاء مزود فعّال ببيانات اعتماد `mock` باعتباره حقيقة runtime.
6. يمنع التطبيق المحلي أو preview-only أو fixture/fallback في شاشة سجل المزودين.
7. يمنع تطبيقات المستهلك من تعديل المزود أو قراءة السجل الإداري.
8. يمنع DSH من تعديل الحقيقة المالية لمزود الدفع.
9. كل تحديث مزود يعاد قراءته من المصدر ويُسجل في audit دون أسرار.
10. فشل الاتصال لا يُحوّل إلى نجاح أو بيانات قديمة غير موسومة.

## معايير القبول

- `/platform/health` و`/platform/readiness` يعكسان اتصال PostgreSQL الحقيقي.
- runtime config والحالة الفعالة والمتغيرات والـflags والخدمات والصحة والتدقيق مرتبطة بعقد Platform Control وعميله المشترك.
- قائمة المزودين وتفاصيل المزود وتحديثه والصحة موجودة في OpenAPI وتطابق routes الفعلية، بما فيها `/providers/maps/route`.
- استجابات المزود تعرض `credentialConfigured` فقط ولا تحتوي `credentials`.
- الصحة الخارجية تنفذ GET محدودًا بمهلة وحجم واستضافة مسموحة، ولا تتبع redirect أو تمرر Authorization.
- الهجرة اللاحقة تعطل السجلات الوهمية وتمحو بيانات اعتمادها وتضيف فهرس `(kind, active, updated_at)`.
- لوحة التحكم تعرض loading/empty/error/success، الصحة الحية، وجود الاعتماد، التفاصيل الآمنة، والتفعيل/التعطيل مع read-after-write.
- لا توجد raw API calls أو حقيقة أعمال محلية داخل الشاشة.
- اختبارات Go والعقد وTypeScript والهجرة وruntime smoke تنجح على commit واحد.

## الموافقات

- Product model implementation: complete.
- Developer verification: pending same-commit CI/runtime evidence.
- Product Manager approval: pending independent identity.
- Product Owner acceptance: pending independent identity.
- Security review for secret handling and health-probe boundary: pending independent identity.
- QA/accessibility and Release/Production evidence: pending independent identities and applicable environment evidence.
