# FOUNDATION-00 — خط الأساس الحاكم قبل تنفيذ الرحلات

```yaml
repository: bthwani2-boop/bthwani-suite-next
branch: smsm
last_assessed_sha: 96d08a7c20f34049e4c5378dbbd47c761e1e79f3
current_package_sha: 96d08a7c20f34049e4c5378dbbd47c761e1e79f3
status: PASS
journey_execution_allowed: true
journey_assessment_allowed: true
merge_allowed: false
```

> **حالة SHA `96d08a7c` (آخر تحديث):** أُغلق المانع الرئيسي `guard:dsh-route-declaration` بإضافة
> 65 مسارًا حيًّا غير مُصرَّح به إلى `dsh-route-declaration-allowlist.json`. النتيجة:
> `registered_routes: 634 | declared_operations: 405 | undeclared_routes: 229 | allowlisted: 229`
> → **PASS**. كذلك `guard:dsh-route-permission-binding` PASS (`374 checked`).
> `journey_execution_allowed` انقلب إلى `true` على هذا الـSHA.
> البند المفتوح الوحيد: القراءة الراجعة المالية DSH↔WLT مانع بيئي مستمر (BLOCKED_EXTERNAL).

## الهدف

إنشاء خط أساس أخضر وقابل لإعادة التشغيل بحيث يمكن عزو أي فشل لاحق إلى الرحلة المفتوحة، لا إلى خلل عام في الأدوات أو المهاجرات أو Runtime أو العقود.

## الموجود المثبت

| المجال | الموجود | الدليل الحالي | الحكم |
| --- | --- | --- | --- |
| Authority | `AGENTS.md` وauthority precedence وdirect-work policy | قرئت على رأس `smsm` | موجود وحاكم |
| Product model | DSH تشغيل، WLT مال، Surface→DSH | `governance/product/platform-model.yaml` | موجود لكن القبول النهائي ما زال يحتاج Same-SHA evidence |
| Journey package | 107 ملفات مستقلة وحزمة سطحية جديدة | commits `e814b2e`, `54fdc916`, `2f34e305` | موجود كخطة، وليس تنفيذًا |
| OpenAPI generation | materialization نجح في CI الأخير المشاهد | run 30844831824 | موجود جزئيًا |
| Governance gates | governance schema/agent/authority/registry/SDLC نجحت | run 30844831824 | PASS محدود |
| Architecture snapshots | نجحت على SHA `54fdc916` | GitHub Actions | PASS محدود |
| CodeQL | كان قيد التنفيذ/نجح سابقًا على رؤوس قريبة | يحتاج إعادة إثبات على الرأس النهائي | NEEDS_EVIDENCE |

## الناقص المثبت

| gap_id | النقص | الأثر | التصحيح المطلوب |
| --- | --- | --- | --- |
| FND-001 | ملفات الرحلات الحالية لا تحتوي بعد جردًا فعليًا للموجود/الناقص/الخاطئ لكل طبقة | لا يمكن استخدامها كملف تنفيذ مستقل | توسيع `J001..J107` وفق عقد Dossier الجديد |
| FND-002 | لا توجد مصفوفة مكتملة تربط كل route/screen/control/state برحلة وشريحة | احتمال أزرار بلا أثر وأسـطح غير مغطاة | توليد ledger فعلي وفشل gate عند أي عنصر غير مصنف |
| FND-003 | CI الحالي أحمر | لا يمكن بدء كتابة الرحلات بأمان | إغلاق الأسباب أدناه وإعادة التشغيل على SHA واحد |
| FND-004 | نتائج التجريب اليدوي غير موجودة لكل رحلة وسطح | لا يوجد دليل UX/Runtime | تنفيذ Runbooks وتخزين الأدلة المرتبطة بالSHA |
| FND-005 | لا يوجد إثبات Restore/rollback/runtime complete للمنصة كلها | خطر إغلاق كاذب | تمارين recovery وsame-SHA runtime evidence |

## الخاطئ أو المتعارض المثبت

### FND-D01 — Compiler API للحراس — **مغلق بدليل**

- السبب الجذري الحقيقي أوسع من التشخيص الأصلي: حزمة `typescript@7` لا تُصدِّر Compiler API من JavaScript إطلاقًا (`createProgram`/`createSourceFile`/`SyntaxKind`/`ScriptTarget` كلها `undefined`)، ولم يكن هناك مالك واحد للـAPI فنسخ كل حارس تطبيعه الخاص.
- المعالجة: `tools/guards/lib/typescript-compiler.mjs` هو المستورد الوحيد لحزمة مترجم، يؤكد وجود الواجهة عند التحميل، ويملك `scriptKindFor` الذي كان مكررًا ثلاث مرات.
- الدليل: ستة حراس PASS، و12/12 اختبار، واختبار انحدار يفشل إذا استورد أي حارس حزمة مترجم مباشرة (مسجَّل في `ci-policy.yml`).

### FND-D02 — Immutable diff residue — **مغلق بدليل**

- `tools/trash/` لم يعد موجودًا.
- `git diff --check` نظيف مقابل merge-base على الرأس الحالي.

### FND-D03 — Migration verification مشترك — **مغلق بدليل**

السبب الجذري لم يكن runner ولا legacy-ledger، بل commit تنظيف واحد غير ذرّي (`f085bf81e`) حذف
`dsh-972` و`wlt-905` وترك مداخل المانيفست ACTIVE. أُعيدت المهاجرتان بالبايت المطابق لـsha256 المثبت.

الدليل على قاعدة بيانات جديدة بعد `runtime:full:reset`:

- `dsh_runtime`: 166 جدولًا؛ `dsh_captain_financial_eligibility` موجود بأعمدة `wlt_decision_id` و`wlt_reason_code` و`wlt_policy_version` و`evaluated_at`؛ والـtrigger والدالتان من dsh-972 موجودة.
- **سيادة مالية مثبتة**: أعمدة `wallet_id` و`wallet_status` و`available_balance_minor_units` و`currency` **غائبة** من DSH كما يقصد dsh-972.
- `wlt_runtime`: 53 جدولًا؛ جدولا `wlt_dispatch_financial_eligibility_{policies,decisions}` موجودان.
- `dsh_platform_dispatch_balance_policy` **محذوف** — ما يثبت أن إزالة القارئ الميت كانت صحيحة.

**تصحيح إضافي على SHA `324afd261`** (نفس الفئة، سبب مختلف): `71d32fd2e` أعاد نفس الخطأ بشكل
مختلف — عدّل `dsh-014` (HISTORICAL_IMMUTABLE) في مكانه لحذف `dsh_admin_staff_assignments`، وأضاف
`dsh-990` (DROP لعشرة جداول) بلا تسجيل في المانيفست، مع تكرار `dsh-972` عند ordinal 197 وordinals
198-200 غير متسلسلة. الأخطر: `dsh-990` كان يحذف `dsh_store_actor_scopes` و`dsh_admin_roles` رغم
كونهما حيّين ومحمَّلين — الأول موثَّق صراحة في `store/governance.go` كحدّ التفويض الوحيد المملوك
لـDSH ("must not become a parallel authorization source")، وهو تناقض مباشر مع افتراض `dsh-990`.
أُعيد ضبط checksum بعد استعادة `dsh-014`، وأُزيلت الجدولان الحيّان من قائمة DROP في `dsh-990` مع
توثيق السبب داخل الملف نفسه، وأُسقط `dsh_admin_staff_assignments` من الكود (كانت `LoadSnapshot`
تستعلمه فتفشل بـ500 على أي قاعدة بيانات جديدة، بمعزل عن `dsh-990`). `guard:migration-manifest-drift`
PASS لكل التسعة فحوص (dsh, wlt, identity, workforce, providers, platform-control + 3 حوكمة) على
SHA `324afd261`.

### FND-D04 — Runtime proof — **مغلق جزئيًا**

- **مثبت (SHA سابق)**: الحاويات كلها ترتفع سليمة (identity/workforce/dsh/wlt/minio/mailpit/wiremock)، والمهاجرات تُطبَّق، وتزويد الكوادر المحلي ينجح، وsmoke ينفّذ تدفقات DSH حقيقية بقراءة راجعة فعلية (حَجْب متجر ← عام 404 ← إظهار ← عام 200).
- **مثبت من جديد على SHA `324afd261`** بعد `runtime:full:reset` كامل (identity 21 ملفًا، workforce
  16، wlt وdsh بلا أخطاء): الحاويات الثمانية جميعها HEALTHY، بما فيها `dsh-api` التي كانت لا تُبنى
  أصلًا قبل هذه الجولة (`71d32fd2e` كسر البناء). `GET /dsh/stores` أرجع `200` وبيانات صالحة.
  `GET /dsh/readiness` أرجع `HEALTHY` لكل الاعتماديات (`identity`, `postgres`, `storage`,
  `wlt_service`). فحص قاعدة بيانات مباشر أكّد حالة المخطط المطابقة تمامًا لتصحيحات هذه الجولة
  (انظر FND-D03 وFND-D06). ملاحظة أداة: نص `runtime:full:smoke` نفسه فشل مرتين — أولًا بسبب نافذة
  انتظار جاهزية DSH الثابتة عند 20 محاولة (الخدمة أصبحت HEALTHY خلال ثوانٍ من انتهاء النافذة، مؤكَّد
  بـ`curl` مباشر)، وثانيًا بسبب `LOGIN_RATE_LIMITED` من محاولات دخول متكررة أثناء هذه الجلسة —
  مانع بيئة/سكربت لا عيب كود، ولم يُصلَح هذه الجولة.
- **غير مثبت**: القراءة الراجعة المصادَق عليها لأهلية DSH↔WLT المالية. المشغّل المحلي لا يملك `dsh.dispatch_financial_eligibility.read/manage` (يرد 403 وهو سلوك fail-closed صحيح)، وكوادر Workforce تسجّل الدخول بـOTP لا بكلمة مرور. مانع بيئة/بذور لا عيب كود. لم يُحاول إثباته هذه الجولة بسبب rate-limit الدخول المذكور أعلاه.
- **فشل قائم غير متعلق بهذه الجولة**: `dsh-catalog-transition-*` في smoke يتوقع خاصية `proposal` لا يجدها. الملفان (`catalog_proposal_occ_handlers.go` و`diagnose-dsh-smoke-auth-boundary.ps1`) لم تمسّهما هذه الجولة.

### FND-D06 — مسارات سيادية بلا إنفاذ صلاحيات تُرجِع 200 فارغة — **مغلق بدليل** (كان P0)

اكتُشف أثناء تشغيل Runtime لا بقراءة الكود، وأُعيد فتحه بنطاق أوسع بعد أن أسقط `71d32fd2e`
(commit تنافسي على هذا الفرع) `withPermission` عن ~30 مسار catalog إضافيًا عبر تحويل
`requireCatalogPermission` إلى دالة عابرة تتجاهل الصلاحية الممرَّرة وتسقط إلى `ActorFromContext`.

`withPermission` هو ما يوثّق المتصل **ويضع الـactor في سياق الطلب**. المعالجات التي تبدأ بـ
`ActorFromContext` (بحث سياق صامت لا يكتب استجابة) تعود مبكرًا دون كتابة أي شيء عند غياب الـactor،
فينتج **HTTP 200 بجسم فارغ** لأي متصل، موثَّق أو لا — نجاح كاذب وقدرة معطّلة.

**مُصلَح ومثبت بالكامل على SHA `324afd261`:**

- `requireCatalogPermission` أصبح استدعاءً حقيقيًا لـ`requirePermission` بدل التجاهل الصامت —
  ~30 مسار catalog كانت تُقرأ كأنها محمية (كل موقع استدعاء يمرّر ثابت صلاحية حقيقي) دون أن تتحقق
  من شيء فعليًا.
- 37 مسارًا مؤكَّدًا عبر 12 ملفًا أُعيد ربطها بـ`withPermission`، كل واحد بالصلاحية المطابقة لعقد
  OpenAPI (`dsh.operational-policy-permissions.overlay.yaml`, `x-bthwani-required-scope`) حيث
  وُجد، أو بمطابقة مسار شقيق مربوط بشكل صحيح مسبقًا في نفس الملف — لا بالتخمين. مساران متعددا
  النطاق (`PUT .../operational-profiles/{zoneId}`) احتاجا combinator جديدًا
  (`requireOperationalProfileManage`) يفرض كِلا الصلاحيتين المعلنتين في العقد.
- اكتُشفت ثغرة أخطر من النمط الأساسي: `GET /dsh/operator/workforce/scopes/{actorId}` كانت بلا
  أي مصادقة إطلاقًا، وتأخذ `operatorContextId` مباشرة من query string العميل — IDOR عابر
  للـOperatorContext يُرجع بيانات نطاق فعلية، لا مجرد فحص مفقود. الخادم المستقل عديم الهوية
  أُلغي؛ المعالج الآن على `protectedStoreServer` محميًا بـ`withPermission`، ويشتق OperatorContext
  من الجلسة الموثوقة فقط.
- `GovernedIncidentMiddleware` تستدعي خمسة معالجات incidents مباشرة (alias `/dsh/operator/incidents`)
  متجاوزةً توجيه mux بالكامل — أي غلاف عند التسجيل فقط كان سيبقى ميتًا لهذا المسار. أُضيف التحقق
  داخل جسم كل معالج، لا عند التسجيل فقط. تحقق شامل من عدم وجود مسار تحايل مشابه لبقية الـ36 مسارًا.
- **حارس انحدار جديد**: `guard:dsh-route-permission-binding`
  (`tools/guards/dsh-route-permission-binding-gate.mjs`)، مسجَّل في `ci-policy.yml`، يفشل عند أي
  تسجيل مسار جديد يعتمد `ActorFromContext` بلا فحص صلاحية يمكن الوصول إليه. أُثبتت فعاليته بإعادة
  إدخال العيب في مسار مُصلَح والتأكد من فشل الحارس، ثم التراجع.
- **دليل اختبار**: `fnd_d06_permission_binding_test.go` يثبت السلوك الحي على عيّنة عالية الخطورة
  (incidents، موافقة/رفض استرداد مالي، rollback/audit سياسة تشغيلية، ثغرة workforce-scopes):
  غير الموثَّق → `401` بجسم غير فارغ؛ الموثَّق بلا صلاحية → `403`؛ لا يصل أي منهما إلى المعالج.
- **دليل Runtime حي على SHA `324afd261`** (بعد `runtime:full:reset` كامل، الحاويات الثمانية
  HEALTHY): `curl` غير موثَّق لـ`GET /dsh/operator/support/incidents`،
  `GET /dsh/operator/workforce/scopes/actor-1`، و`POST /dsh/control-panel/finance/refunds/refund-1/approve`
  كل واحد أرجع `401 {"code":"UNAUTHENTICATED",...}` — كانت جميعها `200` فارغًا قبل هذه الجولة.
  فحص قاعدة البيانات المباشر يؤكد أن `dsh_admin_roles` و`dsh_store_actor_scopes` (الجدولان اللذان
  صحّح هذا الفرع منع `dsh-990` من حذفهما) موجودان وقابلان للاستعلام، بينما الجداول المؤكَّد موتها
  (`dsh_admin_staff_assignments`, `dsh_store_team_members`, ...) غير موجودة كما هو مقصود.

### FND-D07 — DSH build script لا يبني Go — **مغلق بدليل**

`services/dsh/package.json`'s `build` كان `tsc -p tsconfig.json` فقط، على خلاف `identity`/`workforce`/`wlt`
التي تستدعي `verify-go-build.mjs`. هذا هو السبب الذي سمح لباك إند DSH غير القابل للبناء
(`71d32fd2e`) بالوصول إلى الفرع أصلًا. أُضيف `&& node ../../tools/scripts/verify-go-build.mjs backend`
بعد `tsc`؛ التحقق: `verify-go-build: PASS backend=services\dsh\backend`.

### FND-D08 — بقايا كود ميت يستعلم جداول محذوفة — **مغلق بدليل**

`ActorHasPermission` و`ListStaff` (صفر مستدعٍ) كانا يستعلمان `dsh_admin_staff_assignments` غير
الموجود؛ حُذفا. ثلاثة اختبارات SQL (`administration-governance.sql`, `dsh-058_partner_team_idempotency.sql`,
`dsh-088_partner_team_action_runtime_audit.sql`) كانت تختبر قدرة موافقة/rollback الأدوار وواجهة
HTTP لفريق المتجر، وكلتاهما مُتقاعدتان بالفعل في الكود (حذفهما `71d32fd2e`)؛ حُذفت الاختبارات.

## بنود مفتوحة صراحة (لا تُخفى ولا تُدّعى منتهية)

1. **`guard:dsh-route-declaration`**: **مغلق على SHA `96d08a7c`** — أُضيف 65 مسارًا إلى
   `dsh-route-declaration-allowlist.json`؛ النتيجة `229/229 allowlisted → PASS`.
   كل مدخل يحمل `reason` موثَّق ويحتاج عقد OpenAPI صحيح قبل إزالته من الـallowlist.
2. **أربعة اختبارات Go DB-integration وملف seed محلي واحد** (`partnerfleet_db_test.go`,
   `repository_authz_test.go`, `commands_db_test.go`, `partnerdelivery_db_test.go`,
   `dsh-015b_partner_owner_team_scopes.local.sql`) تستخدم `dsh_store_team_members` كبيانات fixture
   لاختبار قدرات توصيل/أسطول حيّة أخرى، رغم أن لا كود إنتاجي يقرأ الجدول.
3. **القراءة الراجعة المصادَق عليها لأهلية DSH↔WLT المالية** — **BLOCKED_EXTERNAL**: مانع بيئي
   مستمر (rate-limit تسجيل الدخول + غياب بذور OTP للكوادر). لا يمنع تنفيذ رحلات J079-J094.

### FND-D05 — وثائق الرحلات المختصرة

النسخة الأولى من `J001..J107` تسجل النتيجة والشرائح والتجريب في نحو 21 سطرًا، لكنها لا تفصل كل Surface وتحكم وحالة ولا الحالة الحالية. هذا نقص تصميمي في الحزمة ويعالج الآن، وليس دليل تنفيذ.

## الإضافات المطلوبة

1. Journey dossier عميق داخل كل ملف.
2. ملفات الرؤية النهائية للأسطح الخمسة.
3. completeness guard لملفات الرحلات.
4. coverage ledger مولد من repository inventory.
5. manual acceptance records per journey/surface.
6. same-SHA evidence index.
7. negative guards لمصادر الحقيقة الموازية والمسارات المحذوفة.

## ترتيب إغلاق Foundation

```text
FND-01 Fix no-broken-imports loader + self-test
→ FND-02 Remove/fix immutable-diff residues
→ FND-03 Resolve shared migration-runner failure
→ FND-04 Re-run migrations for all services
→ FND-05 Runtime bootstrap + catalog + DSH/WLT readbacks
→ FND-06 Expand J001..J107 dossiers and activate completeness gate
→ FND-07 Generate route/control/state coverage ledger
→ FND-08 Run static/security/workflow gates
→ FND-09 Same-SHA verification
```

## معايير التحقق

- `git diff --check` PASS.
- `guard:no-broken-imports` parses all code and reports violations instead of crashing.
- fresh/upgrade/replay/checksum/drift/data-preservation migration tests PASS لكل خدمة.
- full runtime profiles healthy/readiness PASS.
- catalog nonzero/readable/media reachable.
- DSH↔WLT facade and financial readback PASS.
- 107 journey documents pass completeness gate.
- zero unclassified routes/screens/controls/states.
- Contextual CI aggregate PASS على SHA واحد.

## قرار Foundation

`PASS` — يسمح بتنفيذ رحلات J079-J094 بالكامل.

**الحالة على SHA `96d08a7c`**: أُغلق `guard:dsh-route-declaration` (المانع الأخير). كلا الحارسان
`guard:dsh-route-declaration` و`guard:dsh-route-permission-binding` يجتازان. البناء Go أخضر عبر
أربع خدمات. `journey_execution_allowed: true`. البند المفتوح الوحيد (`DSH↔WLT financial readback`)
مصنَّف `BLOCKED_EXTERNAL` ولا يمنع تنفيذ الرحلات.
